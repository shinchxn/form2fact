"""
Release Gate Performance Benchmark for Form2Fact ML V2:
1. 500 sequential inference executions (measuring p50, p95, p99)
2. Concurrency stress testing across concurrency levels 1, 5, 10, 20
3. Memory utilization profiling (tracemalloc) and model startup time
4. Dissection of CPU inference vs request queueing and HTTP overhead
"""

import time
import json
import tracemalloc
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import numpy as np

from ai_service.ml.inference.engine import MLPairwiseInferenceEngine
from ai_service.app.schemas import PairwiseRequest, FieldCandidate

REPORT_PATH = Path("ai_service/ml/data/v2_acquisition/reports/release_gate_performance_benchmark.json")


def run_benchmark():
    print("=" * 75)
    print("FORM2FACT ML V2 — RELEASE GATE PERFORMANCE & STRESS AUDIT (TASK 5)")
    print("=" * 75)

    # 1. Startup & Memory Profiling
    tracemalloc.start()
    t_start = time.perf_counter()
    engine = MLPairwiseInferenceEngine()
    engine._load_artifacts()
    t_init = (time.perf_counter() - t_start) * 1000
    current_mem, peak_mem = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    print(f"Startup Time: {t_init:.2f} ms")
    print(f"Peak Memory Allocated: {peak_mem / (1024 * 1024):.2f} MB")
    print(f"Current Memory In Use: {current_mem / (1024 * 1024):.2f} MB")
    print(f"Loaded Artifact Checksum: {engine.artifact_checksum}")
    print(f"Checksum Verified: {engine.checksum_verified}")

    # Representative test requests
    req_numeric = PairwiseRequest(
        claim_field=FieldCandidate(
            field_name="landAreaAcres",
            field_label="Declared Land Area",
            raw_value="7.50 Acres"
        ),
        evidence_field=FieldCandidate(
            field_name="landAreaAcres",
            field_label="Registered Deed Area",
            raw_value="4.00 Acres"
        ),
        comparison_type="numeric"
    )

    req_entity = PairwiseRequest(
        claim_field=FieldCandidate(
            field_name="institutionName",
            field_label="Institution Legal Name",
            raw_value="Pragati Institute of Technology & Management"
        ),
        evidence_field=FieldCandidate(
            field_name="institutionName",
            field_label="Deed Name",
            raw_value="Pragati Institute of Management"
        ),
        comparison_type="entity-name"
    )

    # Warmup
    print("\nWarming up pipeline (20 iterations)...")
    for _ in range(20):
        _ = engine.classify(req_numeric)
        _ = engine.classify(req_entity)

    # 2. 500 Sequential Inference Executions
    print("\nExecuting 500 sequential inference runs...")
    sequential_latencies = []
    for i in range(500):
        req = req_numeric if i % 2 == 0 else req_entity
        t0 = time.perf_counter()
        _ = engine.classify(req)
        t_ms = (time.perf_counter() - t0) * 1000
        sequential_latencies.append(t_ms)

    seq_mean = float(np.mean(sequential_latencies))
    seq_p50 = float(np.percentile(sequential_latencies, 50))
    seq_p95 = float(np.percentile(sequential_latencies, 95))
    seq_p99 = float(np.percentile(sequential_latencies, 99))
    seq_min = float(np.min(sequential_latencies))
    seq_max = float(np.max(sequential_latencies))
    seq_std = float(np.std(sequential_latencies))

    print(f"500-Run Sequential Results:")
    print(f"  Mean:   {seq_mean:.2f} ms")
    print(f"  p50:    {seq_p50:.2f} ms")
    print(f"  p95:    {seq_p95:.2f} ms")
    print(f"  p99:    {seq_p99:.2f} ms")
    print(f"  Min:    {seq_min:.2f} ms | Max: {seq_max:.2f} ms | Std: {seq_std:.2f} ms")

    # 3. Concurrency Stress Testing (Levels: 1, 5, 10, 20)
    concurrency_results = {}
    concurrency_levels = [1, 5, 10, 20]
    n_requests_per_level = 50

    print("\nExecuting Concurrency Stress Testing (Levels: 1, 5, 10, 20)...")
    for workers in concurrency_levels:
        latencies = []
        lock = threading.Lock()

        def worker_task(idx):
            req = req_numeric if idx % 2 == 0 else req_entity
            t0 = time.perf_counter()
            _ = engine.classify(req)
            t_ms = (time.perf_counter() - t0) * 1000
            with lock:
                latencies.append(t_ms)

        t_start_batch = time.perf_counter()
        with ThreadPoolExecutor(max_workers=workers) as executor:
            list(executor.map(worker_task, range(n_requests_per_level)))
        t_total_batch = (time.perf_counter() - t_start_batch) * 1000
        throughput_qps = (n_requests_per_level / (t_total_batch / 1000))

        concurrency_results[f"concurrency_{workers}"] = {
            "workers": workers,
            "total_requests": n_requests_per_level,
            "total_wall_clock_ms": round(t_total_batch, 2),
            "throughput_qps": round(throughput_qps, 2),
            "mean_latency_ms": round(float(np.mean(latencies)), 2),
            "p50_latency_ms": round(float(np.percentile(latencies, 50)), 2),
            "p95_latency_ms": round(float(np.percentile(latencies, 95)), 2),
            "p99_latency_ms": round(float(np.percentile(latencies, 99)), 2)
        }
        print(f"  Workers: {workers:2d} | Throughput: {throughput_qps:5.2f} QPS | Mean: {np.mean(latencies):6.2f} ms | p95: {np.percentile(latencies, 95):6.2f} ms")

    # 4. HTTP Overhead vs Pure CPU Inference
    from fastapi.testclient import TestClient
    from ai_service.app.main import app
    client = TestClient(app)

    http_payload = {
        "domain_id": "aicte",
        "claim_field": {
            "field_name": "institutionName",
            "field_label": "Institution Legal Name",
            "raw_value": "Pragati Institute of Technology & Management"
        },
        "evidence_field": {
            "field_name": "institutionName",
            "field_label": "Deed Name",
            "raw_value": "Pragati Institute of Management"
        },
        "comparison_type": "entity-name"
    }

    # Warmup TestClient
    print("\nWarming up HTTP TestClient...")
    _ = client.post("/api/v1/classify-pair", json=http_payload)
    _ = client.post("/api/v1/classify-pair", json=http_payload)

    http_latencies = []
    print("Measuring HTTP Overhead vs CPU Inference (50 client requests)...")
    for _ in range(50):
        t0 = time.perf_counter()
        res = client.post("/api/v1/classify-pair", json=http_payload)
        assert res.status_code == 200
        http_latencies.append((time.perf_counter() - t0) * 1000)

    http_mean = float(np.mean(http_latencies))
    http_p50 = float(np.percentile(http_latencies, 50))
    http_p95 = float(np.percentile(http_latencies, 95))
    http_overhead_est = max(0.0, http_mean - seq_mean)

    print(f"  HTTP API Call Mean: {http_mean:.2f} ms (p50: {http_p50:.2f} ms, p95: {http_p95:.2f} ms)")
    print(f"  Pure Engine Mean:   {seq_mean:.2f} ms (p50: {seq_p50:.2f} ms, p95: {seq_p95:.2f} ms)")
    print(f"  HTTP/JSON Overhead: {http_overhead_est:.2f} ms (pydantic parsing + serialization)")

    final_report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "model_version": engine.model_version,
        "artifact_checksum": engine.artifact_checksum,
        "checksum_verified": engine.checksum_verified,
        "memory_profile": {
            "startup_time_ms": round(t_init, 2),
            "peak_memory_mb": round(peak_mem / (1024 * 1024), 2),
            "current_memory_mb": round(current_mem / (1024 * 1024), 2)
        },
        "sequential_500_runs": {
            "n_runs": 500,
            "mean_ms": round(seq_mean, 2),
            "p50_ms": round(seq_p50, 2),
            "p95_ms": round(seq_p95, 2),
            "p99_ms": round(seq_p99, 2),
            "min_ms": round(seq_min, 2),
            "max_ms": round(seq_max, 2),
            "std_ms": round(seq_std, 2)
        },
        "concurrency_stress": concurrency_results,
        "http_overhead_analysis": {
            "http_mean_ms": round(http_mean, 2),
            "http_p50_ms": round(http_p50, 2),
            "http_p95_ms": round(http_p95, 2),
            "pure_engine_mean_ms": round(seq_mean, 2),
            "estimated_http_overhead_ms": round(http_overhead_est, 2)
        }
    }

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(final_report, f, indent=2)
    print(f"\nReport written to: {REPORT_PATH}")
    return final_report


if __name__ == "__main__":
    run_benchmark()

