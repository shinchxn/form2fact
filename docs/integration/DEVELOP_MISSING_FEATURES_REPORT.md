# Form2Fact Develop Missing Features & Gap Analysis Report

**Document ID:** `FORM2FACT-GAP-ANALYSIS-001`  
**Date:** November 6, 2026  
**Auditor:** Senior Software Architect, Git Integration Engineer & Release Validation Specialist  
**Repository:** `https://github.com/shinchxn/form2fact.git`  
**Trunk:** `develop` (`9d98401`)

---

## 1. Executive Summary

This report documents the gap analysis between the current `develop` trunk (`9d98401`) and all discovered remote branches. 

Out of 10 audited branches, 8 branches are 100% integrated. Exactly **two remote branches** contain eligible unmerged commits:
1. `origin/glowing-robot` (Commit `9f57de4`): CI workflow secret scanner hotfix.
2. `origin/feature/document-intelligence` (Commit `1bfb602`): End-to-end OCR microservice and ingestion pipeline.

No other missing commits, abandoned branches, or dangling PRs exist.

---

## 2. Unmerged Branch Detail & Gap Ledger

### 2.1 `origin/glowing-robot`
- **Commit:** `9f57de447c8584b03bb7b30e290c452ec988dc99`
- **Author:** `shinchxn`
- **Subject:** `fix(ci): exclude secret scanner self-matches`
- **Parent Commit:** `9d98401` (Direct child of current `develop`)
- **Changed Files:** `.github/workflows/ci.yml` (14 insertions, 2 deletions)
- **Gap Impact:** The CI pipeline secret scanner flags test regexes and markdown documentation in `ci.yml` and `CI_CD_PIPELINE.md`. This commit excludes those two files from the grep pattern.
- **Integration Action:** Fast-forward or cherry-pick `9f57de4`.

### 2.2 `origin/feature/document-intelligence`
- **Commit:** `1bfb6029b17700580b90ae24f8e1e9cff500b2fa`
- **Author:** Form2Fact Team
- **Subject:** `Complete OCR pipeline integration`
- **Merge Base with develop:** `74dfe78`
- **Changed Files:** 9 files (367 insertions, 13 deletions)
- **Components to Integrate:**
  1. `ai_service/app/ocr.py`: Core OCR engine implementing PyMuPDF page rendering, Tesseract word data extraction, confidence scoring, 15MB size limit, and 100-page limit.
  2. `ai_service/tests/test_ocr.py`: 6 unit tests validating text-layer extraction, mock Tesseract OCR, size limits, page limits, and corrupt PDF handling.
  3. `ai_service/app/main.py`: Authentication dependency `verify_ocr_token` (`X-OCR-Service-Token` constant-time comparison), endpoint `POST /api/v1/ocr/pdf`, and health check capabilities update.
  4. `ai_service/requirements.txt`: Append `PyMuPDF>=1.24.0`, `pytesseract>=0.3.13`, `Pillow>=10.0.0`.
  5. `ai_service/Dockerfile`: Add `tesseract-ocr` system package via `apt-get` within non-root container architecture.
  6. `server/api.ts`: Hook OCR fallback in `POST /api/v1/applications/:id/documents` when uploaded PDF has fewer than 40 characters of native text.
  7. `src/types/index.ts`: Add `extractionMethod`, `ocrConfidence`, `characterCount`, and `status` to `DocumentRecord.extractedTextByPage`.
  8. `.env.example` & `infrastructure/docker-compose.yml`: Wire `OCR_SERVICE_TOKEN` secret configuration.

---

## 3. Harmonization & Collision Plan for Phase 5

| Target File | develop State | Incoming Work | Harmonization Strategy |
| :--- | :--- | :--- | :--- |
| `.github/workflows/ci.yml` | Base CI definition | `9f57de4` regex exclusion | Direct fast-forward/clean apply. |
| `ai_service/app/main.py` | Calibrated V2 ML engine + loader | OCR endpoint + token check | Retain calibrated engine, inject `verify_ocr_token` and `POST /api/v1/ocr/pdf`, append `"page_level_pdf_ocr"` to capabilities. |
| `ai_service/Dockerfile` | Hardened non-root `appuser`, PYTHONPATH | `apt-get install tesseract-ocr` | Add `apt-get update && apt-get install -y --no-install-recommends tesseract-ocr` in runner stage before switching to `USER appuser`. |
| `ai_service/requirements.txt` | V2 ML dependencies (torch, sklearn, etc.) | OCR dependencies | Add `PyMuPDF>=1.24.0`, `pytesseract>=0.3.13`, `Pillow>=10.0.0` preserving ML libraries. |
| `server/api.ts` | Base upload handler | OCR fallback when `isScannedOrTextPoor` | Seamlessly insert OCR fetch fallback, parse response, populate page metadata. |
| `src/types/index.ts` | `verificationStatus` added | Detailed page metadata | Combine types cleanly. |
| `infrastructure/docker-compose.yml` | Dual profiles | `OCR_SERVICE_TOKEN` env var | Pass `OCR_SERVICE_TOKEN: ${OCR_SERVICE_TOKEN:-form2fact_ocr_secret_token_2026}` to backend container. |
