# Form2Fact — Project Knowledge Base & Documentation

Welcome to the central technical documentation and knowledge base for **Form2Fact** — the AICTE institutional application scrutiny and evidence-first cross-verification platform.

---

## 📚 Knowledge Base Index

| Document | Description | Target Audience |
| :--- | :--- | :--- |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | System architecture, end-to-end data flows, lifecycle stages, and component interaction models. | Architects, Senior Engineers |
| **[TECHNICAL_AUDIT.md](./TECHNICAL_AUDIT.md)** | Baseline architectural audit, feature implementation statuses, dependency analysis, gap analysis, and SIH readiness assessment. | Project Leads, Auditors, Developers |
| **[RULES_AND_REGULATORY_NORMS.md](./RULES_AND_REGULATORY_NORMS.md)** | Statutory regulatory rules (`RULE-TEN-01` through `RULE-SAFETY-06`), AICTE Handbook citations, normalizer formulas, and concordance logic. | Regulatory Officers, Engine Developers |
| **[API_REFERENCE.md](./API_REFERENCE.md)** | Canonical REST API documentation (`/api/v1/*`), request/response payloads, authentication, and RBAC permissions. | Backend & Frontend Developers |
| **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** | SQLite database architecture, entity-relationship diagrams, table schemas, foreign keys, and audit ledger structure. | Database Engineers, Backend Developers |
| **[DOCUMENT_INTELLIGENCE_ROADMAP.md](./DOCUMENT_INTELLIGENCE_ROADMAP.md)** | Implementation blueprints for OCR (`tesseract.js` / Vision API), visual canvas PDF viewing (`pdfjs-dist`), and AI document classification. | AI/ML Engineers, Document Specialists |
| **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** | Local environment setup, test runner commands, coding standards, adding new regulatory rules, and seeding demo scenarios. | All Contributors |

---

## 🎯 Executive Overview of Form2Fact

### What is Form2Fact?
Form2Fact is an **evidence-first decision-support platform** designed to streamline institutional scrutiny for technical education regulatory bodies (such as AICTE). It cross-verifies applicant declarations (land acreage, tenancy expiry dates, sponsoring trust identities, statutory safety clearances) against registered institutional supporting documents.

### Key Governance Principles
1. **Decision Support, Not Decision Replacement:** Form2Fact flags discrepancies and presents linked evidence with page numbers and exact clause text. It **never** autonomously declares fraud or approves/rejects institutional filings; authorized human scrutiny officers retain statutory adjudicative authority.
2. **Deterministic Verification Guarantee:** Verification checks are powered by transparent, versioned rules linked to gazetted regulatory clauses (AICTE Approval Process Handbook), rather than opaque "black-box" model outputs.
3. **Immutable Audit Accountability:** Every manual field correction, finding dismissal, and docket determination requires an authenticated officer ID, timestamp, and mandatory written justification recorded in an append-only ledger.
4. **Air-Gapped & Resilient Operation:** The core verification engine, database, and deterministic parsers run 100% locally with zero external network dependencies. Cloud AI (Gemini GenAI) is used strictly as an optional narrative summarizer with automatic local fallback.

