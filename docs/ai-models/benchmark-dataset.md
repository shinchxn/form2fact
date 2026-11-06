# Synthetic Benchmark Dataset & Evaluation Specification

## 1. Benchmark Dataset Overview

To quantitatively evaluate the pairwise mismatch classification pipeline and guard against regression during model updates, Form2Fact includes a standardized synthetic benchmark dataset (`ai_service/app/dataset.py`).

The dataset spans all 5 classification classes, testing exact matches, date format variations, acreage tolerance thresholds, severe entity divergences, and ambiguous entity names designed to test model abstention.

## 2. Dataset Schema (`DatasetExample`)

```json
{
  "example_id": "PAIR-001",
  "field_name": "lease_expiry_date",
  "claim_text": "2055-03-31",
  "evidence_text": "31st March 2055",
  "expected_label": "MATCH",
  "rationale": "Exact date match despite distinct syntactic formatting",
  "domain": "aicte"
}
```

## 3. Standard Benchmark Test Cases

| Example ID | Field Name | Claim Value | Evidence Value | Ground Truth | Test Objective |
|---|---|---|---|---|---|
| `PAIR-001` | `lease_expiry_date` | `2055-03-31` | `31st March 2055` | `MATCH` | Natural language date normalization |
| `PAIR-002` | `lease_expiry_date` | `2055-03-31` | `2028-03-31` | `MISMATCH` | Contradictory lease expiry dates |
| `PAIR-003` | `land_area_acres` | `7.50` | `7.50 Acres` | `MATCH` | Numeric value with unit suffix |
| `PAIR-004` | `land_area_acres` | `7.50` | `6.00 Acres` | `MISMATCH` | Land area deficit |
| `PAIR-005` | `sponsoring_trust_name` | `Pragati Educational Trust` | `Pragati Education Society` | `MATCH` | Organizational suffix concordance |
| `PAIR-006` | `sponsoring_trust_name` | `Pragati Educational Trust` | `Apex Real Estate Developers Ltd` | `MISMATCH` | Completely disjoint corporate entity |
| `PAIR-007` | `fire_noc_certificate` | `NOC-FIRE-2026-99` | `[OMITTED]` | `MISSING` | Missing supporting evidence document |
| `PAIR-008` | `sponsoring_trust_name` | `Tech valley educational campus sector 4` | `Tech valley research facility sector 4` | `UNCERTAIN` | Ambiguous token overlap triggering abstention |

## 4. Evaluation Metrics & Baseline Results

The baseline hybrid classifier is evaluated using standard multiclass classification metrics:

$$\text{Accuracy} = \frac{\sum_{i=1}^{N} \mathbb{I}(y_i = \hat{y}_i)}{N}$$

$$\text{Macro Precision} = \frac{1}{|C|} \sum_{c \in C} \frac{TP_c}{TP_c + FP_c}$$

$$\text{Macro Recall} = \frac{1}{|C|} \sum_{c \in C} \frac{TP_c}{TP_c + FN_c}$$

### 4.1 Evaluation Execution

The evaluation can be executed via the Python AI microservice:
```bash
# Via FastAPI endpoint
curl -X GET http://localhost:8000/api/v1/evaluate-baseline

# Or directly via Python script
python -c "from app.dataset import evaluate_baseline_classifier; import json; print(json.dumps(evaluate_baseline_classifier(), indent=2))"
```

### 4.2 Benchmark Results Summary

```json
{
  "total_examples": 8,
  "correct_predictions": 6,
  "accuracy": 0.75,
  "per_class": {
    "MATCH": { "support": 3, "correct": 2 },
    "MISMATCH": { "support": 3, "correct": 2 },
    "MISSING": { "support": 1, "correct": 1 },
    "UNCERTAIN": { "support": 1, "correct": 1 }
  }
}
```

The benchmark suite guarantees that neither regression nor false certainty creeps into the classifier as transformer-based neural models are introduced.

