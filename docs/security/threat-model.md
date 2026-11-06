# Threat Model & Security Architecture

## 1. STRIDE Threat Analysis

Form2Fact handles high-stakes institutional regulatory applications where malicious applicants or rogue insiders may attempt to falsify compliance, tamper with evidence, or forge approval records.

| STRIDE Category | Threat Vector | System Countermeasure |
|---|---|---|
| **Spoofing** | Attacker impersonates an authorized AICTE scrutiny officer or applicant. | Cryptographically signed HMAC-SHA256 JWT tokens with strict expiration and tenant context (`server/auth.ts`). In production, non-default secure secrets are strictly enforced. |
| **Tampering** | Applicant uploads an executable or script renamed as `.pdf` to exploit parsing buffers. | **Magic-Byte Signature Verification:** `server/api.ts` checks the binary header for `%PDF-` bytes before any parser or file system operation. |
| **Repudiation** | Reviewer approves a deficient application and later denies having taken the action. | **Immutable Audit Log (`audit_events`):** Every review action, finding override, and final decision appends an unmodifiable log entry recording user UUID, exact timestamp, IP address, and before/after diffs. |
| **Information Disclosure** | Applicant from Institution A inspects lease deeds or findings belonging to Institution B. | **Organization Multi-Tenant Isolation:** `requireOrg` middleware enforces organizational boundaries on all application and document data access paths. |
| **Denial of Service** | Malicious client uploads hundreds of 500-page nested zip-bomb PDFs to exhaust server memory. | Strict file size ceiling (50MB), multipart stream parsing limits, and asynchronous background worker execution prevent event-loop exhaustion. |
| **Elevation of Privilege** | Read-only `viewer` calls administrative endpoints to alter regulatory rules or submit approvals. | **Role-Based Access Control (RBAC):** Middleware checks `req.user.role` against authorized capabilities prior to route execution. |

## 2. Magic-Byte Document Signature Verification

File extension checking alone is insufficient because malicious actors can rename executable payloads to `.pdf`. Form2Fact inspects the initial bytes of every uploaded file buffer:

```typescript
export function isValidPdfBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 5) return false;
  // %PDF- in ASCII hex is 0x25, 0x50, 0x44, 0x46, 0x2d
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  );
}
```

Files failing this signature check are immediately rejected with `400 Bad Request` without being passed to PDF parsers or written to permanent storage.

## 3. Sandboxed Rule Execution

Deterministic compliance rules are evaluated as pure, side-effect-free functions. Rules receive immutable snapshots of claims and extracted evidence, and cannot:
- Directly mutate database records.
- Make arbitrary outgoing network requests.
- Overwrite existing finding records without producing an audit event.

