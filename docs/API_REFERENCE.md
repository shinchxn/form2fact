# Form2Fact — REST API Specification & Reference

All endpoints are versioned under `/api/v1` and hosted via Express (`server/api.ts`).

---

## 1. Authentication & Security Model

- **Bearer Token Authorization:** Authenticated requests pass the JWT token in the HTTP `Authorization` header:
  ```http
  Authorization: Bearer <jwt-token>
  ```
- **Role-Based Access Control (RBAC):**
  - `Administrator`: Full access (create, read, update, delete, rule toggles, demo resets).
  - `Reviewer`: Scrutiny operations (intake, document uploads, field corrections, finding adjudications, formal docket decisions).
  - `Read-only Viewer`: Inspection access only. Mutations return `HTTP 403 Forbidden`.

---

## 2. API Endpoints

### 2.1 Authentication & Persona Management

#### `POST /api/v1/auth/login`
Authenticates with email and password, returning a signed JWT token.
- **Request Body:**
  ```json
  {
    "email": "aruna.rao@scrutiny.edu.in",
    "password": "Reviewer123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "usr-001",
      "displayName": "Dr. Aruna Rao",
      "email": "aruna.rao@scrutiny.edu.in",
      "role": "Reviewer",
      "department": "Regional Scrutiny Committee - Western Directorate"
    }
  }
  ```

#### `GET /api/v1/auth/me`
Retrieves the currently authenticated session user profile.

#### `GET /api/v1/users`
Lists all demo personas available for simulation.

#### `POST /api/v1/user`
Switches active demo persona and issues a valid JWT token.

---

### 2.2 Applications Management

#### `GET /api/v1/applications`
Lists application dockets with optional filtering.
- **Query Parameters:**
  - `search`: Case-insensitive text search (Reference, Name, Address, Trust).
  - `status`: Filter by `reviewStatus` or `status`.
  - `category`: Filter by `applicationType`.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 3,
    "data": [ ...Application Objects... ]
  }
  ```

#### `POST /api/v1/applications`
Creates a new application intake record.
- **Request Body:**
  ```json
  {
    "institutionName": "Apex Institute of Technology",
    "applicationType": "New Technical Campus",
    "declaredDetails": {
      "institutionName": "Apex Institute of Technology",
      "societyOrTrustName": "Apex Education Trust",
      "address": "Tech Valley, Pune",
      "pinCode": "411001",
      "state": "Maharashtra",
      "landAreaAcres": 7.5,
      "leaseExpiryDate": "2054-03-31",
      "sanctionedIntake": 360,
      "previousApprovalRef": "N/A",
      "applicationYear": "2026-27"
    }
  }
  ```
- **Response (201 Created):** Application object.

#### `GET /api/v1/applications/:id`
Retrieves a full application docket, including attached documents, extracted fields, and active findings.

#### `POST /api/v1/applications/:id/decision`
Records the final statutory determination on an application.
- **Permissions:** `Administrator`, `Reviewer`
- **Request Body:**
  ```json
  {
    "decisionType": "Approved",
    "rationale": "All statutory documents verified against AICTE norms. Unencumbered 30-year lease confirmed."
  }
  ```

---

### 2.3 Documents & File Handling

#### `POST /api/v1/applications/:id/documents`
Uploads a supporting PDF document with magic-byte verification.
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `file`: PDF binary file (max 15MB, verified `%PDF-` header).
  - `documentType`: One of `Land Lease Deed`, `Land Ownership Title Deed`, `Building Safety Certificate`, `Fire Safety NOC`, `Society / Trust Registration Certificate`, `AICTE Prior Approval Order`.
- **Response (201 Created):** Document record metadata and extracted fields.

#### `GET /api/v1/applications/:id/documents/:docId/file`
Streams the binary PDF file from disk with `Content-Type: application/pdf`.

#### `DELETE /api/v1/documents/:id`
Deletes a document, cascades its extracted fields, and re-evaluates all application rules.
- **Permissions:** `Administrator`, `Reviewer`

---

### 2.4 Extracted Fields & Manual Overrides

#### `GET /api/v1/documents/:id/fields`
Lists all extracted fields associated with a document.

#### `PATCH /api/v1/fields/:id`
Records a reviewer manual override on an extracted field with mandatory justification.
- **Permissions:** `Administrator`, `Reviewer`
- **Request Body:**
  ```json
  {
    "correctedValue": "2054-03-31",
    "note": "Verified from registered amendment deed clause 4 on page 3."
  }
  ```
- **Side Effect:** Automatically triggers rule re-validation.

---

### 2.5 Regulatory Rules & Sandbox Testing

#### `GET /api/v1/rules`
Lists all registered regulatory verification rules.

#### `PATCH /api/v1/rules/:id`
Enables or disables a specific regulatory rule.
- **Permissions:** `Administrator`
- **Request Body:** `{ "enabled": false }`

#### `POST /api/v1/rules/test`
Executes an isolated rule simulation sandbox without modifying database state.
- **Request Body:**
  ```json
  {
    "ruleKey": "RULE-TEN-01",
    "declaredValue": "2054-03-31",
    "evidenceValue": "2028-03-31",
    "evaluationYear": 2026
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "status": "Discrepancy",
      "explanation": "Declared lease expiry (2054-03-31) contradicts registered deed expiry (2028-03-31)."
    }
  }
  ```

---

### 2.6 Findings & Adjudication

#### `GET /api/v1/findings`
Lists all discrepancy findings with optional query filters (`status`, `category`, `severity`).

#### `POST /api/v1/findings/:id/review`
Adjudicates an individual finding.
- **Permissions:** `Administrator`, `Reviewer`
- **Request Body:**
  ```json
  {
    "action": "Confirm Finding",
    "newStatus": "Confirmed",
    "note": "20-year deficit verified against registered lease deed."
  }
  ```

---

### 2.7 Verification Dossier & Audit Ledger

#### `GET /api/v1/applications/:id/report`
Generates the comprehensive institutional verification dossier.

#### `GET /api/v1/audit`
Retrieves the complete append-only audit event ledger.

#### `POST /api/v1/applications/:id/deep-scrutiny`
Executes advisory Gemini narrative synthesis (with local fallback).

#### `POST /api/v1/reset-demo`
Reloads the SQLite database with default baseline demonstration scenarios.
- **Permissions:** `Administrator`

