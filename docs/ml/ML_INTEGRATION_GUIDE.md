# Form2Fact — Machine Learning Integration Guide

**Integration Endpoint:** `ai_service/app/main.py` (`POST /api/v1/classify-pair`)  
**Backend Caller:** `server/modules/verification/pairwiseEngine.ts` (Node.js)

---

## 1. API Contract Specification

### Request (`POST /api/v1/classify-pair`)
```json
{
  "domain_id": "aicte",
  "claim_field": {
    "field_name": "landAreaAcres",
    "field_label": "Declared Campus Land Area",
    "raw_value": "7.50"
  },
  "evidence_field": {
    "field_name": "landAreaAcres",
    "field_label": "Title Deed Land Area",
    "raw_value": "6.00",
    "document_name": "Land Title Deed.pdf",
    "page_number": 4
  },
  "comparison_type": "numeric",
  "confidence_threshold": 0.75
}
```

### Response (`200 OK`)
```json
{
  "label": "MISMATCH",
  "confidence": 0.98,
  "is_deterministic": false,
  "explanation": "ML semantic classification: MISMATCH (Confidence: 98.0%).",
  "normalized_claim_value": "7.50",
  "normalized_evidence_value": "6.00",
  "evidence_list": [
    {
      "id": "ev-anon",
      "document_id": "doc-unknown",
      "document_name": "Land Title Deed.pdf",
      "page_number": 4,
      "field_id": null,
      "evidence_text": "Extracted: 6.00",
      "evidence_role": "Conflicting Evidence"
    }
  ],
  "requires_human_review": true,
  "model_version": "form2fact-hybrid-pairwise-v2.0-ml"
}
```

---

## 2. Safe Fallback Guarantee
If the ML service (`ai_service`) is unreachable or undergoing restart:
1. The Node.js Express server does NOT crash.
2. The Node.js backend seamlessly executes its native deterministic engine in `server/modules/verification/pairwiseEngine.ts`.
3. The response clearly reports `is_deterministic: true` and logs fallback usage in audit logs.
