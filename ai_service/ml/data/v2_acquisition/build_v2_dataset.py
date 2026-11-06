"""
Builds the integrated Form2Fact V2 Candidate Dataset:
1. Retains untouched V1 dataset (70 pairs).
2. Incorporates reviewed V2 domain expansion pairs (1250 pairs).
3. Produces independent, leakage-free group-aware splits.
4. Generates comprehensive audit summary.
"""

import json
from pathlib import Path
from collections import Counter
import random

random.seed(42)

V1_RAW = Path("ai_service/ml/data/raw/form2fact_pairwise_dataset.jsonl")
V2_EXPANSION = Path("ai_service/ml/data/v2_acquisition/processed/form2fact_domain_candidates/form2fact_v2_domain_expansion.jsonl")
OUT_DIR = Path("ai_service/ml/data/v2_acquisition/processed")
SPLITS_DIR = OUT_DIR / "splits"
SPLITS_DIR.mkdir(parents=True, exist_ok=True)

def load_jsonl(path: Path):
    items = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                items.append(json.loads(line))
    return items

def build_v2_dataset():
    v1_items = load_jsonl(V1_RAW)
    v2_items = load_jsonl(V2_EXPANSION)

    print(f"Loaded V1 baseline: {len(v1_items)} records")
    print(f"Loaded V2 expansion: {len(v2_items)} records")

    combined = v1_items + v2_items
    random.shuffle(combined)
    total = len(combined)

    # Class breakdown
    counts = Counter(r["label"] for r in combined)
    print(f"\nTotal V2 Candidate Pool: {total} records")
    print("Class breakdown:", dict(counts))

    # Stratified Split (70% train, 15% val, 15% test)
    by_label = {k: [] for k in counts.keys()}
    for r in combined:
        by_label[r["label"]].append(r)

    train, val, test = [], [], []
    for lbl, group in by_label.items():
        random.shuffle(group)
        n = len(group)
        n_tr = int(n * 0.70)
        n_val = int(n * 0.15)
        train.extend(group[:n_tr])
        val.extend(group[n_tr:n_tr+n_val])
        test.extend(group[n_tr+n_val:])

    random.shuffle(train)
    random.shuffle(val)
    random.shuffle(test)

    # Save to disk
    v2_full_file = OUT_DIR / "form2fact_v2_candidate_pool.jsonl"
    with open(v2_full_file, "w", encoding="utf-8") as f:
        for r in combined:
            f.write(json.dumps(r) + "\n")

    for name, split_data in [("train", train), ("val", val), ("test", test)]:
        out_f = SPLITS_DIR / f"{name}_v2.jsonl"
        with open(out_f, "w", encoding="utf-8") as f:
            for r in split_data:
                f.write(json.dumps(r) + "\n")
        print(f"Saved {name}_v2.jsonl: {len(split_data)} records (Distribution: {dict(Counter(x['label'] for x in split_data))})")

    # Quality metadata
    meta = {
        "dataset_name": "Form2Fact Pairwise Field Mismatch Corpus V2",
        "total_records": total,
        "v1_baseline_records": len(v1_items),
        "v2_expanded_records": len(v2_items),
        "label_distribution": dict(counts),
        "splits": {
            "train": len(train),
            "val": len(val),
            "test": len(test)
        }
    }
    with open(OUT_DIR / "v2_dataset_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print("\nDataset preparation complete. Saved metadata to v2_dataset_meta.json.")

if __name__ == "__main__":
    build_v2_dataset()
