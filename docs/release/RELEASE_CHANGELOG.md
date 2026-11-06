# FORM2FACT — RELEASE CHANGELOG (v1.2.0)

**Release Date:** 2026-11-06  
**Target Release Branch:** `main`  
**Integration Branch:** `develop`  
**Release Manager:** Principal Software Architect & Release Manager

---

## 1. Executive Summary

Version 1.2.0 represents the complete, professionalized release of Form2Fact. It consolidates all feature branches into a unified, secure, zero-mock institutional scrutiny and document cross-verification platform.

---

## 2. Key Delivered Features

### 2.1 Storage & Architecture
- **Persistent Storage Provider Abstraction:** Implemented `IStorageProvider` and `LocalDiskStorageProvider` with path traversal defense and MinIO S3 object storage compatibility.
- **Transactional Document Deletion:** Multi-table document detachment (`extracted_fields`, `documents`, `audit_events`) wrapped in transactions with automatic rollback and filesystem restoration.
- **Multi-Tenant Scrutiny:** Regional directorate isolation between Western (`org-aicte-western`) and Central (`org-aicte-central`).

### 2.2 Data Integrity & Zero-Mock Runtime
- **Clean Database Mode:** Demo fixtures (`app-1104`, `app-0842`, `app-0915`) are bypassed in production mode (`NODE_ENV=production` or `SEED_DEMO_DATA=false`).
- **Truthful UI Empty States:** Added explicit empty state components for applications docket, findings triage, and evidence viewer when zero records exist.
- **Truthful Screening Stamping:** Token-overlap heuristic fallback explicitly labeled as `form2fact-deterministic-screening-v1.0` with `isDeterministic: true`, ending false representation as a neural model.
- **Real ML Microservice Integration:** Automated request forwarding to internal Python FastAPI microservice (`POST /api/v1/classify-pair`) when `AI_SERVICE_URL` is configured.

### 2.3 Regulatory AICTE Rules Engine
- **Tenure Verification (`RULE-TEN-01`):** Mandates minimum 30-year unexpired lease tenure.
- **Entity Concordance (`RULE-NAME-02`):** Verifies trust/society name matches deed grantee.
- **Acreage Aggregation (`RULE-AREA-03`):** Supports multi-parcel aggregation while preventing duplicate plot counting.
- **Mandatory Safety Documentation (`RULE-DOC-04`):** Flags missing Fire & Life Safety NOC.
- **Scanned Degraded Detection (`RULE-SAFETY-06`):** Identifies text-poor scanned bitmaps and flags for physical verification.

### 2.4 Calibrated ML Pairwise Classifier V2
- **Five-Class Taxonomy:** `MATCH`, `MISMATCH`, `MISSING`, `UNCERTAIN`, `NOT_COMPARABLE`.
- **Validation-Fitted Temperature Scaling:** Logit scaling with temperature $T=1.3468$ fitted on validation split.
- **Statutory Abstention Policy:** Calibrated confidence $< 0.60$ automatically abstains to `UNCERTAIN` for human review.

### 2.5 Security, Governance & Verification
- **Production JWT Enforcement:** Startup fails immediately if `JWT_SECRET` is missing, short, or default in production.
- **Append-Only Audit Ledger:** Complete cryptographic audit trail tracking all reviewer adjudications.
- **34-Point Automated Data Integrity Suite:** 100% pass rate validating zero-mock guarantees and persistence durability.

---

## 3. Mandatory Artifacts & Documentation
- **`BharatCode.txt`:** Form2Fact architectural specification and project identifier at root.
- **`README.md`:** 22-section GitHub README with system diagrams, workflow diagrams, and screenshot galleries.
- **`docs/assets/screenshots/`:** 10 genuine high-resolution application screenshots captured via Playwright.
