# Form2Fact V3 Machine Learning Development Plan

## Objective
Establish the architectural roadmap for Form2Fact V3 pairwise classification, focusing on:
1. Multi-domain regulatory document intelligence (expanding beyond AICTE to technical, medical, and collegiate statutory frameworks).
2. Population-scale benchmark expansion with verified domain manifests.
3. Enhanced multi-page cadastral and deed alignment models.
4. Preserved inference backwards-compatibility with V2 serving infrastructure.

## Governance Mandates
- **No Disruption:** V1 and V2 champions, calibration wrappers, and historical validation reports are immutable.
- **Inference Stability:** Serving endpoints (`/api/v1/verification/pairwise`) remain strictly conformant to the established 5-class taxonomy: `[MATCH, MISMATCH, MISSING, UNCERTAIN, NOT_COMPARABLE]`.
