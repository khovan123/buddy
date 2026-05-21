"""
RabbitMQ consumer — processes content-sync events for RAG indexing.

Listens on the ``rag.content.sync`` queue (bound to the ``content.sync``
fanout exchange) and incrementally updates the Qdrant vector store whenever
content is created, updated, or deleted.

The recommendation-service has its own queue on the same exchange for its
materialized views — both services receive the same events independently.
"""

import json
import logging
import threading
import time

import pika

from config import RABBITMQ_URL

logger = logging.getLogger(__name__)

# Exchange and queue names (must match content-service publisher config)
EXCHANGE_CONTENT_SYNC = "content.sync"
QUEUE_RAG_CONTENT_SYNC = "rag.content.sync"


class RAGContentConsumer:
    """Consume content-sync events and keep Qdrant in sync.

    Binds ``rag.content.sync`` to the ``content.sync`` fanout exchange
    so this consumer receives the same events as the recommendation-service
    consumer, without coupling to it.

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

    def _on_content_sync(self, channel, method, properties, body) -> None:
        """Handle a content sync event.

        Dispatches to catalog_store for metadata persistence, and to
        rag_indexer for Qdrant vector upsert/removal.

        Only ITEM_UPSERT and ITEM_DELETED trigger re-indexing.
        Course/major metadata updates only affect the catalog store
        (Qdrant chunks are indexed by item, not by course/major).
        """
        try:
            message = json.loads(body)
            payload = message.get("payload", message)
            sync_type = payload.get("type", "")

            if sync_type == "ITEM_UPSERT":
                self.catalog_store.upsert_item(payload)
                item_id = payload.get("itemId", "")
                # Re-fetch the full item for chunking (upsert_item may have
                # merged partial fields, so read the canonical version back).
                item = self.catalog_store.get_item(item_id)
                if item:
                    chunks = self.rag_indexer.index_item(item)
                    logger.debug("Indexed %d chunks for item %s", chunks, item_id)
                else:
                    logger.warning("Item %s not found in catalog after upsert", item_id)

            elif sync_type == "ITEM_DELETED":
                item_id = payload.get("itemId", "")
                self.catalog_store.remove_item(item_id)
                self.rag_indexer.remove_item(item_id)
                logger.debug("Removed item %s from catalog and Qdrant", item_id)

            elif sync_type == "COURSE_UPSERT":
                self.catalog_store.upsert_course(payload)
            elif sync_type == "COURSE_DELETED":
                self.catalog_store.remove_course(payload["courseId"])
            elif sync_type == "MAJOR_UPSERT":
                self.catalog_store.upsert_major(payload)
            elif sync_type == "MAJOR_DELETED":
                self.catalog_store.remove_major(payload["majorId"])
            else:
                logger.warning("Unknown content sync type: %s", sync_type)

            channel.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error("Failed to process content sync event: %s", e, exc_info=True)
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

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
        """Gracefully stop consuming and close the connection."""
        self._stopping = True
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
