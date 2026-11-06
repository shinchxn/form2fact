# Runtime Storage Directory

This directory holds local runtime files for Form2Fact in development mode.

## Storage Rules

1. **Databases (`*.db`, `*.sqlite`)**:
   - `form2fact.db`: Default SQLite database when `DATABASE_URL` is not configured.
   - Ignored by git to avoid committing environment-specific state or credentials.
   - Automated migrations execute on startup (`server/db.ts`).

2. **Dockets & Documents (`data/dockets/`)**:
   - Stores uploaded PDF and image documents when local storage is configured.
   - In production, S3/MinIO is used instead (`server/core/storage/s3.ts`).
   - All uploaded user documents are ignored by git for privacy and tenant security.
   - Directory structure is preserved via `.gitkeep`.
