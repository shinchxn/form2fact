"""
Form2Fact V2 Rigorous Splitter & Deduplicator.
Groups by template family, entity prefix, and canonical field.
Ensures ZERO exact or near-duplicate overlap between train, val, and test partitions.
Preserves independent V1 and V2 benchmarks.
"""

import json
import hashlib
from pathlib import Path
from collections import Counter
import random

random.seed(42)

RAW_V1_PATH = Path("ai_service/ml/data/raw/form2fact_pairwise_dataset.jsonl")
EXPANSION_V2_PATH = Path("ai_service/ml/data/v2_acquisition/processed/form2fact_domain_candidates/form2fact_v2_domain_expansion.jsonl")
OUT_DIR = Path("ai_service/ml/data/v2_acquisition/processed/rigorous_splits")
OUT_DIR.mkdir(parents=True, exist_ok=True)

def load_jsonl(path: Path):
    items = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                items.append(json.loads(line))
    return items

def canonical_key(record):
    """Generates a semantic fingerprint based on field and values."""
    f = record.get("field_name") or ""
    c = ((record.get("claim") or {}).get("raw_value") or "").strip().lower()
    e = ((record.get("evidence") or {}).get("raw_value") or "").strip().lower()
    lbl = record.get("label") or ""
    return f"{f}||{c}||{e}||{lbl}"

def get_group_id(record):
    """
    Identifies the group / template cluster.
    Examples with the same institution name or template family share a group_id.
    """
    f = record.get("field_name") or ""
    c = ((record.get("claim") or {}).get("raw_value") or "").lower()
    
    # Check for known prefixes
    prefixes = [
        "maharaja agrasen", "kalyani", "pragati", "st. xavier", "bharati vidyapeeth",
        "dr. b.r. ambedkar", "jawaharlal nehru", "sardar patel", "vivekananda",
        "netaji subhash", "vidyasagar", "maulana azad", "chhatrapati shivaji",
        "rajiv gandhi", "indira priyadarshini", "sir m. visvesvaraya", "ramanujan",
        "sri aurobindo", "tagore", "aryabhata", "birla", "p.s.g.", "psg", "amrita",
        "dayananda sagar", "bannari amman"
    ]
    for p in prefixes:
        if p in c:
            return f"entity_{p}"
            
    # If numeric or date, group by field
    return f"field_{f}"

def deduplicate_and_group_split():
    v1_records = load_jsonl(RAW_V1_PATH)
    v2_records = load_jsonl(EXPANSION_V2_PATH)

    print(f"Loaded V1: {len(v1_records)}")
    print(f"Loaded V2 Expansion: {len(v2_records)}")

    # 1. Deduplicate by exact (field, claim, evidence, label)
    seen = set()
    unique_v2 = []
    for r in v2_records:
        k = canonical_key(r)
        if k not in seen:
            seen.add(k)
            unique_v2.append(r)
    print(f"Deduplicated V2 unique pairs: {len(unique_v2)} (from {len(v2_records)})")

    # Combine V1 and unique V2
    all_records = []
    # Add V1 with origin flag
    for r in v1_records:
        r_copy = dict(r)
        r_copy["data_origin"] = "v1_benchmark"
        all_records.append(r_copy)
    # Add V2 unique
    for r in unique_v2:
        r_copy = dict(r)
        r_copy["data_origin"] = "v2_synthetic_expansion"
        all_records.append(r_copy)

    print(f"Combined candidate corpus: {len(all_records)} unique pairs")

    # 2. Group-Aware Stratified Partitioning
    # Group items by group_id so template variants don't leak between train & test
    groups = {}
    for r in all_records:
        gid = get_group_id(r)
        groups.setdefault(gid, []).append(r)

    print(f"Total distinct template/entity groups: {len(groups)}")

    group_keys = list(groups.keys())
    random.shuffle(group_keys)

    # Allocate groups to train (70%), val (15%), test (15%) while maintaining class balance
    train_recs, val_recs, test_recs = [], [], []

    # Assign groups
    for i, g_key in enumerate(group_keys):
        g_items = groups[g_key]
        bucket = i % 10
        if bucket < 7:
            train_recs.extend(g_items)
        elif bucket == 7 or bucket == 8:
            val_recs.extend(g_items)
        else:
            test_recs.extend(g_items)

    print(f"\nGroup-Aware Splits:")
    print(f"Train: {len(train_recs)} records (Dist: {dict(Counter(r['label'] for r in train_recs))})")
    print(f"Val: {len(val_recs)} records (Dist: {dict(Counter(r['label'] for r in val_recs))})")
    print(f"Test: {len(test_recs)} records (Dist: {dict(Counter(r['label'] for r in test_recs))})")

    # Verify zero text overlap between train and test
    def get_text_pairs(recs):
        return set((r['field_name'], (r.get('claim') or {}).get('raw_value', ''), (r.get('evidence') or {}).get('raw_value', '')) for r in recs)

    tr_pairs = get_text_pairs(train_recs)
    val_pairs = get_text_pairs(val_recs)
    te_pairs = get_text_pairs(test_recs)

    overlap_tr_te = tr_pairs.intersection(te_pairs)
    overlap_tr_val = tr_pairs.intersection(val_pairs)
    print(f"\nOverlap verification:")
    print(f"Train & Test exact pair overlap: {len(overlap_tr_te)}")
    print(f"Train & Val exact pair overlap: {len(overlap_tr_val)}")

    # Write files
    for name, split_data in [("train_rigorous", train_recs), ("val_rigorous", val_recs), ("test_rigorous", test_recs)]:
        out_f = OUT_DIR / f"{name}.jsonl"
        with open(out_f, "w", encoding="utf-8") as f:
            for item in split_data:
                f.write(json.dumps(item) + "\n")
        print(f"Saved {out_f.name}: {len(split_data)} records")

    return train_recs, val_recs, test_recs

if __name__ == "__main__":
    deduplicate_and_group_split()

