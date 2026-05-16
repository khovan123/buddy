"""
Two-Tower recommendation model (TensorFlow/Keras).

Architecture:
  ┌──────────────┐     ┌──────────────┐
  │  User Tower   │     │  Item Tower   │
  │              │     │              │
  │  user_id     │     │  item_id     │
  │  major_id    │     │  item_type   │
  │  course_id   │     │  major_id    │
  │  semester    │     │  course_id   │
  │  career_id   │     │  semester    │
  │              │     │              │
  │  Dense(128)  │     │  Dense(128)  │
  │  Dense(64)   │     │  Dense(64)   │
  │  L2 Norm     │     │  L2 Norm     │
  └──────┬───────┘     └──────┬───────┘
         │                    │
         └────── cosine ──────┘
                similarity
                  ↓
              prediction
"""

import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import tensorflow as tf
from tensorflow import keras
import numpy as np
import logging

logger = logging.getLogger(__name__)


class TwoTowerModel:
    """Two-Tower embedding model for user-item recommendation."""

    def __init__(self, vocab_sizes: dict, embedding_dim: int = 64):
        """
        Args:
            vocab_sizes: {
                "user_id": N, "major_id": N, "course_id": N,
                "career_id": N, "item_id": N, "item_type": 3,
            }
            embedding_dim: final embedding dimension (default 64)
        """
        self.vocab_sizes = vocab_sizes
        self.embedding_dim = embedding_dim
        self.user_tower = self._build_user_tower()
        self.item_tower = self._build_item_tower()
        self.model = self._build_full_model()

    def _build_user_tower(self) -> keras.Model:
        """User tower: user_id + major + course + semester + career → embedding."""
        user_id_input = keras.Input(shape=(1,), name="user_id", dtype=tf.int32)
        major_input = keras.Input(shape=(1,), name="user_major_id", dtype=tf.int32)
        course_input = keras.Input(shape=(1,), name="user_course_id", dtype=tf.int32)
        semester_input = keras.Input(shape=(1,), name="user_semester", dtype=tf.float32)
        career_input = keras.Input(shape=(1,), name="user_career_id", dtype=tf.int32)

        user_emb = keras.layers.Embedding(
            self.vocab_sizes.get("user_id", 10000), 32
        )(user_id_input)
        major_emb = keras.layers.Embedding(
            self.vocab_sizes.get("major_id", 100), 16
        )(major_input)
        course_emb = keras.layers.Embedding(
            self.vocab_sizes.get("course_id", 500), 16
        )(course_input)
        career_emb = keras.layers.Embedding(
            self.vocab_sizes.get("career_id", 100), 16
        )(career_input)

        user_emb = keras.layers.Flatten()(user_emb)
        major_emb = keras.layers.Flatten()(major_emb)
        course_emb = keras.layers.Flatten()(course_emb)
        career_emb = keras.layers.Flatten()(career_emb)

        concat = keras.layers.Concatenate()([
            user_emb, major_emb, course_emb, semester_input, career_emb
        ])

        reg = keras.regularizers.l2(1e-5)
        x = keras.layers.Dense(256, activation="relu", kernel_regularizer=reg)(concat)
        x = keras.layers.BatchNormalization()(x)
        x = keras.layers.Dropout(0.15)(x)
        x = keras.layers.Dense(128, activation="relu", kernel_regularizer=reg)(x)
        x = keras.layers.BatchNormalization()(x)
        x = keras.layers.Dropout(0.15)(x)
        x = keras.layers.Dense(self.embedding_dim, kernel_regularizer=reg)(x)
        output = keras.layers.UnitNormalization(axis=1)(x)

        return keras.Model(
            inputs=[user_id_input, major_input, course_input, semester_input, career_input],
            outputs=output,
            name="user_tower",
        )

    def _build_item_tower(self) -> keras.Model:
        """Item tower: item_id + item_type + major + course + semester → embedding."""
        item_id_input = keras.Input(shape=(1,), name="item_id", dtype=tf.int32)
        item_type_input = keras.Input(shape=(1,), name="item_type", dtype=tf.int32)
        major_input = keras.Input(shape=(1,), name="item_major_id", dtype=tf.int32)
        course_input = keras.Input(shape=(1,), name="item_course_id", dtype=tf.int32)
        semester_input = keras.Input(shape=(1,), name="item_semester", dtype=tf.float32)

        item_emb = keras.layers.Embedding(
            self.vocab_sizes.get("item_id", 50000), 32
        )(item_id_input)
        type_emb = keras.layers.Embedding(
            self.vocab_sizes.get("item_type", 3), 8
        )(item_type_input)
        major_emb = keras.layers.Embedding(
            self.vocab_sizes.get("major_id", 100), 16
        )(major_input)
        course_emb = keras.layers.Embedding(
            self.vocab_sizes.get("course_id", 500), 16
        )(course_input)

        item_emb = keras.layers.Flatten()(item_emb)
        type_emb = keras.layers.Flatten()(type_emb)
        major_emb = keras.layers.Flatten()(major_emb)
        course_emb = keras.layers.Flatten()(course_emb)

        concat = keras.layers.Concatenate()([
            item_emb, type_emb, major_emb, course_emb, semester_input
        ])

        reg = keras.regularizers.l2(1e-5)
        x = keras.layers.Dense(256, activation="relu", kernel_regularizer=reg)(concat)
        x = keras.layers.BatchNormalization()(x)
        x = keras.layers.Dropout(0.15)(x)
        x = keras.layers.Dense(128, activation="relu", kernel_regularizer=reg)(x)
        x = keras.layers.BatchNormalization()(x)
        x = keras.layers.Dropout(0.15)(x)
        x = keras.layers.Dense(self.embedding_dim, kernel_regularizer=reg)(x)
        output = keras.layers.UnitNormalization(axis=1)(x)

        return keras.Model(
            inputs=[item_id_input, item_type_input, major_input, course_input, semester_input],
            outputs=output,
            name="item_tower",
        )

    def _build_full_model(self) -> keras.Model:
        """Combined model with cosine similarity loss."""
        # User inputs
        user_id = keras.Input(shape=(1,), name="user_id", dtype=tf.int32)
        user_major = keras.Input(shape=(1,), name="user_major_id", dtype=tf.int32)
        user_course = keras.Input(shape=(1,), name="user_course_id", dtype=tf.int32)
        user_semester = keras.Input(shape=(1,), name="user_semester", dtype=tf.float32)
        user_career = keras.Input(shape=(1,), name="user_career_id", dtype=tf.int32)

        # Item inputs
        item_id = keras.Input(shape=(1,), name="item_id", dtype=tf.int32)
        item_type = keras.Input(shape=(1,), name="item_type", dtype=tf.int32)
        item_major = keras.Input(shape=(1,), name="item_major_id", dtype=tf.int32)
        item_course = keras.Input(shape=(1,), name="item_course_id", dtype=tf.int32)
        item_semester = keras.Input(shape=(1,), name="item_semester", dtype=tf.float32)

        user_emb = self.user_tower([user_id, user_major, user_course, user_semester, user_career])
        item_emb = self.item_tower([item_id, item_type, item_major, item_course, item_semester])

        # Cosine similarity (dot product of L2-normalized vectors)
        cosine_sim = keras.layers.Dot(axes=1, normalize=False)([user_emb, item_emb])
        # Temperature scaling: cosine sim [-1,1] → logits [-15,15]
        similarity = cosine_sim * 15.0

        model = keras.Model(
            inputs=[
                user_id, user_major, user_course, user_semester, user_career,
                item_id, item_type, item_major, item_course, item_semester,
            ],
            outputs=similarity,
            name="two_tower_recommendation",
        )

        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss=keras.losses.BinaryCrossentropy(from_logits=True),
            metrics=["accuracy"],
        )

        return model

    def save(self, path: str) -> None:
        """Save both towers + full model weights."""
        os.makedirs(path, exist_ok=True)
        self.user_tower.save(os.path.join(path, "user_tower.keras"))
        self.item_tower.save(os.path.join(path, "item_tower.keras"))
        self.model.save_weights(os.path.join(path, "full_model.weights.h5"))
        logger.info(f"Model saved to {path}")

    def load(self, path: str) -> None:
        """Load pre-trained weights."""
        self.user_tower = keras.models.load_model(os.path.join(path, "user_tower.keras"))
        self.item_tower = keras.models.load_model(os.path.join(path, "item_tower.keras"))
        self.model.load_weights(os.path.join(path, "full_model.weights.h5"))
        logger.info(f"Model loaded from {path}")
