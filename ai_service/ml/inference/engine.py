"""
Form2Fact ML Inference Service.
Implements the hybrid inference engine:
1. Fast-path deterministic screening (Missing values, exact string equivalence, OCR degradation)
2. ML embedding feature extraction (SentenceTransformer all-MiniLM-L6-v2) + tabular features
3. Supervised classification head prediction
4. Decision policy & confidence calibration (abstains to UNCERTAIN if confidence < threshold)
"""

import json
from pathlib import Path
from typing import Optional, Dict, Any
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

ARTIFACTS_DIR = Path(__file__).parents[1] / "artifacts"
CONFIG_PATH = ARTIFACTS_DIR / "model_config.json"
WEIGHTS_PATH = ARTIFACTS_DIR / "pairwise_classifier_weights.pkl"

class MLPairwiseInferenceEngine:
    _instance = None

    def __init__(self):
        self.extractor = PairwiseFeatureExtractor()
        self.clf = None
        self.config = {}
        self._load_artifacts()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_artifacts(self):
        if CONFIG_PATH.exists():
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                self.config = json.load(f)
        if WEIGHTS_PATH.exists():
            import pickle
            with open(WEIGHTS_PATH, "rb") as f:
                self.clf = pickle.load(f)

    def is_ready(self) -> bool:
        return self.clf is not None

    def classify(self, request: PairwiseRequest) -> PairwiseResponse:
        claim = request.claim_field
        evidence = request.evidence_field
        threshold = request.confidence_threshold or 0.75
        model_version = self.config.get("model_version", "form2fact-hybrid-pairwise-v2.0-ml")

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
                model_version=model_version
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
                model_version=model_version
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
                model_version=model_version
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
                model_version=model_version
            )

        # -------------------------------------------------------------
        # 5. ML Hybrid Inference Path
        # -------------------------------------------------------------
        if not self.is_ready():
            # Fallback to Jaccard rule if weights not present
            return self._fallback_jaccard(claim, evidence, norm_claim, norm_evidence, threshold, model_version, evidence_list)

        try:
            # Build text inputs
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
            probs = self.clf.predict_proba(X)[0]
            pred_idx = int(np.argmax(probs))
            pred_conf = float(probs[pred_idx])
            pred_label_str = INT_TO_LABEL[pred_idx]

            # Enforce Abstention Policy: low-confidence ML predictions route to UNCERTAIN
            if pred_conf < threshold and pred_label_str in ["MATCH", "MISMATCH"]:
                return PairwiseResponse(
                    label=PairwiseLabel.UNCERTAIN,
                    confidence=round(pred_conf, 2),
                    is_deterministic=False,
                    explanation=f"ML prediction confidence ({pred_conf*100:.1f}%) below threshold ({threshold*100:.0f}%). Abstaining to UNCERTAIN for officer adjudication.",
                    normalized_claim_value=norm_claim,
                    normalized_evidence_value=norm_evidence,
                    evidence_list=evidence_list,
                    requires_human_review=True,
                    model_version=model_version
                )

            return PairwiseResponse(
                label=PairwiseLabel(pred_label_str),
                confidence=round(pred_conf, 2),
                is_deterministic=False,
                explanation=f"ML semantic classification: {pred_label_str} (Confidence: {pred_conf*100:.1f}%).",
                normalized_claim_value=norm_claim,
                normalized_evidence_value=norm_evidence,
                evidence_list=evidence_list,
                requires_human_review=pred_label_str != "MATCH" or pred_conf < 0.95,
                model_version=model_version
            )

        except Exception as e:
            return self._fallback_jaccard(claim, evidence, norm_claim, norm_evidence, threshold, model_version, evidence_list)

    def _fallback_jaccard(self, claim, evidence, norm_claim, norm_evidence, threshold, model_version, evidence_list):
        from ai_service.app.classifier import calculate_jaccard
        overlap = calculate_jaccard(norm_claim, norm_evidence)
        if overlap >= 0.8:
            lbl = PairwiseLabel.MATCH
            rev = False
        elif overlap <= 0.2:
            lbl = PairwiseLabel.MISMATCH
            rev = True
        else:
            lbl = PairwiseLabel.UNCERTAIN
            rev = True

        return PairwiseResponse(
            label=lbl,
            confidence=round(overlap, 2),
            is_deterministic=False,
            explanation=f"Fallback lexical matching: {overlap*100:.0f}% token overlap.",
            normalized_claim_value=norm_claim,
            normalized_evidence_value=norm_evidence,
            evidence_list=evidence_list,
            requires_human_review=rev,
            model_version=model_version
        )
