"""
Form2Fact ML Inference Service.
Implements the hybrid inference engine:
1. Fast-path deterministic screening (Missing values, exact string equivalence, OCR degradation)
2. ML embedding feature extraction (SentenceTransformer all-MiniLM-L6-v2) + tabular features
3. Supervised classification head prediction with calibrated probabilities (temperature scaling)
4. Decision policy & confidence calibration (abstains to UNCERTAIN if confidence < threshold)
5. Zero silent fallback: explicit errors when artifacts are missing or corrupt.
"""

import os
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
import numpy as np

from ai_service.ml.models.feature_extractor import PairwiseFeatureExtractor
from ai_service.ml.models.classifier_head import LABEL_NAMES, INT_TO_LABEL
from ai_service.ml.preprocessing.pipeline import (
    normalize_text, is_missing_value, is_ocr_degraded, extract_numeric,
    FieldInput, PairInput
)
from ai_service.app.schemas import (
    PairwiseRequest, PairwiseResponse, PairwiseLabel, EvidenceReference
)

logger = logging.getLogger("form2fact.ai_service.ml_engine")

ARTIFACTS_DIR = Path(__file__).parents[1] / "artifacts"
V2_CALIBRATED_WEIGHTS = ARTIFACTS_DIR / "v2" / "v2_calibrated_classifier_weights.pkl"
V2_CHAMPION_WEIGHTS = ARTIFACTS_DIR / "v2" / "v2_champion_classifier_weights.pkl"
V1_WEIGHTS = ARTIFACTS_DIR / "pairwise_classifier_weights.pkl"

V2_CONFIG = ARTIFACTS_DIR / "v2" / "v2_model_config.json"
V1_CONFIG = ARTIFACTS_DIR / "model_config.json"


class MLPairwiseInferenceEngine:
    _instance = None

    def __init__(self):
        self.extractor = PairwiseFeatureExtractor()
        self.clf = None
        self.config: Dict[str, Any] = {}
        self.is_calibrated: bool = False
        self.temperature: float = 1.0
        self.calibration_method: Optional[str] = None
        self.default_threshold: float = float(os.environ.get("FORM2FACT_ML_ABSTENTION_THRESHOLD", "0.60"))
        self.model_version: str = "form2fact-hybrid-pairwise-v2.0-champion"
        self.artifact_checksum: Optional[str] = None
        self.checksum_verified: bool = False
        self.startup_time_ms: float = 0.0
        self._load_artifacts()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_artifacts(self):
        import time
        import hashlib
        t_start = time.perf_counter()

        # Resolve config path
        config_path = os.environ.get("FORM2FACT_ML_CONFIG_PATH")
        if config_path:
            cfg_p = Path(config_path)
        elif V2_CONFIG.exists():
            cfg_p = V2_CONFIG
        elif V1_CONFIG.exists():
            cfg_p = V1_CONFIG
        else:
            cfg_p = None

        if cfg_p and cfg_p.exists():
            try:
                with open(cfg_p, "r", encoding="utf-8") as f:
                    self.config = json.load(f)
                self.model_version = self.config.get("model_version", self.model_version)
            except Exception as e:
                logger.error(f"Failed to load model config from {cfg_p}: {e}")
        else:
            self.config = {}

        # Resolve weights path
        weights_path = os.environ.get("FORM2FACT_ML_WEIGHTS_PATH")
        if weights_path:
            w_p = Path(weights_path)
        elif V2_CALIBRATED_WEIGHTS.exists():
            w_p = V2_CALIBRATED_WEIGHTS
        elif V2_CHAMPION_WEIGHTS.exists():
            w_p = V2_CHAMPION_WEIGHTS
        elif V1_WEIGHTS.exists():
            w_p = V1_WEIGHTS
        else:
            w_p = None

        if w_p and w_p.exists():
            try:
                raw_bytes = w_p.read_bytes()
                self.artifact_checksum = hashlib.sha256(raw_bytes).hexdigest()

                # Optional startup checksum validation
                expected_sha = os.environ.get("FORM2FACT_ML_EXPECTED_CHECKSUM")
                if expected_sha and self.artifact_checksum.lower() != expected_sha.lower().strip():
                    logger.error(
                        f"Checksum mismatch for {w_p}: got {self.artifact_checksum}, expected {expected_sha}"
                    )
                    self.checksum_verified = False
                    self.clf = None
                    return
                else:
                    self.checksum_verified = True

                import pickle
                loaded_obj = pickle.loads(raw_bytes)

                if isinstance(loaded_obj, dict) and "base_model" in loaded_obj:
                    # Calibrated wrapper artifact
                    self.clf = loaded_obj["base_model"]
                    self.temperature = float(loaded_obj.get("optimal_temperature", 1.0))
                    self.is_calibrated = True
                    self.calibration_method = loaded_obj.get("calibration_method", "temperature_scaling")
                    logger.info(
                        f"Loaded calibrated model artifact from {w_p} (T={self.temperature}, method={self.calibration_method}, sha256={self.artifact_checksum[:12]}...)"
                    )
                else:
                    # Raw estimator artifact
                    self.clf = loaded_obj
                    self.temperature = 1.0
                    self.is_calibrated = False
                    self.calibration_method = None
                    logger.info(f"Loaded raw classifier artifact from {w_p} (sha256={self.artifact_checksum[:12]}...)")
            except Exception as e:
                logger.error(f"Failed to load weights from {w_p}: {e}")
                self.clf = None
                self.checksum_verified = False
        else:
            logger.warning(f"Weights path {w_p} does not exist.")
            self.clf = None
            self.checksum_verified = False

        self.startup_time_ms = round((time.perf_counter() - t_start) * 1000, 2)

    def is_ready(self) -> bool:
        return self.clf is not None and self.checksum_verified

    def predict_probabilities(self, X: np.ndarray) -> np.ndarray:
        """
        Compute predicted class probabilities with temperature scaling if calibrated.
        """
        if not self.is_ready():
            raise RuntimeError("ML pairwise model weights are missing or corrupt. Inference cannot proceed.")

        if hasattr(self.clf, "n_features_in_") and X.shape[1] != self.clf.n_features_in_:
            raise ValueError(
                f"Feature dimension mismatch: feature extractor generated {X.shape[1]} features, "
                f"but classifier head expects {self.clf.n_features_in_} features."
            )

        if self.is_calibrated and self.temperature != 1.0 and hasattr(self.clf, "decision_function"):
            decision = self.clf.decision_function(X)
            scaled = decision / self.temperature
            exp_s = np.exp(scaled - np.max(scaled, axis=1, keepdims=True))
            probs = exp_s / np.sum(exp_s, axis=1, keepdims=True)
            return probs
        else:
            return self.clf.predict_proba(X)

    def classify(self, request: PairwiseRequest) -> PairwiseResponse:
        claim = request.claim_field
        evidence = request.evidence_field
        threshold = request.confidence_threshold if request.confidence_threshold is not None else self.default_threshold
        model_ver = self.model_version

        # -------------------------------------------------------------
        # 1. Deterministic Rule 1: Missing Evidence
        # -------------------------------------------------------------
        if not evidence or not evidence.raw_value or is_missing_value(evidence.raw_value):
            return PairwiseResponse(
                label=PairwiseLabel.MISSING,
                confidence=1.0,
                is_deterministic=True,
                explanation=f"Required supporting document or evidence field '{claim.field_label}' was not provided in the docket.",
                normalized_claim_value=claim.normalized_value or claim.raw_value,
                normalized_evidence_value=None,
                evidence_list=[],
                requires_human_review=True,
                model_version=model_ver
            )

        evidence_list = []
        if evidence.document_name and evidence.page_number:
            evidence_list.append(EvidenceReference(
                id=f"ev-{evidence.field_id or 'anon'}",
                document_id=evidence.document_id or "doc-unknown",
                document_name=evidence.document_name,
                page_number=evidence.page_number,
                field_id=evidence.field_id,
                evidence_text=evidence.source_text or f"Extracted: {evidence.raw_value}",
                evidence_role="Conflicting Evidence"
            ))

        # -------------------------------------------------------------
        # 2. Deterministic Rule 2: Incompatible Semantic Fields
        # -------------------------------------------------------------
        if request.comparison_type == "not_comparable":
            return PairwiseResponse(
                label=PairwiseLabel.NOT_COMPARABLE,
                confidence=1.0,
                is_deterministic=True,
                explanation=f"Field '{claim.field_name}' and field '{evidence.field_name}' represent distinct incompatible statutory concepts.",
                normalized_claim_value=claim.raw_value,
                normalized_evidence_value=evidence.raw_value,
                evidence_list=[],
                requires_human_review=False,
                model_version=model_ver
            )

        # -------------------------------------------------------------
        # 3. Deterministic Rule 3: OCR Degradation & Corruption
        # -------------------------------------------------------------
        if is_ocr_degraded(claim.raw_value) or is_ocr_degraded(evidence.raw_value):
            return PairwiseResponse(
                label=PairwiseLabel.UNCERTAIN,
                confidence=0.30,
                is_deterministic=True,
                explanation="Degraded OCR scan layer detected or text unreadable; strictly abstaining to UNCERTAIN for human inspection.",
                normalized_claim_value=claim.raw_value,
                normalized_evidence_value=evidence.raw_value,
                evidence_list=evidence_list,
                requires_human_review=True,
                model_version=model_ver
            )

        norm_claim = normalize_text(claim.normalized_value or claim.raw_value)
        norm_evidence = normalize_text(evidence.normalized_value or evidence.raw_value)

        # -------------------------------------------------------------
        # 4. Deterministic Rule 4: Exact Normalized Concordance (Fast Path)
        # -------------------------------------------------------------
        if norm_claim == norm_evidence and norm_claim != "":
            return PairwiseResponse(
                label=PairwiseLabel.MATCH,
                confidence=1.0,
                is_deterministic=True,
                explanation=f"Exact normalized concordance verified on {claim.field_label} ('{claim.raw_value}').",
                normalized_claim_value=norm_claim,
                normalized_evidence_value=norm_evidence,
                evidence_list=evidence_list,
                requires_human_review=False,
                model_version=model_ver
            )

        # -------------------------------------------------------------
        # 5. ML Hybrid Inference Path (No Silent Fallback)
        # -------------------------------------------------------------
        if not self.is_ready():
            raise RuntimeError(
                "ML Pairwise Classifier artifact is not ready or failed to load. "
                "Silent fallback is disabled to prevent unverified regulatory predictions."
            )

        # Build text inputs for transformer
        c_text = f"Field: {claim.field_name} | Type: {request.comparison_type} | Claim: {claim.raw_value}"
        e_text = f"Field: {evidence.field_name} | Type: {request.comparison_type} | Evidence: {evidence.raw_value}"

        # Dense embeddings (1536 dim)
        emb = self.extractor.encode_pairs([c_text], [e_text])

        # Tabular alignment features (8 dim)
        from ai_service.ml.training.train_classifier import compute_tabular_features
        tab_dict = {
            "claim_value": claim.raw_value,
            "evidence_value": evidence.raw_value,
            "field_type": request.comparison_type
        }
        tab_feat = np.array([compute_tabular_features(tab_dict)], dtype=np.float32)

        X = np.hstack([emb, tab_feat])
        probs = self.predict_probabilities(X)[0]
        pred_idx = int(np.argmax(probs))
        pred_conf = float(probs[pred_idx])
        pred_label_str = INT_TO_LABEL[pred_idx]

        cal_indicator = " (calibrated)" if self.is_calibrated else ""

        # Enforce Abstention Policy: low-confidence ML predictions route to UNCERTAIN
        if pred_conf < threshold:
            return PairwiseResponse(
                label=PairwiseLabel.UNCERTAIN,
                confidence=round(pred_conf, 4),
                is_deterministic=False,
                explanation=(
                    f"ML prediction confidence ({pred_conf*100:.1f}%){cal_indicator} is below "
                    f"verification threshold ({threshold*100:.0f}%). "
                    f"Predicted tendency was {pred_label_str}. "
                    f"Abstaining to UNCERTAIN for officer adjudication."
                ),
                normalized_claim_value=norm_claim,
                normalized_evidence_value=norm_evidence,
                evidence_list=evidence_list,
                requires_human_review=True,
                model_version=model_ver
            )

        # Enforce Human-in-the-Loop policy for regulatory decisions:
        # MISMATCH, MISSING, and UNCERTAIN ALWAYS require human review.
        # MATCH requires human review if confidence < 0.95.
        if pred_label_str in ["MISMATCH", "MISSING", "UNCERTAIN"]:
            req_review = True
        elif pred_label_str == "NOT_COMPARABLE":
            req_review = False
        else:  # MATCH
            req_review = pred_conf < 0.95

        return PairwiseResponse(
            label=PairwiseLabel(pred_label_str),
            confidence=round(pred_conf, 4),
            is_deterministic=False,
            explanation=f"ML semantic classification: {pred_label_str} (Confidence: {pred_conf*100:.1f}%{cal_indicator}).",
            normalized_claim_value=norm_claim,
            normalized_evidence_value=norm_evidence,
            evidence_list=evidence_list,
            requires_human_review=req_review,
            model_version=model_ver
        )
