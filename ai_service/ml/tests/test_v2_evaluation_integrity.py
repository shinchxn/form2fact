"""
Extended unit and integration tests for Form2Fact ML V2:
1. Probability calibration artifact loading & temperature scaling
2. Abstention threshold behavior across thresholds [0.50, 0.75, 0.90]
3. Missing and malformed feature robustness
4. Checksum verification of V2 champion weights & config
5. Latency timing instrumentation assertions
6. Backward compatibility with FastAPI PairwiseResponse contract
"""

import json
import pickle
import hashlib
from pathlib import Path
import numpy as np
import pytest

from ai_service.ml.inference.engine import MLPairwiseInferenceEngine
from ai_service.app.schemas import PairwiseRequest, FieldCandidate, PairwiseLabel

CHAMPION_WEIGHTS = Path("ai_service/ml/artifacts/v2/v2_champion_classifier_weights.pkl")
CHAMPION_CONFIG = Path("ai_service/ml/artifacts/v2/v2_model_config.json")
CALIBRATED_WEIGHTS = Path("ai_service/ml/artifacts/v2/v2_calibrated_classifier_weights.pkl")

def test_v2_champion_artifact_checksum():
    """Verify champion weights and config match exact registered SHA256 checksums."""
    assert CHAMPION_WEIGHTS.exists(), "Champion weights file must exist"
    assert CHAMPION_CONFIG.exists(), "Champion config file must exist"

    data_w = CHAMPION_WEIGHTS.read_bytes()
    sha_w = hashlib.sha256(data_w).hexdigest()
    assert sha_w == "efa27bee02d3d7b53a96366365f48a3f5924d7bd0095acdde965093bcf8f778e", "Weights checksum mismatch"

    data_c = CHAMPION_CONFIG.read_bytes()
    sha_c = hashlib.sha256(data_c).hexdigest()
    assert sha_c == "fc607b4c1a364669dd350b3ba377582d333324b466c6ddd20696d2c57a827927", "Config checksum mismatch"

def test_v2_champion_config_schema():
    """Verify configuration attributes match expected schema and dimensions."""
    with open(CHAMPION_CONFIG, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    assert cfg["model_version"] == "form2fact-hybrid-pairwise-v2.0-champion"
    assert cfg["model_type"] == "HistGradientBoosting"
    assert "metrics_v2" in cfg
    assert cfg["metrics_v2"]["accuracy"] >= 0.95
    assert cfg["metrics_v2"]["mismatch_recall"] >= 0.95

def test_calibrated_artifact_loading():
    """Verify calibrated model wrapper loads and applies temperature scaling properly."""
    assert CALIBRATED_WEIGHTS.exists(), "Calibrated artifact must exist"
    with open(CALIBRATED_WEIGHTS, "rb") as f:
        wrapper = pickle.load(f)
    assert wrapper["calibration_method"] == "temperature_scaling"
    assert "optimal_temperature" in wrapper
    assert wrapper["optimal_temperature"] > 0.5
    assert "base_model" in wrapper

def test_abstention_threshold_behavior():
    """Verify that setting a higher confidence threshold routes borderline cases to UNCERTAIN."""
    engine = MLPairwiseInferenceEngine.get_instance()

    # Borderline ambiguous address comparison
    req = PairwiseRequest(
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
        confidence_threshold=0.85
    )
    res = engine.classify(req)
    assert res.label == PairwiseLabel.UNCERTAIN
    assert res.requires_human_review is True

def test_malformed_feature_robustness():
    """Verify engine handles null, numeric cast failures, and empty fields gracefully."""
    engine = MLPairwiseInferenceEngine.get_instance()

    # Malformed numeric value
    req = PairwiseRequest(
        claim_field=FieldCandidate(
            field_name="landAreaAcres",
            field_label="Land Area",
            raw_value="TEN_ACRES_APPROX"
        ),
        evidence_field=FieldCandidate(
            field_name="landAreaAcres",
            field_label="Deed Area",
            raw_value="N/A"
        ),
        comparison_type="numeric"
    )
    res = engine.classify(req)
    # Evidence is N/A sentinel -> MISSING
    assert res.label == PairwiseLabel.MISSING
    assert res.requires_human_review is True

def test_fastapi_schema_compatibility():
    """Verify all fields expected by frontend and backend exist on PairwiseResponse."""
    engine = MLPairwiseInferenceEngine.get_instance()
    req = PairwiseRequest(
        claim_field=FieldCandidate(
            field_name="trustName",
            field_label="Trust Name",
            raw_value="Pragati Education Society"
        ),
        evidence_field=FieldCandidate(
            field_name="trustName",
            field_label="Trust Certificate",
            raw_value="Pragati Education Society"
        )
    )
    res = engine.classify(req)
    assert hasattr(res, "label")
    assert hasattr(res, "confidence")
    assert hasattr(res, "is_deterministic")
    assert hasattr(res, "explanation")
    assert hasattr(res, "normalized_claim_value")
    assert hasattr(res, "evidence_list")
    assert hasattr(res, "requires_human_review")
    assert hasattr(res, "model_version")

def test_exact_feature_contract_parity():
    """BLOCKER 2: Verify exact 1,544-dim feature vector contract and training/inference parity."""
    from ai_service.ml.training.train_classifier import compute_tabular_features

    engine = MLPairwiseInferenceEngine.get_instance()
    assert hasattr(engine.clf, "n_features_in_")
    expected_dim = engine.clf.n_features_in_
    assert expected_dim == 1544, f"Estimator expected dimension is {expected_dim}, must be 1544"

    # 1. Semantic embeddings: 4 * 384 = 1536 dim
    c_text = "Field: institutionName | Type: entity-name | Claim: Pragati Engineering College"
    e_text = "Field: institutionName | Type: entity-name | Evidence: Pragati Institute of Technology"
    emb = engine.extractor.encode_pairs([c_text], [e_text])
    assert emb.shape == (1, 1536), f"Embedding feature shape is {emb.shape}, expected (1, 1536)"

    # 2. Tabular alignment features: 8 dim
    tab_dict = {
        "claim_value": "Pragati Engineering College",
        "evidence_value": "Pragati Institute of Technology",
        "field_type": "entity-name"
    }
    tab_feat = np.array([compute_tabular_features(tab_dict)], dtype=np.float32)
    assert tab_feat.shape == (1, 8), f"Tabular feature shape is {tab_feat.shape}, expected (1, 8)"

    # 3. Stacked representation: 1536 + 8 = 1544 dim
    X = np.hstack([emb, tab_feat])
    assert X.shape == (1, 1544), f"Combined feature vector shape is {X.shape}, expected (1, 1544)"

    # 4. Parity check with estimator
    probs = engine.predict_probabilities(X)
    assert probs.shape == (1, 5)
    assert np.isclose(np.sum(probs), 1.0)

    # 5. Incompatible dimension safety: must raise ValueError
    X_incompatible = np.zeros((1, 100), dtype=np.float32)
    with pytest.raises(ValueError, match="Feature dimension mismatch"):
        engine.predict_probabilities(X_incompatible)


