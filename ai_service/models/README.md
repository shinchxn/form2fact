# Form2Fact MLOps Model Artifact Registry

This directory stores versioned model artifacts, configurations, and the deployment manifest for the Form2Fact AI microservice.

## Directory Structure

```
models/
├── manifest.json                  # Canonical manifest defining versions, checksums, and active release
├── versions/
│   └── v1.0.0/                   # Production v1.0.0 release
│       ├── metadata.json         # Architecture specification, input/output schemas, evaluation links
│       └── config.json           # Inference thresholds and normalization parameters
└── README.md                      # Model registry documentation & packaging runbook
```

## Model Packaging & Checksum Verification

1. Every model release must have an entry in `manifest.json`.
2. All artifact files must have verifiable SHA-256 checksums in `manifest.json`.
3. In production, `MODEL_VERSION` environment variable specifies which version to load (e.g. `MODEL_VERSION=v1.0.0`).
4. Missing or corrupted model artifacts trigger automatic fallback to verified deterministic heuristics with an operational alert.
