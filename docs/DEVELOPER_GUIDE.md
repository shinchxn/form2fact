# Form2Fact — Developer & Contributor Guide

## 1. Prerequisites & Environment Setup

- **Node.js:** Node.js v22.x LTS or higher (required for native `node:sqlite`).
- **NPM:** v10.x or higher.
- **Git:** Git v2.40+

### Clone & Install
```bash
git clone <repo-url> form2fact
cd form2fact
npm install
```

### Environment Configuration
Copy the sample environment file:
```bash
cp .env.example .env
```
Key variables:
- `GEMINI_API_KEY`: *(Optional)* API key for live advisory narrative reasoning. If omitted, the system defaults to deterministic local synthesis.
- `PORT`: Server port (default: `3000`).
- `JWT_SECRET`: *(Production)* Secure secret for signing JSON Web Tokens.

---

## 2. Common Development Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts full-stack development server with hot-reload (Vite + Express on port 3000). |
| `npm test` | Runs the automated regression and rule verification test suite (`tsx server/test-runner.ts`). |
| `npm run lint` | Runs TypeScript type checking across the entire project (`tsc --noEmit`). |
| `npm run build` | Compiles client assets into `dist/` for production deployment. |
| `npm start` | Launches the production Express server (`tsx server.ts`). |

---

## 3. Project Directory Map

```
form2fact/
├── data/                  # SQLite database and stored document files
│   ├── form2fact.db       # Active SQLite database
│   └── dockets/{appId}/   # Durable PDF binaries
├── server/                # Backend source code
│   ├── api.ts             # Express REST router
│   ├── auth.ts            # JWT authentication and RBAC
│   ├── db.ts              # SQLite database schema and queries
│   ├── extraction.ts      # Field extraction and Gemini client
│   ├── rulesEngine.ts     # Statutory verification rules
│   └── test-runner.ts     # Regression test suite
├── src/                   # React 19 Frontend
│   ├── components/        # UI Views, Modals, and Widgets
│   ├── services/api.ts    # Frontend HTTP API client
│   └── types/index.ts     # Domain TypeScript types
└── docs/                  # Central knowledge base
```

---

## 4. How to Add a New Statutory Rule

To introduce a new regulatory verification check (e.g., verifying Fire Safety NOC validity):

1. **Define the Rule in `INITIAL_RULES`:**
   In [server/rulesEngine.ts](file:///d:/projects/form2fact/server/rulesEngine.ts), append your rule to `INITIAL_RULES`:
   ```typescript
   {
     id: 'rule-fire-07',
     ruleKey: 'RULE-FIRE-07',
     name: 'Fire Safety NOC Validity & Recency',
     description: 'Verifies that the submitted Fire Safety NOC has not expired relative to the academic year.',
     category: 'Safety & Compliance',
     applicableApplicationCategory: 'All Applications',
     applicableDocumentTypes: ['Fire Safety NOC'],
     version: 'v1.0',
     sourceReference: 'Approval Process Handbook, Annexure 4 (Safety Mandates)',
     effectiveFrom: '2024-04-01',
     enabled: true,
     readableCondition: 'Fire NOC Expiry Date >= Academic Evaluation Year Start',
     testCases: [ ... ]
   }
   ```

2. **Implement Evaluation Logic in `evaluateApplicationRules`:**
   Add a conditional block matching `rule.ruleKey === 'RULE-FIRE-07'`:
   - Inspect `documents` and `extractedFields`.
   - If a violation occurs, push a structured `Finding` object with references, severity, and `evidenceList`.
   - If the check passes, increment `passedCount++`.

3. **Add Live Sandbox Support in `evaluateSingleRuleSandbox`:**
   Ensure `evaluateSingleRuleSandbox` can execute your rule in isolation for testing.

4. **Add Unit Test in `server/test-runner.ts`:**
   Add positive, negative, and missing-data assertions to verify that your rule triggers as expected. Run `npm test`.

---

## 5. Coding & UI Guidelines

1. **Strict Design Tokens:** Do not introduce arbitrary hex colors or pixel sizes. Reference standard design tokens as detailed in [DESIGN_SYSTEM.md](file:///d:/projects/form2fact/DESIGN_SYSTEM.md).
2. **Numeric Columns:** Numeric tabular metrics (acreage, student intake, dates, confidence scores) must use `font-mono tabular-nums text-right`.
3. **Audit Trail Mandate:** Any server mutation that modifies an application, field, finding, or rule must invoke `db.recordAudit()` with an actor ID and rationale note.
4. **Non-Defamatory Phrasing:** The system must assist human reviewers. Discrepancy descriptions must use objective administrative phrasing (*variance, tenure deficit, unverified clause*); never use accusatory language (*fraud, illegal, fake*).

