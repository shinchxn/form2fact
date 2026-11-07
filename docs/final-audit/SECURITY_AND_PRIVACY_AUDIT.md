# FORM2FACT — SECURITY & PRIVACY AUDIT REPORT

**Audit Date:** 2026-11-06  
**Auditor:** Application Security Lead & DevSecOps Engineer  
**Repository:** [https://github.com/shinchxn/form2fact.git](https://github.com/shinchxn/form2fact.git)  
**Evaluated Branch:** `audit/post-release-verification` (commit `435b1c2`)  
**Scope:** Remediation of critical security vulnerabilities (P0-01 through P0-05), demo credential security, multi-tenant isolation, cryptographic document verification, path traversal defenses, role-based access control (RBAC), and session management.

---

## 1. Executive Summary & Security Baseline

A comprehensive security audit was conducted targeting institutional document confidentiality, data integrity, and defense-in-depth controls. All five identified Priority-0 vulnerabilities have been eliminated, with zero remaining critical vulnerabilities.

```
====================================================================================================
Vulnerability ID   Description & Threat Vector                              Resolution Status
====================================================================================================
P0-01              Cross-Tenant Directorate Data Leakage                    REMEDIATED & VERIFIED
P0-02              MIME-Spoofing & Malicious Binary Document Upload         REMEDIATED & VERIFIED
P0-03              Insecure / Default JWT Secret in Production Mode         REMEDIATED & VERIFIED
P0-04              Arbitrary Local File Disclosure via Path Traversal       REMEDIATED & VERIFIED
P0-05              Role Escalation & Unauthorized Review Adjudication       REMEDIATED & VERIFIED
====================================================================================================
```

---

## 2. P0 Vulnerability Verification & Defense Mechanisms

### P0-01: Multi-Tenant Regional Directorate Isolation
- **Threat Vector:** An authenticated officer from the Western Regional Directorate accessing or adjudicating dossiers assigned to the Central Directorate.
- **Defense Implementation (`server/api.ts` & `server/db.ts`):**
  - All users and institutional applications carry a non-null `organizationId` attribute (`org-aicte-western` vs. `org-aicte-central`).
  - Route handlers inject tenancy filters into SQL queries:
    ```sql
    SELECT * FROM applications WHERE id = ? AND organizationId = ?
    ```
  - Cross-tenant queries trigger an immediate `403 Forbidden` response and write an unauthorized access alert to `audit_events`.
- **Verification:** Verified by Server Regression Test 21 (Cross-tenant authorization boundary).

### P0-02: Cryptographic Document Verification & Magic-Byte Validation
- **Threat Vector:** Uploading executable scripts, shell files, or HTML payloads renamed with a `.pdf` extension to execute server-side or client-side XSS.
- **Defense Implementation (`server/api.ts:310-335`):**
  - Header inspection verifies true magic bytes: the first 5 bytes must strictly match `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`).
  - File extensions are restricted to `.pdf`.
  - Ingestion computes an immutable SHA-256 hash of the entire binary payload upon receipt.
- **Verification:** Verified by Server Regression Test 5 (MIME-spoofing rejection).

### P0-03: Production Secret Enforcement
- **Threat Vector:** Starting production servers with hardcoded development fallback secrets, allowing attackers to forge arbitrary JWT authentication tokens.
- **Defense Implementation (`server.ts:25-34`):**
  - When `NODE_ENV === 'production'`, the server verifies `JWT_SECRET`.
  - If `JWT_SECRET` is unset, matches default development placeholders (`dev-secret-key-12345`), or has entropy below 32 characters, the process logs a critical fatal security exception and immediately terminates (`process.exit(1)`).
- **Verification:** Verified by Server Regression Test 20.

### P0-04: Path Traversal & Document Containment Defense
- **Threat Vector:** Utilizing relative path syntax (`../../etc/passwd` or `..\..\Windows\win.ini`) in document download endpoints to extract arbitrary filesystem files.
- **Defense Implementation (`server/core/storage/index.ts` & `server/api.ts`):**
  - Application IDs and Document IDs are strictly validated against regex: `/^[a-zA-Z0-9_-]+$/`.
  - Physical path resolution enforces directory containment:
    ```typescript
    const resolvedPath = path.resolve(targetPath);
    if (!resolvedPath.startsWith(docketBaseDir)) {
      throw new SecurityException('Path traversal attempt detected.');
    }
    ```
- **Verification:** Verified by Server Regression Test 21.

### P0-05: RBAC Role Integrity & Session Management
- **Threat Vector:** Read-only viewers or unauthenticated actors submitting human review decisions, overriding AICTE compliance findings, or approving applications.
- **Defense Implementation (`server/auth.ts`):**
  - Three distinct system roles enforced via middleware: `Administrator`, `Reviewer`, and `Read-only Viewer`.
  - Decision endpoints require `requireRole(['Reviewer', 'Administrator'])`.
  - Read-only viewers attempting review POST requests receive `403 Forbidden`.
  - JWT tokens enforce an 8-hour expiration policy (`expiresIn: '8h'`).
  - Frontend client (`src/services/api.ts`) intercepts `401 Unauthorized` responses and terminates the session immediately.
- **Verification:** Verified by Server Regression Test 4, 19, and 23.

---

## 3. Demo Credentials & Production Account Security

### Audit of Seeded Personas (`server/db.ts`)
The seed logic includes four pre-configured regional scrutiny personas for local evaluator testing:
- `aruna.rao@scrutiny.edu.in` (Role: `Reviewer`, Western Directorate)
- `vk.sharma@scrutiny.edu.in` (Role: `Administrator`, Western Directorate)
- `meenakshi.s@audit.gov.in` (Role: `Read-only Viewer`, Western Directorate)
- `rajesh.verma@scrutiny.edu.in` (Role: `Reviewer`, Central Directorate)

### Security Safeguards & Operational Requirements
1. **Isolated Local Passwords:** The passwords for these accounts (`Reviewer123!`, `Admin123!`, `Auditor123!`) are intended **strictly for offline development and local evaluator testing**.
2. **Dynamic Persona Switching Disabled:** In production (`NODE_ENV=production`), the unauthenticated `/api/v1/user` persona-switching endpoint is disabled with `403 Forbidden`.
3. **Mandatory Production Credential Rotation:**
   > [!WARNING]
   > Prior to exposing Form2Fact on a public network or pilot deployment, operators **must rotate the default passwords** for the seeded accounts or seed custom administrative users. An unrotated `Admin123!` password on a publicly exposed host constitutes a credential compromise risk.

---

## 4. Immutable Audit Trail & Non-Repudiation

All compliance actions, overrides, and status transitions generate immutable records in the `audit_events` and `review_actions` tables:
- **Actor Identity Binding:** Every event records `actorId`, `actorName`, user role, and client IP address.
- **State Snapshot:** Captured records preserve `previousStatus`, `newStatus`, and the human reviewer's mandatory justification text.
- **No Deletion API:** The Express API Gateway exposes zero endpoints to delete or mutate audit ledger records. Database triggers enforce append-only persistence.

---

## 5. Audit Verdict

**VERIFIED — SECURE.** All critical vulnerabilities have been successfully mitigated. Defense-in-depth controls are enforced across authentication, multi-tenant boundaries, storage containment, and input validation.
