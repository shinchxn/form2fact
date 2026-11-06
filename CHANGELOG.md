# Changelog

All notable changes to the **Form2Fact** platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-11-06

### Added
- **Persistent Storage Provider Abstraction:** Integrated `IStorageProvider` supporting local filesystem storage with path containment and MinIO/S3 object storage.
- **Transactional Document Deletion:** Database deletion operations now wrap cascading relations (`extracted_fields`, `documents`) in transactions with automatic rollback and storage recovery.
- **Data Integrity & Zero-Mock Runtime:** Implemented clean database startup guards preventing fabricated demo applications from populating production instances (`NODE_ENV=production` or `SEED_DEMO_DATA=false`).
- **Real ML Microservice Bridge:** Express pairwise engine dynamically proxies requests to internal Python FastAPI microservice (`POST /api/v1/classify-pair`) with deterministic fallback labeling.
- **Automated Data Integrity Test Suite:** 34-point automated test suite (`server/tests/dataIntegrity.test.ts`) validating 15 operational data integrity vectors.
- **Mandatory Repository Tracking (`BharatCode.txt`):** Factual project identifier and architectural specifications tracked at repository root.
- **Official Enterprise Logo & Branding:** Official emblem integrated into login view, sidebar navigation, and documentation assets.
- **Automated Playwright Screenshot Suite:** 10 genuine high-resolution application screenshots captured and versioned under `docs/assets/screenshots/`.

### Changed
- Refactored `OverviewView`, `ReportsView`, and `DocumentReviewView` with truthful empty states when records are zero.
- Replaced heuristic Jaccard overlap pseudo-model version with truthful deterministic screening metadata (`isDeterministic: true`, `form2fact-deterministic-screening-v1.0`).
- Upgraded auth token verification with graceful non-production key transition compatibility and automated 401 session invalidation.

---

## [1.1.0] - 2026-11-05

### Added
- **Calibrated Pairwise Classifier V2:** Temperature scaling ($T = 1.3468$) fitted on validation splits to produce well-calibrated posterior probabilities.
- **Statutory Abstention Policy:** Predictions with calibrated confidence below 0.60 abstain to `UNCERTAIN` and route to human reviewers.
- **AICTE Regulatory Rules Engine:** Multi-parcel land aggregation, minimum 30-year lease tenure verification, and sponsoring society concordance checks.
- **Split-Screen Evidence Workbench:** Coordinated document canvas with OCR bounding box overlay and side-by-side evidence inspection.

---

## [1.0.0] - 2026-11-04

### Added
- Initial baseline repository with FastAPI ML service, Express API gateway, and React/Tailwind frontend.
- Five-class pairwise taxonomy (`MATCH`, `MISMATCH`, `MISSING`, `UNCERTAIN`, `NOT_COMPARABLE`).
- SQLite storage engine with RBAC authentication and audit logging.
