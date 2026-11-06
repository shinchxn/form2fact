# Database Migration & Synchronization Guide

## 1. Migration Strategy Overview

Form2Fact supports two operational operational models:
1. **Local Developer / Edge Scrutiny Mode:** Single-file zero-configuration SQLite database (`data/form2fact.db`).
2. **Enterprise Cloud Scrutiny Mode:** High-concurrency PostgreSQL 16 cluster.

To transition seamlessly from SQLite to PostgreSQL without data loss or downtime, Form2Fact includes an automated schema synchronization and ETL tool: `infrastructure/db/migrate_sqlite_to_pg.ts`.

## 2. PostgreSQL Schema Initialization

The authoritative PostgreSQL 16 schema resides in `infrastructure/db/init.sql`.

To initialize a fresh PostgreSQL database:
```bash
# Using standard psql client
psql -h localhost -U postgres -d form2fact -f infrastructure/db/init.sql

# Or using docker-compose
docker-compose exec postgres psql -U postgres -d form2fact -f /docker-entrypoint-initdb.d/init.sql
```

The script initializes:
- `uuid-ossp` and `pgcrypto` extensions.
- All 11 core tables with constraints and cascading foreign keys.
- B-tree and GIN indexes for fast lookup and JSONB queries.
- Initial seed data (default organizations, system roles, and registered domain versions).

## 3. Data Migration from SQLite to PostgreSQL

The migration script (`infrastructure/db/migrate_sqlite_to_pg.ts`) performs automated translation of table structures, data types, and foreign key relationships.

### 3.1 Migration Command Usage

```bash
# Dry Run Mode (Audits SQLite tables and previews record counts without writing to PG)
npx tsx infrastructure/db/migrate_sqlite_to_pg.ts --dry-run

# Live Migration Mode (Executes transactional INSERT statements against target PG)
npx tsx infrastructure/db/migrate_sqlite_to_pg.ts --live --pg-url postgresql://postgres:postgres@localhost:5432/form2fact
```

### 3.2 Type Translation Matrix

| SQLite Storage Class | PostgreSQL Target Type | Migration Handling |
|---|---|---|
| `TEXT` (UUID format) | `UUID` | Validated via UUID v4 regex |
| `TEXT` (ISO Date string) | `TIMESTAMPTZ` / `DATE` | Parsed to standard UTC ISO-8601 |
| `TEXT` (JSON serialized) | `JSONB` | Validated via `JSON.parse` before inserting |
| `INTEGER` (0 / 1) | `BOOLEAN` | Translated to `TRUE` / `FALSE` |
| `REAL` / `NUMERIC` | `NUMERIC(12, 4)` | Exact precision decimal preservation |
| `BLOB` | `BYTEA` | Encoded as hex or migrated to S3 object store |

### 3.3 Verification & Audit Checklist

Following migration execution, verify record parity across tables:
1. `SELECT count(*) FROM users;` (Must match SQLite `users` count).
2. `SELECT count(*) FROM applications;` (Must match SQLite `applications` count).
3. `SELECT count(*) FROM documents;` (Must match SQLite `documents` count).
4. `SELECT count(*) FROM findings;` (Must match SQLite `findings` count).
5. `SELECT count(*) FROM audit_events;` (Must match SQLite `audit_events` count).

All primary keys, foreign key relationships, and JSONB fields are preserved exactly.

