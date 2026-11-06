# REST API Endpoints Specification

## 1. Authentication & Session Headers

All endpoints under `/api/v1/` require an HTTP `Authorization` header containing a signed JSON Web Token (JWT) issued by `/api/auth/login`:

```http
Authorization: Bearer <jwt_token>
X-Organization-Id: <optional_target_org_uuid>
```

---

## 2. Domain Pack Management API

### `GET /api/v1/domains`
Returns a list of all registered regulatory domain packs.
- **Access:** Public / Authenticated
- **Response `200 OK`:**
```json
[
  {
    "id": "aicte",
    "name": "AICTE Institutional Approval & Compliance Scrutiny",
    "version": "1.2.0",
    "regulatoryAuthority": "All India Council for Technical Education",
    "documentCount": 6,
    "ruleCount": 6
  }
]
```

### `GET /api/v1/domains/:id`
Returns full configuration details for a specific domain pack.
- **Parameters:** `id` (e.g., `aicte`).
- **Response `200 OK`:** Returns full `DomainPack` JSON schema including document definitions, field definitions, comparison relationships, and rules.
- **Error `404 Not Found`:** If domain ID is not registered.

---

## 3. Pairwise Verification API

### `POST /api/v1/verification/pairwise`
Executes pairwise field mismatch classification between a claim value and a candidate evidence snippet.
- **Access:** Authenticated (`reviewer`, `admin`)
- **Request Body (Validated via Zod `PairwiseSchema`):**
```json
{
  "fieldName": "lease_expiry_date",
  "claimValue": "2055-03-31",
  "evidenceValue": "2028-03-31",
  "domainId": "aicte",
  "tolerance": 0,
  "confidenceThreshold": 0.85,
  "documentContext": {
    "documentName": "Land_Lease_Agreement_Pragati.pdf",
    "pageNumber": 3,
    "snippet": "The term of this lease shall expire on thirty-first day of March two thousand twenty-eight."
  }
}
```
- **Response `200 OK`:**
```json
{
  "status": "MISMATCH",
  "confidence": 0.95,
  "requiresHumanReview": true,
  "explanation": "Contradictory values detected for field 'lease_expiry_date': Claimed '2055-03-31' vs Evidence '2028-03-31'.",
  "discrepancyType": "DATE_CONTRADICTION",
  "evidence": {
    "documentName": "Land_Lease_Agreement_Pragati.pdf",
    "pageNumber": 3,
    "snippet": "The term of this lease shall expire on thirty-first day of March two thousand twenty-eight."
  }
}
```

---

## 4. Background Job Management API

### `GET /api/v1/jobs/:id`
Retrieves execution status and progress for an asynchronous background job.
- **Parameters:** `id` (e.g., `job-40080245-9896-4ff8-8d1b-0211b2f0f6b4`).
- **Response `200 OK`:**
```json
{
  "id": "job-40080245-9896-4ff8-8d1b-0211b2f0f6b4",
  "type": "document-processing",
  "status": "completed",
  "progress": 100,
  "attempts": 1,
  "result": {
    "extractedFields": 14,
    "pageCount": 18
  },
  "createdAt": "2026-11-06T03:23:34.465Z",
  "updatedAt": "2026-11-06T03:23:34.476Z"
}
```
- **Error `404 Not Found`:** If job ID does not exist.

---

## 5. Organization Multi-Tenancy API

### `GET /api/v1/organizations`
Lists organizations accessible to the authenticated user.
- **Access:** Authenticated (`admin`, `reviewer`)
- **Response `200 OK`:**
```json
[
  {
    "id": "org-aicte-western",
    "name": "AICTE Western Regional Office (WRO)",
    "code": "WRO-MUMBAI",
    "type": "Regulatory Regional Office",
    "status": "active"
  }
]
```

### `GET /api/v1/organizations/:id`
Returns organization details and enforces tenant isolation.

---

## 6. Applications, Documents & Findings API

- `GET /api/applications`: List applications filtered by user organization.
- `GET /api/applications/:id`: Application detail, metadata, and declared parameters.
- `POST /api/applications/:id/documents`: Multipart PDF upload (validates `%PDF-` magic-bytes).
- `GET /api/applications/:id/documents`: List supporting documents with verification status.
- `POST /api/applications/:id/verify`: Trigger complete deterministic rules engine and pairwise verification.
- `GET /api/applications/:id/findings`: Retrieve generated findings with linked evidence items.
- `POST /api/findings/:id/action`: Scrutiny officer action (`Confirmed`, `Dismissed`, `Overridden`).
- `POST /api/applications/:id/decision`: Submit final statutory determination (`Approved`, `Deficit Memo`, `Rejected`).

