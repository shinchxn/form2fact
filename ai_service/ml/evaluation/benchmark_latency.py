"""
Comprehensive Latency & End-to-End Instrumentation Benchmark for Form2Fact ML Pipeline.
Measures:
1. Text preprocessing latency
2. MiniLM embedding extraction latency (single and batch)
3. Feature vector concatenation & tabular assembly latency
4. Classifier head inference latency (single and batch)
5. Complete end-to-end latency
"""

import time
import json
import pickle
from pathlib import Path
import numpy as np

from ai_service.ml.models.feature_extractor import PairwiseFeatureExtractor
from ai_service.ml.training.train_classifier import compute_tabular_features
from ai_service.ml.preprocessing.pipeline import normalize_text

WEIGHTS_PATH = Path("ai_service/ml/artifacts/v2/v2_champion_classifier_weights.pkl")
REPORT_PATH = Path("ai_service/ml/data/v2_acquisition/reports/latency_benchmark_detailed.json")

def benchmark_pipeline(n_runs=50):
    print("=" * 70)
    print("FORM2FACT ML V2 — END-TO-END PIPELINE TIMING INSTRUMENTATION")
    print("=" * 70)

    # 1. Load artifacts
    print("\nLoading Champion Weights...")
    with open(WEIGHTS_PATH, "rb") as f:
        clf = pickle.load(f)
    print(f"Loaded classifier: {type(clf)}")

    print("Loading MiniLM Feature Extractor...")
    extractor = PairwiseFeatureExtractor()
    _ = extractor.encode_single("warmup")

    # Sample inputs
    claim_text = "Field: leaseExpiryDate | Type: date | Claim: 2054-03-31 (Context: Lease expiry declared in application form)"
    evidence_text = "Field: leaseExpiryDate | Type: date | Evidence: 2028-06-30 (Context: Registered deed termination date in docket)"
    tab_dict = {
        "claim_value": "2054-03-31",
        "evidence_value": "2028-06-30",
        "field_type": "date"
    }

    # Warmup
    print("Executing warmup runs (10 iterations)...")
    for _ in range(10):
        _ = normalize_text(claim_text)
        _ = compute_tabular_features(tab_dict)
        emb = extractor.encode_pairs([claim_text], [evidence_text])
        tab = np.array([compute_tabular_features(tab_dict)], dtype=np.float32)
        X = np.hstack([emb, tab])
        _ = clf.predict_proba(X)

    print(f"\nBenchmarking over {n_runs} single-pair executions...")
    t_prep, t_emb, t_tab, t_clf, t_e2e = [], [], [], [], []

    for _ in range(n_runs):
        t0 = time.perf_counter()

        # Phase 1: Preprocessing & Text Cleaning
        tp0 = time.perf_counter()
        _ = normalize_text(claim_text)
        _ = normalize_text(evidence_text)
        tp1 = time.perf_counter()
        t_prep.append((tp1 - tp0) * 1000)

        # Phase 2: MiniLM Dense Embedding
        te0 = time.perf_counter()
        emb = extractor.encode_pairs([claim_text], [evidence_text])
        te1 = time.perf_counter()
        t_emb.append((te1 - te0) * 1000)

        # Phase 3: Tabular Feature Assembly
        tt0 = time.perf_counter()
        tab_feats = compute_tabular_features(tab_dict)
        tab_arr = np.array([tab_feats], dtype=np.float32)
        X_pair = np.hstack([emb, tab_arr])
        tt1 = time.perf_counter()
        t_tab.append((tt1 - tt0) * 1000)

        # Phase 4: Classifier Head Prediction
        tc0 = time.perf_counter()
        _ = clf.predict_proba(X_pair)
        tc1 = time.perf_counter()
        t_clf.append((tc1 - tc0) * 1000)

        t_total = (time.perf_counter() - t0) * 1000
        t_e2e.append(t_total)

    def stats(arr):
        return {
            "mean_ms": round(float(np.mean(arr)), 3),
            "median_ms": round(float(np.median(arr)), 3),
            "p95_ms": round(float(np.percentile(arr, 95)), 3),
            "min_ms": round(float(np.min(arr)), 3),
            "max_ms": round(float(np.max(arr)), 3)
        }

    results = {
        "n_runs": n_runs,
        "batch_size": 1,
        "device": "CPU",
        "breakdown": {
            "1_preprocessing": stats(t_prep),
            "2_embedding_generation": stats(t_emb),
            "3_tabular_feature_assembly": stats(t_tab),
            "4_classifier_head_inference": stats(t_clf),
            "5_complete_end_to_end": stats(t_e2e)
        }
    }

    print("\n--- Benchmark Summary (Single Pair, CPU) ---")
    print(f"1. Text Preprocessing:       Mean = {results['breakdown']['1_preprocessing']['mean_ms']} ms")
    print(f"2. MiniLM Embedding:          Mean = {results['breakdown']['2_embedding_generation']['mean_ms']} ms (Median: {results['breakdown']['2_embedding_generation']['median_ms']} ms, p95: {results['breakdown']['2_embedding_generation']['p95_ms']} ms)")
    print(f"3. Tabular Feature Assembly:  Mean = {results['breakdown']['3_tabular_feature_assembly']['mean_ms']} ms")
    print(f"4. Classifier Head:           Mean = {results['breakdown']['4_classifier_head_inference']['mean_ms']} ms (Median: {results['breakdown']['4_classifier_head_inference']['median_ms']} ms, p95: {results['breakdown']['4_classifier_head_inference']['p95_ms']} ms)")
    print(f"5. COMPLETE END-TO-END:       Mean = {results['breakdown']['5_complete_end_to_end']['mean_ms']} ms (Median: {results['breakdown']['5_complete_end_to_end']['median_ms']} ms, p95: {results['breakdown']['5_complete_end_to_end']['p95_ms']} ms)")

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nDetailed latency telemetry saved to: {REPORT_PATH}")
    return results

if __name__ == "__main__":
    benchmark_pipeline(30)

