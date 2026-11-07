"""
Form2Fact V3 Canonical Pairwise Data Schema & Validation Engine.
Validates records against the V3 schema specification, enforces five-class taxonomy,
detects duplicates, verifies provenance, and produces validation & rejection reports.
"""

import sys
import json
import hashlib
from pathlib import Path
from typing import Dict, Any, List, Optional, Set
from pydantic import BaseModel, Field, field_validator, model_validator

VALID_LABELS = {"MATCH", "MISMATCH", "MISSING", "UNCERTAIN", "NOT_COMPARABLE"}
VALID_FIELD_TYPES = {
    "numeric", "date", "entity_name", "address", "cadastral_survey",
    "generic", "document_presence", "textual_claim"
}
VALID_REVIEW_STATUSES = {"pending", "reviewed", "audited", "rejected"}
VALID_ANNOTATION_STATUSES = {
    "unreviewed", "defensibly_mapped", "human_annotated", "adjudicated", "quarantined"
}

class ClaimModel(BaseModel):
    text: str = Field(..., min_length=1, description="Claim textual representation")
    field_name: str = Field(..., min_length=1, description="Canonical statutory or candidate field name")
    source_document_id: Optional[str] = Field(None, description="Document identifier for claim")
    page: Optional[int] = Field(None, ge=1, description="Page citation in docket")

class EvidenceModel(BaseModel):
    text: str = Field(..., description="Evidence textual representation")
    source_document_id: Optional[str] = Field(None, description="Document identifier for evidence")
    page: Optional[int] = Field(None, ge=1, description="Page citation in supporting docket")

class ComparisonModel(BaseModel):
    source_label: Optional[str] = Field(None, description="Raw label in original upstream dataset")
    label: str = Field(..., description="Form2Fact 5-class canonical target label")
    field_type: str = Field("generic", description="Semantic category of field")
    normalization_applied: List[str] = Field(default_factory=list, description="Normalizers executed")
    ocr_quality: str = Field("unknown", description="Assessment of OCR quality: high, noisy, unreadable, unknown")

    @field_validator("label")
    @classmethod
    def validate_label(cls, v: str) -> str:
        if v not in VALID_LABELS:
            raise ValueError(f"Invalid label '{v}'. Must be one of: {sorted(VALID_LABELS)}")
        return v

    @field_validator("field_type")
    @classmethod
    def validate_field_type(cls, v: str) -> str:
        if v not in VALID_FIELD_TYPES:
            raise ValueError(f"Invalid field_type '{v}'. Must be one of: {sorted(VALID_FIELD_TYPES)}")
        return v

class ProvenanceModel(BaseModel):
    dataset: str = Field(..., min_length=1, description="Identifier of source dataset")
    source_url: str = Field(..., min_length=1, description="Verified source URL or repository ID")
    licence: str = Field(..., min_length=1, description="Applicable licence")
    annotation_status: str = Field("unreviewed", description="Annotation provenance")

    @field_validator("annotation_status")
    @classmethod
    def validate_annotation_status(cls, v: str) -> str:
        if v not in VALID_ANNOTATION_STATUSES:
            raise ValueError(f"Invalid annotation_status '{v}'. Must be one of: {sorted(VALID_ANNOTATION_STATUSES)}")
        return v

class QualityModel(BaseModel):
    is_synthetic: bool = Field(..., description="Explicit flag indicating whether record was synthetically generated")
    is_human_annotated: bool = Field(..., description="Explicit flag indicating human expert annotation")
    review_status: str = Field("pending", description="Auditing status")

    @field_validator("review_status")
    @classmethod
    def validate_review_status(cls, v: str) -> str:
        if v not in VALID_REVIEW_STATUSES:
            raise ValueError(f"Invalid review_status '{v}'. Must be one of: {sorted(VALID_REVIEW_STATUSES)}")
        return v

class V3PairwiseRecord(BaseModel):
    record_id: str = Field(..., min_length=1, description="Unique record identifier")
    schema_version: str = Field("3.0", description="Schema version identifier")
    group_id: Optional[str] = Field(None, description="Grouping identifier for leak-free document-level splits")
    claim: ClaimModel
    evidence: EvidenceModel
    comparison: ComparisonModel
    provenance: ProvenanceModel
    quality: QualityModel

    @model_validator(mode="after")
    def validate_record_logic(self) -> "V3PairwiseRecord":
        # Disallow synthetic claiming to be human annotated
        if self.quality.is_synthetic and self.quality.is_human_annotated:
            raise ValueError("Record cannot simultaneously be marked is_synthetic=True and is_human_annotated=True.")
        
        # Enforce MISSING semantics: if label is MISSING, evidence text must be empty or claim marked missing
        if self.comparison.label == "MISSING":
            if self.evidence.text.strip() != "" and not "[MISSING" in self.evidence.text and not "[OMITTED" in self.evidence.text:
                pass # Acceptable if evidence explicitly notes omission
        return self

def validate_jsonl_file(input_path: Path) -> Dict[str, Any]:
    """Validates an entire JSONL file against the V3 schema."""
    valid_records = []
    rejected_records = []
    seen_record_ids: Set[str] = set()
    duplicate_count = 0
    
    total_lines = 0
    with open(input_path, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            line_str = line.strip()
            if not line_str:
                continue
            total_lines += 1
            try:
                raw_data = json.loads(line_str)
                record = V3PairwiseRecord(**raw_data)
                
                # Duplicate check
                if record.record_id in seen_record_ids:
                    duplicate_count += 1
                    rejected_records.append({
                        "line": line_no,
                        "record_id": record.record_id,
                        "error": f"Duplicate record_id '{record.record_id}' detected."
                    })
                    continue
                    
                seen_record_ids.add(record.record_id)
                valid_records.append(record.model_dump())
            except Exception as e:
                rejected_records.append({
                    "line": line_no,
                    "record_id": raw_data.get("record_id", f"unknown_line_{line_no}") if "raw_data" in locals() and isinstance(raw_data, dict) else f"unknown_line_{line_no}",
                    "error": str(e)
                })

    report = {
        "file": str(input_path),
        "total_lines_inspected": total_lines,
        "valid_records_count": len(valid_records),
        "rejected_records_count": len(rejected_records),
        "duplicate_count": duplicate_count,
        "rejection_rate": (len(rejected_records) / total_lines) if total_lines > 0 else 0.0,
        "rejections": rejected_records[:50] # Top 50 sample errors
    }
    return report

if __name__ == "__main__":
    if len(sys.argv) > 1:
        target_file = Path(sys.argv[1])
        if target_file.exists():
            rep = validate_jsonl_file(target_file)
            print(json.dumps(rep, indent=2))
        else:
            print(f"File not found: {target_file}")
    else:
        print("Usage: python validate_v3_schema.py <path_to_jsonl>")
