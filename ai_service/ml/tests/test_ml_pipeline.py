"""
Unit and integration tests for Form2Fact ML pipeline:
1. Preprocessing, normalization & OCR noise detection
2. Dense semantic feature extraction
3. Classification head inference across all 5 classes
4. Abstention to UNCERTAIN on low confidence
5. Deterministic fast-path integrity
"""

import pytest
from ai_service.ml.preprocessing.pipeline import (
    normalize_text, normalize_date, extract_numeric, is_missing_value, is_ocr_degraded
)
from ai_service.ml.inference.engine import MLPairwiseInferenceEngine
from ai_service.app.schemas import PairwiseRequest, FieldCandidate, PairwiseLabel

@pytest.fixture
def engine():
    return MLPairwiseInferenceEngine.get_instance()

def test_preprocessing_text_normalization():
    assert normalize_text("  Pragati Institute of Technology & Management!  ") == "pragati institute of technology management"
    assert normalize_text("Kalyani Charitable Trust") == "kalyani charitable trust"

def test_preprocessing_date_normalization():
    assert normalize_date("2054-03-31") == "2054-03-31"
    assert normalize_date("31/03/2054") == "2054-03-31"
    assert normalize_date("31-03-2054") == "2054-03-31"
    assert normalize_date("31 March 2054") == "2054-03-31"
    assert normalize_date("March 31, 2054") == "2054-03-31"

def test_preprocessing_numeric_extraction():
    assert extract_numeric("7.50") == 7.50
    assert extract_numeric("7.50 Acres") == 7.50
    assert extract_numeric("1,20,00,000") == 12000000.0

def test_ocr_degradation_detection():
    assert is_ocr_degraded("Pr@g#ti 3duc@t!0n S0c!3ty ~~~??? [OCR UNREADABLE]") is True
    assert is_ocr_degraded("???-??-2054 [SCANNED BITMAP]") is True
    assert is_ocr_degraded("Pragati Education Society") is False

def test_missing_value_detection():
    assert is_missing_value(None) is True
    assert is_missing_value("") is True
    assert is_missing_value("N/A") is True
    assert is_missing_value("Valid through 2028") is False

def test_ml_inference_class_match(engine):
    req = PairwiseRequest(
        claim_field=FieldCandidate(
            field_name="institutionName",
            field_label="Institution Legal Name",
            raw_value="Pragati Institute of Technology & Management"
        ),
        evidence_field=FieldCandidate(
            field_name="institutionName",
            field_label="Institution Name",
            raw_value="Pragati Institute of Technology & Management"
        )
    )
    res = engine.classify(req)
    assert res.label == PairwiseLabel.MATCH
    assert res.confidence >= 0.99
    assert res.requires_human_review is False

def test_ml_inference_class_missing(engine):
    req = PairwiseRequest(
        claim_field=FieldCandidate(
            field_name="fireSafetyNoc",
            field_label="Fire Safety NOC",
            raw_value="Certified Sound"
        ),
        evidence_field=None
    )
    res = engine.classify(req)
    assert res.label == PairwiseLabel.MISSING
    assert res.confidence == 1.0
    assert res.requires_human_review is True

def test_ml_inference_class_not_comparable(engine):
    req = PairwiseRequest(
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
        comparison_type="not_comparable"
    )
    res = engine.classify(req)
    assert res.label == PairwiseLabel.NOT_COMPARABLE
    assert res.requires_human_review is False

def test_ml_inference_class_uncertain_ocr(engine):
    req = PairwiseRequest(
        claim_field=FieldCandidate(
            field_name="trustName",
            field_label="Sponsoring Trust",
            raw_value="Pragati Education Society"
        ),
        evidence_field=FieldCandidate(
            field_name="trustName",
            field_label="Deed Sponsoring Trust",
            raw_value="Pr@g#ti 3duc@t!0n S0c!3ty ~~~??? [OCR UNREADABLE]"
        )
    )
    res = engine.classify(req)
    assert res.label == PairwiseLabel.UNCERTAIN
    assert res.requires_human_review is True
    assert "OCR" in res.explanation
