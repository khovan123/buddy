"""
Centralised configuration for the RAG service.

All settings are loaded from environment variables with sensible defaults
for local development.  In production the ``.env.prod`` file is loaded
automatically when ``NODE_ENV=production``.
"""

import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

_env_file = '.env.prod' if os.getenv('NODE_ENV') == 'production' else '.env'
load_dotenv(_env_file)  # Load env file (no-op if not present, e.g. in Docker)

# ─── MongoDB (own database only — no cross-service connections) ─────────────────
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/recommendation_db")
MONGO_DB_NAME = "recommendation_db"

# ─── RabbitMQ ───────────────────────────────────────────────────────────────────
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://admin:admin123@localhost:5672/microservices")
INTERACTION_QUEUE = os.getenv("INTERACTION_QUEUE", "recommendation.events")

# ─── Redis ──────────────────────────────────────────────────────────────────────
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "redis123")

if os.getenv("REDIS_URL"):
    REDIS_URL = os.getenv("REDIS_URL")
else:
    _redis_auth = f":{quote_plus(REDIS_PASSWORD)}@" if REDIS_PASSWORD else ""
    REDIS_URL = f"redis://{_redis_auth}{REDIS_HOST}:{REDIS_PORT}/0"

RECOMMENDATION_CACHE_TTL = int(os.getenv("RECOMMENDATION_CACHE_TTL", "300"))  # 5 min

# ─── Scoring ────────────────────────────────────────────────────────────────────
TOP_K_CANDIDATES = int(os.getenv("TOP_K_CANDIDATES", "200"))
TOP_K_RESULTS = int(os.getenv("TOP_K_RESULTS", "10"))
HISTORY_SIZE = int(os.getenv("HISTORY_SIZE", "100"))  # recent items to keep

# ─── Phase Thresholds (auto-detected) ──────────────────────────────────────────
PHASE_ONLINE_THRESHOLD = int(os.getenv("PHASE_ONLINE_THRESHOLD", "1000"))
PHASE_BATCH_ML_THRESHOLD = int(os.getenv("PHASE_BATCH_ML_THRESHOLD", "50000"))
PHASE_CONTINUOUS_THRESHOLD = int(os.getenv("PHASE_CONTINUOUS_THRESHOLD", "500000"))

# ─── Blending Weights ──────────────────────────────────────────────────────────
# { tier: (behavioral_w, profile_w, popularity_w) }
BLENDING_WEIGHTS = {
    "full": (0.70, 0.20, 0.10),        # ≥5 interactions
    "partial": (0.30, 0.40, 0.30),     # 1-4 interactions
    "profile_only": (0.00, 0.60, 0.40), # has profile, no interactions
    "cold": (0.00, 0.00, 1.00),         # brand new user
}
MIN_INTERACTIONS_FULL = int(os.getenv("MIN_INTERACTIONS_FULL", "5"))

# ─── Time Decay ─────────────────────────────────────────────────────────────────
TIME_DECAY_LAMBDA = float(os.getenv("TIME_DECAY_LAMBDA", "0.05"))

# ─── Model Artifacts ────────────────────────────────────────────────────────────
ARTIFACTS_DIR = os.getenv("ARTIFACTS_DIR", "./artifacts")
MIN_HITRATE = float(os.getenv("MIN_HITRATE", "0.05"))
MODEL_KEEP_VERSIONS = int(os.getenv("MODEL_KEEP_VERSIONS", "3"))

# ─── Model Lifecycle (FAISS rebuild + retrain scheduling) ───────────────────
FAISS_REBUILD_INTERVAL_HOURS = int(os.getenv("FAISS_REBUILD_INTERVAL_HOURS", "6"))
FAISS_REBUILD_THRESHOLD = int(os.getenv("FAISS_REBUILD_THRESHOLD", "50"))
RETRAIN_INTERVAL_HOURS = int(os.getenv("RETRAIN_INTERVAL_HOURS", "168"))  # weekly
OOV_RETRAIN_THRESHOLD = float(os.getenv("OOV_RETRAIN_THRESHOLD", "0.20"))

# ─── Server ─────────────────────────────────────────────────────────────────────
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "3010"))
_allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = ["*"] if _allowed_origins_raw == "*" else [o.strip() for o in _allowed_origins_raw.split(",")]
