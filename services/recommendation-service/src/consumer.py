"""
RabbitMQ consumer — processes events from multiple services.

Consumes 3 event streams (each on its own queue):
  1. Interaction events   → update user_profile_store + item_popularity_store
  2. Content events       → update catalog_store (items, courses, majors)
  3. User profile events  → update catalog_store (user profiles)

This is how the recommendation-service builds its local materialized views
without ever connecting to another service's database.

RAG indexing is handled by the dedicated ``rag-service``; this consumer
only maintains the recommendation catalog and FAISS index.
"""

import json
import logging
import threading
import pika
from config import RABBITMQ_URL, FAISS_REBUILD_THRESHOLD

from stores.user_profile_store import UserProfileStore
from stores.item_popularity_store import ItemPopularityStore
from stores.catalog_store import CatalogStore

logger = logging.getLogger(__name__)

# Queue names (must match NestJS QUEUES constants)
QUEUE_INTERACTIONS = "recommendation.events"
QUEUE_CONTENT_SYNC = "recommendation.content.sync"
QUEUE_USER_SYNC = "recommendation.user.sync"
EXCHANGE_DEAD_LETTER = "dead.letter"


class EventConsumer:
    """RabbitMQ consumer that processes events from multiple upstream services.

    Listens on three queues in parallel:
        - ``recommendation.events`` — interaction events
        - ``recommendation.content.sync`` — content catalog CRUD
        - ``recommendation.user.sync`` — user profile updates

    Each event is dispatched to the appropriate materialized-view store so
    the recommendation engine can score without cross-service DB access.

    Args:
        user_store: Store for aggregated user interaction profiles.
        popularity_store: Store for item-level popularity counters.
        catalog_store: Local materialized view of items/courses/majors.
        model_manager: Optional ``ModelManager`` for threshold-triggered
            FAISS index rebuilds after new items arrive.
    """

    def __init__(
        self,
        user_store: UserProfileStore,
        popularity_store: ItemPopularityStore,
        catalog_store: CatalogStore,
        model_manager=None,
    ):
        self.user_store = user_store
        self.popularity_store = popularity_store
        self.catalog_store = catalog_store
        self._model_manager = model_manager
        self._connection = None
        self._channel = None
        self._items_since_rebuild = 0
        self._rebuild_lock = threading.Lock()
        self._stopping = False

    def connect(self) -> None:
        """Establish a blocking connection to RabbitMQ and declare queues.

        Declares durable queues for all three event streams with dead-letter
        exchange support.  The content sync queue is bound to the
        ``content.sync`` fanout exchange so both this service and the
        rag-service receive the same events independently.
        Sets ``prefetch_count=50`` for flow control.
        """
        params = pika.URLParameters(RABBITMQ_URL)
        self._connection = pika.BlockingConnection(params)
        self._channel = self._connection.channel()

        # Declare queues
        for queue in [QUEUE_INTERACTIONS, QUEUE_CONTENT_SYNC, QUEUE_USER_SYNC]:
            self._channel.queue_declare(
                queue=queue, 
                durable=True,
                arguments={"x-dead-letter-exchange": EXCHANGE_DEAD_LETTER}
            )

        # Bind content sync queue to the fanout exchange
        self._channel.exchange_declare(
            exchange="content.sync",
            exchange_type="fanout",
            durable=True,
            arguments={"alternate-exchange": EXCHANGE_DEAD_LETTER},
        )
        self._channel.queue_bind(
            queue=QUEUE_CONTENT_SYNC,
            exchange="content.sync",
        )

        self._channel.basic_qos(prefetch_count=50)
        logger.info("Connected to RabbitMQ, consuming from 3 queues")

    # ─── Interaction Events ─────────────────────────────────────────────

    def _on_interaction(self, channel, method, properties, body) -> None:
        """Handle an interaction event (view, like, purchase, etc.).

        Updates both the user interaction profile and the item popularity
        counters atomically.  ACKs on success, NACKs with requeue on failure.

        Args:
            channel: The AMQP channel.
            method: Delivery metadata (delivery_tag, routing_key, etc.).
            properties: Message properties.
            body: Raw JSON message bytes.
        """
        try:
            message = json.loads(body)
            payload = message.get("payload", message)

            self.user_store.update_on_interaction(payload)
            self.popularity_store.update_on_interaction(payload)

            channel.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Failed to process interaction event: {e}")
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    # ─── Content Sync Events (from content-service) ─────────────────────

    def _on_content_sync(self, channel, method, properties, body) -> None:
        """
        Handle content events: item created/updated/deleted, course/major changes.

        Expected payload formats:
          Item:   { "type": "ITEM_UPSERT", "itemId": "...", "itemType": "RESOURCE", "majorId": "...", ... }
          Item:   { "type": "ITEM_DELETED", "itemId": "..." }
          Course: { "type": "COURSE_UPSERT", "courseId": "...", "majorId": "...", "semester": 3, ... }
          Course: { "type": "COURSE_DELETED", "courseId": "..." }
          Major:  { "type": "MAJOR_UPSERT", "majorId": "...", "code": "SE", "name": "..." }
          Major:  { "type": "MAJOR_DELETED", "majorId": "..." }
        """
        try:
            message = json.loads(body)
            payload = message.get("payload", message)
            sync_type = payload.get("type", "")

            if sync_type == "ITEM_UPSERT":
                self.catalog_store.upsert_item(payload)
                self._check_rebuild_threshold()
            elif sync_type == "ITEM_DELETED":
                self.catalog_store.remove_item(payload["itemId"])
            elif sync_type == "COURSE_UPSERT":
                self.catalog_store.upsert_course(payload)
            elif sync_type == "COURSE_DELETED":
                self.catalog_store.remove_course(payload["courseId"])
            elif sync_type == "MAJOR_UPSERT":
                self.catalog_store.upsert_major(payload)
            elif sync_type == "MAJOR_DELETED":
                self.catalog_store.remove_major(payload["majorId"])
            else:
                logger.warning(f"Unknown content sync type: {sync_type}")

            channel.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Failed to process content sync event: {e}")
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    def _check_rebuild_threshold(self) -> None:
        """Trigger an async FAISS index rebuild when enough new items arrive.

        Uses a double-checked lock pattern so only one rebuild runs at a
        time.  The threshold is configured by ``FAISS_REBUILD_THRESHOLD``.
        """
        self._items_since_rebuild += 1
        if self._items_since_rebuild >= FAISS_REBUILD_THRESHOLD and self._model_manager:
            with self._rebuild_lock:
                if self._items_since_rebuild >= FAISS_REBUILD_THRESHOLD:
                    self._items_since_rebuild = 0
                    logger.info(f"FAISS rebuild threshold ({FAISS_REBUILD_THRESHOLD}) reached — triggering async rebuild")
                    t = threading.Thread(target=self._model_manager.rebuild_index, daemon=True)
                    t.start()



    # ─── User Profile Sync Events (from user-service) ──────────────────

    def _on_user_sync(self, channel, method, properties, body) -> None:
        """
        Handle user profile events from UserProfileUpdatedEvent.

        The payload arrives in NestJS event format:
          { "payload": { "userId": "...", "changes": { "majorId": "...", ... }, "updatedAt": "..." } }

        We extract the flat user profile for the catalog store.
        """
        try:
            message = json.loads(body)
            payload = message.get("payload", message)

            # Extract user profile from enriched event format
            user_id = payload.get("userId", "")
            changes = payload.get("changes", {})

            user_profile = {
                "userId": user_id,
                "majorId": changes.get("majorId", payload.get("majorId", "")),
                "courseId": changes.get("courseId", payload.get("courseId", "")),
                "semester": changes.get("semester", payload.get("semester")),
                "careerId": changes.get("careerId", payload.get("careerId", "")),
            }

            self.catalog_store.upsert_user_profile(user_profile)

            channel.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Failed to process user sync event: {e}")
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    # ─── Start Consuming ────────────────────────────────────────────────

    def start_consuming(self) -> None:
        """Blocking consume loop — run in a separate thread."""
        import time
        retry_delay = 5

        while not self._stopping:
            try:
                if not self._channel or self._channel.is_closed or not self._connection or self._connection.is_closed:
                    self.connect()

                self._channel.basic_consume(queue=QUEUE_INTERACTIONS, on_message_callback=self._on_interaction)
                self._channel.basic_consume(queue=QUEUE_CONTENT_SYNC, on_message_callback=self._on_content_sync)
                self._channel.basic_consume(queue=QUEUE_USER_SYNC, on_message_callback=self._on_user_sync)

                logger.info("Consumer started on 3 queues: interactions, content sync, user sync")
                retry_delay = 5  # Reset on successful connect
                self._channel.start_consuming()
            except pika.exceptions.AMQPConnectionError as e:
                if self._stopping:
                    break
                logger.error(f"RabbitMQ connection error: {e}. Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, 60)
            except Exception as e:
                if self._stopping:
                    break
                logger.error(f"Unexpected consumer error: {e}. Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, 60)

    def close(self) -> None:
        """Gracefully close the RabbitMQ connection if open.

        Tolerates already-broken connections (e.g. SSL transport
        StreamLostError) so the lifespan shutdown never crashes.
        """
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
            logger.debug(f"Ignored error during consumer close: {e}")
