from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class PairwiseLabel(str, Enum):
    MATCH = "MATCH"
    MISMATCH = "MISMATCH"
    MISSING = "MISSING"
    UNCERTAIN = "UNCERTAIN"
    NOT_COMPARABLE = "NOT_COMPARABLE"


class FieldCandidate(BaseModel):
    field_id: Optional[str] = None
    document_id: Optional[str] = None
    document_name: Optional[str] = None
    field_name: str
    field_label: str
    raw_value: str
    normalized_value: Optional[str] = None
    page_number: Optional[int] = None
    source_text: Optional[str] = None
    confidence: Optional[float] = None


class PairwiseRequest(BaseModel):
    domain_id: str = "aicte"
    relationship_id: Optional[str] = None
    claim_field: FieldCandidate
    evidence_field: Optional[FieldCandidate] = None
    comparison_type: Optional[str] = Field(default="generic", description="date | numeric | entity-name | code | generic")
    tolerance_threshold: Optional[float] = 0.05
    confidence_threshold: Optional[float] = 0.75


class EvidenceReference(BaseModel):
    id: str
    document_id: str
    document_name: str
    page_number: int
    field_id: Optional[str] = None
    evidence_text: str
    evidence_role: str = "Conflicting Evidence"


class PairwiseResponse(BaseModel):
    label: PairwiseLabel
    confidence: float
    is_deterministic: bool
    explanation: str
    normalized_claim_value: str
    normalized_evidence_value: Optional[str] = None
    evidence_list: List[EvidenceReference] = []
    requires_human_review: bool
    model_version: str


class BatchPairwiseRequest(BaseModel):
    comparisons: List[PairwiseRequest]


class BatchPairwiseResponse(BaseModel):
    results: List[PairwiseResponse]
    total: int
    matches: int
    mismatches: int
    missing: int
    uncertain: int
    not_comparable: int


class DatasetExample(BaseModel):
    example_id: str
    domain: str
    document_types: List[str]
    field_name: str
    claim_value: str
    evidence_value: Optional[str]
    relationship_type: str
    ground_truth_label: PairwiseLabel
    reviewer_rationale: str
    is_synthetic: bool = True

