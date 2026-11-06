# Python AI Microservice API Contracts

## 1. Service Overview

The Python AI Microservice is built with **FastAPI** and **Pydantic v2**. It runs on port `8000` (or container service `ai_service:8000`) and handles machine learning classification tasks for Form2Fact.

All input requests and output responses are strictly validated using Pydantic models defined in `ai_service/app/schemas.py`.

---

## 2. Endpoints

### 2.1 Health Check
`GET /api/v1/health`
- **Description:** Verifies service uptime and returns loaded ML capabilities.
- **Response `200 OK`:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "capabilities": ["pairwise-classification", "batch-inference", "baseline-evaluator"]
}
```

### 2.2 Classify Pair
`POST /api/v1/classify-pair`
- **Description:** Classifies a single pairwise claim vs evidence candidate.
- **Request Body (`PairwiseRequest`):**
```json
{
  "field_name": "sponsoring_trust_name",
  "claim_text": "Pragati Educational Trust",
  "evidence_text": "Pragati Education Society",
  "domain_id": "aicte",
  "threshold": 0.85
}
```
- **Response Body (`PairwiseResponse`):**
```json
{
  "label": "MATCH",
  "confidence": 0.88,
  "requires_human_review": false,
  "explanation": "High token concordance between 'Pragati Educational Trust' and 'Pragati Education Society' (concordance 0.88 >= 0.85).",
  "details": {
    "overlap_score": 0.88,
    "fast_path_matched": false,
    "abstention_triggered": false
  }
}
```

### 2.3 Batch Classify
`POST /api/v1/batch-classify`
- **Description:** Classifies an array of pairwise candidates in a single vectorizable request.
- **Request Body (`BatchPairwiseRequest`):**
```json
{
  "pairs": [
    {
      "field_name": "lease_expiry_date",
      "claim_text": "2055-03-31",
      "evidence_text": "2055-03-31",
      "domain_id": "aicte",
      "threshold": 0.85
    },
    {
      "field_name": "land_area_acres",
      "claim_text": "7.50",
      "evidence_text": "6.00",
      "domain_id": "aicte",
      "threshold": 0.85
    }
  ]
}
```
- **Response Body:** Array of `PairwiseResponse` objects in corresponding index order.

### 2.4 Evaluate Synthetic Baseline
`GET /api/v1/evaluate-baseline`
- **Description:** Executes the standardized 8-example benchmark evaluation suite and returns per-class precision and macro accuracy.
- **Response `200 OK`:**
```json
{
  "status": "success",
  "accuracy": 0.75,
  "total_evaluated": 8,
  "correct_predictions": 6,
  "results": [ ... ]
}
```

