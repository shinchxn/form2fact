# Dataset Card for Form2Fact Pairwise Field Mismatch Corpus

## Dataset Description
- **Repository:** `ai_service/ml/data/`
- **Format:** JSON Lines (`.jsonl`)
- **Version:** `1.0.0`
- **Language:** English (`en`)
- **Domain Focus:** Cross-document institutional compliance & regulatory verification (AICTE, NAAC, NBA)

### Dataset Summary
The Form2Fact Pairwise Field Mismatch Corpus provides ground-truth pairs of institutional declared claims and documentary evidence excerpts. Each record is labeled with one of five mutual exclusive classes: `MATCH`, `MISMATCH`, `MISSING`, `UNCERTAIN`, `NOT_COMPARABLE`.

### Data Fields
- `pair_id`: Unique identifier (e.g., `f2f-001`)
- `field_name`: Regulatory field name (e.g., `landAreaAcres`, `leaseExpiryDate`, `trustName`)
- `field_type`: Semantic field category (`numeric`, `date`, `entity_name`, `code`, `generic`)
- `domain`: Regulatory domain (`aicte`, `naac`, `nba`)
- `claim`: Dict containing `raw_value`, `context`, `document_type`, `extraction_confidence`
- `evidence`: Dict containing `raw_value`, `context`, `document_type`, `extraction_confidence`
- `label`: Canonical label string (`MATCH`, `MISMATCH`, `MISSING`, `UNCERTAIN`, `NOT_COMPARABLE`)
- `reviewer_rationale`: Human/expert reasoning explaining the statutory grounding of the label
- `is_synthetic`: Boolean indicating if sample was synthesized under regulatory guidelines

### Split Distribution
- **Train:** 47 records (70%)
- **Validation:** 10 records (15%)
- **Test:** 13 records (15%)
- **Stratification:** Balanced across all 5 classes with zero data leakage across split boundaries.

