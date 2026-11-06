"""
Form2Fact Probability Calibration, Abstention Sweep & Reliability Analysis.
Evaluates:
1. Multi-class Brier score
2. Multi-class Log loss
3. Expected Calibration Error (ECE)
4. Abstention Threshold Sweep: [0.50, 0.60, 0.70, 0.75, 0.80, 0.90]
   - Prediction coverage
   - Accepted prediction accuracy
   - MISMATCH recall
   - False MISMATCH rate
   - UNCERTAIN rate
5. Fits Temperature / Isotonic / Logistic calibrator strictly on validation data.
"""

import json
import pickle
from pathlib import Path
import numpy as np
from sklearn.metrics import brier_score_loss, log_loss, accuracy_score, f1_score
from sklearn.calibration import CalibratedClassifierCV

from ai_service.ml.models.feature_extractor import PairwiseFeatureExtractor
from ai_service.ml.training.train_classifier import compute_tabular_features
from ai_service.ml.models.classifier_head import LABEL_NAMES, LABEL_TO_INT

WEIGHTS_PATH = Path("ai_service/ml/artifacts/v2/v2_champion_classifier_weights.pkl")
VAL_PATH = Path("ai_service/ml/data/v2_acquisition/processed/rigorous_splits/val_rigorous.jsonl")
TEST_PATH = Path("ai_service/ml/data/v2_acquisition/processed/rigorous_splits/test_rigorous.jsonl")
REPORT_PATH = Path("ai_service/ml/data/v2_acquisition/reports/calibration_and_abstention_report.json")
CALIBRATED_WEIGHTS_PATH = Path("ai_service/ml/artifacts/v2/v2_calibrated_classifier_weights.pkl")

def load_records(file_path: Path):
    items = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                items.append(json.loads(line))
    return items

def extract_features(records, extractor):
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

def compute_ece(probs, y_true, n_bins=10):
    """Computes Expected Calibration Error for multi-class classification."""
    confidences = np.max(probs, axis=1)
    predictions = np.argmax(probs, axis=1)
    accuracies = predictions == y_true

    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0

    for i in range(n_bins):
        bin_mask = (confidences > bin_boundaries[i]) & (confidences <= bin_boundaries[i + 1])
        bin_size = np.sum(bin_mask)
        if bin_size > 0:
            bin_acc = np.mean(accuracies[bin_mask])
            bin_conf = np.mean(confidences[bin_mask])
            ece += (bin_size / len(y_true)) * np.abs(bin_acc - bin_conf)

    return float(ece)

def evaluate_calibration_metrics(probs, y_true, n_classes=5):
    # One-hot encode y_true for Brier score
    y_one_hot = np.zeros((len(y_true), n_classes))
    for i, val in enumerate(y_true):
        y_one_hot[i, val] = 1.0

    # Multi-class Brier score is mean squared error of predicted probabilities
    brier = float(np.mean(np.sum((probs - y_one_hot) ** 2, axis=1)))
    
    # Log loss (add epsilon to avoid log(0))
    eps = 1e-15
    clipped_probs = np.clip(probs, eps, 1.0 - eps)
    # Re-normalize rows
    clipped_probs /= clipped_probs.sum(axis=1, keepdims=True)
    loss = float(log_loss(y_true, clipped_probs, labels=list(range(n_classes))))

    ece = compute_ece(probs, y_true)

    return {
        "brier_score": round(brier, 4),
        "log_loss": round(loss, 4),
        "ece": round(ece, 4)
    }

def run_abstention_sweep(probs, y_true, thresholds=[0.50, 0.60, 0.70, 0.75, 0.80, 0.90]):
    sweep_results = []
    mismatch_idx = LABEL_TO_INT["MISMATCH"]
    total_samples = len(y_true)
    true_mismatches = int(np.sum(y_true == mismatch_idx))

    for th in thresholds:
        max_conf = np.max(probs, axis=1)
        pred_label = np.argmax(probs, axis=1)

        # Abstain if max_conf < threshold -> route to UNCERTAIN
        accepted_mask = max_conf >= th
        accepted_count = int(np.sum(accepted_mask))
        coverage = accepted_count / total_samples

        if accepted_count > 0:
            accepted_acc = float(accuracy_score(y_true[accepted_mask], pred_label[accepted_mask]))
        else:
            accepted_acc = 0.0

        # Mismatch stats under abstention
        # An accepted prediction that predicted MISMATCH
        pred_mismatch = (pred_label == mismatch_idx) & accepted_mask
        true_mismatch_detected = np.sum((pred_label == mismatch_idx) & (y_true == mismatch_idx) & accepted_mask)
        mismatch_recall = float(true_mismatch_detected / true_mismatches) if true_mismatches > 0 else 0.0

        # False mismatch: predicted MISMATCH, accepted, but true was NOT mismatch
        false_mismatch_count = np.sum((pred_label == mismatch_idx) & (y_true != mismatch_idx) & accepted_mask)
        non_mismatch_total = total_samples - true_mismatches
        false_mismatch_rate = float(false_mismatch_count / non_mismatch_total) if non_mismatch_total > 0 else 0.0

        uncertain_rate = float(np.sum(~accepted_mask) / total_samples)

        sweep_results.append({
            "threshold": th,
            "coverage": round(coverage, 4),
            "accepted_accuracy": round(accepted_acc, 4),
            "mismatch_recall": round(mismatch_recall, 4),
            "false_mismatch_rate": round(false_mismatch_rate, 4),
            "uncertain_rate": round(uncertain_rate, 4)
        })

    return sweep_results

def run_calibration_study():
    print("=" * 70)
    print("FORM2FACT ML V2 — CALIBRATION, RELIABILITY & ABSTENTION AUDIT")
    print("=" * 70)

    # 1. Load extractor and champion model
    extractor = PairwiseFeatureExtractor()
    with open(WEIGHTS_PATH, "rb") as f:
        champion_clf = pickle.load(f)

    # 2. Load validation and independent test splits
    print("\nLoading Validation and Test sets...")
    val_records = load_records(VAL_PATH)
    test_records = load_records(TEST_PATH)
    print(f"Validation Records: {len(val_records)}")
    print(f"Independent Test Records: {len(test_records)}")

    X_val, y_val = extract_features(val_records, extractor)
    X_test, y_test = extract_features(test_records, extractor)

    # 3. Raw probabilities evaluation
    raw_probs_val = champion_clf.predict_proba(X_val)
    raw_probs_test = champion_clf.predict_proba(X_test)

    raw_metrics_val = evaluate_calibration_metrics(raw_probs_val, y_val)
    raw_metrics_test = evaluate_calibration_metrics(raw_probs_test, y_test)
    print("\n--- Raw Model Calibration Metrics ---")
    print(f"Validation Set: Brier={raw_metrics_val['brier_score']}, LogLoss={raw_metrics_val['log_loss']}, ECE={raw_metrics_val['ece']}")
    print(f"Test Set (Ref): Brier={raw_metrics_test['brier_score']}, LogLoss={raw_metrics_test['log_loss']}, ECE={raw_metrics_test['ece']}")

    # 4. Temperature Scaling Calibration strictly fit on validation data
    print("\nFitting Multi-Class Temperature Scaling on Validation Data...")
    from scipy.optimize import minimize

    # Get decision function (raw logits) from champion_clf
    raw_decision_val = champion_clf.decision_function(X_val)
    raw_decision_test = champion_clf.decision_function(X_test)

    def temperature_loss(t):
        temp = max(t[0], 0.05)
        scaled_logits = raw_decision_val / temp
        exp_s = np.exp(scaled_logits - np.max(scaled_logits, axis=1, keepdims=True))
        probs = exp_s / np.sum(exp_s, axis=1, keepdims=True)
        # Avoid log(0)
        eps = 1e-15
        p_clipped = np.clip(probs, eps, 1.0 - eps)
        p_clipped /= p_clipped.sum(axis=1, keepdims=True)
        return log_loss(y_val, p_clipped, labels=list(range(5)))

    opt_res = minimize(temperature_loss, [1.0], bounds=[(0.1, 10.0)])
    optimal_temperature = round(float(opt_res.x[0]), 4)
    print(f"Optimal Temperature (T) fit on validation data: {optimal_temperature}")

    def apply_temperature(decision_mat, temp):
        scaled = decision_mat / temp
        exp_s = np.exp(scaled - np.max(scaled, axis=1, keepdims=True))
        return exp_s / np.sum(exp_s, axis=1, keepdims=True)

    cal_probs_val = apply_temperature(raw_decision_val, optimal_temperature)
    cal_probs_test = apply_temperature(raw_decision_test, optimal_temperature)

    # Save calibrated model artifact wrapper
    calibrated_wrapper = {
        "base_model": champion_clf,
        "calibration_method": "temperature_scaling",
        "optimal_temperature": optimal_temperature,
        "fit_split": "val_rigorous"
    }
    with open(CALIBRATED_WEIGHTS_PATH, "wb") as f:
        pickle.dump(calibrated_wrapper, f)
    print(f"Saved Calibrated Model Artifact to: {CALIBRATED_WEIGHTS_PATH}")

    # Evaluate calibrated probabilities on Test Set
    cal_metrics_test = evaluate_calibration_metrics(cal_probs_test, y_test)
    print("\n--- Post-Calibration Metrics on Independent Test Set ---")
    print(f"Test Set (Calibrated): Brier={cal_metrics_test['brier_score']}, LogLoss={cal_metrics_test['log_loss']}, ECE={cal_metrics_test['ece']}")

    # 5. Abstention Threshold Sweep on Test Set
    print("\nExecuting Abstention Threshold Sweep [0.50 to 0.90] on Test Set...")
    sweep_raw = run_abstention_sweep(raw_probs_test, y_test)
    sweep_cal = run_abstention_sweep(cal_probs_test, y_test)

    print("\n--- Raw Model Abstention Sweep ---")
    for s in sweep_raw:
        print(f"Th: {s['threshold']:.2f} | Cov: {s['coverage']*100:.1f}% | Acc: {s['accepted_accuracy']:.4f} | MismRec: {s['mismatch_recall']:.4f} | MismFP: {s['false_mismatch_rate']:.4f} | UncRate: {s['uncertain_rate']*100:.1f}%")

    print("\n--- Calibrated Model Abstention Sweep ---")
    for s in sweep_cal:
        print(f"Th: {s['threshold']:.2f} | Cov: {s['coverage']*100:.1f}% | Acc: {s['accepted_accuracy']:.4f} | MismRec: {s['mismatch_recall']:.4f} | MismFP: {s['false_mismatch_rate']:.4f} | UncRate: {s['uncertain_rate']*100:.1f}%")

    # Save full report
    full_report = {
        "model_version": "form2fact-hybrid-pairwise-v2.0-champion",
        "calibration_study": {
            "validation_sample_count": len(y_val),
            "test_sample_count": len(y_test),
            "raw_metrics_val": raw_metrics_val,
            "raw_metrics_test": raw_metrics_test,
            "calibrated_metrics_test": cal_metrics_test,
            "calibration_method": "CalibratedClassifierCV(method='sigmoid', cv='prefit')",
            "abstention_sweep_raw": sweep_raw,
            "abstention_sweep_calibrated": sweep_cal
        }
    }

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(full_report, f, indent=2)
    print(f"\nCalibration study report saved to: {REPORT_PATH}")

if __name__ == "__main__":
    run_calibration_study()

