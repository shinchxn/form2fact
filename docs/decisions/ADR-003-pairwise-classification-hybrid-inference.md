# ADR-003: Pairwise Field Mismatch Classification Pipeline and Abstention Policy

## Status
**ACCEPTED**

## Context
Traditional document scrutiny platforms attempt to make broad monolithic classification decisions at the document level (e.g., "Document is Valid" or "Application Rejected"). This approach fails in high-stakes regulatory auditing because:
1. Reviewers cannot pinpoint *why* a document was flagged without page and snippet citations.
2. Binary classification (Match vs Mismatch) forces false positives when data formats differ or optical character recognition introduces minor character noise.
3. Automated systems must never independently declare "fraud" or override statutory officer discretion.

## Decision
We implement a **Fine-Grained Pairwise Field Mismatch Classification Pipeline** with an explicit **5-Way Classification Taxonomy** and **Confidence-Based Abstention**:
1. **Taxonomy:**
   - `MATCH`: Both values represent concordant statutory information within tolerance (e.g., normalized dates match, or acreage meets requirement).
   - `MISMATCH`: Explicit contradictory variance detected between claim and verified evidence (e.g., claimed lease expires 2055, but verified deed expires 2028).
   - `MISSING`: Claimed statutory field or required supporting document is completely absent from submitted artifacts.
   - `UNCERTAIN`: Model confidence falls below threshold (0.85), or text token overlap is ambiguous (0.20 < Jaccard < 0.80), explicitly routing the case to a human reviewer.
   - `NOT_COMPARABLE`: Fields are semantically disjoint or unaligned in statutory context.
2. **Hybrid Fast-Path & Semantic Inference Architecture:**
   - **Deterministic Fast-Path:** Identical string comparison, standardized ISO-8601 date parsing, and numeric acreage tolerance calculation execute synchronously in sub-millisecond time.
   - **Entity Concordance Heuristic:** Tokenized Jaccard similarity and substring containment resolve minor organizational suffix variations ("Society" vs "Trust").
   - **Confidence-Based Abstention:** Whenever semantic similarity lands between 0.20 and 0.80 (or transformer embedding cosine similarity is ambiguous), the classifier automatically returns `UNCERTAIN` with `requiresHumanReview: true`.
3. **Objective Administrative Terminology:**
   - Findings strictly avoid accusatory language ("fraud", "fake", "forgery").
   - Findings utilize objective regulatory terms: *"variance"*, *"discrepancy"*, *"tenure deficit"*, *"unverified citation"*.

## Consequences
### Positive
- **Human-in-the-Loop Safeguards:** AI assists rather than decides; high uncertainty surfaces directly to the reviewer with evidence side-by-side.
- **Explainability:** Every finding includes `claimValue`, `evidenceValue`, `pageNumber`, `snippet`, and `confidenceScore`.
- **High Throughput:** Fast-path filters out 80%+ of exact matches without expensive neural network inference.

### Negative / Trade-offs
- **Abstention Volume:** Setting a conservative confidence threshold (0.85) increases the number of `UNCERTAIN` flags requiring human review, preventing automation from operating unattended. This is an intentional safety feature for institutional scrutiny.

