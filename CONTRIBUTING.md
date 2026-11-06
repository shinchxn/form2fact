# Contributing to Form2Fact

Thank you for your interest in contributing to **Form2Fact** — the Evidence-First Institutional Document Intelligence & Regulatory Cross-Verification Platform.

---

## 1. Code of Conduct

All contributors are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat all members of the community with respect and professionalism.

---

## 2. Branching & Git Workflow

We adhere to a structured Git-Flow branching strategy:

- **`main`**: Production releases only. Protected; code is merged strictly from `develop` following comprehensive acceptance and regression testing.
- **`develop`**: Primary integration branch. All feature branches branch off and merge into `develop`.
- **Feature Branches**: Named descriptively:
  - `feature/<feature-name>` (e.g., `feature/document-intelligence`, `feature/ml-pairwise-classifier-v2`)
  - `chore/<maintenance-task>` (e.g., `chore/dependency-updates`)
  - `fix/<bug-description>` (e.g., `fix/auth-token-refresh`)

---

## 3. Pull Request Guidelines

1. **Target Branch:** All pull requests must target `develop`. Do not open PRs directly targeting `main`.
2. **Deterministic & Test-Driven:** Every PR must include relevant unit and integration tests.
3. **Data Integrity Invariant:** Never introduce mock or fabricated operational data into production code paths. Use genuine schemas, verified test fixtures, and explicit empty states.
4. **Zero Autonomous Decision Invariant:** Automated algorithms or neural classifiers must never autonomously approve or reject institutional applications. All low-confidence or conflicting classifications must abstain to `UNCERTAIN` and route to human reviewers.
5. **Linting & Compilation:**
   ```bash
   npm run lint        # Must pass with 0 errors
   npm run build       # Must compile production assets successfully
   npm test            # Must pass 100% of regression scenarios
   npm run test:integrity # Must pass 100% of data integrity checks
   ```

---

## 4. Local Development Setup

Refer to the [Installation & Setup](README.md#installation--setup) section in the root `README.md`.
