# FORM2FACT — PRODUCTION SEED DATA & ENVIRONMENT ISOLATION POLICY
**Evidence-First Institutional Document Intelligence & Regulatory Cross-Verification Platform**  
**Document Reference:** `F2F-DOC-INTEG-05`  
**Target Branch:** `feature/remove-mock-data`  
**Base Commit:** `d7980a9` (Verified `develop`)  
**Date:** November 2026  
**Status:** MANDATORY OPERATIONAL POLICY  

---

## 1. PURPOSE & APPLICABILITY

This policy establishes strict statutory guidelines governing database initialization, reference configuration data, developer demonstration fixtures, and machine learning training datasets across Form2Fact deployment environments.

As an institutional scrutiny platform processing regulatory approvals, Form2Fact must guarantee that **no synthetic, fake, or demo institutions ever appear in production environments**.

---

## 2. SEED DATA CLASSIFICATION MATRIX

| Data Category | Permitted Environments | Content & Entities | Production Seeding Mechanism | Justification & Policy |
| :--- | :--- | :--- | :--- | :--- |
| **Class A: Statutory Reference & Governance** | **All Environments** (`development`, `staging`, `production`) | - System Roles (`Administrator`, `Reviewer`, `Read-only Viewer`)<br>- AICTE Rules Catalog (`RULE-TEN-01`, `RULE-NAME-02`, `RULE-AREA-03`, `RULE-DOC-04`)<br>- Regional Directorates (`org-aicte-western`, `org-aicte-central`)<br>- Configured Authority Accounts | Seeded on initial startup if tables are empty. | Required for the application to function. Rules and user roles represent statutory regulations, not institutional filings. |
| **Class B: Synthetic Operational Demo Data** | **Development & Offline Demo Only** (`NODE_ENV=development` AND `SEED_DEMO_DATA=true`) | - Demo Institutions (`St. Teresa Institute`, `Apex Institute`, `Saraswati College`)<br>- Demo Dockets (`app-1104`, `app-0842`, `app-0915`)<br>- Pre-computed findings and documents | **STRICTLY BLOCKED IN PRODUCTION** via `isProduction \|\| seedDemoDisabled` guard. | Fabricated operational data. Must never be inserted into production SQLite storage. |
| **Class C: Automated Test Fixtures** | **Test Harnesses Only** (`npm test`, `pytest`, `unittest`) | - In-memory and temporary SQLite test databases<br>- Synthetic test PDFs and spoofed executables<br>- 11 taxonomy test vectors | Isolated to test runner processes. Cleaned up immediately upon test conclusion. | Required to verify regression safety, role escalation defense, and magic-byte checks. |
| **Class D: ML Training & Benchmark Datasets** | **Offline ML Pipeline Only** (`ai_service/ml/data/`) | - 1,250 synthetic training pairs (`train.jsonl`)<br>- 41 frozen benchmark records (`test_rigorous.jsonl`)<br>- Validation calibration split (`val.jsonl`) | Kept in `ai_service/ml/data/`. Never imported or executed by the Express runtime. | Legitimate supervised NLP training data. Preserved for model repeatability and provenance auditing. |

---

## 3. PRODUCTION SEEDING ENFORCEMENT ARCHITECTURE

The database initializer in [`server/db.ts`](file:///d:/projects/form2fact/server/db.ts) enforces this policy at the engine level:

```typescript
seedDefaultData(forceReset = false) {
  const isProduction = process.env.NODE_ENV === 'production';
  const seedDemoDisabled = process.env.SEED_DEMO_DATA === 'false';
  const existingRulesCount = Number((this.db.prepare('SELECT COUNT(*) as count FROM rules').get() as any)?.count || 0);
  const existingUsersCount = Number((this.db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0);

  // Non-destructive check: if production already has rules and users, exit immediately
  if (!forceReset) {
    if (isProduction && existingRulesCount > 0 && existingUsersCount > 0) {
      return;
    }
  }

  // 1. Seed Authorized Users (Class A)
  for (const u of defaultUsers) {
    insertUser.run(u.id, u.displayName, u.email, u.passwordHash, u.role, u.department, u.organizationId, ...);
  }

  // 2. Seed Statutory AICTE Rule Catalog (Class A)
  for (const r of INITIAL_RULES) {
    insertRule.run(r.id, r.ruleKey, r.name, r.description, r.category, ...);
  }

  // 3. HARD PRODUCTION GUARD: Zero Class B Demo Applications
  if (isProduction || seedDemoDisabled) {
    console.log('[INFO] Production or clean data mode active: skipping demo application fixtures.');
    return;
  }

  // Demo applications (app-1104, app-0842, app-0915) only execute below this guard
  ...
}
```

---

## 4. ENVIRONMENT VARIABLE SPECIFICATION

| Environment Variable | Recommended Development Value | Mandatory Production Value | Purpose |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `development` | `production` | Enforces production mode across Node.js, Express, and Vite. |
| `SEED_DEMO_DATA` | `true` | `false` | Explicitly disables demo application insertion. |
| `JWT_SECRET` | `form2fact-dev-insecure-secret` | Cryptographically random $\ge 32$ character hex | Cryptographic token signing secret (Fatal exit if weak). |
| `STORAGE_ROOT` | `./data/dockets` | Dedicated secure volume mount | Storage path for authentic uploaded PDF evidence. |
| `AI_SERVICE_URL` | `http://localhost:8000` | Containerized internal microservice URL | URL for real SentenceTransformer ML inference and Tesseract OCR. |

---

## 5. NON-DESTRUCTIVE CLEANUP & BACKUP MANDATE

1. **Prior to any schema migration or data remediation:**
   ```bash
   sqlite3 data/form2fact.db ".backup data/backups/f2f-backup-$(date +%Y%m%d%H%M%S).db"
   ```
2. **Never execute unconditional `DELETE FROM applications` or `DROP TABLE` in production.**
3. **Audit trails (`audit_events`) are strictly append-only and must never be truncated or purged.**
