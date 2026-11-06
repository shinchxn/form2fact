"""
Test Suite for Form2Fact Model V2 Calibrated Inference Integration:
1. Calibrated engine initialization & artifact verification
2. Temperature scaling math verification during inference
3. 5-class ordering and taxonomy preservation
4. Abstention policy across all five classes at threshold 0.60
5. Elimination of silent fallback on missing/corrupt artifacts
6. FastAPI endpoints integration (health, classify-pair, batch-classify)
"""

import os
import json
import pickle
import numpy as np
import pytest
from fastapi.testclient import TestClient

from ai_service.ml.inference.engine import MLPairwiseInferenceEngine
from ai_service.app.main import app
from ai_service.app.schemas import (
    PairwiseRequest,
    FieldCandidate,
    PairwiseLabel,
    PairwiseResponse
)


@pytest.fixture
def engine():
    return MLPairwiseInferenceEngine.get_instance()


@pytest.fixture
def client():
    return TestClient(app)


def test_calibrated_engine_initialization(engine):
    """Task 1: Verify champion classifier and calibration wrapper load deterministically."""
    assert engine.is_ready() is True
    assert engine.is_calibrated is True
    assert engine.temperature == pytest.approx(1.8182, abs=1e-3)
    assert engine.calibration_method == "temperature_scaling"
    assert engine.model_version == "form2fact-hybrid-pairwise-v2.0-champion"
    assert engine.default_threshold == 0.60


def test_temperature_scaling_applied_in_inference(engine):
    """Task 1: Verify temperature scaling is applied during actual probability estimation."""
    # Create synthetic feature vector of dimension 1544 (1536 dense + 8 tabular)
    X = np.zeros((1, 1544), dtype=np.float32)

    raw_logits = engine.clf.decision_function(X)
    raw_scaled = raw_logits / engine.temperature
    expected_exp = np.exp(raw_scaled - np.max(raw_scaled, axis=1, keepdims=True))
    expected_probs = expected_exp / np.sum(expected_exp, axis=1, keepdims=True)

    actual_probs = engine.predict_probabilities(X)
    np.testing.assert_allclose(actual_probs, expected_probs, rtol=1e-5, atol=1e-5)
    assert np.isclose(np.sum(actual_probs), 1.0)


def test_five_class_ordering(engine):
    """Task 1: Verify 5-class output ordering matches INT_TO_LABEL exactly."""
    expected_classes = np.array([0, 1, 2, 3, 4])
    np.testing.assert_array_equal(engine.clf.classes_, expected_classes)


def test_abstention_policy_all_five_classes(engine):
    """Task 2: Test 0.60 threshold and human-review routing across all 5 classes."""

    # 1. MATCH: Concordant institution names
    req_match = PairwiseRequest(
        claim_field=FieldCandidate(
            field_name="institutionName",
            field_label="Institution Legal Name",
            raw_value="Pragati Institute of Technology & Management"
        ),
        evidence_field=FieldCandidate(
            field_name="institutionName",
            field_label="Institution Name",
            raw_value="Pragati Institute of Technology & Management"
        ),
        confidence_threshold=0.60
    )
    res_match = engine.classify(req_match)
    assert res_match.label == PairwiseLabel.MATCH
    assert res_match.confidence >= 0.95
    assert res_match.requires_human_review is False

    # 2. MISMATCH: Deficit land area
    req_mismatch = PairwiseRequest(
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
        comparison_type="numeric",
        confidence_threshold=0.60
    )
    res_mismatch = engine.classify(req_mismatch)
    assert res_mismatch.label == PairwiseLabel.MISMATCH
    # Regulatory Rule: All MISMATCH findings MUST require human inspection
    assert res_mismatch.requires_human_review is True

    # 3. MISSING: Omitted evidence field
    req_missing = PairwiseRequest(
        claim_field=FieldCandidate(
            field_name="fireSafetyNoc",
            field_label="Fire Safety NOC",
            raw_value="Valid Certificate"
        ),
        evidence_field=None,
        confidence_threshold=0.60
    )
    res_missing = engine.classify(req_missing)
    assert res_missing.label == PairwiseLabel.MISSING
    assert res_missing.requires_human_review is True

    # 4. UNCERTAIN: Direct model prediction on ambiguous address
    req_uncertain = PairwiseRequest(
        claim_field=FieldCandidate(
            field_name="campusAddress",
            field_label="Campus Address",
            raw_value="Plot 12, Phase 3, Industrial Area, Sector 62"
        ),
        evidence_field=FieldCandidate(
            field_name="campusAddress",
            field_label="Deed Address",
            raw_value="Survey No. 44/2, Near Metro Station, Sector 62"
        ),
        confidence_threshold=0.60
    )
    res_uncertain = engine.classify(req_uncertain)
    assert res_uncertain.label == PairwiseLabel.UNCERTAIN
    assert res_uncertain.requires_human_review is True

    # 4b. Low-confidence abstention to UNCERTAIN when confidence < threshold
    req_abstain = PairwiseRequest(
        claim_field=FieldCandidate(
            field_name="campusAddress",
            field_label="Campus Address",
            raw_value="Plot 12, Phase 3, Industrial Area, Sector 62"
        ),
        evidence_field=FieldCandidate(
            field_name="campusAddress",
            field_label="Deed Address",
            raw_value="Survey No. 44/2, Near Metro Station, Sector 62"
        ),
        confidence_threshold=0.999
    )
    res_abstain = engine.classify(req_abstain)
    assert res_abstain.label == PairwiseLabel.UNCERTAIN
    assert res_abstain.requires_human_review is True
    assert "Abstaining to UNCERTAIN" in res_abstain.explanation

    # 5. NOT_COMPARABLE: Semantically incompatible statutory fields
    req_not_comp = PairwiseRequest(
        claim_field=FieldCandidate(
            field_name="leaseExpiryDate",
            field_label="Lease Expiry Date",
            raw_value="2054-03-31"
        ),
        evidence_field=FieldCandidate(
            field_name="sponsoringTrust",
            field_label="Sponsoring Trust",
            raw_value="Pragati Education Society"
        ),
        comparison_type="not_comparable",
        confidence_threshold=0.60
    )
    res_not_comp = engine.classify(req_not_comp)
    assert res_not_comp.label == PairwiseLabel.NOT_COMPARABLE
    assert res_not_comp.requires_human_review is False


def test_safe_behavior_on_missing_corrupt_artifacts(monkeypatch):
    """Task 4: Confirm no silent fallback when model artifacts are missing or corrupt."""
    # Point weights to non-existent file
    monkeypatch.setenv("FORM2FACT_ML_WEIGHTS_PATH", "ai_service/ml/artifacts/non_existent.pkl")
    
    # Create fresh engine instance
    fresh_engine = MLPairwiseInferenceEngine()
    fresh_engine._load_artifacts()
    assert fresh_engine.is_ready() is False

    # Calling classify on non-ready engine MUST raise RuntimeError, NOT silently fallback
    req = PairwiseRequest(
        claim_field=FieldCandidate(
            field_name="trustName",
            field_label="Trust Name",
            raw_value="Alpha Society"
        ),
        evidence_field=FieldCandidate(
            field_name="trustName",
            field_label="Evidence Trust",
            raw_value="Beta Corp"
        )
    )
    with pytest.raises(RuntimeError) as exc_info:
        fresh_engine.classify(req)
    assert "Silent fallback is disabled" in str(exc_info.value)


def test_fastapi_health_endpoint(client):
    """Task 4: Verify FastAPI health check endpoint exposes calibrated status and metadata."""
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["ml_ready"] is True
    assert data["is_calibrated"] is True
    assert data["optimal_temperature"] == pytest.approx(1.8182, abs=1e-3)
    assert data["abstention_threshold"] == 0.60
    assert data["model_version"] == "form2fact-hybrid-pairwise-v2.0-champion"
    assert "temperature_scaled_calibration" in data["capabilities"]


def test_fastapi_classify_pair_endpoint(client):
    """Task 4: Verify FastAPI classify-pair endpoint response schema and compatibility."""
    payload = {
        "domain_id": "aicte",
        "claim_field": {
            "field_name": "institutionName",
            "field_label": "Institution Name",
            "raw_value": "Apex Institute of Technology"
        },
        "evidence_field": {
            "field_name": "institutionName",
            "field_label": "Document Name",
            "raw_value": "Apex Institute of Technology"
        },
        "comparison_type": "entity-name",
        "confidence_threshold": 0.60
    }
    res = client.post("/api/v1/classify-pair", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["label"] == "MATCH"
    assert data["confidence"] >= 0.95
    assert data["model_version"] == "form2fact-hybrid-pairwise-v2.0-champion"


def test_fastapi_batch_classify_endpoint(client):
    """Task 4: Verify FastAPI batch-classify endpoint response counts and schema."""
    payload = {
        "comparisons": [
            {
                "claim_field": {
                    "field_name": "name",
                    "field_label": "Name",
                    "raw_value": "ABC College"
                },
                "evidence_field": {
                    "field_name": "name",
                    "field_label": "Name",
                    "raw_value": "ABC College"
                }
            },
            {
                "claim_field": {
                    "field_name": "noc",
                    "field_label": "NOC",
                    "raw_value": "Approved"
                },
                "evidence_field": None
            }
        ]
    }
    res = client.post("/api/v1/batch-classify", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 2
    assert data["matches"] == 1
    assert data["missing"] == 1


def test_corrupted_model_artifact_rejection(tmp_path, monkeypatch):
    """Task 6: Verify corrupt pickle artifact is detected and readiness fails."""
    corrupt_file = tmp_path / "corrupt_weights.pkl"
    corrupt_file.write_bytes(b"CORRUPTED_NON_PICKLE_GARBAGE_BYTES")

    monkeypatch.setenv("FORM2FACT_ML_WEIGHTS_PATH", str(corrupt_file))
    fresh_engine = MLPairwiseInferenceEngine()
    fresh_engine._load_artifacts()

    assert fresh_engine.is_ready() is False
    assert fresh_engine.clf is None


def test_checksum_mismatch_rejection(monkeypatch):
    """Task 6: Verify mismatch against expected SHA-256 rejects model on startup."""
    fake_checksum = "0000000000000000000000000000000000000000000000000000000000000000"
    monkeypatch.setenv("FORM2FACT_ML_EXPECTED_CHECKSUM", fake_checksum)

    fresh_engine = MLPairwiseInferenceEngine()
    fresh_engine._load_artifacts()

    assert fresh_engine.checksum_verified is False
    assert fresh_engine.is_ready() is False


def test_v1_rollback_execution(monkeypatch):
    """Task 4 & 6: Verify documented V1 rollback loads cleanly and performs inference."""
    monkeypatch.setenv("FORM2FACT_ML_WEIGHTS_PATH", "ai_service/ml/artifacts/pairwise_classifier_weights.pkl")
    monkeypatch.setenv("FORM2FACT_ML_CONFIG_PATH", "ai_service/ml/artifacts/model_config.json")

    v1_engine = MLPairwiseInferenceEngine()
    v1_engine._load_artifacts()

    assert v1_engine.is_ready() is True
    assert v1_engine.is_calibrated is False
    assert v1_engine.temperature == 1.0

    req = PairwiseRequest(
        claim_field=FieldCandidate(
            field_name="institutionName",
            field_label="Institution Legal Name",
            raw_value="Apex Institute"
        ),
        evidence_field=FieldCandidate(
            field_name="institutionName",
            field_label="Deed Name",
            raw_value="Apex Institute"
        )
    )
    res = v1_engine.classify(req)
    assert res.label == PairwiseLabel.MATCH
    assert res.confidence >= 0.95


def test_numerical_stability_extreme_logits(engine):
    """Task 2 & 6: Verify mathematical stability under extreme values without NaN/Inf."""
    # Large magnitude feature vector
    X_extreme = np.ones((1, 1544), dtype=np.float32) * 1e4
    probs = engine.predict_probabilities(X_extreme)

    assert not np.isnan(probs).any(), "Probabilities must not contain NaN"
    assert not np.isinf(probs).any(), "Probabilities must not contain Inf"
    assert np.isclose(np.sum(probs), 1.0, atol=1e-5), "Probabilities must sum to 1.0"
    assert (probs >= 0.0).all() and (probs <= 1.0).all()


def test_fastapi_http_503_when_unready(monkeypatch):
    """Task 4 & 6: Verify FastAPI endpoints return HTTP 503 when model is unready."""
    from ai_service.app.main import ml_engine, app

    # Temporarily set ml_engine.clf = None
    original_clf = ml_engine.clf
    try:
        ml_engine.clf = None
        client = TestClient(app)

        req_payload = {
            "claim_field": {
                "field_name": "trustName",
                "field_label": "Trust Name",
                "raw_value": "Alpha Trust"
            },
            "evidence_field": {
                "field_name": "trustName",
                "field_label": "Trust Name",
                "raw_value": "Beta Trust"
            }
        }
        res = client.post("/api/v1/classify-pair", json=req_payload)
        assert res.status_code == 503
        assert "not ready" in res.json()["detail"]

        res_ml = client.post("/api/v1/ml/classify-pair", json=req_payload)
        assert res_ml.status_code == 503

        res_batch = client.post("/api/v1/batch-classify", json={"comparisons": [req_payload]})
        assert res_batch.status_code == 503
    finally:
        ml_engine.clf = original_clf

