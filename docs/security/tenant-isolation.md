# Multi-Tenant Isolation & Role-Based Access Control (RBAC)

## 1. Multi-Tenant Organization Boundary

Form2Fact isolates regulatory data across organizations. Organizations represent:
- Regulatory headquarters (e.g., AICTE Central New Delhi).
- Regional scrutiny offices (e.g., AICTE Western Regional Office Mumbai, Northern Regional Office Kanpur).
- Independent institutional groups or universities conducting pre-accreditation mock audits.

### 1.1 Tenant Context Propagation

Every authenticated user belongs to an `organizationId`. During authentication, the user's primary organization ID is embedded within the JWT claim:

```json
{
  "userId": "usr-reviewer-01",
  "email": "reviewer@aicte.gov.in",
  "role": "reviewer",
  "organizationId": "org-aicte-western",
  "exp": 1731000000
}
```

### 1.2 Tenant Enforcement Middleware (`server/auth.ts`)

The `requireOrg` middleware enforces organizational access boundaries:
```typescript
export function requireOrg(allowedOrgId?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthenticatedUser;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // Admins have cross-tenant oversight; other roles are strictly bounded
    if (user.role === 'admin') {
      return next();
    }
    const targetOrgId = allowedOrgId || req.params.orgId || req.headers['x-organization-id'];
    if (targetOrgId && user.organizationId !== targetOrgId) {
      return res.status(403).json({ error: 'Cross-tenant access forbidden' });
    }
    next();
  };
}
```

## 2. RBAC Permissions Matrix

| Capability / Endpoint | `admin` | `reviewer` | `viewer` | `applicant` |
|---|:---:|:---:|:---:|:---:|
| View Registered Domains (`GET /api/v1/domains`) | ✅ | ✅ | ✅ | ✅ |
| Upload Institutional Application Documents | ✅ | ❌ | ❌ | ✅ |
| Execute Verification Runs (`POST /api/applications/:id/verify`) | ✅ | ✅ | ❌ | ❌ |
| View Application Findings & Citations | ✅ | ✅ | ✅ | ❌ |
| Overwrite / Confirm Finding Discrepancy | ✅ | ✅ | ❌ | ❌ |
| Record Final Application Decision | ✅ | ✅ | ❌ | ❌ |
| View System Audit Trail (`GET /api/audit`) | ✅ | ✅ | ✅ | ❌ |
| Manage Domain Packs & System Config | ✅ | ❌ | ❌ | ❌ |

## 3. Immutable Regulatory Audit Trail

To preserve legal integrity during judicial or administrative review, the `audit_events` table enforces an append-only architecture:
- No `UPDATE` or `DELETE` permissions are granted on the `audit_events` table.
- Events record the actor's user ID, IP address, user-agent, target entity ID, and a JSON diff containing both prior state and resulting state.

