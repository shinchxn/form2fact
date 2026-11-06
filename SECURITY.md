# Security Policy

## 1. Supported Versions

| Version | Supported |
| :--- | :--- |
| `1.2.x` | :white_check_mark: |
| `< 1.2.0` | :x: |

---

## 2. Reporting a Vulnerability

If you discover a security vulnerability within Form2Fact, please do **NOT** open a public issue. Instead, report it privately to the project maintainers:

- **Security Contact:** `shinchxn@users.noreply.github.com`
- **Response Window:** Acknowledgement within 48 hours; resolution plan within 7 business days.

Please include:
1. Detailed description of the vulnerability and attack vector.
2. Steps to reproduce or proof-of-concept payload.
3. Impact assessment on multi-tenant isolation, cryptographic checksum verification, or RBAC controls.

---

## 3. Security Principles & Guarantees

Form2Fact enforces the following statutory and architectural security invariants:

1. **Mandatory Production JWT Secret:** Application fails immediately at startup if `JWT_SECRET` is unset, shorter than 32 characters, or using fallback values in production (`NODE_ENV=production`).
2. **Multi-Tenant Data Isolation:** Users from one regional directorate cannot query, view, or download dossiers belonging to another directorate.
3. **Path Traversal Defense:** All docket file streaming routes enforce strict alphanumeric regex validations and verify physical filesystem containment within the dedicated tenant directory.
4. **Tamper-Evident Audit Trails:** The audit ledger (`audit_events`) is append-only and cryptographically bounds user IDs and action timestamps.
5. **Magic-Byte Header Verification:** Document ingestion inspects raw file bytes (`%PDF-`) to reject spoofed executable payloads before storage.
