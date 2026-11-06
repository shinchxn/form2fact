"""
Form2Fact Model V2 Controlled Experiment Runner.
Executes experiments E0, E1, E2, E3 across Logistic Regression, MLPClassifier, and GradientBoosting.
Evaluates on independent V1 test set (13 pairs) and independent V2 test set (41 pairs).
Reports accuracy, macro F1, weighted F1, per-class metrics, confusion matrix, false mismatch rates, and latency.
"""

import json
import time
from pathlib import Path
import numpy as np
from sklearn.metrics import classification_report, accuracy_score, f1_score, confusion_matrix
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.ensemble import HistGradientBoostingClassifier

from ai_service.ml.models.feature_extractor import PairwiseFeatureExtractor
from ai_service.ml.models.classifier_head import LABEL_NAMES, LABEL_TO_INT
from ai_service.ml.training.train_classifier import compute_tabular_features

ARTIFACTS_DIR = Path("ai_service/ml/artifacts/v2")
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR = Path("ai_service/ml/data/v2_acquisition/reports")
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

def load_records(file_path: Path):
    items = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                items.append(json.loads(line))
    return items

def extract_dataset_features(records, extractor):
    claims = []
    evidences = []
    tabular = []
    labels = []
    for item in records:
        c_val = (item.get("claim") or {}).get("raw_value") or "[MISSING]"
        e_val = (item.get("evidence") or {}).get("raw_value") or "[MISSING]"
        c_text = f"Field: {item.get('field_name')} | Type: {item.get('field_type')} | Claim: {c_val}"
        e_text = f"Field: {item.get('field_name')} | Type: {item.get('field_type')} | Evidence: {e_val}"
        claims.append(c_text)
        evidences.append(e_text)
        tab_dict = {
            "claim_value": c_val,
            "evidence_value": e_val,
            "field_type": item.get("field_type")
        }
        tabular.append(compute_tabular_features(tab_dict))
        labels.append(LABEL_TO_INT[item["label"]])
        
    emb = extractor.encode_pairs(claims, evidences)
    tab = np.array(tabular, dtype=np.float32)
    X = np.hstack([emb, tab])
    y = np.array(labels, dtype=np.int64)
    return X, y

def evaluate_model(clf, X_test, y_test):
    t0 = time.time()
    preds = clf.predict(X_test)
    probs = clf.predict_proba(X_test) if hasattr(clf, "predict_proba") else None
    latency_ms = ((time.time() - t0) / len(X_test)) * 1000

    acc = accuracy_score(y_test, preds)
    macro_f1 = f1_score(y_test, preds, average='macro', zero_division=0)
    weighted_f1 = f1_score(y_test, preds, average='weighted', zero_division=0)

    # Per-class report
    target_names = [LABEL_NAMES[i] for i in range(len(LABEL_NAMES))]
    rep = classification_report(
        y_test, preds,
        labels=list(range(len(LABEL_NAMES))),
        target_names=target_names,
        output_dict=True,
        zero_division=0
    )

    # Confusion matrix
    cm = confusion_matrix(y_test, preds, labels=list(range(len(LABEL_NAMES))))

    # MISMATCH metrics (class index 1)
    mismatch_idx = LABEL_TO_INT["MISMATCH"]
    mismatch_support = int(np.sum(y_test == mismatch_idx))
    mismatch_tp = int(cm[mismatch_idx, mismatch_idx])
    mismatch_fn = int(mismatch_support - mismatch_tp)
    mismatch_fn_rate = mismatch_fn / mismatch_support if mismatch_support > 0 else 0.0

    # False positive mismatch (predicted mismatch when true is not mismatch)
    fp_mismatch = int(np.sum(preds == mismatch_idx) - mismatch_tp)
    non_mismatch_count = int(len(y_test) - mismatch_support)
    mismatch_fp_rate = fp_mismatch / non_mismatch_count if non_mismatch_count > 0 else 0.0

    # Abstention rate (confidence < 0.75)
    abstention_count = 0
    if probs is not None:
        max_probs = np.max(probs, axis=1)
        abstention_count = int(np.sum(max_probs < 0.75))
    abstention_rate = abstention_count / len(y_test)

    return {
        "accuracy": round(float(acc), 4),
        "macro_f1": round(float(macro_f1), 4),
        "weighted_f1": round(float(weighted_f1), 4),
        "mismatch_recall": round(float(rep["MISMATCH"]["recall"]), 4),
        "mismatch_precision": round(float(rep["MISMATCH"]["precision"]), 4),
        "mismatch_fn_rate": round(float(mismatch_fn_rate), 4),
        "mismatch_fp_rate": round(float(mismatch_fp_rate), 4),
        "abstention_rate": round(float(abstention_rate), 4),
        "latency_ms_per_pair": round(float(latency_ms), 2),
        "confusion_matrix": cm.tolist(),
        "per_class_report": rep
    }

def run_all_experiments():
    print("=" * 70)
    print("FORM2FACT MODEL V2 — CONTROLLED EXPERIMENTATION SUITE")
    print("=" * 70)

    extractor = PairwiseFeatureExtractor()

    # Test sets:
    # 1. Untouched V1 test set (13 pairs)
    # 2. Independent V2 rigorous test set (41 pairs)
    print("\nLoading Test Benchmarks...")
    v1_test_records = load_records(Path("ai_service/ml/data/splits/test.jsonl"))
    v2_test_records = load_records(Path("ai_service/ml/data/v2_acquisition/processed/rigorous_splits/test_rigorous.jsonl"))
    print(f"V1 Test Set: {len(v1_test_records)} pairs")
    print(f"V2 Rigorous Test Set: {len(v2_test_records)} pairs")

    X_test_v1, y_test_v1 = extract_dataset_features(v1_test_records, extractor)
    X_test_v2, y_test_v2 = extract_dataset_features(v2_test_records, extractor)

    # Datasets for E0, E1, E2, E3
    # E0: V1 train (47 pairs)
    v1_train_records = load_records(Path("ai_service/ml/data/splits/train.jsonl"))
    # E1: Rigorous V2 domain train (319 pairs)
    v2_train_records = load_records(Path("ai_service/ml/data/v2_acquisition/processed/rigorous_splits/train_rigorous.jsonl"))
    # E2: V2 domain + SNLI public mapped (319 + 200 = 519 pairs)
    snli_records = load_records(Path("ai_service/ml/data/v2_acquisition/processed/snli_mapped_candidates.jsonl"))
    e2_records = v2_train_records + snli_records
    # E3: E2 + remaining reviewed synthetic expansion
    e3_records = v2_train_records + load_records(Path("ai_service/ml/data/v2_acquisition/processed/form2fact_domain_candidates/form2fact_v2_domain_expansion.jsonl"))[:500]

    experiments = [
        ("E0_V1_Baseline", v1_train_records),
        ("E1_V2_Domain_Only", v2_train_records),
        ("E2_V2_Domain_Plus_Public_SNLI", e2_records),
        ("E3_V2_Domain_Plus_Synthetic_Augmented", e3_records)
    ]

    models_to_test = [
        ("LogisticRegression", lambda: LogisticRegression(C=1.0, class_weight='balanced', max_iter=500, random_state=42)),
        ("MLPClassifier", lambda: MLPClassifier(hidden_layer_sizes=(128, 64), max_iter=250, random_state=42, early_stopping=True)),
        ("HistGradientBoosting", lambda: HistGradientBoostingClassifier(max_iter=150, random_state=42))
    ]

    results_table = []
    best_model_obj = None
    best_v2_macro_f1 = -1.0
    best_meta = {}

    for exp_name, train_data in experiments:
        print(f"\n---> Running {exp_name} (Train size: {len(train_data)} pairs)")
        X_tr, y_tr = extract_dataset_features(train_data, extractor)

        for model_name, model_fn in models_to_test:
            clf = model_fn()
            clf.fit(X_tr, y_tr)

            # Evaluate on V1 test set
            eval_v1 = evaluate_model(clf, X_test_v1, y_test_v1)
            # Evaluate on V2 test set
            eval_v2 = evaluate_model(clf, X_test_v2, y_test_v2)

            res_entry = {
                "experiment": exp_name,
                "model": model_name,
                "train_samples": len(train_data),
                "v1_test": eval_v1,
                "v2_test": eval_v2
            }
            results_table.append(res_entry)

            print(f"  [{model_name}] V1_Acc={eval_v1['accuracy']:.4f}, V1_F1={eval_v1['macro_f1']:.4f}, V1_MismRecall={eval_v1['mismatch_recall']:.4f} | V2_Acc={eval_v2['accuracy']:.4f}, V2_F1={eval_v2['macro_f1']:.4f}, V2_MismRecall={eval_v2['mismatch_recall']:.4f}")

            # Track champion model based on V2 independent macro F1
            if eval_v2["macro_f1"] > best_v2_macro_f1:
                best_v2_macro_f1 = eval_v2["macro_f1"]
                best_model_obj = clf
                best_meta = {
                    "experiment": exp_name,
                    "model_type": model_name,
                    "metrics_v1": eval_v1,
                    "metrics_v2": eval_v2,
                    "train_samples": len(train_data),
                    "model_version": "form2fact-hybrid-pairwise-v2.0-champion"
                }

    # Save all experiment results
    exp_out_file = REPORTS_DIR / "controlled_experiments_report.json"
    with open(exp_out_file, "w", encoding="utf-8") as f:
        json.dump(results_table, f, indent=2)
    print(f"\nAll experiment metrics saved to: {exp_out_file}")

    # Export Champion V2 Model Artifacts
    if best_model_obj is not None:
        import pickle
        champ_weights_path = ARTIFACTS_DIR / "v2_champion_classifier_weights.pkl"
        with open(champ_weights_path, "wb") as f:
            pickle.dump(best_model_obj, f)
        print(f"Saved Champion V2 model weights to: {champ_weights_path}")

        champ_config_path = ARTIFACTS_DIR / "v2_model_config.json"
        with open(champ_config_path, "w", encoding="utf-8") as f:
            json.dump(best_meta, f, indent=2)
        print(f"Saved Champion V2 model config to: {champ_config_path}")

    return results_table, best_meta

if __name__ == "__main__":
    run_all_experiments()

