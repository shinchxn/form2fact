# ADR-004: Dual Database Compatibility (SQLite Local & PostgreSQL Enterprise)

## Status
**ACCEPTED**

## Context
Form2Fact was initially constructed with Node.js 22's experimental native `node:sqlite` module (`server/db.ts`). While SQLite provides zero-configuration local development, instant test execution, and zero operational footprint, enterprise deployment for regulatory scrutiny (such as AICTE national scrutiny processing thousands of technical institutes) requires:
1. Multi-replica horizontal scalability with concurrent write transactions.
2. Robust connection pooling and row-level locking.
3. Native JSONB queries and full-text indexing.
4. Point-in-time recovery (PITR) and enterprise clustering.

Rewriting the entire application exclusively for PostgreSQL immediately would break existing local test fixtures, developer velocity, and lightweight demonstration sandboxes.

## Decision
We implement a **Dual Database Compatibility Strategy**:
1. **Local & Test Engine (SQLite via `node:sqlite`):**
   - Maintained in `server/db.ts` for instant developer setup (`data/form2fact.db`), zero external daemon dependencies, and sub-second test execution across all 17 test suites.
2. **Production Schema (PostgreSQL 16 in `infrastructure/db/init.sql`):**
   - Full enterprise schema designed with standard UUID v4 keys, foreign key constraints with `ON DELETE CASCADE/SET NULL`, JSONB evidence containers, and optimized B-tree indexes.
   - Includes full organization multi-tenancy tables (`organizations`), user RBAC (`users`), domain registry metadata (`domains`), applications, documents, extracted fields, findings, audit logs, review actions, and async jobs.
3. **Automated Schema & Data Migration Tool (`infrastructure/db/migrate_sqlite_to_pg.ts`):**
   - Verified TypeScript CLI script that reads existing SQLite tables and translates records into PostgreSQL parameterized `INSERT` statements with dry-run and live migration modes.
4. **Data Durability Guarantee:**
   - Both SQLite and PostgreSQL schemas enforce collision-resistant UUIDs (`crypto.randomUUID()`) and foreign keys with WAL (Write-Ahead Logging) enabled.

## Consequences
### Positive
- **Zero Friction Onboarding:** New developers and CI pipelines test against local SQLite without needing a running PostgreSQL container.
- **Enterprise Ready:** Clear migration path to PostgreSQL 16 on AWS RDS, Azure Database for PostgreSQL, or Google Cloud SQL.
- **Data Integrity:** Identical column semantics, foreign keys, and audit logging contracts maintained across both engines.

### Negative / Trade-offs
- **Schema Synchronization Overhead:** Any future relational schema alterations must be reflected in both `server/db.ts` (SQLite) and `infrastructure/db/init.sql` (PostgreSQL).

