# Form2Fact V3 Dataset Architecture & Governance

## 1. Directory Structure

```
ai_service/ml/data/v3/
├── raw/            # External and ingested raw records (excluded from git via .gitignore)
├── processed/      # Verified, sanitized, and normalized pairwise records (JSONL)
├── annotations/    # Formal human adjudications and gold-standard annotations
├── splits/         # Population-representative train / validation / test splits
├── manifests/      # SHA-256 cryptographic manifests and provenance records
└── README.md       # Directory architecture and data policy
```

## 2. Data Protection & Governance Rules

1. **Confidentiality:** Never commit proprietary institutional deeds, personal identifiable information (PII), or unredacted PDF scans.
2. **Raw Dataset Isolation:** Raw downloads placed under `raw/` are excluded by `.gitignore`.
3. **Traceability:** Every processed record must reference an immutable source manifest under `manifests/` with SHA-256 checksums, licensing terms, and acquisition timestamps.
4. **No Disruption to Existing Releases:** V1 and V2 models, weights, and evaluation splits remain strictly frozen and unmodified.
