# ADR-002: Domain Pack Architecture for Domain-Independent Verification

## Status
**ACCEPTED**

## Context
Form2Fact originated as an AICTE (All India Council for Technical Education) institutional approval scrutiny tool. The original codebase intertwined AICTE-specific statutory rules (e.g., 30-year land lease tenure, minimum 7.5-acre campus requirements, AICTE trust title concordance) directly within general document ingestion and database handlers. 

To expand Form2Fact into a generic, multi-domain institutional compliance and document intelligence verification platform (supporting Healthcare Accreditation like NABH, Higher Education NAAC, Financial KYC/AML, Corporate Procurement, and Construction Permits), domain-specific logic must be completely abstracted from the verification runtime engine. Hardcoded conditions such as `if (domain === 'aicte')` violate the Open/Closed Principle and create brittle code paths.

## Decision
We establish a declarative **Domain Pack Architecture** managed by a runtime `DomainRegistry`:
1. **Domain Pack Specification (`server/domains/types.ts`):**
   - Every domain is encapsulated in a versioned, self-contained `DomainPack` definition complying with a strict Zod schema (`DomainPackSchema`).
   - A Domain Pack specifies:
     - `documentDefinitions`: Recognized document types, accepted MIME types, statutory retention, required page ranges, and metadata tags.
     - `fieldDefinitions`: Canonical fields to extract, data types (`string`, `date`, `number`, `boolean`, `currency`), normalization directives, and synonyms.
     - `comparisonRelationships`: Directed pairwise field comparison declarations between a claim document and an evidence document with confidence thresholds and tolerances.
     - `rules`: Statutory business rules with parameterized thresholds (e.g., minimum tenure years, area minimums) and non-defamatory explanation templates.
2. **DomainRegistry Singleton (`server/domains/registry.ts`):**
   - Decoupled registry responsible for registering, retrieving, and validating domain packs dynamically at startup or via configuration plugins.
3. **AICTE as Reference Domain Pack (`server/domains/aicte/`):**
   - AICTE approval scrutiny is refactored into the first official Domain Pack (`id: 'aicte'`, `version: '1.2.0'`).
   - Zero AICTE-specific rule keys or heuristics exist inside `server/core/` or `server/modules/verification/pairwiseEngine.ts`.

## Consequences
### Positive
- **Domain Independence:** The platform can onboard new institutional regulatory frameworks (e.g., NAAC, UGC, NABH) simply by supplying a declarative JSON/TypeScript Domain Pack, without modifying a single line of core verification code.
- **Configurable Versioning:** Institutions can maintain multiple versions of compliance rules (e.g., AICTE 2024–25 norms vs AICTE 2026–27 norms) side by side.
- **Auditability:** Every finding explicitly links back to a specific `ruleKey` and `domainId` registered in the Domain Pack.

### Negative / Trade-offs
- **Schema Strictness:** Developers creating a new domain pack must adhere strictly to the `DomainPackSchema` contract, requiring upfront schema planning.

