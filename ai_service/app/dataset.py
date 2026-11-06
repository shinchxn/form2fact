from typing import List, Dict, Any
from .schemas import DatasetExample, PairwiseLabel, PairwiseRequest, FieldCandidate
from .classifier import HybridPairwiseClassifier


ANNOTATION_GUIDELINES = """
# Form2Fact Pairwise Field Annotation Guidelines
1. Ground Truth Labels:
   - MATCH: The claim and evidence represent the exact same underlying institutional fact.
   - MISMATCH: The claim and evidence contradict each other in a legally or materially significant way.
   - MISSING: The supporting evidence document was completely omitted from the docket.
   - UNCERTAIN: The relationship is ambiguous, partially legible, or cannot be resolved without human committee context.
   - NOT_COMPARABLE: The two fields represent distinct, unrelated dimensions.
2. Evidence Anchor Requirement:
   - Every annotation must link to an explicit document type, page number, and text snippet.
3. Separation of Synthetic vs. Real Data:
   - Synthetic fixtures must set is_synthetic=True and must never be mixed with ground-truth real data without explicit labeling.
"""

SYNTHETIC_BENCHMARK_DATASET: List[DatasetExample] = [
    DatasetExample(
        example_id="syn-001",
        domain="aicte",
        document_types=["Land Lease Deed"],
        field_name="leaseExpiryDate",
        claim_value="2054-03-31",
        evidence_value="2054-03-31",
        relationship_type="tenure_expiry",
        ground_truth_label=PairwiseLabel.MATCH,
        reviewer_rationale="Matching 30-year unencumbered lease expiry date.",
        is_synthetic=True
    ),
    DatasetExample(
        example_id="syn-002",
        domain="aicte",
        document_types=["Land Lease Deed"],
        field_name="leaseExpiryDate",
        claim_value="2048-03-31",
        evidence_value="2028-03-31",
        relationship_type="tenure_expiry",
        ground_truth_label=PairwiseLabel.MISMATCH,
        reviewer_rationale="Material 20-year deficit in deed termination clause.",
        is_synthetic=True
    ),
    DatasetExample(
        example_id="syn-003",
        domain="aicte",
        document_types=["Land Lease Deed"],
        field_name="landAreaAcres",
        claim_value="7.50",
        evidence_value="5.20",
        relationship_type="campus_area",
        ground_truth_label=PairwiseLabel.MISMATCH,
        reviewer_rationale="Acreage deficit of 2.30 acres.",
        is_synthetic=True
    ),
    DatasetExample(
        example_id="syn-004",
        domain="aicte",
        document_types=["Society / Trust Registration Certificate"],
        field_name="trustName",
        claim_value="Pragati Educational & Welfare Foundation",
        evidence_value="Pragati Commercial Enterprises Ltd",
        relationship_type="sponsoring_body",
        ground_truth_label=PairwiseLabel.MISMATCH,
        reviewer_rationale="Commercial corporate entity contradicts statutory educational trust.",
        is_synthetic=True
    ),
    DatasetExample(
        example_id="syn-005",
        domain="aicte",
        document_types=["Society / Trust Registration Certificate"],
        field_name="trustName",
        claim_value="Kalyani Charitable Trust",
        evidence_value="Kalyani Charitable Educational Trust",
        relationship_type="sponsoring_body",
        ground_truth_label=PairwiseLabel.MATCH,
        reviewer_rationale="Core distinctive tokens match with permissible legal variant.",
        is_synthetic=True
    ),
    DatasetExample(
        example_id="syn-006",
        domain="aicte",
        document_types=["Building Safety Certificate"],
        field_name="buildingSafetyStatus",
        claim_value="Certified Sound",
        evidence_value=None,
        relationship_type="mandatory_safety",
        ground_truth_label=PairwiseLabel.MISSING,
        reviewer_rationale="Certificate missing from submission docket.",
        is_synthetic=True
    ),
    DatasetExample(
        example_id="syn-007",
        domain="aicte",
        document_types=["AICTE Prior Approval Order"],
        field_name="priorApprovalOrderRef",
        claim_value="F.No. Western/1-35128912/2025/EOA",
        evidence_value="F.No. Western/1-35128912/2025/EOA",
        relationship_type="prior_order",
        ground_truth_label=PairwiseLabel.MATCH,
        reviewer_rationale="Identical previous year approval file number.",
        is_synthetic=True
    ),
    DatasetExample(
        example_id="syn-008",
        domain="aicte",
        document_types=["Land Lease Deed"],
        field_name="landAreaAcres",
        claim_value="7.50",
        evidence_value="Special Economic Zone Plot 44",
        relationship_type="campus_area",
        ground_truth_label=PairwiseLabel.UNCERTAIN,
        reviewer_rationale="Ambiguous schedule description requires surveyor site inspection.",
        is_synthetic=True
    )
]


def evaluate_baseline_classifier() -> Dict[str, Any]:
    classifier = HybridPairwiseClassifier(confidence_threshold=0.75)
    total = len(SYNTHETIC_BENCHMARK_DATASET)
    correct = 0
    predictions = []
    confusion_matrix = {label.value: {l.value: 0 for l in PairwiseLabel} for label in PairwiseLabel}

    for ex in SYNTHETIC_BENCHMARK_DATASET:
        req = PairwiseRequest(
            domain_id=ex.domain,
            claim_field=FieldCandidate(
                field_name=ex.field_name,
                field_label=ex.field_name,
                raw_value=ex.claim_value
            ),
            evidence_field=FieldCandidate(
                field_name=ex.field_name,
                field_label=ex.field_name,
                raw_value=ex.evidence_value or "",
                document_name=ex.document_types[0] if ex.document_types else "TestDoc.pdf",
                page_number=1
            ) if ex.evidence_value else None,
            comparison_type="numeric" if "area" in ex.field_name.lower() else ("entity-name" if "name" in ex.field_name.lower() else "generic")
        )

        res = classifier.classify(req)
        is_correct = res.label.value == ex.ground_truth_label.value
        if is_correct:
            correct += 1

        confusion_matrix[ex.ground_truth_label.value][res.label.value] += 1
        predictions.append({
            "example_id": ex.example_id,
            "field": ex.field_name,
            "ground_truth": ex.ground_truth_label.value,
            "predicted": res.label.value,
            "confidence": res.confidence,
            "is_correct": is_correct
        })

    accuracy = correct / total if total > 0 else 0.0
    abstention_count = sum(1 for p in predictions if p["predicted"] == PairwiseLabel.UNCERTAIN.value)

    return {
        "dataset_size": total,
        "correct_predictions": correct,
        "accuracy": round(accuracy, 4),
        "abstention_rate": round(abstention_count / total, 4) if total > 0 else 0.0,
        "confusion_matrix": confusion_matrix,
        "predictions": predictions,
        "model_version": classifier.classify(req).model_version
    }

