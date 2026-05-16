# ---
# jupyter:
#   jupytext:
#     text_representation:
#       extension: .py
#       format_name: percent
# ---

# %% [markdown]
# # 🏗️ Two-Tower Recommendation Model — Training
# **Unibuddy Distributed** | Self-contained Colab training pipeline
#
# This notebook generates synthetic university data and trains a Two-Tower
# embedding model for user↔item recommendation.

# %% — Install deps
# !pip install -q tensorflow numpy faiss-cpu

# %% — Imports
import os, json, random, hashlib
import numpy as np

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
import tensorflow as tf
from tensorflow import keras

random.seed(42)
np.random.seed(42)
print(f"TensorFlow {tf.__version__}, GPU: {tf.config.list_physical_devices('GPU')}")

# %% [markdown]
# ## 1. Generate Synthetic Training Data

# %%
def make_id(prefix, idx):
    return hashlib.md5(f"{prefix}_{idx}".encode()).hexdigest()[:24]

MAJORS = [
    {"majorId": make_id("major", i), "code": c, "name": n}
    for i, (c, n) in enumerate([
        ("SE","Software Engineering"),("CS","Computer Science"),
        ("DS","Data Science"),("AI","Artificial Intelligence"),("CE","Computer Engineering"),
    ])
]
CAREERS = ["backend","frontend","fullstack","data-engineer","ml-engineer",
           "devops","mobile","security","cloud-architect","product-manager"]
ITEM_TYPES = ["RESOURCE","TUTORIAL","COLLECTION"]
TOPICS = ["Python","Java","JavaScript","TypeScript","React","Node.js","Docker",
          "Kubernetes","AWS","ML","Deep Learning","SQL","MongoDB","Redis",
          "GraphQL","REST APIs","Microservices","Git","CI/CD","System Design",
          "Data Structures","Algorithms","OS","Networking","Cryptography",
          "Cloud Computing","DevOps","Agile","TDD","Clean Code"]

# Courses: 6 semesters × 5 majors = 30
courses = []
for m in MAJORS:
    for sem in range(1, 7):
        courses.append({"courseId": make_id(f"course_{m['code']}", sem),
                        "majorId": m["majorId"], "semester": sem})

# Items: 500
items = []
for i in range(500):
    c = random.choice(courses)
    items.append({"itemId": make_id("item", i), "itemType": random.choice(ITEM_TYPES),
                  "majorId": c["majorId"], "courseId": c["courseId"], "semester": c["semester"]})

# Users: 200
users = []
for i in range(200):
    m = random.choice(MAJORS)
    mc = [c for c in courses if c["majorId"] == m["majorId"]]
    c = random.choice(mc)
    users.append({"userId": make_id("user", i), "majorId": m["majorId"],
                  "courseId": c["courseId"], "semester": random.randint(1,6),
                  "careerId": random.choice(CAREERS)})

# Interactions: ~800 (70% same-major bias)
interactions = []
for u in users:
    same = [it for it in items if it["majorId"] == u["majorId"]]
    other = [it for it in items if it["majorId"] != u["majorId"]]
    n = random.randint(8, 40)
    chosen = (random.sample(same, min(int(n*0.7), len(same)))
              + random.sample(other, min(n - int(n*0.7), len(other))))
    for it in chosen:
        interactions.append({"userId": u["userId"], "itemId": it["itemId"],
                             "actionType": random.choices(["VIEW","LIKE","PURCHASE"],[.6,.25,.15])[0]})

print(f"Generated: {len(courses)} courses, {len(items)} items, {len(users)} users, {len(interactions)} interactions")

# %% [markdown]
# ## 1.5 Collaborative Filtering — Item-Item Co-Interaction
# Build Jaccard similarity from user overlap. CF-implied pairs become
# soft-positive training examples (label weighted by similarity).

# %%
from itertools import combinations as _combs

# Build user→items and item→users
_user_items = defaultdict(set)
_item_users = defaultdict(set)
for _inter in interactions:
    _user_items[_inter["userId"]].add(_inter["itemId"])
    _item_users[_inter["itemId"]].add(_inter["userId"])

def _jaccard(a, b):
    ua, ub = _item_users.get(a, set()), _item_users.get(b, set())
    isect = len(ua & ub)
    return isect / len(ua | ub) if (ua | ub) else 0.0

# Sparse item-item similarity (only pairs with overlap)
_iids = list(_item_users.keys())
item_sim_matrix = {}
for _i, _a in enumerate(_iids):
    for _b in _iids[_i+1:]:
        _s = _jaccard(_a, _b)
        if _s > 0:
            item_sim_matrix[(_a,_b)] = _s
            item_sim_matrix[(_b,_a)] = _s

# CF-implied pairs: for each user, find unseen items similar to their history
cf_pairs_raw = []
for _uid, _seen in _user_items.items():
    _cands = {}
    for _iid in _seen:
        for _other in _iids:
            if _other in _seen: continue
            _s = item_sim_matrix.get((_iid, _other), 0)
            if _s > 0.1:
                _cands[_other] = max(_cands.get(_other, 0), _s)
    for _oid, _sim in sorted(_cands.items(), key=lambda x: -x[1])[:3]:
        cf_pairs_raw.append({"userId": _uid, "itemId": _oid, "cf_weight": _sim})

print(f"Item-item similarities: {len(item_sim_matrix)//2} non-zero pairs")
print(f"CF-implied positives: {len(cf_pairs_raw)}")

# %% [markdown]
# ## 2. Build Training Pairs (Positive + Negative + CF Sampling)

# %%
class VocabEncoder:
    def __init__(self):
        self._vocabs = {}
    def fit(self, field, values):
        unique = sorted(set(v for v in values if v))
        self._vocabs[field] = {v: i+1 for i, v in enumerate(unique)}
    def encode(self, field, value):
        return self._vocabs.get(field, {}).get(value, 0)
    def vocab_size(self, field):
        return len(self._vocabs.get(field, {})) + 1
    def save(self, path):
        with open(path, "w") as f: json.dump(self._vocabs, f)

encoder = VocabEncoder()
item_map = {it["itemId"]: it for it in items}
user_map = {u["userId"]: u for u in users}
course_map = {c["courseId"]: c for c in courses}
type_map = {"RESOURCE": 0, "TUTORIAL": 1, "COLLECTION": 2}

encoder.fit("user_id", [u["userId"] for u in users])
encoder.fit("item_id", [it["itemId"] for it in items])
encoder.fit("major_id", [it["majorId"] for it in items] + [u["majorId"] for u in users])
encoder.fit("course_id", [it["courseId"] for it in items] + [u["courseId"] for u in users])
encoder.fit("career_id", [u["careerId"] for u in users])

# Group interactions by user
from collections import defaultdict
user_ints = defaultdict(list)
for inter in interactions:
    user_ints[inter["userId"]].append(inter)

pairs, labels, weights = [], [], []
all_item_ids = list(item_map.keys())

# Item popularity for hard-negative sampling (popular items = harder negatives)
item_pop = defaultdict(int)
for inter in interactions:
    item_pop[inter["itemId"]] += 1

def _make_pair(uid, iid, meta, it):
    cs = course_map.get(it.get("courseId",""), {}).get("semester", 0)
    return {
        "user_id": encoder.encode("user_id", uid),
        "user_major_id": encoder.encode("major_id", meta.get("majorId","")),
        "user_course_id": encoder.encode("course_id", meta.get("courseId","")),
        "user_semester": float(meta.get("semester", 0)),
        "user_career_id": encoder.encode("career_id", meta.get("careerId","")),
        "item_id": encoder.encode("item_id", iid),
        "item_type": type_map.get(it.get("itemType",""), 0),
        "item_major_id": encoder.encode("major_id", it.get("majorId","")),
        "item_course_id": encoder.encode("course_id", it.get("courseId","")),
        "item_semester": float(cs),
    }

for uid, ints in user_ints.items():
    meta = user_map.get(uid, {})
    interacted_ids = set()

    # Real positive pairs (weight=1.0)
    for inter in ints:
        iid = inter["itemId"]
        if iid not in item_map: continue
        interacted_ids.add(iid)
        pairs.append(_make_pair(uid, iid, meta, item_map[iid]))
        labels.append(1.0); weights.append(1.0)

    # 4× negative sampling with popularity-weighted distribution
    neg_pool = [i for i in all_item_ids if i not in interacted_ids]
    n_neg = min(len(interacted_ids) * 4, len(neg_pool))
    # Popularity-biased: popular items are harder negatives
    neg_counts = np.array([item_pop.get(i, 1) for i in neg_pool], dtype=float)
    neg_probs = neg_counts / neg_counts.sum()
    for neg_id in np.random.choice(neg_pool, size=n_neg, replace=False, p=neg_probs):
        pairs.append(_make_pair(uid, neg_id, meta, item_map[neg_id]))
        labels.append(0.0); weights.append(1.0)

# CF-implied soft-positive pairs (weight = jaccard similarity)
cf_added = 0
for cfp in cf_pairs_raw:
    uid, iid, w = cfp["userId"], cfp["itemId"], cfp["cf_weight"]
    if iid not in item_map or uid not in user_map: continue
    pairs.append(_make_pair(uid, iid, user_map[uid], item_map[iid]))
    labels.append(1.0); weights.append(w)  # soft weight
    cf_added += 1

features = {k: np.array([p[k] for p in pairs],
            dtype=np.float32 if "semester" in k else np.int32)
            for k in pairs[0]}
labels_arr = np.array(labels, dtype=np.float32)
weights_arr = np.array(weights, dtype=np.float32)

n_real_pos = int(sum(1 for l, w in zip(labels, weights) if l == 1.0 and w == 1.0))
print(f"Training pairs: {len(pairs)} ({n_real_pos} real pos, {cf_added} CF pos, {len(pairs)-n_real_pos-cf_added} neg)")
print(f"Vocab sizes: { {f: encoder.vocab_size(f) for f in ['user_id','item_id','major_id','course_id','career_id']} }")

# %% [markdown]
# ## 3. Build Two-Tower Model

# %%
def build_tower(name, input_specs, vocab_sizes_map, embedding_dim=64):
    inputs = []
    embeddings = []
    for iname, dtype, is_embedding, vkey, edim in input_specs:
        inp = keras.Input(shape=(1,), name=iname, dtype=dtype)
        inputs.append(inp)
        if is_embedding:
            emb = keras.layers.Embedding(vocab_sizes_map[vkey], edim)(inp)
            emb = keras.layers.Flatten()(emb)
            embeddings.append(emb)
        else:
            embeddings.append(inp)

    concat = keras.layers.Concatenate()(embeddings)
    reg = keras.regularizers.l2(1e-5)
    x = keras.layers.Dense(256, activation="relu", kernel_regularizer=reg)(concat)
    x = keras.layers.BatchNormalization()(x)
    x = keras.layers.Dropout(0.15)(x)
    x = keras.layers.Dense(128, activation="relu", kernel_regularizer=reg)(x)
    x = keras.layers.BatchNormalization()(x)
    x = keras.layers.Dropout(0.15)(x)
    x = keras.layers.Dense(embedding_dim, kernel_regularizer=reg)(x)
    output = keras.layers.UnitNormalization(axis=1)(x)
    return keras.Model(inputs=inputs, outputs=output, name=name)

vocab_sizes = {
    "user_id": encoder.vocab_size("user_id"),
    "item_id": encoder.vocab_size("item_id"),
    "major_id": encoder.vocab_size("major_id"),
    "course_id": encoder.vocab_size("course_id"),
    "career_id": encoder.vocab_size("career_id"),
    "item_type": 4,
}

user_tower = build_tower("user_tower", [
    ("user_id", tf.int32, True, "user_id", 32),
    ("user_major_id", tf.int32, True, "major_id", 16),
    ("user_course_id", tf.int32, True, "course_id", 16),
    ("user_semester", tf.float32, False, None, None),
    ("user_career_id", tf.int32, True, "career_id", 16),
], vocab_sizes)

item_tower = build_tower("item_tower", [
    ("item_id", tf.int32, True, "item_id", 32),
    ("item_type", tf.int32, True, "item_type", 8),
    ("item_major_id", tf.int32, True, "major_id", 16),
    ("item_course_id", tf.int32, True, "course_id", 16),
    ("item_semester", tf.float32, False, None, None),
], vocab_sizes)

# Full model
all_inputs = user_tower.inputs + item_tower.inputs
user_emb = user_tower(user_tower.inputs)
item_emb = item_tower(item_tower.inputs)
cosine_sim = keras.layers.Dot(axes=1, normalize=False)([user_emb, item_emb])
# Temperature scaling: cosine sim is in [-1,1]. Temperature=15 gives logit range [-15,15]
# which maps well to BCE sigmoid. Too high = gradient saturation on weak embeddings.
TEMPERATURE = 15.0
similarity = cosine_sim * TEMPERATURE

# CosineDecay: starts at 1e-3 and decays smoothly to 1e-6 over training,
# converging into deeper local minima for better MRR.
EPOCHS = 80
BATCH_SIZE = 128
total_steps = (len(labels_arr) // BATCH_SIZE) * EPOCHS
lr_schedule = keras.optimizers.schedules.CosineDecay(
    initial_learning_rate=1e-3,
    decay_steps=total_steps,
    alpha=1e-6 / 1e-3,  # final LR ratio
)
model = keras.Model(inputs=all_inputs, outputs=similarity, name="two_tower")
model.compile(optimizer=keras.optimizers.Adam(learning_rate=lr_schedule),
              loss=keras.losses.BinaryCrossentropy(from_logits=True),
              metrics=["accuracy"])

model.summary()
print(f"\nUser tower params: {user_tower.count_params():,}")
print(f"Item tower params: {item_tower.count_params():,}")

# %% [markdown]
# ## 4. Train

# %%

# Upweight positive samples to counteract class imbalance
n_pos = int(labels_arr.sum())
n_neg = len(labels_arr) - n_pos
ratio = n_neg / max(n_pos, 1)
balanced_weights = np.where(labels_arr == 1.0, weights_arr * ratio, weights_arr)
print(f"Sample weight range: [{balanced_weights.min():.2f}, {balanced_weights.max():.2f}]")

# Early stopping with min_delta to prevent premature stop
callbacks = [
    keras.callbacks.EarlyStopping(
        monitor="val_loss", patience=12, min_delta=0.001,
        restore_best_weights=True, verbose=1
    ),
]

history = model.fit(features, labels_arr,
                    epochs=EPOCHS, batch_size=BATCH_SIZE,
                    validation_split=0.2, verbose=1,
                    sample_weight=balanced_weights,
                    callbacks=callbacks)

# %% [markdown]
# ## 5. Training Curves

# %%
try:
    import matplotlib.pyplot as plt
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
    ax1.plot(history.history["loss"], label="train"); ax1.plot(history.history["val_loss"], label="val")
    ax1.set_title("Loss"); ax1.legend()
    ax2.plot(history.history["accuracy"], label="train"); ax2.plot(history.history["val_accuracy"], label="val")
    ax2.set_title("Accuracy"); ax2.legend()
    plt.tight_layout(); plt.show()
except ImportError:
    print("matplotlib not available — skipping plots")

# %% [markdown]
# ## 6. Save Model Artifacts

# %%
OUTPUT_DIR = "./two_tower_model"
os.makedirs(OUTPUT_DIR, exist_ok=True)

user_tower.save(os.path.join(OUTPUT_DIR, "user_tower.keras"))
item_tower.save(os.path.join(OUTPUT_DIR, "item_tower.keras"))
model.save_weights(os.path.join(OUTPUT_DIR, "full_model.weights.h5"))
encoder.save(os.path.join(OUTPUT_DIR, "vocab.json"))

metrics = {
    "status": "completed",
    "total_pairs": len(pairs),
    "positive_pairs": int(sum(labels)),
    "epochs": EPOCHS,
    "final_loss": float(history.history["loss"][-1]),
    "final_accuracy": float(history.history["accuracy"][-1]),
    "val_loss": float(history.history["val_loss"][-1]),
    "val_accuracy": float(history.history["val_accuracy"][-1]),
    "vocab_sizes": vocab_sizes,
}
with open(os.path.join(OUTPUT_DIR, "metrics.json"), "w") as f:
    json.dump(metrics, f, indent=2)

print(f"\n✅ Model saved to {OUTPUT_DIR}/")
print(json.dumps(metrics, indent=2))

# %% [markdown]
# ## 7. Re-Ranking Evaluation (NDCG@K, Hit Rate@K, MRR)
# Evaluate with proper ranking metrics instead of just accuracy.

# %%
def compute_ranking_metrics(user_tower, item_tower, user_map, item_map,
                           user_ints, encoder, type_map, course_map, K=10):
    """Leave-one-out evaluation: NDCG, HR, Precision, Recall, MRR."""
    ndcg_scores, hr_scores, mrr_scores = [], [], []
    prec_scores, rec_scores = [], []

    # Precompute all item embeddings
    all_iids = list(item_map.keys())
    item_feats = {
        "item_id": np.array([[encoder.encode("item_id", iid)] for iid in all_iids]),
        "item_type": np.array([[type_map.get(item_map[iid].get("itemType",""),0)] for iid in all_iids]),
        "item_major_id": np.array([[encoder.encode("major_id", item_map[iid].get("majorId",""))] for iid in all_iids]),
        "item_course_id": np.array([[encoder.encode("course_id", item_map[iid].get("courseId",""))] for iid in all_iids]),
        "item_semester": np.array([[float(course_map.get(item_map[iid].get("courseId",""),{}).get("semester",0))] for iid in all_iids]),
    }
    all_item_embs = item_tower.predict(item_feats, verbose=0)  # (N_items, 64)

    for uid, ints in user_ints.items():
        if len(ints) < 2: continue
        meta = user_map.get(uid, {})
        held_out_items = {ints[-1]["itemId"]}  # last interaction = test
        # Also count items from last 2 interactions for Recall denominator
        all_relevant = {inter["itemId"] for inter in ints}
        if not held_out_items.intersection(set(item_map.keys())): continue

        # User embedding
        u_feats = {
            "user_id": np.array([[encoder.encode("user_id", uid)]]),
            "user_major_id": np.array([[encoder.encode("major_id", meta.get("majorId",""))]]),
            "user_course_id": np.array([[encoder.encode("course_id", meta.get("courseId",""))]]),
            "user_semester": np.array([[float(meta.get("semester", 0))]]),
            "user_career_id": np.array([[encoder.encode("career_id", meta.get("careerId",""))]]),
        }
        u_emb = user_tower.predict(u_feats, verbose=0)  # (1, 64)

        # Cosine similarity with all items
        scores = np.dot(all_item_embs, u_emb.T).flatten()
        top_k_idx = np.argsort(-scores)[:K]
        top_k_items = [all_iids[i] for i in top_k_idx]

        held_out = list(held_out_items)[0]

        # Hit Rate@K
        hit = 1.0 if held_out in top_k_items else 0.0
        hr_scores.append(hit)

        # Precision@K = |relevant ∩ top-K| / K
        relevant_in_topk = len(set(top_k_items) & all_relevant)
        prec_scores.append(relevant_in_topk / K)

        # Recall@K = |relevant ∩ top-K| / |all_relevant|
        rec_scores.append(relevant_in_topk / max(len(all_relevant), 1))

        # MRR
        if held_out in top_k_items:
            rank = top_k_items.index(held_out) + 1
            mrr_scores.append(1.0 / rank)
        else:
            mrr_scores.append(0.0)

        # NDCG@K
        dcg = 0.0
        for pos, iid in enumerate(top_k_items):
            rel = 1.0 if iid == held_out else 0.0
            dcg += rel / np.log2(pos + 2)
        idcg = 1.0 / np.log2(2)
        ndcg_scores.append(dcg / idcg)

    return {
        f"NDCG@{K}": np.mean(ndcg_scores) if ndcg_scores else 0,
        f"HitRate@{K}": np.mean(hr_scores) if hr_scores else 0,
        f"Precision@{K}": np.mean(prec_scores) if prec_scores else 0,
        f"Recall@{K}": np.mean(rec_scores) if rec_scores else 0,
        "MRR": np.mean(mrr_scores) if mrr_scores else 0,
        "n_users_evaluated": len(hr_scores),
    }

for k in [5, 10, 20]:
    m = compute_ranking_metrics(user_tower, item_tower, user_map, item_map,
                                user_ints, encoder, type_map, course_map, K=k)
    print(f"K={k:2d} | NDCG={m[f'NDCG@{k}']:.4f} | HR={m[f'HitRate@{k}']:.4f} | "
          f"P@{k}={m[f'Precision@{k}']:.4f} | R@{k}={m[f'Recall@{k}']:.4f} | MRR={m['MRR']:.4f} | users={m['n_users_evaluated']}")

# %% [markdown]
# ## 8. Build FAISS ANN Index for Fast Retrieval
# Precompute all item embeddings and build a FAISS index for sub-millisecond
# approximate nearest neighbor lookup at serving time.

# %%
try:
    import faiss

    # Compute all item embeddings
    all_iids = list(item_map.keys())
    item_feats = {
        "item_id": np.array([[encoder.encode("item_id", iid)] for iid in all_iids]),
        "item_type": np.array([[type_map.get(item_map[iid].get("itemType",""),0)] for iid in all_iids]),
        "item_major_id": np.array([[encoder.encode("major_id", item_map[iid].get("majorId",""))] for iid in all_iids]),
        "item_course_id": np.array([[encoder.encode("course_id", item_map[iid].get("courseId",""))] for iid in all_iids]),
        "item_semester": np.array([[float(course_map.get(item_map[iid].get("courseId",""),{}).get("semester",0))] for iid in all_iids]),
    }
    all_item_embs = item_tower.predict(item_feats, verbose=0).astype(np.float32)

    # Build FAISS index (Inner Product for cosine sim on L2-normalized vectors)
    dim = all_item_embs.shape[1]
    index = faiss.IndexFlatIP(dim)  # exact inner product (use IndexIVFFlat for >100K items)
    index.add(all_item_embs)

    # Save index + item ID mapping
    faiss.write_index(index, os.path.join(OUTPUT_DIR, "item_index.faiss"))
    with open(os.path.join(OUTPUT_DIR, "item_ids.json"), "w") as f:
        json.dump(all_iids, f)

    print(f"✅ FAISS index built: {index.ntotal} items, {dim}D embeddings")

    # Demo: retrieve top-5 for a random user
    demo_uid = list(user_map.keys())[0]
    demo_meta = user_map[demo_uid]
    u_feats = {
        "user_id": np.array([[encoder.encode("user_id", demo_uid)]]),
        "user_major_id": np.array([[encoder.encode("major_id", demo_meta.get("majorId",""))]]),
        "user_course_id": np.array([[encoder.encode("course_id", demo_meta.get("courseId",""))]]),
        "user_semester": np.array([[float(demo_meta.get("semester", 0))]]),
        "user_career_id": np.array([[encoder.encode("career_id", demo_meta.get("careerId",""))]]),
    }
    u_emb = user_tower.predict(u_feats, verbose=0).astype(np.float32)
    scores, indices = index.search(u_emb, 5)
    print(f"\nDemo — Top-5 for user {demo_uid[:8]}...")
    for rank, (idx, score) in enumerate(zip(indices[0], scores[0])):
        print(f"  #{rank+1} item={all_iids[idx][:8]}... score={score:.4f}")

except ImportError:
    print("⚠️ faiss-cpu not installed — skipping ANN index. Run: pip install faiss-cpu")

# %% [markdown]
# ## 8.1 Full MRR Evaluation on Test Set
# Evaluate MRR against ALL items (not truncated at K) for the true reciprocal rank.

# %%
def full_mrr_evaluation(user_tower, item_tower, user_map, item_map,
                        user_ints, encoder, type_map, course_map):
    """Full MRR: rank held-out item against ALL items, not just top-K."""
    all_iids = list(item_map.keys())
    item_feats = {
        "item_id": np.array([[encoder.encode("item_id", iid)] for iid in all_iids]),
        "item_type": np.array([[type_map.get(item_map[iid].get("itemType",""),0)] for iid in all_iids]),
        "item_major_id": np.array([[encoder.encode("major_id", item_map[iid].get("majorId",""))] for iid in all_iids]),
        "item_course_id": np.array([[encoder.encode("course_id", item_map[iid].get("courseId",""))] for iid in all_iids]),
        "item_semester": np.array([[float(course_map.get(item_map[iid].get("courseId",""),{}).get("semester",0))] for iid in all_iids]),
    }
    all_item_embs = item_tower.predict(item_feats, verbose=0)

    mrr_scores = []
    ranks = []
    n_total = len(all_iids)

    for uid, ints in user_ints.items():
        if len(ints) < 2: continue
        meta = user_map.get(uid, {})
        held_out = ints[-1]["itemId"]
        if held_out not in item_map: continue

        u_feats = {
            "user_id": np.array([[encoder.encode("user_id", uid)]]),
            "user_major_id": np.array([[encoder.encode("major_id", meta.get("majorId",""))]]),
            "user_course_id": np.array([[encoder.encode("course_id", meta.get("courseId",""))]]),
            "user_semester": np.array([[float(meta.get("semester", 0))]]),
            "user_career_id": np.array([[encoder.encode("career_id", meta.get("careerId",""))]]),
        }
        u_emb = user_tower.predict(u_feats, verbose=0)

        # Score against ALL items
        scores = np.dot(all_item_embs, u_emb.T).flatten()
        # Rank of held-out item (1-indexed)
        held_out_idx = all_iids.index(held_out)
        rank = int((scores >= scores[held_out_idx]).sum())  # number of items scoring >= held-out
        ranks.append(rank)
        mrr_scores.append(1.0 / rank)

    ranks_arr = np.array(ranks)
    print(f"\n{'='*60}")
    print(f"FULL MRR EVALUATION (all {n_total} items)")
    print(f"{'='*60}")
    print(f"Users evaluated: {len(mrr_scores)}")
    print(f"MRR (full):      {np.mean(mrr_scores):.4f}")
    print(f"Median rank:     {np.median(ranks_arr):.0f} / {n_total}")
    print(f"Mean rank:       {np.mean(ranks_arr):.1f} / {n_total}")
    print(f"Top-1 accuracy:  {(ranks_arr == 1).mean():.2%}")
    print(f"Top-5 accuracy:  {(ranks_arr <= 5).mean():.2%}")
    print(f"Top-10 accuracy: {(ranks_arr <= 10).mean():.2%}")
    print(f"Top-20 accuracy: {(ranks_arr <= 20).mean():.2%}")
    print(f"Top-50 accuracy: {(ranks_arr <= 50).mean():.2%}")

    # Rank distribution histogram
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    axes[0].hist(ranks_arr, bins=50, color="#4A90D9", edgecolor="white", alpha=0.8)
    axes[0].axvline(np.median(ranks_arr), color="red", linestyle="--", label=f"Median={np.median(ranks_arr):.0f}")
    axes[0].set_title("Rank Distribution of Held-Out Items")
    axes[0].set_xlabel("Rank (lower = better)")
    axes[0].set_ylabel("Count")
    axes[0].legend()

    axes[1].hist(mrr_scores, bins=50, color="#27AE60", edgecolor="white", alpha=0.8)
    axes[1].set_title("MRR Score Distribution")
    axes[1].set_xlabel("1/Rank")
    axes[1].set_ylabel("Count")
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "mrr_distribution.png"), dpi=150)
    plt.show()

    return {"MRR_full": np.mean(mrr_scores), "median_rank": float(np.median(ranks_arr)),
            "mean_rank": float(np.mean(ranks_arr)), "n_users": len(mrr_scores)}

mrr_results = full_mrr_evaluation(user_tower, item_tower, user_map, item_map,
                                   user_ints, encoder, type_map, course_map)

# %% [markdown]
# ## 8.2 Score Distribution Analysis
# Inspect how cosine similarity scores are distributed across all user-item pairs
# in the FAISS index. Healthy models show clear separation between positive and
# negative pair scores.

# %%
# Score distribution for a sample of users
print("\n" + "="*60)
print("SCORE DISTRIBUTION ANALYSIS")
print("="*60)

all_iids_dist = list(item_map.keys())
item_feats_dist = {
    "item_id": np.array([[encoder.encode("item_id", iid)] for iid in all_iids_dist]),
    "item_type": np.array([[type_map.get(item_map[iid].get("itemType",""),0)] for iid in all_iids_dist]),
    "item_major_id": np.array([[encoder.encode("major_id", item_map[iid].get("majorId",""))] for iid in all_iids_dist]),
    "item_course_id": np.array([[encoder.encode("course_id", item_map[iid].get("courseId",""))] for iid in all_iids_dist]),
    "item_semester": np.array([[float(course_map.get(item_map[iid].get("courseId",""),{}).get("semester",0))] for iid in all_iids_dist]),
}
all_item_embs_dist = item_tower.predict(item_feats_dist, verbose=0)

# Sample 30 users and compute scores against all items
sample_uids = list(user_ints.keys())[:30]
pos_scores_all, neg_scores_all = [], []

for uid in sample_uids:
    meta = user_map.get(uid, {})
    interacted = {inter["itemId"] for inter in user_ints[uid]}
    u_feats = {
        "user_id": np.array([[encoder.encode("user_id", uid)]]),
        "user_major_id": np.array([[encoder.encode("major_id", meta.get("majorId",""))]]),
        "user_course_id": np.array([[encoder.encode("course_id", meta.get("courseId",""))]]),
        "user_semester": np.array([[float(meta.get("semester", 0))]]),
        "user_career_id": np.array([[encoder.encode("career_id", meta.get("careerId",""))]]),
    }
    u_emb = user_tower.predict(u_feats, verbose=0)
    scores = np.dot(all_item_embs_dist, u_emb.T).flatten()

    for i, iid in enumerate(all_iids_dist):
        if iid in interacted:
            pos_scores_all.append(scores[i])
        else:
            neg_scores_all.append(scores[i])

pos_arr = np.array(pos_scores_all)
neg_arr = np.array(neg_scores_all)

print(f"Positive pairs: {len(pos_arr):,}")
print(f"  Mean={pos_arr.mean():.4f}  Std={pos_arr.std():.4f}  Min={pos_arr.min():.4f}  Max={pos_arr.max():.4f}")
print(f"Negative pairs: {len(neg_arr):,}")
print(f"  Mean={neg_arr.mean():.4f}  Std={neg_arr.std():.4f}  Min={neg_arr.min():.4f}  Max={neg_arr.max():.4f}")
sep = pos_arr.mean() - neg_arr.mean()
print(f"Score separation (pos_mean - neg_mean): {sep:.4f}")
print(f"Overlap ratio: {(pos_arr.min() < neg_arr.max())}")

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# Histogram: positive vs negative
axes[0].hist(neg_arr, bins=80, alpha=0.6, color="#E74C3C", label=f"Negative (n={len(neg_arr):,})", density=True)
axes[0].hist(pos_arr, bins=80, alpha=0.6, color="#27AE60", label=f"Positive (n={len(pos_arr):,})", density=True)
axes[0].axvline(pos_arr.mean(), color="#27AE60", linestyle="--", linewidth=2)
axes[0].axvline(neg_arr.mean(), color="#E74C3C", linestyle="--", linewidth=2)
axes[0].set_title("Score Distribution: Positive vs Negative Pairs")
axes[0].set_xlabel("Cosine Similarity Score")
axes[0].set_ylabel("Density")
axes[0].legend()

# Box plot (matplotlib 3.9+ uses tick_labels, boxprops must be a single dict)
bp = axes[1].boxplot([pos_arr, neg_arr], tick_labels=["Positive", "Negative"],
                     patch_artist=True)
colors = ["#27AE60", "#E74C3C"]
for patch, color in zip(bp["boxes"], colors):
    patch.set_facecolor(color)
    patch.set_alpha(0.6)
axes[1].set_title("Score Box Plot")
axes[1].set_ylabel("Cosine Similarity Score")
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "score_distribution.png"), dpi=150)
plt.show()

# %% [markdown]
# ## 8.3 Per-Major Score Distribution (KDE)
# Visualize positive vs negative score separation for EACH major.
# This reveals which majors have poor discrimination (CS/DS problem).

# %%
from scipy.stats import gaussian_kde

# Group users by major
major_users = defaultdict(list)
for uid, meta in user_map.items():
    major_users[meta.get("majorId", "?")].append(uid)

# Precompute item embeddings
all_iids_kde = list(item_map.keys())
item_feats_kde = {
    "item_id": np.array([[encoder.encode("item_id", iid)] for iid in all_iids_kde]),
    "item_type": np.array([[type_map.get(item_map[iid].get("itemType",""),0)] for iid in all_iids_kde]),
    "item_major_id": np.array([[encoder.encode("major_id", item_map[iid].get("majorId",""))] for iid in all_iids_kde]),
    "item_course_id": np.array([[encoder.encode("course_id", item_map[iid].get("courseId",""))] for iid in all_iids_kde]),
    "item_semester": np.array([[float(course_map.get(item_map[iid].get("courseId",""),{}).get("semester",0))] for iid in all_iids_kde]),
}
item_embs_kde = item_tower.predict(item_feats_kde, verbose=0)

majors_sorted = sorted(major_users.keys())
n_majors = len(majors_sorted)
fig, axes = plt.subplots(1, n_majors, figsize=(5 * n_majors, 5), sharey=True)
if n_majors == 1: axes = [axes]

print(f"\n{'='*60}")
print("PER-MAJOR SCORE DISTRIBUTION")
print(f"{'='*60}")

for ax, major_id in zip(axes, majors_sorted):
    pos_s, neg_s = [], []
    for uid in major_users[major_id][:20]:  # sample 20 per major
        meta = user_map[uid]
        interacted = {inter["itemId"] for inter in user_ints.get(uid, [])}
        u_feats = {
            "user_id": np.array([[encoder.encode("user_id", uid)]]),
            "user_major_id": np.array([[encoder.encode("major_id", meta.get("majorId",""))]]),
            "user_course_id": np.array([[encoder.encode("course_id", meta.get("courseId",""))]]),
            "user_semester": np.array([[float(meta.get("semester", 0))]]),
            "user_career_id": np.array([[encoder.encode("career_id", meta.get("careerId",""))]]),
        }
        u_emb = user_tower.predict(u_feats, verbose=0)
        scores = np.dot(item_embs_kde, u_emb.T).flatten()
        for i, iid in enumerate(all_iids_kde):
            (pos_s if iid in interacted else neg_s).append(scores[i])

    pos_a, neg_a = np.array(pos_s), np.array(neg_s)
    sep = pos_a.mean() - neg_a.mean()

    # KDE plots
    x_range = np.linspace(min(neg_a.min(), pos_a.min()) - 0.1,
                          max(neg_a.max(), pos_a.max()) + 0.1, 300)
    if len(neg_a) > 1:
        kde_neg = gaussian_kde(neg_a)
        ax.fill_between(x_range, kde_neg(x_range), alpha=0.4, color="#E74C3C", label="Negative")
    if len(pos_a) > 1:
        kde_pos = gaussian_kde(pos_a)
        ax.fill_between(x_range, kde_pos(x_range), alpha=0.4, color="#27AE60", label="Positive")
    ax.axvline(0, color="gray", linestyle=":", alpha=0.5)
    ax.axvline(pos_a.mean(), color="#27AE60", linestyle="--", alpha=0.8)
    ax.axvline(neg_a.mean(), color="#E74C3C", linestyle="--", alpha=0.8)
    ax.set_title(f"{major_id[:12]}\nsep={sep:.3f}")
    ax.set_xlabel("Cosine Sim")
    ax.legend(fontsize=7)
    print(f"  {major_id}: pos_mean={pos_a.mean():.4f} neg_mean={neg_a.mean():.4f} separation={sep:.4f}")

plt.suptitle("KDE: Positive vs Negative Score Distribution per Major", fontsize=14, y=1.02)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "kde_per_major.png"), dpi=150, bbox_inches="tight")
plt.show()

# %% [markdown]
# ## 8.4 Hard Negative Mining + Fine-Tuning
# Use the current model to find "confusing" items for each user — items with
# high similarity scores that the user did NOT interact with. These hard negatives
# force the model to learn finer-grained distinctions.

# %%
import faiss

def get_hard_negatives(user_tower, item_tower, user_map, user_ints, item_map,
                       encoder, type_map, course_map,
                       n_hard_global=4, n_hard_intra=4, n_candidates=50):
    """
    Dual-strategy hard negative mining:
      1. FAISS global: high-scoring items user didn't interact with (any major)
      2. Intra-major: same-major items user didn't interact with, ranked by score

    Why both? When user-target similarity is negative (CS/DS problem),
    FAISS returns inter-major items as "nearest" — which the model already handles.
    Intra-major negatives force the model to learn WITHIN-major distinctions.
    """
    all_iids = list(item_map.keys())
    item_feats = {
        "item_id": np.array([[encoder.encode("item_id", iid)] for iid in all_iids]),
        "item_type": np.array([[type_map.get(item_map[iid].get("itemType",""),0)] for iid in all_iids]),
        "item_major_id": np.array([[encoder.encode("major_id", item_map[iid].get("majorId",""))] for iid in all_iids]),
        "item_course_id": np.array([[encoder.encode("course_id", item_map[iid].get("courseId",""))] for iid in all_iids]),
        "item_semester": np.array([[float(course_map.get(item_map[iid].get("courseId",""),{}).get("semester",0))] for iid in all_iids]),
    }
    all_item_embs = item_tower.predict(item_feats, verbose=0).astype(np.float32)

    # Build FAISS index
    dim = all_item_embs.shape[1]
    hn_index = faiss.IndexFlatIP(dim)
    hn_index.add(all_item_embs)

    # Pre-build major → item indices for intra-major lookup
    major_to_indices = {}
    for i, iid in enumerate(all_iids):
        m = item_map[iid].get("majorId", "")
        major_to_indices.setdefault(m, []).append(i)

    hard_pairs = []
    stats = {"global": 0, "intra_major": 0}

    for uid, ints in user_ints.items():
        if not ints: continue
        meta = user_map.get(uid, {})
        interacted = {inter["itemId"] for inter in ints}
        user_major = meta.get("majorId", "")

        u_feats = {
            "user_id": np.array([[encoder.encode("user_id", uid)]]),
            "user_major_id": np.array([[encoder.encode("major_id", user_major)]]),
            "user_course_id": np.array([[encoder.encode("course_id", meta.get("courseId",""))]]),
            "user_semester": np.array([[float(meta.get("semester", 0))]]),
            "user_career_id": np.array([[encoder.encode("career_id", meta.get("careerId",""))]]),
        }
        u_emb = user_tower.predict(u_feats, verbose=0).astype(np.float32)

        # ── Strategy 1: FAISS global hard negatives ──────────────────────
        _, top_indices = hn_index.search(u_emb, n_candidates)
        count = 0
        for idx in top_indices[0]:
            neg_iid = all_iids[idx]
            if neg_iid not in interacted:
                hard_pairs.append((uid, neg_iid))
                count += 1
                stats["global"] += 1
                if count >= n_hard_global:
                    break

        # ── Strategy 2: Intra-major hard negatives ───────────────────────
        # Score all items from the SAME major, take highest-scoring non-interacted
        if user_major and user_major in major_to_indices:
            same_major_idx = major_to_indices[user_major]
            same_major_embs = all_item_embs[same_major_idx]  # (M, dim)
            scores = np.dot(same_major_embs, u_emb.T).flatten()  # (M,)

            # Sort by descending score, pick non-interacted
            ranked = np.argsort(-scores)
            count = 0
            for rank_pos in ranked:
                neg_iid = all_iids[same_major_idx[rank_pos]]
                if neg_iid not in interacted:
                    hard_pairs.append((uid, neg_iid))
                    count += 1
                    stats["intra_major"] += 1
                    if count >= n_hard_intra:
                        break

    print(f"  Hard negatives: {stats['global']} global + {stats['intra_major']} intra-major")
    return hard_pairs

# ── Iterative Hard Negative Mining: 3 rounds ─────────────────────────────────
# Each round: re-mine with UPDATED embeddings → fine-tune → repeat.
# This fixes DS regression (round 1 used stale embeddings) and pushes MRR higher.

N_ROUNDS = 3
ROUND_CONFIG = [
    # (n_hard_global, n_hard_intra, lr, epochs, hard_neg_weight)
    (4, 4, 2e-4, 15, 1.5),   # Round 1: balanced exploration
    (3, 5, 1e-4, 10, 2.0),   # Round 2: lean into intra-major (fix DS)
    (2, 6, 5e-5, 8,  2.5),   # Round 3: aggressive intra-major refinement
]

for round_idx, (n_global, n_intra, lr, ft_epochs, hn_weight) in enumerate(ROUND_CONFIG):
    print(f"\n{'='*60}")
    print(f"🔄 ROUND {round_idx+1}/{N_ROUNDS}: global={n_global}, intra={n_intra}, lr={lr:.0e}")
    print(f"{'='*60}")

    # Re-mine hard negatives with CURRENT embeddings
    hard_neg_pairs = get_hard_negatives(
        user_tower, item_tower, user_map, user_ints, item_map,
        encoder, type_map, course_map,
        n_hard_global=n_global, n_hard_intra=n_intra, n_candidates=40
    )
    print(f"✅ Mined {len(hard_neg_pairs)} hard negative pairs")

    # Build fine-tuning dataset
    ft_pairs, ft_labels, ft_weights = [], [], []

    # Original positives
    for uid, ints in user_ints.items():
        meta = user_map.get(uid, {})
        for inter in ints:
            iid = inter["itemId"]
            if iid not in item_map: continue
            ft_pairs.append(_make_pair(uid, iid, meta, item_map[iid]))
            ft_labels.append(1.0); ft_weights.append(1.0)

    # Hard negatives with escalating weight
    for uid, neg_iid in hard_neg_pairs:
        meta = user_map.get(uid, {})
        ft_pairs.append(_make_pair(uid, neg_iid, meta, item_map[neg_iid]))
        ft_labels.append(0.0); ft_weights.append(hn_weight)

    ft_features = {k: np.array([p[k] for p in ft_pairs],
                   dtype=np.float32 if "semester" in k else np.int32)
                   for k in ft_pairs[0]}
    ft_labels_arr = np.array(ft_labels, dtype=np.float32)
    ft_weights_arr = np.array(ft_weights, dtype=np.float32)

    # Balance weights
    ft_n_pos = int(ft_labels_arr.sum())
    ft_n_neg = len(ft_labels_arr) - ft_n_pos
    ft_ratio = ft_n_neg / max(ft_n_pos, 1)
    ft_balanced = np.where(ft_labels_arr == 1.0, ft_weights_arr * ft_ratio, ft_weights_arr)

    print(f"Fine-tune dataset: {len(ft_pairs)} pairs ({ft_n_pos} pos, {ft_n_neg} hard neg)")

    # Fine-tune with decaying LR per round
    ft_lr = keras.optimizers.schedules.CosineDecay(
        initial_learning_rate=lr,
        decay_steps=(len(ft_pairs) // BATCH_SIZE) * ft_epochs,
        alpha=1e-6 / lr,
    )
    model.compile(optimizer=keras.optimizers.Adam(learning_rate=ft_lr),
                  loss=keras.losses.BinaryCrossentropy(from_logits=True),
                  metrics=["accuracy"])

    ft_callbacks = [keras.callbacks.EarlyStopping(
        monitor="val_loss", patience=5, restore_best_weights=True, verbose=1
    )]

    print(f"\n🔧 Fine-tuning round {round_idx+1}...")
    ft_history = model.fit(ft_features, ft_labels_arr,
                           epochs=ft_epochs, batch_size=BATCH_SIZE,
                           validation_split=0.2, verbose=1,
                           sample_weight=ft_balanced,
                           callbacks=ft_callbacks)

    # Quick per-major check after each round
    print(f"\n📊 Round {round_idx+1} evaluation:")
    for k in [10, 50]:
        m = compute_ranking_metrics(user_tower, item_tower, user_map, item_map,
                                    user_ints, encoder, type_map, course_map, K=k)
        print(f"  K={k:2d} | HR={m[f'HitRate@{k}']:.4f} | MRR={m['MRR']:.4f}")

# %% [markdown]
# ## 8.5 Post-Fine-Tuning: Per-Major Evaluation
# Re-evaluate after hard negative mining to verify CS/DS improvement.

# %%
def analyze_by_major(user_tower, item_tower, user_map, item_map,
                     user_ints, encoder, type_map, course_map, K=50):
    """Evaluate HitRate@K and MRR broken down by user's major."""
    all_iids = list(item_map.keys())
    item_feats = {
        "item_id": np.array([[encoder.encode("item_id", iid)] for iid in all_iids]),
        "item_type": np.array([[type_map.get(item_map[iid].get("itemType",""),0)] for iid in all_iids]),
        "item_major_id": np.array([[encoder.encode("major_id", item_map[iid].get("majorId",""))] for iid in all_iids]),
        "item_course_id": np.array([[encoder.encode("course_id", item_map[iid].get("courseId",""))] for iid in all_iids]),
        "item_semester": np.array([[float(course_map.get(item_map[iid].get("courseId",""),{}).get("semester",0))] for iid in all_iids]),
    }
    all_item_embs = item_tower.predict(item_feats, verbose=0)

    results = defaultdict(lambda: {"hits": 0, "mrr_sum": 0.0, "count": 0})

    for uid, ints in user_ints.items():
        if len(ints) < 2: continue
        meta = user_map.get(uid, {})
        held_out = ints[-1]["itemId"]
        if held_out not in item_map: continue
        major = meta.get("majorId", "?")

        u_feats = {
            "user_id": np.array([[encoder.encode("user_id", uid)]]),
            "user_major_id": np.array([[encoder.encode("major_id", meta.get("majorId",""))]]),
            "user_course_id": np.array([[encoder.encode("course_id", meta.get("courseId",""))]]),
            "user_semester": np.array([[float(meta.get("semester", 0))]]),
            "user_career_id": np.array([[encoder.encode("career_id", meta.get("careerId",""))]]),
        }
        u_emb = user_tower.predict(u_feats, verbose=0)
        scores = np.dot(all_item_embs, u_emb.T).flatten()
        top_k_idx = np.argsort(-scores)[:K]
        top_k_items = [all_iids[i] for i in top_k_idx]

        r = results[major]
        r["count"] += 1
        if held_out in top_k_items:
            r["hits"] += 1
            rank = top_k_items.index(held_out) + 1
            r["mrr_sum"] += 1.0 / rank

    print(f"\n{'='*60}")
    print(f"PER-MAJOR EVALUATION (K={K})")
    print(f"{'='*60}")
    print(f"{'Major':<15} {'Users':>6} {'HR@'+str(K):>8} {'MRR':>8}")
    print("-" * 40)
    for major in sorted(results.keys()):
        r = results[major]
        hr = r["hits"] / max(r["count"], 1)
        mrr = r["mrr_sum"] / max(r["count"], 1)
        print(f"{major[:15]:<15} {r['count']:>6} {hr:>8.4f} {mrr:>8.4f}")

    return dict(results)

print("BEFORE fine-tuning:")
# (metrics already printed above in section 7)

print("\nAFTER hard negative fine-tuning:")
post_results = analyze_by_major(user_tower, item_tower, user_map, item_map,
                                user_ints, encoder, type_map, course_map, K=50)

# Also re-run standard metrics
print("\nPost-fine-tune ranking metrics:")
for k in [5, 10, 20, 50]:
    m = compute_ranking_metrics(user_tower, item_tower, user_map, item_map,
                                user_ints, encoder, type_map, course_map, K=k)
    print(f"K={k:2d} | NDCG={m[f'NDCG@{k}']:.4f} | HR={m[f'HitRate@{k}']:.4f} | "
          f"P@{k}={m[f'Precision@{k}']:.4f} | R@{k}={m[f'Recall@{k}']:.4f} | MRR={m['MRR']:.4f}")

# ── Production Artifact Export ─────────────────────────────────────────────────
import hashlib
from datetime import datetime, timezone

EXPORT_DIR = os.path.join(OUTPUT_DIR, "production_export")
os.makedirs(EXPORT_DIR, exist_ok=True)

print("="*60)
print("📦 PRODUCTION ARTIFACT EXPORT")
print("="*60)

# ── 1. Save Individual Towers (Modularized) ──────────────────────────────────
# User Tower: loaded at request time (compute user embedding on-the-fly)
# Item Tower: loaded at batch time (pre-compute all item embeddings periodically)
user_tower.save(os.path.join(EXPORT_DIR, "user_tower.keras"))
item_tower.save(os.path.join(EXPORT_DIR, "item_tower.keras"))
model.save_weights(os.path.join(EXPORT_DIR, "full_model.weights.h5"))
print("✅ Towers saved: user_tower.keras, item_tower.keras")

# ── 2. Vocab Mapping (Training-Serving Consistency) ──────────────────────────
# Backend uses this EXACT mapping to encode features identically to training.
encoder.save(os.path.join(EXPORT_DIR, "vocab.json"))
print("✅ Vocab mapping saved: vocab.json")

# ── 3. Model Configuration Metadata ─────────────────────────────────────────
# Everything the backend needs to reconstruct the encoding pipeline.
model_config = {
    "model_type": "two_tower",
    "embedding_dim": 64,
    "temperature": 15.0,
    "vocab_sizes": vocab_sizes,
    "type_map": type_map,  # {"RESOURCE": 0, "TUTORIAL": 1, "COLLECTION": 2}
    "user_features": {
        "user_id":       {"dtype": "int32", "vocab_field": "user_id"},
        "user_major_id": {"dtype": "int32", "vocab_field": "major_id"},
        "user_course_id":{"dtype": "int32", "vocab_field": "course_id"},
        "user_semester":  {"dtype": "float32", "vocab_field": None},
        "user_career_id": {"dtype": "int32", "vocab_field": "career_id"},
    },
    "item_features": {
        "item_id":       {"dtype": "int32", "vocab_field": "item_id"},
        "item_type":     {"dtype": "int32", "vocab_field": None, "mapping": "type_map"},
        "item_major_id": {"dtype": "int32", "vocab_field": "major_id"},
        "item_course_id":{"dtype": "int32", "vocab_field": "course_id"},
        "item_semester":  {"dtype": "float32", "vocab_field": None},
    },
    "normalization": "L2 (UnitNormalization on tower output)",
    "similarity": "cosine (dot product of L2-normalized vectors)",
}
with open(os.path.join(EXPORT_DIR, "model_config.json"), "w") as f:
    json.dump(model_config, f, indent=2)
print("✅ Model config saved: model_config.json")

# ── 4. Pre-computed Item Embeddings (Batch Serving) ──────────────────────────
# Item embeddings are static between re-training. Pre-compute once, serve many.
all_iids = list(item_map.keys())
item_feats_export = {
    "item_id": np.array([[encoder.encode("item_id", iid)] for iid in all_iids]),
    "item_type": np.array([[type_map.get(item_map[iid].get("itemType",""),0)] for iid in all_iids]),
    "item_major_id": np.array([[encoder.encode("major_id", item_map[iid].get("majorId",""))] for iid in all_iids]),
    "item_course_id": np.array([[encoder.encode("course_id", item_map[iid].get("courseId",""))] for iid in all_iids]),
    "item_semester": np.array([[float(course_map.get(item_map[iid].get("courseId",""),{}).get("semester",0))] for iid in all_iids]),
}
item_embs_export = item_tower.predict(item_feats_export, verbose=0).astype(np.float32)
np.save(os.path.join(EXPORT_DIR, "item_embeddings.npy"), item_embs_export)
with open(os.path.join(EXPORT_DIR, "item_ids.json"), "w") as f:
    json.dump(all_iids, f)
print(f"✅ Item embeddings saved: {item_embs_export.shape[0]} items × {item_embs_export.shape[1]}D")

# ── 5. FAISS Index (ANN Retrieval) ───────────────────────────────────────────
dim = item_embs_export.shape[1]
index = faiss.IndexFlatIP(dim)
index.add(item_embs_export)
faiss.write_index(index, os.path.join(EXPORT_DIR, "item_index.faiss"))
print(f"✅ FAISS index saved: {index.ntotal} vectors, {dim}D")

# ── 6. Final Metrics ────────────────────────────────────────────────────────
final_ranking = {}
for k in [10, 20, 50]:
    m = compute_ranking_metrics(user_tower, item_tower, user_map, item_map,
                                user_ints, encoder, type_map, course_map, K=k)
    final_ranking[f"K={k}"] = {
        "NDCG": round(m[f"NDCG@{k}"], 4),
        "HitRate": round(m[f"HitRate@{k}"], 4),
        "Precision": round(m[f"Precision@{k}"], 4),
        "Recall": round(m[f"Recall@{k}"], 4),
        "MRR": round(m["MRR"], 4),
    }

export_metrics = {
    "status": "completed",
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "model_type": "two_tower",
    "embedding_dim": 64,
    "temperature": 15.0,
    "training": {
        "initial_epochs": EPOCHS,
        "fine_tune_rounds": N_ROUNDS,
        "total_pairs": len(pairs),
        "positive_pairs": int(sum(labels)),
        "vocab_sizes": vocab_sizes,
    },
    "evaluation": final_ranking,
    "artifacts": [
        "user_tower.keras",
        "item_tower.keras",
        "full_model.weights.h5",
        "vocab.json",
        "model_config.json",
        "item_embeddings.npy",
        "item_ids.json",
        "item_index.faiss",
    ],
}
with open(os.path.join(EXPORT_DIR, "metrics.json"), "w") as f:
    json.dump(export_metrics, f, indent=2)

# ── 7. Manifest with checksums ───────────────────────────────────────────────
def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

manifest = {"version": datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S"), "files": {}}
for fname in export_metrics["artifacts"] + ["metrics.json"]:
    fpath = os.path.join(EXPORT_DIR, fname)
    manifest["files"][fname] = {
        "sha256": sha256_file(fpath),
        "size_bytes": os.path.getsize(fpath),
    }
with open(os.path.join(EXPORT_DIR, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=2)

print(f"\n{'='*60}")
print(f"📦 EXPORT COMPLETE → {EXPORT_DIR}/")
print(f"{'='*60}")
print(f"Files:")
for fname, info in manifest["files"].items():
    sz = info["size_bytes"]
    unit = "KB" if sz < 1024*1024 else "MB"
    val = sz/1024 if sz < 1024*1024 else sz/(1024*1024)
    print(f"  {fname:30s} {val:8.1f} {unit}  sha256:{info['sha256'][:12]}...")
print(f"\nEvaluation:")
for k_label, metrics in final_ranking.items():
    print(f"  {k_label}: HR={metrics['HitRate']:.4f} MRR={metrics['MRR']:.4f}")

# %% [markdown]
# ## 9. Embedding Visualization (t-SNE / PCA)
# Visualize how user and item embeddings cluster by major in 2D space.

# %%
from sklearn.manifold import TSNE
from sklearn.decomposition import PCA

# Compute all embeddings
all_uids = list(user_map.keys())
user_feats_all = {
    "user_id": np.array([[encoder.encode("user_id", uid)] for uid in all_uids]),
    "user_major_id": np.array([[encoder.encode("major_id", user_map[uid].get("majorId",""))] for uid in all_uids]),
    "user_course_id": np.array([[encoder.encode("course_id", user_map[uid].get("courseId",""))] for uid in all_uids]),
    "user_semester": np.array([[float(user_map[uid].get("semester", 0))] for uid in all_uids]),
    "user_career_id": np.array([[encoder.encode("career_id", user_map[uid].get("careerId",""))] for uid in all_uids]),
}
user_embs = user_tower.predict(user_feats_all, verbose=0)

# t-SNE on combined embeddings
combined = np.vstack([item_embs_export, user_embs])
labels_viz = (["item"] * len(all_iids)) + (["user"] * len(all_uids))
majors_viz = ([item_map[iid].get("majorId","?") for iid in all_iids]
              + [user_map[uid].get("majorId","?") for uid in all_uids])

tsne = TSNE(n_components=2, perplexity=min(30, len(combined)-1), random_state=42, n_iter=1000)
coords = tsne.fit_transform(combined)

fig, axes = plt.subplots(1, 2, figsize=(16, 7))

# Plot 1: colored by type (user vs item)
for lbl, marker, color in [("item", "o", "#4A90D9"), ("user", "^", "#E74C3C")]:
    mask = [i for i, l in enumerate(labels_viz) if l == lbl]
    axes[0].scatter(coords[mask, 0], coords[mask, 1], c=color, marker=marker,
                    alpha=0.6, s=30, label=lbl)
axes[0].set_title("t-SNE: User vs Item Embeddings")
axes[0].legend()
axes[0].set_xlabel("t-SNE 1"); axes[0].set_ylabel("t-SNE 2")

# Plot 2: colored by major
unique_majors = sorted(set(majors_viz))
cmap = plt.cm.get_cmap("tab10", len(unique_majors))
for idx, major in enumerate(unique_majors):
    mask = [i for i, m in enumerate(majors_viz) if m == major]
    axes[1].scatter(coords[mask, 0], coords[mask, 1], c=[cmap(idx)],
                    alpha=0.6, s=30, label=major[:12])
axes[1].set_title("t-SNE: Colored by Major")
axes[1].legend(fontsize=8, ncol=2)
axes[1].set_xlabel("t-SNE 1"); axes[1].set_ylabel("t-SNE 2")

plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "embedding_tsne.png"), dpi=150)
plt.show()
print(f"✅ t-SNE visualization saved to {OUTPUT_DIR}/embedding_tsne.png")

# PCA variance explained
pca = PCA(n_components=min(10, combined.shape[1]))
pca.fit(combined)
print(f"\nPCA variance explained (top 10): {[f'{v:.1%}' for v in pca.explained_variance_ratio_]}")
print(f"Cumulative: {pca.explained_variance_ratio_.cumsum()[-1]:.1%}")

# %% [markdown]
# ## 10. Download (Colab)
# The production export contains everything the backend needs:
# ```
# production_export/
# ├── user_tower.keras          ← Load at request time
# ├── item_tower.keras          ← Load at batch embedding time
# ├── full_model.weights.h5     ← Full model weights (for fine-tuning)
# ├── vocab.json                ← VocabEncoder mapping (string→int)
# ├── model_config.json         ← Feature schema, type_map, temperature
# ├── item_embeddings.npy       ← Pre-computed item vectors (N×64)
# ├── item_ids.json             ← Item ID ordering for embeddings
# ├── item_index.faiss          ← FAISS ANN index
# ├── metrics.json              ← Training + evaluation metrics
# └── manifest.json             ← SHA256 checksums for integrity
# ```
#
# Backend serving flow:
# 1. Load `user_tower.keras` + `vocab.json` + `model_config.json`
# 2. At request: encode user features → predict → get user embedding
# 3. Search `item_index.faiss` with user embedding → top-K item IDs
# 4. Re-rank with business rules (popularity, freshness, diversity)
#
# Batch item embedding refresh:
# 1. Load `item_tower.keras` + `vocab.json`
# 2. Compute embeddings for all catalog items
# 3. Rebuild FAISS index → save to `item_index.faiss` + `item_embeddings.npy`

# %%
# Uncomment to download:
# import shutil
# shutil.make_archive("two_tower_production", "zip", EXPORT_DIR)
# from google.colab import files
# files.download("two_tower_production.zip")
# # Extract to: services/recommendation-service/src/artifacts/model_YYYYMMDD/

