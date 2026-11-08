# Form2Fact V3 Raw Data Repository

This directory contains external and raw dataset downloads. All files downloaded here are excluded from Git version control by `.gitignore` to prevent repository bloat and accidental distribution of third-party raw dumps.

## Subdirectory Structure:

- `snli/`: Stanford Natural Language Inference raw distribution files.
- `multinli/`: Multi-Genre NLI raw distribution files.
- `averitec/`: Automated Verification of Textual Claims raw data files.
- `fever/`: Fact Extraction and VERification raw data files.
- `sroie/`: ICDAR 2019 SROIE scanned receipt annotations & OCR text files.
- `cord/`: Consolidated Receipt Dataset text/JSON annotations.
- `docvqa/`: Document Visual Question Answering text/JSON metadata.
- `institutional/`: Public institutional regulatory handbooks and gazette disclosures.

## Immutability Rule:
Raw data placed in this directory must remain **read-only and immutable**. All normalization and pairwise candidate mapping scripts must read from `raw/` and output versioned candidates into `ai_service/ml/data/v3/processed/`.

