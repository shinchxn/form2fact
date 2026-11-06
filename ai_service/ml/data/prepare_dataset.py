"""
Form2Fact Dataset Preparation Pipeline

Loads, validates, preprocesses and splits the pairwise classification dataset.
Produces stratified train/validation/test splits with leakage prevention.

Usage:
    python -m ai_service.ml.data.prepare_dataset
"""

import json
import hashlib
import random
from pathlib import Path
from typing import Optional
from collections import Counter

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

RANDOM_SEED = 42
TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15

LABEL_NAMES = ['MATCH', 'MISMATCH', 'MISSING', 'UNCERTAIN', 'NOT_COMPARABLE']
LABEL_TO_INT = {label: i for i, label in enumerate(LABEL_NAMES)}
INT_TO_LABEL = {i: label for label, i in LABEL_TO_INT.items()}

RAW_DIR = Path(__file__).parent / 'raw'
PROCESSED_DIR = Path(__file__).parent / 'processed'
SPLITS_DIR = Path(__file__).parent / 'splits'
REPORTS_DIR = Path(__file__).parent / 'reports'

for d in [PROCESSED_DIR, SPLITS_DIR, REPORTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Loading and validation
# ---------------------------------------------------------------------------

def load_jsonl(path: Path) -> list[dict]:
    """Load a JSONL file, returning a list of records."""
    records = []
    with open(path, 'r', encoding='utf-8') as f:
        for lineno, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
                records.append(record)
            except json.JSONDecodeError as e:
                print(f"WARNING: Skipping malformed JSON at line {lineno}: {e}")
    return records


def validate_record(record: dict) -> Optional[str]:
    """
    Validate a single dataset record.
    Returns an error message string if invalid, else None.
    """
    required_top = ['pair_id', 'field_name', 'field_type', 'label', 'claim']
    for field in required_top:
        if field not in record:
            return f"Missing required field: {field}"

    if record['label'] not in LABEL_NAMES:
        return f"Invalid label: {record['label']!r}. Must be one of {LABEL_NAMES}"

    claim = record.get('claim', {})
    if not isinstance(claim, dict):
        return "claim must be a dict"
    if not claim.get('raw_value', '').strip() and record['label'] != 'MISSING':
        return "claim.raw_value is empty but label is not MISSING"

    return None


def compute_fingerprint(record: dict) -> str:
    """Compute a content hash for near-duplicate detection."""
    claim_val = (record.get('claim') or {}).get('raw_value', '')
    ev_val = (record.get('evidence') or {}).get('raw_value', '') if record.get('evidence') else ''
    key = f"{record['field_name']}|{claim_val}|{ev_val}|{record['label']}"
    return hashlib.md5(key.lower().strip().encode()).hexdigest()


# ---------------------------------------------------------------------------
# Dataset building
# ---------------------------------------------------------------------------

def build_processed_record(raw: dict) -> dict:
    """
    Transform a raw record into the processed format used for training.

    Adds:
      - label_id (integer class index)
      - model_text (combined input string for the ML model)
      - normalized claim/evidence values
      - fingerprint for deduplication
    """
    from ai_service.ml.preprocessing.pipeline import (
        normalize_text, normalize_date, extract_numeric,
        is_missing_value, is_ocr_degraded, build_model_text,
        FieldInput, PairInput
    )

    claim_raw = raw['claim']
    ev_raw = raw.get('evidence')

    claim = FieldInput(
        field_name=raw['field_name'],
        field_label=raw.get('field_label', raw['field_name']),
        raw_value=claim_raw.get('raw_value', ''),
        context=claim_raw.get('context'),
        document_type=claim_raw.get('document_type'),
        extraction_confidence=claim_raw.get('extraction_confidence', 1.0)
    )

    evidence = None
    if ev_raw and ev_raw.get('raw_value', '').strip():
        evidence = FieldInput(
            field_name=raw['field_name'],
            field_label=raw.get('field_label', raw['field_name']),
            raw_value=ev_raw.get('raw_value', ''),
            context=ev_raw.get('context'),
            document_type=ev_raw.get('document_type'),
            extraction_confidence=ev_raw.get('extraction_confidence', 1.0)
        )

    pair = PairInput(
        claim=claim,
        evidence=evidence,
        field_type=raw.get('field_type', 'generic'),
        domain=raw.get('domain', 'aicte')
    )

    model_text = build_model_text(pair)
    fingerprint = compute_fingerprint(raw)

    return {
        'pair_id': raw['pair_id'],
        'field_name': raw['field_name'],
        'field_type': raw['field_type'],
        'domain': raw.get('domain', 'aicte'),
        'label': raw['label'],
        'label_id': LABEL_TO_INT[raw['label']],
        'model_text': model_text,
        'claim_value': claim_raw.get('raw_value', ''),
        'evidence_value': (ev_raw or {}).get('raw_value', ''),
        'claim_context': claim_raw.get('context', ''),
        'evidence_context': (ev_raw or {}).get('context', ''),
        'claim_doc_type': claim_raw.get('document_type', ''),
        'evidence_doc_type': (ev_raw or {}).get('document_type', ''),
        'claim_confidence': claim_raw.get('extraction_confidence', 1.0),
        'evidence_confidence': (ev_raw or {}).get('extraction_confidence', 0.0),
        'data_origin': raw.get('data_origin', 'synthetic'),
        'annotation_status': raw.get('annotation_status', 'reviewed'),
        'fingerprint': fingerprint
    }


# ---------------------------------------------------------------------------
# Splitting
# ---------------------------------------------------------------------------

def stratified_split(
    records: list[dict],
    train_ratio: float = TRAIN_RATIO,
    val_ratio: float = VAL_RATIO,
    seed: int = RANDOM_SEED
) -> tuple[list[dict], list[dict], list[dict]]:
    """
    Stratified train/val/test split by label.
    Uses fixed random seed for reproducibility.
    """
    rng = random.Random(seed)

    by_label: dict[str, list[dict]] = {label: [] for label in LABEL_NAMES}
    for rec in records:
        label = rec['label']
        by_label[label].append(rec)

    train, val, test = [], [], []

    for label, group in by_label.items():
        rng.shuffle(group)
        n = len(group)
        n_train = max(1, int(n * train_ratio))
        n_val = max(1, int(n * val_ratio))
        # Remaining goes to test
        train.extend(group[:n_train])
        val.extend(group[n_train:n_train + n_val])
        test.extend(group[n_train + n_val:])

    # Shuffle each split to avoid label ordering
    rng.shuffle(train)
    rng.shuffle(val)
    rng.shuffle(test)

    return train, val, test


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

def deduplicate(records: list[dict]) -> tuple[list[dict], int]:
    """Remove exact duplicates by content fingerprint. Returns (deduped, removed_count)."""
    seen = set()
    result = []
    removed = 0
    for rec in records:
        fp = rec['fingerprint']
        if fp in seen:
            removed += 1
        else:
            seen.add(fp)
            result.append(rec)
    return result, removed


# ---------------------------------------------------------------------------
# Quality report
# ---------------------------------------------------------------------------

def generate_quality_report(
    all_records: list[dict],
    train: list[dict],
    val: list[dict],
    test: list[dict],
    duplicates_removed: int,
    validation_errors: list[str]
) -> dict:
    """Generate a dataset quality report."""
    total = len(all_records)
    label_dist = Counter(r['label'] for r in all_records)
    domain_dist = Counter(r['domain'] for r in all_records)
    type_dist = Counter(r['field_type'] for r in all_records)
    origin_dist = Counter(r['data_origin'] for r in all_records)

    return {
        'total_records': total,
        'duplicates_removed': duplicates_removed,
        'validation_errors': len(validation_errors),
        'label_distribution': dict(label_dist),
        'domain_distribution': dict(domain_dist),
        'field_type_distribution': dict(type_dist),
        'data_origin_distribution': dict(origin_dist),
        'splits': {
            'train': len(train),
            'validation': len(val),
            'test': len(test),
        },
        'split_label_distribution': {
            'train': dict(Counter(r['label'] for r in train)),
            'validation': dict(Counter(r['label'] for r in val)),
            'test': dict(Counter(r['label'] for r in test)),
        }
    }


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def prepare_dataset(raw_path: Optional[Path] = None) -> dict:
    """
    Full dataset preparation pipeline.

    1. Load raw JSONL.
    2. Validate records.
    3. Build processed records.
    4. Deduplicate.
    5. Stratified split.
    6. Save processed files and splits.
    7. Generate quality report.

    Returns the quality report dict.
    """
    if raw_path is None:
        raw_path = RAW_DIR / 'form2fact_pairwise_dataset.jsonl'

    print(f"Loading raw dataset: {raw_path}")
    raw_records = load_jsonl(raw_path)
    print(f"  Loaded {len(raw_records)} raw records")

    # Validate
    validation_errors = []
    valid_records = []
    for rec in raw_records:
        err = validate_record(rec)
        if err:
            validation_errors.append(f"{rec.get('pair_id', '?')}: {err}")
            print(f"  VALIDATION ERROR: {rec.get('pair_id', '?')}: {err}")
        else:
            valid_records.append(rec)

    print(f"  Valid: {len(valid_records)}, Errors: {len(validation_errors)}")

    # Process
    processed = [build_processed_record(r) for r in valid_records]

    # Deduplicate
    processed, dupes_removed = deduplicate(processed)
    print(f"  Deduplication: removed {dupes_removed} exact duplicates, {len(processed)} remain")

    # Check all 5 classes present
    present_labels = set(r['label'] for r in processed)
    missing_labels = set(LABEL_NAMES) - present_labels
    if missing_labels:
        print(f"  WARNING: Missing class representation: {missing_labels}")

    # Split
    train, val, test = stratified_split(processed)
    print(f"  Split: train={len(train)}, val={len(val)}, test={len(test)}")

    # Save processed full set
    full_path = PROCESSED_DIR / 'form2fact_pairwise_processed.jsonl'
    with open(full_path, 'w', encoding='utf-8') as f:
        for rec in processed:
            f.write(json.dumps(rec) + '\n')
    print(f"  Saved processed: {full_path}")

    # Save splits
    for split_name, split_data in [('train', train), ('val', val), ('test', test)]:
        split_path = SPLITS_DIR / f'{split_name}.jsonl'
        with open(split_path, 'w', encoding='utf-8') as f:
            for rec in split_data:
                f.write(json.dumps(rec) + '\n')
        print(f"  Saved {split_name}: {split_path} ({len(split_data)} records)")

    # Save label map
    label_map_path = PROCESSED_DIR / 'label_map.json'
    with open(label_map_path, 'w', encoding='utf-8') as f:
        json.dump({'label_to_id': LABEL_TO_INT, 'id_to_label': INT_TO_LABEL}, f, indent=2)

    # Quality report
    report = generate_quality_report(processed, train, val, test, dupes_removed, validation_errors)
    report_path = REPORTS_DIR / 'dataset_quality_report.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    print(f"  Quality report: {report_path}")

    return report


if __name__ == '__main__':
    report = prepare_dataset()
    print("\n=== Dataset Quality Report ===")
    print(json.dumps(report, indent=2))

