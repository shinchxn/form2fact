"""
Form2Fact ML Training Pipeline with Hybrid Feature Assembly.
Extracts:
1. 1536-dim dense semantic embeddings [u, v, |u - v|, u * v]
2. 8-dim deterministic/heuristic alignment features:
   - exact_match (binary)
   - token_jaccard (float [0, 1])
   - is_claim_missing (binary)
   - is_evidence_missing (binary)
   - is_ocr_degraded (binary)
   - is_numeric_diff (binary)
   - numeric_delta_ratio (float)
   - field_compatibility (binary)
This combined representation guarantees accurate learning on small & large datasets alike.
"""

import json
from pathlib import Path
import numpy as np
from sklearn.metrics import classification_report, accuracy_score, f1_score
from sklearn.linear_model import LogisticRegression

from ai_service.ml.models.feature_extractor import PairwiseFeatureExtractor
from ai_service.ml.models.classifier_head import LABEL_NAMES, LABEL_TO_INT
from ai_service.ml.preprocessing.pipeline import (
    normalize_text, is_missing_value, is_ocr_degraded, extract_numeric
)

ARTIFACTS_DIR = Path(__file__).parents[1] / "artifacts"
SPLITS_DIR = Path(__file__).parents[1] / "data" / "splits"
REPORTS_DIR = Path(__file__).parents[1] / "data" / "reports"

ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

def compute_tabular_features(item: dict) -> list:
    c_raw = item.get("claim_value") or ""
    e_raw = item.get("evidence_value") or ""
    
    c_norm = normalize_text(c_raw)
    e_norm = normalize_text(e_raw)
    
    exact = 1.0 if (c_norm and c_norm == e_norm) else 0.0
    
    tokens_c = set(c_norm.split())
    tokens_e = set(e_norm.split())
    if tokens_c or tokens_e:
        jaccard = len(tokens_c.intersection(tokens_e)) / len(tokens_c.union(tokens_e))
    else:
        jaccard = 0.0
        
    c_miss = 1.0 if is_missing_value(c_raw) else 0.0
    e_miss = 1.0 if is_missing_value(e_raw) else 0.0
    ocr_bad = 1.0 if (is_ocr_degraded(c_raw) or is_ocr_degraded(e_raw)) else 0.0
    
    c_num = extract_numeric(c_raw)
    e_num = extract_numeric(e_raw)
    if c_num is not None and e_num is not None:
        num_diff = 1.0 if abs(c_num - e_num) > 0.05 else 0.0
        denom = max(abs(c_num), abs(e_num), 1.0)
        num_ratio = min(abs(c_num - e_num) / denom, 10.0)
    else:
        num_diff = 0.0
        num_ratio = 0.0
        
    compat = 0.0 if item.get("field_type") == "not_comparable" else 1.0

    return [exact, jaccard, c_miss, e_miss, ocr_bad, num_diff, num_ratio, compat]

def load_split(split_name: str):
    file_path = SPLITS_DIR / f"{split_name}.jsonl"
    claims = []
    evidences = []
    tabular = []
    labels = []
    raw_items = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            item = json.loads(line)
            raw_items.append(item)
            c_val = item.get("claim_value") or "[MISSING]"
            e_val = item.get("evidence_value") or "[MISSING]"
            c_text = f"Field: {item.get('field_name')} | Type: {item.get('field_type')} | Claim: {c_val}"
            e_text = f"Field: {item.get('field_name')} | Type: {item.get('field_type')} | Evidence: {e_val}"
            claims.append(c_text)
            evidences.append(e_text)
            tabular.append(compute_tabular_features(item))
            labels.append(item["label_id"])
    return claims, evidences, np.array(tabular, dtype=np.float32), np.array(labels, dtype=np.int64), raw_items

def run_training():
    print("=== Step 1: Loading Dataset Splits ===")
    train_claims, train_evidences, tab_train, y_train, _ = load_split("train")
    val_claims, val_evidences, tab_val, y_val, _ = load_split("val")
    test_claims, test_evidences, tab_test, y_test, _ = load_split("test")
    print(f"Loaded: train={len(y_train)}, val={len(y_val)}, test={len(y_test)}")

    print("\n=== Step 2: Extracting Pairwise Semantic Embeddings ===")
    extractor = PairwiseFeatureExtractor()
    emb_train = extractor.encode_pairs(train_claims, train_evidences)
    emb_val = extractor.encode_pairs(val_claims, val_evidences)
    emb_test = extractor.encode_pairs(test_claims, test_evidences)

    # Stack dense embeddings with tabular alignment signals
    X_train = np.hstack([emb_train, tab_train])
    X_val = np.hstack([emb_val, tab_val])
    X_test = np.hstack([emb_test, tab_test])
    print(f"Combined feature matrix: train={X_train.shape}, val={X_val.shape}, test={X_test.shape}")

    print("\n=== Step 3: Training Hybrid Classifier Head with Class Weighting ===")
    clf = LogisticRegression(
        C=1.0,
        class_weight='balanced',
        max_iter=500,
        random_state=42,
        solver='lbfgs'
    )
    clf.fit(X_train, y_train)

    print("\n=== Step 4: Evaluating on Validation Split ===")
    y_val_pred = clf.predict(X_val)
    val_acc = accuracy_score(y_val, y_val_pred)
    val_macro_f1 = f1_score(y_val, y_val_pred, average='macro', zero_division=0)
    print(f"Validation Accuracy: {val_acc:.4f}")
    print(f"Validation Macro F1: {val_macro_f1:.4f}")

    target_names = [LABEL_NAMES[i] for i in range(len(LABEL_NAMES))]
    print("\nValidation Classification Report:")
    print(classification_report(y_val, y_val_pred, labels=list(range(len(LABEL_NAMES))), target_names=target_names, zero_division=0))

    print("\n=== Step 5: Evaluating on Held-Out Test Split ===")
    y_test_pred = clf.predict(X_test)
    test_acc = accuracy_score(y_test, y_test_pred)
    test_macro_f1 = f1_score(y_test, y_test_pred, average='macro', zero_division=0)
    print(f"Test Set Accuracy: {test_acc:.4f}")
    print(f"Test Set Macro F1: {test_macro_f1:.4f}")
    test_report_dict = classification_report(
        y_test, y_test_pred,
        labels=list(range(len(LABEL_NAMES))),
        target_names=target_names,
        output_dict=True,
        zero_division=0
    )
    print("\nTest Set Classification Report:")
    print(classification_report(y_test, y_test_pred, labels=list(range(len(LABEL_NAMES))), target_names=target_names, zero_division=0))

    print("\n=== Step 6: Exporting Trained Artifacts ===")
    import pickle
    weights_path = ARTIFACTS_DIR / "pairwise_classifier_weights.pkl"
    with open(weights_path, "wb") as f:
        pickle.dump(clf, f)
    print(f"Saved classifier head weights to: {weights_path}")

    meta = {
        "model_version": "form2fact-hybrid-pairwise-v2.0-ml",
        "embedding_backbone": "sentence-transformers/all-MiniLM-L6-v2",
        "dense_dim": int(emb_train.shape[1]),
        "tabular_dim": int(tab_train.shape[1]),
        "total_feature_dim": int(X_train.shape[1]),
        "classes": LABEL_NAMES,
        "validation_accuracy": round(float(val_acc), 4),
        "validation_macro_f1": round(float(val_macro_f1), 4),
        "test_accuracy": round(float(test_acc), 4),
        "test_macro_f1": round(float(test_macro_f1), 4)
    }
    config_path = ARTIFACTS_DIR / "model_config.json"
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(f"Saved model configuration to: {config_path}")

    # Save training report
    report_path = REPORTS_DIR / "training_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump({
            "metrics": meta,
            "test_report": test_report_dict
        }, f, indent=2)
    print(f"Saved training report to: {report_path}")

if __name__ == "__main__":
    run_training()
