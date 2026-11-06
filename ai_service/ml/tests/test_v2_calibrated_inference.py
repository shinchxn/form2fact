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

