import re
from typing import Tuple, List
from .schemas import (
    PairwiseRequest,
    PairwiseResponse,
    PairwiseLabel,
    EvidenceReference
)

MODEL_VERSION = "form2fact-pairwise-ml-v1.0.0"


def normalize_text(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"[.,\/#!$%\^&\*;:{}=\-_`~()\"'’“”]", " ", text.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def calculate_jaccard(str1: str, str2: str) -> float:
    tokens1 = set(normalize_text(str1).split())
    tokens2 = set(normalize_text(str2).split())
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)


class HybridPairwiseClassifier:
    """
    Pairwise field mismatch classifier implementing the hybrid deterministic + semantic pipeline.
    """

    def __init__(self, confidence_threshold: float = 0.75):
        self.confidence_threshold = confidence_threshold

    def classify(self, request: PairwiseRequest) -> PairwiseResponse:
        claim = request.claim_field
        evidence = request.evidence_field
        threshold = request.confidence_threshold or self.confidence_threshold

        # 1. Missing evidence check
        if not evidence or not evidence.raw_value or not evidence.raw_value.strip():
            return PairwiseResponse(
                label=PairwiseLabel.MISSING,
                confidence=1.0,
                is_deterministic=True,
                explanation=f"Required supporting document or field '{claim.field_label}' was not provided in the docket.",
                normalized_claim_value=claim.normalized_value or claim.raw_value,
                normalized_evidence_value=None,
                evidence_list=[],
                requires_human_review=True,
                model_version=MODEL_VERSION
            )

        # 2. Compatibility check
        if claim.field_name != evidence.field_name and not self._is_compatible_field(claim.field_name, evidence.field_name):
            return PairwiseResponse(
                label=PairwiseLabel.NOT_COMPARABLE,
                confidence=0.99,
                is_deterministic=True,
                explanation=f"Field '{claim.field_name}' and field '{evidence.field_name}' do not represent equivalent statutory concepts.",
                normalized_claim_value=claim.raw_value,
                normalized_evidence_value=evidence.raw_value,
                evidence_list=[],
                requires_human_review=False,
                model_version=MODEL_VERSION
            )

        # Build evidence reference if available
        evidence_list: List[EvidenceReference] = []
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

        norm_claim = normalize_text(claim.normalized_value or claim.raw_value)
        norm_evidence = normalize_text(evidence.normalized_value or evidence.raw_value)

        # 3. Exact normalized match (Deterministic fast-path)
        if norm_claim == norm_evidence and norm_claim != "":
            return PairwiseResponse(
                label=PairwiseLabel.MATCH,
                confidence=1.0,
                is_deterministic=True,
                explanation=f"Exact normalized string match on {claim.field_label} (\"{claim.raw_value}\").",
                normalized_claim_value=norm_claim,
                normalized_evidence_value=norm_evidence,
                evidence_list=evidence_list,
                requires_human_review=False,
                model_version=MODEL_VERSION
            )

        # 4. Numeric / Acreage Evaluation
        if request.comparison_type == "numeric" or "acres" in claim.field_name.lower() or "area" in claim.field_name.lower():
            try:
                c_val = float(re.sub(r"[^\d.]", "", claim.normalized_value or claim.raw_value))
                e_val = float(re.sub(r"[^\d.]", "", evidence.normalized_value or evidence.raw_value))
                tolerance = request.tolerance_threshold or 0.05
                if abs(c_val - e_val) <= tolerance:
                    return PairwiseResponse(
                        label=PairwiseLabel.MATCH,
                        confidence=0.98,
                        is_deterministic=True,
                        explanation=f"Acreage values agree within tolerance: Claimed {c_val} vs Evidence {e_val} (diff: {abs(c_val - e_val):.2f}).",
                        normalized_claim_value=str(c_val),
                        normalized_evidence_value=str(e_val),
                        evidence_list=evidence_list,
                        requires_human_review=False,
                        model_version=MODEL_VERSION
                    )
                else:
                    return PairwiseResponse(
                        label=PairwiseLabel.MISMATCH,
                        confidence=0.98,
                        is_deterministic=True,
                        explanation=f"Acreage deficit detected: Claimed {c_val} Acres vs Document Evidence {e_val} Acres (Deficit: {c_val - e_val:.2f} Acres).",
                        normalized_claim_value=str(c_val),
                        normalized_evidence_value=str(e_val),
                        evidence_list=evidence_list,
                        requires_human_review=True,
                        model_version=MODEL_VERSION
                    )
            except ValueError:
                pass

        # 5. Entity Name Semantic Concordance
        if request.comparison_type == "entity-name" or "trust" in claim.field_name.lower() or "name" in claim.field_name.lower():
            jaccard = calculate_jaccard(claim.raw_value, evidence.raw_value)
            # Commercial marker divergence check
            commercial_markers = {"commercial", "enterprises", "holding", "corp", "corporation", "ltd"}
            claim_has_com = bool(set(norm_claim.split()).intersection(commercial_markers))
            evidence_has_com = bool(set(norm_evidence.split()).intersection(commercial_markers))

            if claim_has_com != evidence_has_com:
                return PairwiseResponse(
                    label=PairwiseLabel.MISMATCH,
                    confidence=0.95,
                    is_deterministic=False,
                    explanation="Material divergence: Sponsoring non-profit trust contradicted by private commercial entity naming.",
                    normalized_claim_value=norm_claim,
                    normalized_evidence_value=norm_evidence,
                    evidence_list=evidence_list,
                    requires_human_review=True,
                    model_version=MODEL_VERSION
                )

            if jaccard >= 0.5:
                return PairwiseResponse(
                    label=PairwiseLabel.MATCH,
                    confidence=round(jaccard, 2),
                    is_deterministic=False,
                    explanation=f"Entity names concordant with {jaccard*100:.0f}% token overlap.",
                    normalized_claim_value=norm_claim,
                    normalized_evidence_value=norm_evidence,
                    evidence_list=evidence_list,
                    requires_human_review=jaccard < threshold,
                    model_version=MODEL_VERSION
                )
            elif jaccard <= 0.2:
                return PairwiseResponse(
                    label=PairwiseLabel.MISMATCH,
                    confidence=round(1.0 - jaccard, 2),
                    is_deterministic=False,
                    explanation=f"Entity names diverge materially ({jaccard*100:.0f}% overlap).",
                    normalized_claim_value=norm_claim,
                    normalized_evidence_value=norm_evidence,
                    evidence_list=evidence_list,
                    requires_human_review=True,
                    model_version=MODEL_VERSION
                )

        # 6. General semantic similarity & Abstention to UNCERTAIN
        overlap = calculate_jaccard(norm_claim, norm_evidence)
        if overlap >= 0.8:
            return PairwiseResponse(
                label=PairwiseLabel.MATCH,
                confidence=round(overlap, 2),
                is_deterministic=False,
                explanation=f"High semantic overlap ({overlap*100:.0f}%).",
                normalized_claim_value=norm_claim,
                normalized_evidence_value=norm_evidence,
                evidence_list=evidence_list,
                requires_human_review=overlap < threshold,
                model_version=MODEL_VERSION
            )
        elif overlap <= 0.2:
            return PairwiseResponse(
                label=PairwiseLabel.MISMATCH,
                confidence=round(1.0 - overlap, 2),
                is_deterministic=False,
                explanation=f"Semantic mismatch detected ({overlap*100:.0f}% overlap).",
                normalized_claim_value=norm_claim,
                normalized_evidence_value=norm_evidence,
                evidence_list=evidence_list,
                requires_human_review=True,
                model_version=MODEL_VERSION
            )

        # Abstain to UNCERTAIN when confidence does not exceed threshold
        return PairwiseResponse(
            label=PairwiseLabel.UNCERTAIN,
            confidence=round(overlap, 2),
            is_deterministic=False,
            explanation=f"Ambiguous comparison: Confidence {overlap*100:.0f}% is below verification threshold {threshold*100:.0f}%. Abstaining to human inspection.",
            normalized_claim_value=norm_claim,
            normalized_evidence_value=norm_evidence,
            evidence_list=evidence_list,
            requires_human_review=True,
            model_version=MODEL_VERSION
        )

    def _is_compatible_field(self, a: str, b: str) -> bool:
        clean_a = re.sub(r"[^a-z]", "", a.lower())
        clean_b = re.sub(r"[^a-z]", "", b.lower())
        if clean_a == clean_b:
            return True
        aliases = {
            "leaseexpirydate": ["validupto", "terminationdate", "expirydate"],
            "landareaacres": ["campusarea", "landarea", "totalarea"],
            "trustname": ["societyname", "foundationname", "sponsoringbody"],
            "priorapprovalorderref": ["previousapprovalref", "fnoreference"]
        }
        for k, v in aliases.items():
            if (k == clean_a and clean_b in v) or (k == clean_b and clean_a in v):
                return True
        return False

