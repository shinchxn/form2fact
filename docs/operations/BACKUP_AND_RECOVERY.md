# Form2Fact Backup, Disaster Recovery & Restoration Procedures

**Reference:** F2F-OPS-BACKUP-2026  
**Audience:** Database Administrators, DevOps Engineers, Infrastructure Operators

---

## 1. BACKUP SCOPE & ASSET CLASSIFICATION

Form2Fact requires scheduled, consistent backups of three core asset classes:

| Asset | Location (Host / Volume) | Content Description | Recovery Point Objective (RPO) | Recovery Time Objective (RTO) |
|---|---|---|:---:|:---:|
| **Relational Database** | `form2fact_data/form2fact.db` | Institutional applications, extracted fields, rules, review decisions, append-only audit trail. | $\le 1$ Hour | $\le 15$ Minutes |
| **Uploaded Dockets** | `form2fact_data/dockets/*.pdf` | Scanned statutory applicant filings (lease deeds, NOCs, certificates). | $\le 24$ Hours | $\le 30$ Minutes |
| **Model Registry** | `form2fact_models/` | Versioned model manifests, checksums, and metadata. | Static (Versioned) | $\le 10$ Minutes |

---

## 2. BACKUP PROCEDURES

### 2.1 SQLite Online Snapshot (Zero-Downtime)
SQLite supports atomic, zero-downtime online backups using the `VACUUM INTO` command, which copies the database while write transactions are safely committed to WAL logs:

```bash
# 1. Create timestamped backup directory
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p /backups/sqlite

# 2. Execute atomic online backup from running container
docker exec form2fact-api-server node -e "
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('/app/data/form2fact.db');
db.exec(\"VACUUM INTO '/app/data/form2fact_backup_${TIMESTAMP}.db'\");
console.log('Atomic SQLite backup completed.');
"

# 3. Copy the backup file to host storage
docker cp form2fact-api-server:/app/data/form2fact_backup_${TIMESTAMP}.db /backups/sqlite/
docker exec form2fact-api-server rm /app/data/form2fact_backup_${TIMESTAMP}.db
```

### 2.2 Document Storage Backup
Archive all uploaded institutional dockets:
```bash
# Create compressed archive of uploaded PDF dockets
docker run --rm -v form2fact_data:/data -v /backups/dockets:/backup alpine \
  tar -czf /backup/dockets_${TIMESTAMP}.tar.gz -C /data/dockets .
```

---

## 3. RESTORATION & DISASTER RECOVERY PROCEDURES

### 3.1 Step-by-Step Database Restoration
In the event of corrupted state or hardware failure:

1. **Stop Application Containers:**
   ```bash
   docker compose stop api-server
   ```
2. **Restore Database File into Volume:**
   ```bash
   docker run --rm -v form2fact_data:/data -v /backups/sqlite:/backup alpine \
     cp /backup/form2fact_backup_TARGET.db /data/form2fact.db
   ```
3. **Restart API Server:**
   ```bash
   docker compose start api-server
   ```
4. **Verify Relational Integrity:**
   ```bash
   docker exec form2fact-api-server node -e "
   const { DatabaseSync } = require('node:sqlite');
   const db = new DatabaseSync('/app/data/form2fact.db');
   const apps = db.prepare('SELECT count(*) as c FROM applications').get();
   const audit = db.prepare('SELECT count(*) as c FROM audit_events').get();
   console.log('Restored Applications Count:', apps.c);
   console.log('Restored Audit Events Count:', audit.c);
   "
   ```

### 3.2 Restoring Document Storage
```bash
docker run --rm -v form2fact_data:/data -v /backups/dockets:/backup alpine \
  tar -xzf /backup/dockets_TARGET.tar.gz -C /data/dockets
```

---

## 4. BACKUP ROTATION & ENCRYPTION POLICY

1. **Retention Schedule:**
   - Daily backups retained for 30 days.
   - Weekly backups retained for 12 weeks.
   - Monthly archive retained for 7 years (statutory regulatory audit compliance).
2. **Encryption:** All offsite backup archives must be encrypted with AES-256 (e.g. `gpg --symmetric --cipher-algo AES256`).
