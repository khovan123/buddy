"""
RabbitMQ consumer — processes content-sync events for RAG indexing.

Listens on the ``rag.content.sync`` queue (bound to the ``content.sync``
fanout exchange) and incrementally updates the Qdrant vector store whenever
content is created, updated, or deleted.

The recommendation-service has its own queue on the same exchange for its
materialized views — both services receive the same events independently.

Heavy work (embedding + Qdrant upsert) is offloaded to a worker thread so
the pika I/O thread stays responsive for heartbeats.  ACK/NACK is sent via
``add_callback_threadsafe`` after the work completes.
"""

import json
import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import pika

from config import RABBITMQ_URL

logger = logging.getLogger(__name__)

# Exchange and queue names (must match content-service publisher config)
EXCHANGE_CONTENT_SYNC = "content.sync"
QUEUE_RAG_CONTENT_SYNC = "rag.content.sync"

# Max parallel embedding workers — keeps memory bounded
_REINDEX_WORKERS = 2


class RAGContentConsumer:
    """Consume content-sync events and keep Qdrant in sync.

    Binds ``rag.content.sync`` to the ``content.sync`` fanout exchange
    so this consumer receives the same events as the recommendation-service
    consumer, without coupling to it.

    Heavy re-indexing (ITEM_UPSERT, COURSE_UPSERT, MAJOR_UPSERT) is
    dispatched to a ``ThreadPoolExecutor`` so the pika I/O thread
    continues servicing heartbeats.  ACK is sent back via
    ``add_callback_threadsafe`` after the work completes successfully.

    Args:
        catalog_store: Local materialized view of items/courses/majors.
        rag_indexer: RAGIndexer instance for Qdrant upsert/remove.
    """

    def __init__(self, catalog_store, rag_indexer):
        self.catalog_store = catalog_store
        self.rag_indexer = rag_indexer
        self._connection = None
        self._channel = None
        self._stopping = False
        self._executor = ThreadPoolExecutor(
            max_workers=_REINDEX_WORKERS,
            thread_name_prefix="rag-idx",
        )

    def connect(self) -> None:
        """Establish blocking connection, declare exchange + queue + binding."""
        params = pika.URLParameters(RABBITMQ_URL)
        self._connection = pika.BlockingConnection(params)
        self._channel = self._connection.channel()

        # Declare the fanout exchange (idempotent — must match NestJS declaration)
        self._channel.exchange_declare(
            exchange=EXCHANGE_CONTENT_SYNC,
            exchange_type="fanout",
            durable=True,
        )

        # Declare our queue and bind to the fanout exchange
        self._channel.queue_declare(
            queue=QUEUE_RAG_CONTENT_SYNC,
            durable=True,
            arguments={"x-dead-letter-exchange": "dead.letter"},
        )
        self._channel.queue_bind(
            queue=QUEUE_RAG_CONTENT_SYNC,
            exchange=EXCHANGE_CONTENT_SYNC,
        )

        self._channel.basic_qos(prefetch_count=10)
        logger.info("RAG consumer connected, bound %s to %s", QUEUE_RAG_CONTENT_SYNC, EXCHANGE_CONTENT_SYNC)

    # ─── Thread-safe ACK/NACK helpers ───────────────────────────────────

    def _safe_ack(self, delivery_tag: int) -> None:
        """ACK a message from any thread via the pika I/O loop."""
        if self._connection and self._connection.is_open:
            self._connection.add_callback_threadsafe(
                lambda: self._channel.basic_ack(delivery_tag=delivery_tag)
            )

    def _safe_nack(self, delivery_tag: int) -> None:
        """NACK+requeue a message from any thread via the pika I/O loop."""
        if self._connection and self._connection.is_open:
            self._connection.add_callback_threadsafe(
                lambda: self._channel.basic_nack(delivery_tag=delivery_tag, requeue=True)
            )

    # ─── Message handler ────────────────────────────────────────────────

    def _on_content_sync(self, channel, method, properties, body) -> None:
        """Handle a content sync event.

        Light operations (catalog store updates, deletes) run inline.
        Heavy operations (embedding + Qdrant upsert) are dispatched to the
        thread pool; ACK is deferred until the work completes.
        """
        try:
            message = json.loads(body)
            payload = message.get("payload", message)
            sync_type = payload.get("type", "")

            if sync_type == "ITEM_UPSERT":
                self.catalog_store.upsert_item(payload)
                item_id = payload.get("itemId", "")
                item = self.catalog_store.get_item(item_id)
                if item:
                    # Offload embedding work — ACK after completion
                    self._executor.submit(
                        self._index_item_async, item, method.delivery_tag
                    )
                    return  # ACK handled by worker thread
                else:
                    logger.warning("Item %s not found in catalog after upsert", item_id)

            elif sync_type == "ITEM_DELETED":
                item_id = payload.get("itemId", "")
                self.catalog_store.remove_item(item_id)
                self.rag_indexer.remove_item(item_id)
                logger.debug("Removed item %s from catalog and Qdrant", item_id)

            elif sync_type == "COURSE_UPSERT":
                self.catalog_store.upsert_course(payload)
                course_id = payload.get("courseId", "")
                if course_id:
                    # Offload batch re-index — ACK after completion
                    self._executor.submit(
                        self._reindex_items_by_course_async, course_id, method.delivery_tag
                    )
                    return

            elif sync_type == "COURSE_DELETED":
                self.catalog_store.remove_course(payload["courseId"])

            elif sync_type == "MAJOR_UPSERT":
                self.catalog_store.upsert_major(payload)
                major_id = payload.get("majorId", "")
                if major_id:
                    # Offload batch re-index — ACK after completion
                    self._executor.submit(
                        self._reindex_items_by_major_async, major_id, method.delivery_tag
                    )
                    return

            elif sync_type == "MAJOR_DELETED":
                self.catalog_store.remove_major(payload["majorId"])
            else:
                logger.warning("Unknown content sync type: %s", sync_type)

            # Inline ACK for lightweight operations
            channel.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error("Failed to process content sync event: %s", e, exc_info=True)
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    # ─── Worker-thread methods (run off the pika I/O thread) ────────────

    def _index_item_async(self, item: dict, delivery_tag: int) -> None:
        """Index a single item in a worker thread, then ACK."""
        item_id = item.get("itemId", "?")
        try:
            chunks = self.rag_indexer.index_item(item)
            logger.debug("Indexed %d chunks for item %s", chunks, item_id)
            self._safe_ack(delivery_tag)
        except Exception as e:
            logger.error("Failed to index item %s: %s", item_id, e)
            self._safe_nack(delivery_tag)

    def _reindex_items_by_course_async(self, course_id: str, delivery_tag: int) -> None:
        """Re-index all items for a course in a worker thread, then ACK."""
        try:
            items = self.catalog_store.get_items_by_course(course_id)
            if not items:
                self._safe_ack(delivery_tag)
                return
            logger.info("Re-indexing %d items for course %s after metadata update", len(items), course_id)
            for item in items:
                try:
                    self.rag_indexer.index_item(item)
                except Exception as e:
                    logger.error("Failed to re-index item %s for course %s: %s", item.get("itemId"), course_id, e)
            self._safe_ack(delivery_tag)
        except Exception as e:
            logger.error("Course re-index failed for %s: %s", course_id, e)
            self._safe_nack(delivery_tag)

    def _reindex_items_by_major_async(self, major_id: str, delivery_tag: int) -> None:
        """Re-index all items for a major in a worker thread, then ACK."""
        try:
            items = self.catalog_store.get_items_by_major(major_id)
            if not items:
                self._safe_ack(delivery_tag)
                return
            logger.info("Re-indexing %d items for major %s after metadata update", len(items), major_id)
            for item in items:
                try:
                    self.rag_indexer.index_item(item)
                except Exception as e:
                    logger.error("Failed to re-index item %s for major %s: %s", item.get("itemId"), major_id, e)
            self._safe_ack(delivery_tag)
        except Exception as e:
            logger.error("Major re-index failed for %s: %s", major_id, e)
            self._safe_nack(delivery_tag)

    # ─── Lifecycle ──────────────────────────────────────────────────────

    def start_consuming(self) -> None:
        """Blocking consume loop with reconnect — run in a daemon thread."""
        retry_delay = 5

        while not self._stopping:
            try:
                if not self._channel or self._channel.is_closed or not self._connection or self._connection.is_closed:
                    self.connect()

                self._channel.basic_consume(
                    queue=QUEUE_RAG_CONTENT_SYNC,
                    on_message_callback=self._on_content_sync,
                )

                logger.info("RAG consumer started on queue: %s", QUEUE_RAG_CONTENT_SYNC)
                retry_delay = 5  # Reset on success
                self._channel.start_consuming()
            except pika.exceptions.AMQPConnectionError as e:
                if self._stopping:
                    break
                logger.error("RabbitMQ connection error: %s. Retrying in %ds...", e, retry_delay)
                time.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, 60)
            except Exception as e:
                if self._stopping:
                    break
                logger.error("Unexpected consumer error: %s. Retrying in %ds...", e, retry_delay)
                time.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, 60)

    def close(self) -> None:
        """Gracefully stop consuming, drain workers, and close connection."""
        self._stopping = True
        self._executor.shutdown(wait=True, cancel_futures=False)
        try:
            if self._channel and self._channel.is_open:
                self._channel.stop_consuming()
        except Exception:
            pass
        try:
            if self._connection and self._connection.is_open:
                self._connection.close()
        except Exception as e:
            logger.debug("Ignored error during consumer close: %s", e)
