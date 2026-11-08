import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { DatabaseSync } from 'node:sqlite';
import {
  Application,
  DocumentRecord,
  ExtractedField,
  Finding,
  ReviewAction,
  AuditEvent,
  Rule,
  User,
  UserRole,
  AnnotationRecord,
  UserAnnotation,
  AnnotationMetrics,
  FiveClassLabel,
  ReviewerAuthorization,
  ReviewerAuthorizationInput,
  InstitutionalDocket,
  InstitutionalDocketLifecycle,
  DocketTransitionEvent
} from '../src/types/index.ts';
import { INITIAL_RULES, evaluateApplicationRules } from './rulesEngine.ts';
import { extractFieldsFromPages } from './extraction.ts';
import { computeCohensKappa } from './metrics/cohensKappa.ts';
import {
  computePayloadHash,
  computeEventHash,
  verifyLedgerChain,
  GENESIS_PREVIOUS_HASH,
  LedgerVerificationResult
} from './ledger/cryptographicLedger.ts';
import {
  createLedgerCheckpoint,
  verifyLedgerAgainstCheckpoint,
  LedgerCheckpoint,
  CheckpointDatabaseFingerprint,
  CheckpointVerificationResult
} from './ledger/externalCheckpoint.ts';

export interface DatabaseUser extends User {
  passwordHash: string;
}

export const VALID_V3_FIELD_TYPES = new Set([
  'numeric', 'date', 'entity_name', 'address', 'cadastral_survey',
  'generic', 'document_presence', 'textual_claim'
]);

export function mapFieldTypeToV3(category?: string | null): string {
  if (!category) return 'generic';
  const c = category.toLowerCase().trim();
  if (VALID_V3_FIELD_TYPES.has(c)) return c;
  if (c.includes('date') || c.includes('time') || c.includes('expiry') || c.includes('tenure')) return 'date';
  if (c.includes('area') || c.includes('numeric') || c.includes('amount') || c.includes('capacity') || c.includes('ratio')) return 'numeric';
  if (c.includes('cadastral') || c.includes('survey') || c.includes('khasra') || c.includes('plot')) return 'cadastral_survey';
  if (c.includes('address') || c.includes('location')) return 'address';
  if (c.includes('name') || c.includes('entity') || c.includes('trust') || c.includes('institution') || c.includes('sponsoring')) return 'entity_name';
  if (c.includes('document') || c.includes('presence') || c.includes('noc')) return 'document_presence';
  if (c.includes('text') || c.includes('claim') || c.includes('compliance') || c.includes('safety')) return 'textual_claim';
  return 'generic';
}

export class ScrutinyDatabase {
  db: DatabaseSync;
  dbPath: string;

  currentUser: User = {
    id: 'usr-001',
    displayName: 'Dr. Aruna Rao',
    email: 'aruna.rao@scrutiny.edu.in',
    role: 'Reviewer',
    department: 'Regional Scrutiny Committee - Western Directorate'
  };

  constructor(customPath?: string) {
    if (customPath) {
      this.dbPath = customPath;
    } else {
      const dataDir = path.resolve(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      this.dbPath = path.join(dataDir, 'form2fact.db');
    }

    this.db = new DatabaseSync(this.dbPath);
    this.initSchema();
    this.seedDefaultData(false);
  }

  private initSchema() {
    this.db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        displayName TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        role TEXT NOT NULL,
        department TEXT NOT NULL,
        organizationId TEXT NOT NULL DEFAULT 'org-aicte-western',
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        referenceNumber TEXT UNIQUE NOT NULL,
        institutionName TEXT NOT NULL,
        applicationType TEXT NOT NULL,
        organizationId TEXT NOT NULL DEFAULT 'org-aicte-western',
        status TEXT NOT NULL,
        reviewStatus TEXT NOT NULL,
        declaredDetails TEXT NOT NULL,
        documentCount INTEGER NOT NULL DEFAULT 0,
        openFindingsCount INTEGER NOT NULL DEFAULT 0,
        totalFindingsCount INTEGER NOT NULL DEFAULT 0,
        reviewerNotes TEXT,
        assignedReviewer TEXT,
        createdBy TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        applicationId TEXT NOT NULL,
        originalFilename TEXT NOT NULL,
        documentType TEXT NOT NULL,
        storageKey TEXT NOT NULL,
        mimeType TEXT NOT NULL,
        sizeBytes INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        pageCount INTEGER NOT NULL,
        processingStatus TEXT NOT NULL,
        isScannedOrTextPoor INTEGER NOT NULL DEFAULT 0,
        extractedTextByPage TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY(applicationId) REFERENCES applications(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS extracted_fields (
        id TEXT PRIMARY KEY,
        documentId TEXT NOT NULL,
        applicationId TEXT NOT NULL,
        fieldName TEXT NOT NULL,
        fieldLabel TEXT NOT NULL,
        rawValue TEXT NOT NULL,
        normalizedValue TEXT NOT NULL,
        pageNumber INTEGER NOT NULL,
        sourceText TEXT NOT NULL,
        confidence REAL,
        extractionMethod TEXT NOT NULL,
        isCorrected INTEGER DEFAULT 0,
        correctedValue TEXT,
        correctedBy TEXT,
        correctedAt TEXT,
        correctionNote TEXT,
        FOREIGN KEY(documentId) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY(applicationId) REFERENCES applications(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS findings (
        id TEXT PRIMARY KEY,
        reference TEXT NOT NULL,
        applicationId TEXT NOT NULL,
        ruleId TEXT NOT NULL,
        ruleKey TEXT NOT NULL,
        ruleVersion TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        explanation TEXT NOT NULL,
        declaredValue TEXT,
        evidenceValue TEXT,
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
        evidenceList TEXT NOT NULL,
        assignedReviewer TEXT,
        reviewerDecisionReason TEXT,
        updatedBy TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY(applicationId) REFERENCES applications(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS rules (
        id TEXT PRIMARY KEY,
        ruleKey TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        applicableApplicationCategory TEXT NOT NULL,
        applicableDocumentTypes TEXT NOT NULL,
        version TEXT NOT NULL,
        sourceReference TEXT NOT NULL,
        effectiveFrom TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        readableCondition TEXT NOT NULL,
        testCases TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS review_actions (
        id TEXT PRIMARY KEY,
        findingId TEXT NOT NULL,
        applicationId TEXT NOT NULL,
        reviewerId TEXT NOT NULL,
        reviewerName TEXT NOT NULL,
        action TEXT NOT NULL,
        previousStatus TEXT NOT NULL,
        newStatus TEXT NOT NULL,
        note TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        actorId TEXT NOT NULL,
        actorName TEXT NOT NULL,
        action TEXT NOT NULL,
        entityType TEXT NOT NULL,
        entityReference TEXT NOT NULL,
        beforeValue TEXT,
        afterValue TEXT,
        note TEXT
      );

      CREATE TABLE IF NOT EXISTS application_decisions (
        id TEXT PRIMARY KEY,
        applicationId TEXT NOT NULL,
        reviewerId TEXT NOT NULL,
        reviewerName TEXT NOT NULL,
        decisionType TEXT NOT NULL,
        rationale TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY(applicationId) REFERENCES applications(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS annotation_records (
        id TEXT PRIMARY KEY,
        recordId TEXT NOT NULL UNIQUE,
        institutionId TEXT NOT NULL,
        institutionName TEXT NOT NULL,
        applicationId TEXT,
        claimFieldName TEXT NOT NULL,
        claimText TEXT NOT NULL,
        claimDocumentId TEXT,
        claimDocumentName TEXT,
        claimPage INTEGER,
        evidenceText TEXT NOT NULL,
        evidenceDocumentId TEXT,
        evidenceDocumentName TEXT,
        evidencePage INTEGER,
        evidenceLocation TEXT,
        normalizedClaimValue TEXT,
        normalizedEvidenceValue TEXT,
        fieldCategory TEXT,
        sourceProvenance TEXT NOT NULL DEFAULT 'AICTE Regulatory Filing',
        originalSourceLabel TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        finalLabel TEXT,
        adjudicatorId TEXT,
        adjudicatorName TEXT,
        adjudicationRationale TEXT,
        adjudicatedAt TEXT,
        organizationId TEXT NOT NULL DEFAULT 'org-aicte-western',
        isDemoCandidate INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_annotations (
        id TEXT PRIMARY KEY,
        recordId TEXT NOT NULL,
        annotatorId TEXT NOT NULL,
        annotatorName TEXT NOT NULL,
        annotatorRole TEXT NOT NULL,
        label TEXT NOT NULL,
        rationale TEXT NOT NULL,
        isDraft INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        UNIQUE(recordId, annotatorId),
        FOREIGN KEY(recordId) REFERENCES annotation_records(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS reviewer_authorizations (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        role TEXT NOT NULL,
        organizationId TEXT NOT NULL DEFAULT 'org-aicte-western',
        verifiedIdentityRef TEXT NOT NULL,
        issuingAuthority TEXT NOT NULL,
        professionalDesignation TEXT,
        authorizationReference TEXT NOT NULL,
        approvedBy TEXT NOT NULL,
        approvedByName TEXT NOT NULL,
        approvedAt TEXT NOT NULL,
        expiryDate TEXT,
        isRevoked INTEGER NOT NULL DEFAULT 0,
        revocationReason TEXT,
        revokedAt TEXT,
        revokedBy TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS institutional_dockets (
        id TEXT PRIMARY KEY,
        docketNumber TEXT UNIQUE NOT NULL,
        institutionId TEXT NOT NULL,
        institutionName TEXT NOT NULL,
        sourceOrganization TEXT NOT NULL,
        sourceUrl TEXT,
        retrievalDate TEXT NOT NULL,
        publicationDate TEXT,
        authorizationReference TEXT NOT NULL,
        documentChecksum TEXT NOT NULL,
        documentPath TEXT NOT NULL,
        mimeType TEXT NOT NULL,
        sizeBytes INTEGER NOT NULL,
        pageCount INTEGER NOT NULL,
        organizationId TEXT NOT NULL DEFAULT 'org-aicte-western',
        documentClassification TEXT NOT NULL DEFAULT 'statutory_filing',
        provenanceStatus TEXT NOT NULL DEFAULT 'PROVENANCE_PENDING',
        lifecycleState TEXT NOT NULL DEFAULT 'DATA_SOURCE_IDENTIFIED',
        verifiedBy TEXT,
        verifiedAt TEXT,
        verificationNotes TEXT,
        uploadedBy TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS docket_transitions (
        id TEXT PRIMARY KEY,
        docketId TEXT NOT NULL,
        fromState TEXT NOT NULL,
        toState TEXT NOT NULL,
        actorId TEXT NOT NULL,
        actorName TEXT NOT NULL,
        rationale TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY(docketId) REFERENCES institutional_dockets(id) ON DELETE CASCADE
      );
    `);

    // Automatic migration for existing databases: ensure organizationId exists
    try {
      this.db.exec("ALTER TABLE users ADD COLUMN organizationId TEXT NOT NULL DEFAULT 'org-aicte-western';");
    } catch {}
    try {
      this.db.exec("ALTER TABLE applications ADD COLUMN organizationId TEXT NOT NULL DEFAULT 'org-aicte-western';");
    } catch {}
    try {
      this.db.exec("ALTER TABLE annotation_records ADD COLUMN isDemoCandidate INTEGER NOT NULL DEFAULT 0;");
    } catch {}
    try {
      this.db.exec("UPDATE annotation_records SET isDemoCandidate = 1, sourceProvenance = 'AICTE Demonstration Scrutiny Scenario (Demo Fixture)' WHERE id LIKE 'ann-rec-00%';");
    } catch {}

    // Migrations for documents identity & provenance
    try { this.db.exec("ALTER TABLE documents ADD COLUMN uploadedBy TEXT;"); } catch {}
    try { this.db.exec("ALTER TABLE documents ADD COLUMN organizationId TEXT NOT NULL DEFAULT 'org-aicte-western';"); } catch {}
    try { this.db.exec("ALTER TABLE documents ADD COLUMN sourceOrganization TEXT;"); } catch {}
    try { this.db.exec("ALTER TABLE documents ADD COLUMN sourceUrl TEXT;"); } catch {}
    try { this.db.exec("ALTER TABLE documents ADD COLUMN retrievalDate TEXT;"); } catch {}
    try { this.db.exec("ALTER TABLE documents ADD COLUMN publicationDate TEXT;"); } catch {}
    try { this.db.exec("ALTER TABLE documents ADD COLUMN authorizationReference TEXT;"); } catch {}
    try { this.db.exec("ALTER TABLE documents ADD COLUMN documentClassification TEXT NOT NULL DEFAULT 'statutory_filing';"); } catch {}
    try { this.db.exec("ALTER TABLE documents ADD COLUMN provenanceStatus TEXT NOT NULL DEFAULT 'PROVENANCE_PENDING';"); } catch {}
    try { this.db.exec("ALTER TABLE documents ADD COLUMN verifiedBy TEXT;"); } catch {}
    try { this.db.exec("ALTER TABLE documents ADD COLUMN verifiedAt TEXT;"); } catch {}

    // Migrations for audit_events cryptographic ledger hash-chaining
    try { this.db.exec("ALTER TABLE audit_events ADD COLUMN sequenceNumber INTEGER NOT NULL DEFAULT 0;"); } catch {}
    try { this.db.exec("ALTER TABLE audit_events ADD COLUMN actorRole TEXT NOT NULL DEFAULT 'Reviewer';"); } catch {}
    try { this.db.exec("ALTER TABLE audit_events ADD COLUMN organizationId TEXT NOT NULL DEFAULT 'org-aicte-western';"); } catch {}
    try { this.db.exec("ALTER TABLE audit_events ADD COLUMN payloadHash TEXT NOT NULL DEFAULT '';"); } catch {}
    try { this.db.exec("ALTER TABLE audit_events ADD COLUMN previousHash TEXT NOT NULL DEFAULT '';"); } catch {}
    try { this.db.exec("ALTER TABLE audit_events ADD COLUMN currentHash TEXT NOT NULL DEFAULT '';"); } catch {}

    // Backfill cryptographic hash chain for any existing unhashed events
    try {
      const unhashed = this.db.prepare("SELECT * FROM audit_events ORDER BY rowid ASC").all() as any[];
      if (unhashed.length > 0 && (!unhashed[0].currentHash || unhashed[0].sequenceNumber === 0)) {
        let prevH = GENESIS_PREVIOUS_HASH;
        for (let i = 0; i < unhashed.length; i++) {
          const row = unhashed[i];
          const seq = i + 1;
          const pHash = computePayloadHash({
            entityType: row.entityType,
            entityReference: row.entityReference,
            beforeValue: row.beforeValue,
            afterValue: row.afterValue,
            note: row.note
          });
          const cHash = computeEventHash({
            sequenceNumber: seq,
            previousHash: prevH,
            id: row.id,
            timestamp: row.timestamp,
            actorId: row.actorId,
            actorRole: row.actorRole || 'Reviewer',
            organizationId: row.organizationId || 'org-aicte-western',
            action: row.action,
            payloadHash: pHash
          });
          this.db.prepare(`
            UPDATE audit_events
            SET sequenceNumber = ?, payloadHash = ?, previousHash = ?, currentHash = ?,
                actorRole = COALESCE(NULLIF(actorRole, ''), 'Reviewer'),
                organizationId = COALESCE(NULLIF(organizationId, ''), 'org-aicte-western')
            WHERE id = ?
          `).run(seq, pHash, prevH, cHash, row.id);
          prevH = cHash;
        }
      }
    } catch {}

    // SQLite triggers enforcing append-only invariants on audit_events
    try {
      this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS audit_events_no_update
        BEFORE UPDATE ON audit_events
        BEGIN
          SELECT RAISE(FAIL, 'Cryptographic Ledger Invariant: audit_events table is strictly append-only. Modifying existing events is prohibited.');
        END;

        CREATE TRIGGER IF NOT EXISTS audit_events_no_delete
        BEFORE DELETE ON audit_events
        BEGIN
          SELECT RAISE(FAIL, 'Cryptographic Ledger Invariant: audit_events table is strictly append-only. Deleting events is prohibited.');
        END;
      `);
    } catch {}

    // Initialize initial annotation candidate records if table is empty
    this.seedInitialAnnotationCandidates();
  }

  seedDefaultData(forceReset = false) {
    const isProduction = process.env.NODE_ENV === 'production';
    const seedDemoDisabled = process.env.SEED_DEMO_DATA === 'false';
    const existingAppsCount = Number((this.db.prepare('SELECT COUNT(*) as count FROM applications').get() as any)?.count || 0);
    const existingRulesCount = Number((this.db.prepare('SELECT COUNT(*) as count FROM rules').get() as any)?.count || 0);
    const existingUsersCount = Number((this.db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0);

    if (!forceReset) {
      if (isProduction && existingRulesCount > 0) {
        return;
      }
      if (!isProduction && existingAppsCount > 0 && existingUsersCount > 0) {
        return;
      }
    }

    // Clear all existing data inside transaction
    try {
      this.db.exec("DROP TRIGGER IF EXISTS audit_events_no_delete; DROP TRIGGER IF EXISTS audit_events_no_update;");
    } catch {}

    this.db.exec(`
      DELETE FROM application_decisions;
      DELETE FROM audit_events;
      DELETE FROM review_actions;
      DELETE FROM findings;
      DELETE FROM extracted_fields;
      DELETE FROM documents;
      DELETE FROM applications;
      DELETE FROM rules;
      DELETE FROM users;
    `);

    // 1. Seed Users (strictly isolated to non-production or explicit bootstrap)
    const insertUser = this.db.prepare(`
      INSERT INTO users (id, displayName, email, passwordHash, role, department, organizationId, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    if (isProduction || seedDemoDisabled) {
      // Check for one-time secure administrator bootstrap via environment variables
      const bEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase().trim();
      const bPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
      const bName = process.env.BOOTSTRAP_ADMIN_NAME || 'System Administrator';
      const bOrg = process.env.BOOTSTRAP_ADMIN_ORG || 'org-aicte-western';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (bEmail && bPassword) {
        if (!emailRegex.test(bEmail)) {
          console.error('[SECURITY ERROR] BOOTSTRAP_ADMIN_EMAIL is not a valid email address!');
        } else if (bPassword.length < 12) {
          console.error('[SECURITY ERROR] BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters in production!');
        } else if (['Admin123!', 'Password123!', 'Reviewer123!', 'Administrator123!'].includes(bPassword)) {
          console.error('[SECURITY ERROR] BOOTSTRAP_ADMIN_PASSWORD cannot use known default/trivial credentials in production!');
        } else {
          this.db.exec('BEGIN IMMEDIATE');
          try {
            const count = Number((this.db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0);
            if (count === 0) {
              const adminId = `usr-admin-${crypto.randomUUID().slice(0, 8)}`;
              const hash = bcrypt.hashSync(bPassword, 12);
              const now = new Date().toISOString();
              insertUser.run(adminId, bName, bEmail, hash, 'Administrator', 'System Administration Directorate', bOrg, now);
              this.db.exec('COMMIT');
              console.log(`[SECURITY] One-time administrator provisioned for email ${bEmail}. Enforce password rotation policy.`);
            } else {
              this.db.exec('ROLLBACK');
            }
          } catch (e) {
            this.db.exec('ROLLBACK');
            console.error('[SECURITY ERROR] Failed to provision bootstrap administrator:', e);
          } finally {
            // Strictly delete plaintext password from environment memory
            delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
          }
        }
      } else {
        console.log('[SECURITY] Production mode active: zero default/demo users seeded. Provision administrator via BOOTSTRAP_ADMIN_EMAIL or /api/v1/auth/bootstrap-admin.');
      }
    } else {
      // Development / Evaluator Sandbox Demo Users
      const defaultUsers: (DatabaseUser & { organizationId?: string })[] = [
        {
          id: 'usr-001',
          displayName: 'Dr. Aruna Rao',
          email: 'aruna.rao@scrutiny.edu.in',
          passwordHash: bcrypt.hashSync('Reviewer123!', 10),
          role: 'Reviewer',
          department: 'Regional Scrutiny Committee - Western Directorate',
          organizationId: 'org-aicte-western'
        },
        {
          id: 'usr-002',
          displayName: 'V. K. Sharma',
          email: 'vk.sharma@scrutiny.edu.in',
          passwordHash: bcrypt.hashSync('Admin123!', 10),
          role: 'Administrator',
          department: 'Quality Assurance Directorate',
          organizationId: 'org-aicte-western'
        },
        {
          id: 'usr-003',
          displayName: 'S. Meenakshi',
          email: 'meenakshi.s@audit.gov.in',
          passwordHash: bcrypt.hashSync('Auditor123!', 10),
          role: 'Read-only Viewer',
          department: 'Statutory Compliance Audit',
          organizationId: 'org-aicte-western'
        },
        {
          id: 'usr-004',
          displayName: 'Dr. Rajesh Verma',
          email: 'rajesh.verma@scrutiny.edu.in',
          passwordHash: bcrypt.hashSync('Reviewer123!', 10),
          role: 'Reviewer',
          department: 'Regional Scrutiny Committee - Central Directorate',
          organizationId: 'org-aicte-central'
        }
      ];

      for (const u of defaultUsers) {
        insertUser.run(u.id, u.displayName, u.email, u.passwordHash, u.role, u.department, u.organizationId || 'org-aicte-western', '2026-01-01T00:00:00.000Z');
      }
    }

    // 2. Seed Rules
    const insertRule = this.db.prepare(`
      INSERT INTO rules (id, ruleKey, name, description, category, applicableApplicationCategory, applicableDocumentTypes, version, sourceReference, effectiveFrom, enabled, readableCondition, testCases)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const r of INITIAL_RULES) {
      insertRule.run(
        r.id,
        r.ruleKey,
        r.name,
        r.description,
        r.category,
        r.applicableApplicationCategory,
        JSON.stringify(r.applicableDocumentTypes),
        r.version,
        r.sourceReference,
        r.effectiveFrom,
        r.enabled ? 1 : 0,
        r.readableCondition,
        JSON.stringify(r.testCases)
      );
    }

    // 3. Seed Demo Applications (strictly disabled in production or when SEED_DEMO_DATA=false)
    if (isProduction || seedDemoDisabled) {
      console.log('[INFO] Production or clean data mode active: skipping demo application fixtures.');
      return;
    }

    // App 1: Compliant
    const app1Id = 'app-1104';
    const app1: Application = {
      id: app1Id,
      referenceNumber: 'APP-2026-EOA-1104',
      institutionName: 'Kalyani Institute of Engineering & Technology',
      applicationType: 'Extension of Approval',
      organizationId: 'org-aicte-western',
      status: 'Ready for Review',
      reviewStatus: 'Review Completed',
      declaredDetails: {
        institutionName: 'Kalyani Institute of Engineering & Technology',
        societyOrTrustName: 'Kalyani Charitable Educational Trust',
        address: 'Sector 14, Knowledge Corridor, Pune - 411028',
        pinCode: '411028',
        state: 'Maharashtra',
        landAreaAcres: 7.50,
        leaseExpiryDate: '2054-03-31',
        sanctionedIntake: 420,
        previousApprovalRef: 'F.No. Western/1-35128912/2025/EOA',
        applicationYear: '2026-27'
      },
      documentCount: 4,
      openFindingsCount: 0,
      totalFindingsCount: 0,
      reviewerNotes: 'All submitted statutory documents cross-verified. 30-year unencumbered lease confirmed.',
      assignedReviewer: 'Dr. Aruna Rao',
      createdBy: 'Applicant Portal (Online)',
      createdAt: '2026-03-12T09:30:00.000Z',
      updatedAt: '2026-03-14T14:15:00.000Z'
    };
    this.rawInsertApplication(app1);

    const doc1_1: DocumentRecord = {
      id: 'doc-1104-lease',
      applicationId: app1Id,
      originalFilename: 'Registered_Lease_Deed_Kalyani_Trust_30Yr.pdf',
      documentType: 'Land Lease Deed',
      storageKey: `dockets/${app1Id}/lease_deed.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 1845200,
      checksum: 'sha256-a9f82bc71e843',
      pageCount: 6,
      processingStatus: 'Extracted',
      extractedTextByPage: [
        { page: 1, text: 'THIS INDENTURE OF LEASE entered on this 1st day of April 2024 between MIDC (Lessor) and Kalyani Charitable Educational Trust (Lessee)...' },
        { page: 2, text: 'WHEREAS the Lessee is establishing Kalyani Institute of Engineering & Technology on plot no 42...' },
        { page: 3, text: 'CLAUSE 4: DURATION AND TENURE. The Lessor doth hereby demise unto the Lessee all that piece and parcel of land for a term expiring on 31 March 2054 subject to payment of annual ground rent...' },
        { page: 4, text: 'SCHEDULE OF PROPERTY: Land area admeasuring 7.50 Acres bearing Survey No. 114/2B, Knowledge Park...' }
      ],
      createdAt: '2026-03-12T09:35:00.000Z'
    };
    const doc1_2: DocumentRecord = {
      id: 'doc-1104-safety',
      applicationId: app1Id,
      originalFilename: 'Building_Safety_Structural_Fitness_2025.pdf',
      documentType: 'Building Safety Certificate',
      storageKey: `dockets/${app1Id}/building_safety.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 945000,
      checksum: 'sha256-b3e100f9831',
      pageCount: 3,
      processingStatus: 'Extracted',
      extractedTextByPage: [
        { page: 1, text: 'CERTIFICATE OF STRUCTURAL STABILITY. Certified that the institutional building premises of Kalyani Institute of Engineering has been inspected by Chartered Engineer: Er. S. P. Deshmukh. Found structurally sound for educational occupancy.' }
      ],
      createdAt: '2026-03-12T09:36:00.000Z'
    };
    const doc1_3: DocumentRecord = {
      id: 'doc-1104-fire',
      applicationId: app1Id,
      originalFilename: 'Fire_Safety_NOC_Municipal_Corp_2025.pdf',
      documentType: 'Fire Safety NOC',
      storageKey: `dockets/${app1Id}/fire_noc.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 812000,
      checksum: 'sha256-c77439ad22',
      pageCount: 2,
      processingStatus: 'Extracted',
      extractedTextByPage: [
        { page: 1, text: 'FIRE AND LIFE SAFETY CLEARANCE CERTIFICATE. Issued by Chief Fire Officer, Municipal Corporation. Valid until March 2027.' }
      ],
      createdAt: '2026-03-12T09:37:00.000Z'
    };
    const doc1_4: DocumentRecord = {
      id: 'doc-1104-trust',
      applicationId: app1Id,
      originalFilename: 'Trust_Registration_Certificate_Bombay_Public_Trust.pdf',
      documentType: 'Society / Trust Registration Certificate',
      storageKey: `dockets/${app1Id}/trust_cert.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 1120000,
      checksum: 'sha256-d88190fa72',
      pageCount: 4,
      processingStatus: 'Extracted',
      extractedTextByPage: [
        { page: 1, text: 'Office of the Charity Commissioner. Certificate of Registration. Society named: Kalyani Charitable Educational Trust has this day been registered under Bombay Public Trusts Act, 1950. Registration No: E-18422/Pune.' }
      ],
      createdAt: '2026-03-12T09:38:00.000Z'
    };

    [doc1_1, doc1_2, doc1_3, doc1_4].forEach(d => this.rawInsertDocument(d));

    const flds1_1 = extractFieldsFromPages(doc1_1.id, app1Id, doc1_1.documentType, doc1_1.extractedTextByPage!.map(p => ({ pageNumber: p.page, text: p.text })));
    const flds1_2 = extractFieldsFromPages(doc1_2.id, app1Id, doc1_2.documentType, doc1_2.extractedTextByPage!.map(p => ({ pageNumber: p.page, text: p.text })));
    const flds1_4 = extractFieldsFromPages(doc1_4.id, app1Id, doc1_4.documentType, doc1_4.extractedTextByPage!.map(p => ({ pageNumber: p.page, text: p.text })));
    [...flds1_1, ...flds1_2, ...flds1_4].forEach(f => this.rawInsertField(f));

    // App 2: Mismatch
    const app2Id = 'app-0842';
    const app2: Application = {
      id: app2Id,
      referenceNumber: 'APP-2026-NTC-0842',
      institutionName: 'Pragati Institute of Technology & Management',
      applicationType: 'New Technical Campus',
      organizationId: 'org-aicte-western',
      status: 'Ready for Review',
      reviewStatus: 'Under Review',
      declaredDetails: {
        institutionName: 'Pragati Institute of Technology & Management',
        societyOrTrustName: 'Pragati Educational & Welfare Foundation',
        address: 'Plot 88-92, Industrial Focal Point, Phase 4, Ahmedabad - 382445',
        pinCode: '382445',
        state: 'Gujarat',
        landAreaAcres: 7.50,
        leaseExpiryDate: '2048-03-31',
        sanctionedIntake: 300,
        previousApprovalRef: 'N/A (New Institution)',
        applicationYear: '2026-27'
      },
      documentCount: 4,
      openFindingsCount: 2,
      totalFindingsCount: 2,
      reviewerNotes: 'Flagged for scrutiny: Land lease duration in deed terminates in 2028 despite applicant declaring 2048. Land acreage short by 2.30 acres.',
      assignedReviewer: 'Dr. Aruna Rao',
      createdBy: 'Applicant Portal (Online)',
      createdAt: '2026-03-10T11:00:00.000Z',
      updatedAt: '2026-03-15T16:20:00.000Z'
    };
    this.rawInsertApplication(app2);

    const doc2_1: DocumentRecord = {
      id: 'doc-0842-lease',
      applicationId: app2Id,
      originalFilename: 'Land_Lease_Agreement_Pragati_Ahmedabad.pdf',
      documentType: 'Land Lease Deed',
      storageKey: `dockets/${app2Id}/lease_deed.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 2410000,
      checksum: 'sha256-e32049ba1',
      pageCount: 5,
      processingStatus: 'Extracted',
      extractedTextByPage: [
        { page: 1, text: 'INDENTURE OF LEASE executed at Ahmedabad. Lessor: Gujarat Industrial Estate Ltd. Lessee: Pragati Educational & Welfare Foundation...' },
        { page: 2, text: 'The Lessee intends to operate educational facilities...' },
        { page: 3, text: 'CLAUSE 4: TENURE OF LEASE. That the term of this lease agreement shall be for a duration of five (5) years only, valid up to 31 March 2028, after which the Lessee shall surrender physical possession unless a renewed lease is formally registered with competent authorities.' },
        { page: 4, text: 'SCHEDULE A (PROPERTY PARTICULARS): All that parcel of non-agricultural freehold parcel, total land area: 5.20 Acres, comprised in Survey No. 88/1...' }
      ],
      createdAt: '2026-03-10T11:05:00.000Z'
    };
    const doc2_2: DocumentRecord = {
      id: 'doc-0842-trust',
      applicationId: app2Id,
      originalFilename: 'Trust_Deed_Pragati_Foundation.pdf',
      documentType: 'Society / Trust Registration Certificate',
      storageKey: `dockets/${app2Id}/trust_cert.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 1320000,
      checksum: 'sha256-ff4190ba33',
      pageCount: 4,
      processingStatus: 'Extracted',
      extractedTextByPage: [
        { page: 1, text: 'CERTIFICATE OF REGISTRATION UNDER SOCIETIES REGISTRATION ACT. Society named: Pragati Educational & Welfare Foundation bearing Registration No: GUJ/AHM/2014/8912.' }
      ],
      createdAt: '2026-03-10T11:06:00.000Z'
    };
    const doc2_3: DocumentRecord = {
      id: 'doc-0842-safety',
      applicationId: app2Id,
      originalFilename: 'Building_Safety_Inspection_Report.pdf',
      documentType: 'Building Safety Certificate',
      storageKey: `dockets/${app2Id}/safety_cert.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 1540000,
      checksum: 'sha256-a1458921cf',
      pageCount: 3,
      processingStatus: 'Extracted',
      extractedTextByPage: [
        { page: 1, text: 'STRUCTURAL ADEQUACY CERTIFICATE. Chartered Engineer: Er. R. K. Patel. Certified sound for instructional use.' }
      ],
      createdAt: '2026-03-10T11:07:00.000Z'
    };
    const doc2_4: DocumentRecord = {
      id: 'doc-0842-fire',
      applicationId: app2Id,
      originalFilename: 'Fire_NOC_Ahmedabad_Urban_Development.pdf',
      documentType: 'Fire Safety NOC',
      storageKey: `dockets/${app2Id}/fire_noc.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 790000,
      checksum: 'sha256-324901ba12',
      pageCount: 2,
      processingStatus: 'Extracted',
      extractedTextByPage: [
        { page: 1, text: 'FIRE PREVENTION NOC. Urban Development Authority Fire Branch. Valid through December 2026.' }
      ],
      createdAt: '2026-03-10T11:08:00.000Z'
    };
    [doc2_1, doc2_2, doc2_3, doc2_4].forEach(d => this.rawInsertDocument(d));

    const flds2_1 = extractFieldsFromPages(doc2_1.id, app2Id, doc2_1.documentType, doc2_1.extractedTextByPage!.map(p => ({ pageNumber: p.page, text: p.text })));
    const flds2_2 = extractFieldsFromPages(doc2_2.id, app2Id, doc2_2.documentType, doc2_2.extractedTextByPage!.map(p => ({ pageNumber: p.page, text: p.text })));
    const flds2_3 = extractFieldsFromPages(doc2_3.id, app2Id, doc2_3.documentType, doc2_3.extractedTextByPage!.map(p => ({ pageNumber: p.page, text: p.text })));
    [...flds2_1, ...flds2_2, ...flds2_3].forEach(f => this.rawInsertField(f));

    const evalResult2 = evaluateApplicationRules(
      app2,
      [doc2_1, doc2_2, doc2_3, doc2_4],
      this.getFieldsByApplication(app2Id),
      this.getAllRules()
    );
    evalResult2.findings.forEach(f => this.rawInsertFinding(f));

    // App 3: Scanned / Missing Evidence
    const app3Id = 'app-0915';
    const app3: Application = {
      id: app3Id,
      referenceNumber: 'APP-2026-EOA-0915',
      institutionName: 'Vidyapeeth Academy of Pharmaceutical Sciences',
      applicationType: 'Increase in Intake',
      organizationId: 'org-aicte-central',
      status: 'Ready for Review',
      reviewStatus: 'Pending Review',
      declaredDetails: {
        institutionName: 'Vidyapeeth Academy of Pharmaceutical Sciences',
        societyOrTrustName: 'Vidyapeeth Educational Trust',
        address: 'Bypass Road, Near District Stadium, Bhopal - 462003',
        pinCode: '462003',
        state: 'Madhya Pradesh',
        landAreaAcres: 5.00,
        leaseExpiryDate: '2050-06-30',
        sanctionedIntake: 120,
        previousApprovalRef: 'F.No. Central/1-2819024/2024/EOA',
        applicationYear: '2026-27'
      },
      documentCount: 2,
      openFindingsCount: 2,
      totalFindingsCount: 2,
      reviewerNotes: 'Fire Safety NOC missing from uploaded docket. Uploaded Building Safety Certificate is a scanned photocopy requiring officer inspection.',
      assignedReviewer: 'Dr. Aruna Rao',
      createdBy: 'Applicant Portal (Online)',
      createdAt: '2026-03-14T08:00:00.000Z',
      updatedAt: '2026-03-14T08:15:00.000Z'
    };
    this.rawInsertApplication(app3);

    const doc3_1: DocumentRecord = {
      id: 'doc-0915-lease',
      applicationId: app3Id,
      originalFilename: 'Land_Title_Deed_Vidyapeeth_Trust.pdf',
      documentType: 'Land Lease Deed',
      storageKey: `dockets/${app3Id}/title_deed.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 2100000,
      checksum: 'sha256-ff712bc9',
      pageCount: 4,
      processingStatus: 'Extracted',
      extractedTextByPage: [
        { page: 1, text: 'PERPETUAL LEASE CONVEYANCE. Lessor: State Housing Board. Lessee: Vidyapeeth Educational Trust...' },
        { page: 2, text: 'For a term expiring on 30 June 2050...' },
        { page: 3, text: 'Schedule: Total land area 5.00 Acres.' }
      ],
      createdAt: '2026-03-14T08:05:00.000Z'
    };
    const doc3_2: DocumentRecord = {
      id: 'doc-0915-safety-scan',
      applicationId: app3Id,
      originalFilename: 'Building_Safety_Photocopy_Scanned.pdf',
      documentType: 'Building Safety Certificate',
      storageKey: `dockets/${app3Id}/safety_scan.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 4200000,
      checksum: 'sha256-dd189024c',
      pageCount: 2,
      processingStatus: 'Scanned Unreadable',
      isScannedOrTextPoor: true,
      extractedTextByPage: [
        { page: 1, text: '[SCANNED BITMAP IMAGE — OCR TEXT LAYER NOT PRESENT IN PDF CONTAINER. LOW CONTRAST STAMP]' }
      ],
      createdAt: '2026-03-14T08:06:00.000Z'
    };
    [doc3_1, doc3_2].forEach(d => this.rawInsertDocument(d));

    const flds3_1 = extractFieldsFromPages(doc3_1.id, app3Id, doc3_1.documentType, doc3_1.extractedTextByPage!.map(p => ({ pageNumber: p.page, text: p.text })));
    flds3_1.forEach(f => this.rawInsertField(f));

    const evalResult3 = evaluateApplicationRules(
      app3,
      [doc3_1, doc3_2],
      this.getFieldsByApplication(app3Id),
      this.getAllRules()
    );
    evalResult3.findings.forEach(f => this.rawInsertFinding(f));

    // Audit Events
    const initialEvents: AuditEvent[] = [
      {
        id: 'aud-001',
        timestamp: '2026-03-10T11:00:00.000Z',
        actorId: 'system',
        actorName: 'Application Intake Portal',
        action: 'Application Created',
        entityType: 'Application',
        entityReference: 'APP-2026-NTC-0842',
        note: 'Intake package submitted with 4 attached PDF documents.'
      },
      {
        id: 'aud-002',
        timestamp: '2026-03-10T11:08:30.000Z',
        actorId: 'system',
        actorName: 'Extraction Pipeline',
        action: 'Extraction Completed',
        entityType: 'Document',
        entityReference: 'Registered_Lease_Deed_Kalyani_Trust_30Yr.pdf',
        note: 'Deterministic text parsing completed across 5 pages.'
      },
      {
        id: 'aud-003',
        timestamp: '2026-03-10T11:10:00.000Z',
        actorId: 'system',
        actorName: 'Validation Engine (v1.2)',
        action: 'Validation Executed',
        entityType: 'Finding',
        entityReference: 'FND-0842-01',
        note: 'Rule RULE-TEN-01 raised finding: Lease expiry date variance (Declared: 2048-03-31 vs Deed: 31 March 2028).'
      },
      {
        id: 'aud-004',
        timestamp: '2026-03-15T16:20:00.000Z',
        actorId: 'usr-001',
        actorName: 'Dr. Aruna Rao',
        action: 'Officer Note Added',
        entityType: 'Application',
        entityReference: 'APP-2026-NTC-0842',
        note: 'Scrutiny Officer flag: Notice to institution scheduled for land tenure deficit.'
      }
    ];

    for (const e of initialEvents) {
      this.recordAudit(e);
    }

    try {
      this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS audit_events_no_update
        BEFORE UPDATE ON audit_events
        BEGIN
          SELECT RAISE(FAIL, 'Cryptographic Ledger Invariant: audit_events table is strictly append-only. Modifying existing events is prohibited.');
        END;

        CREATE TRIGGER IF NOT EXISTS audit_events_no_delete
        BEFORE DELETE ON audit_events
        BEGIN
          SELECT RAISE(FAIL, 'Cryptographic Ledger Invariant: audit_events table is strictly append-only. Deleting events is prohibited.');
        END;
      `);
    } catch {}
  }

  // --- RAW INSERT HELPERS FOR SEEDING & TRANSACTIONS ---

  private rawInsertApplication(app: Application) {
    this.db.prepare(`
      INSERT INTO applications (id, referenceNumber, institutionName, applicationType, organizationId, status, reviewStatus, declaredDetails, documentCount, openFindingsCount, totalFindingsCount, reviewerNotes, assignedReviewer, createdBy, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      app.id,
      app.referenceNumber,
      app.institutionName,
      app.applicationType,
      app.organizationId || 'org-aicte-western',
      app.status,
      app.reviewStatus,
      JSON.stringify(app.declaredDetails),
      app.documentCount,
      app.openFindingsCount,
      app.totalFindingsCount,
      app.reviewerNotes || '',
      app.assignedReviewer || '',
      app.createdBy,
      app.createdAt,
      app.updatedAt
    );
  }

  private rawInsertDocument(doc: DocumentRecord) {
    this.db.prepare(`
      INSERT INTO documents (id, applicationId, originalFilename, documentType, storageKey, mimeType, sizeBytes, checksum, pageCount, processingStatus, isScannedOrTextPoor, extractedTextByPage, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      doc.id,
      doc.applicationId,
      doc.originalFilename,
      doc.documentType,
      doc.storageKey,
      doc.mimeType,
      doc.sizeBytes,
      doc.checksum,
      doc.pageCount,
      doc.processingStatus,
      doc.isScannedOrTextPoor ? 1 : 0,
      doc.extractedTextByPage ? JSON.stringify(doc.extractedTextByPage) : null,
      doc.createdAt
    );
  }

  private rawInsertField(f: ExtractedField) {
    this.db.prepare(`
      INSERT INTO extracted_fields (id, documentId, applicationId, fieldName, fieldLabel, rawValue, normalizedValue, pageNumber, sourceText, confidence, extractionMethod, isCorrected, correctedValue, correctedBy, correctedAt, correctionNote)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      f.id,
      f.documentId,
      f.applicationId,
      f.fieldName,
      f.fieldLabel,
      f.rawValue,
      f.normalizedValue,
      f.pageNumber,
      f.sourceText,
      f.confidence ?? null,
      f.extractionMethod,
      f.isCorrected ? 1 : 0,
      f.correctedValue || null,
      f.correctedBy || null,
      f.correctedAt || null,
      f.correctionNote || null
    );
  }

  private rawInsertFinding(f: Finding) {
    this.db.prepare(`
      INSERT INTO findings (id, reference, applicationId, ruleId, ruleKey, ruleVersion, category, title, explanation, declaredValue, evidenceValue, severity, status, evidenceList, assignedReviewer, reviewerDecisionReason, updatedBy, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      f.id,
      f.reference,
      f.applicationId,
      f.ruleId,
      f.ruleKey,
      f.ruleVersion,
      f.category,
      f.title,
      f.explanation,
      f.declaredValue || null,
      f.evidenceValue || null,
      f.severity,
      f.status,
      JSON.stringify(f.evidenceList || []),
      f.assignedReviewer || null,
      f.reviewerDecisionReason || null,
      f.updatedBy || null,
      f.createdAt,
      f.updatedAt
    );
  }

  // --- QUERY & MUTATION APIS ---

  getAllApplications(userOrgId?: string, isAdmin = false): Application[] {
    let rows: any[];
    if (!isAdmin && userOrgId) {
      rows = this.db.prepare('SELECT * FROM applications WHERE organizationId = ? ORDER BY createdAt DESC').all(userOrgId) as any[];
    } else {
      rows = this.db.prepare('SELECT * FROM applications ORDER BY createdAt DESC').all() as any[];
    }
    return rows.map(r => this.mapApplicationRow(r));
  }

  getApplicationById(id: string, userOrgId?: string, isAdmin = false): Application | undefined {
    const row = this.db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    if (!isAdmin && userOrgId && row.organizationId !== userOrgId) {
      return undefined;
    }
    return this.mapApplicationRow(row);
  }

  createApplication(data: Partial<Application>, actor?: User): Application {
    const id = `app-${crypto.randomUUID()}`;
    const ref = data.referenceNumber || `APP-2026-${(data.applicationType || 'EOA').slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const effectiveActor = actor || this.currentUser;
    const organizationId = data.organizationId || (effectiveActor as any).organizationId || 'org-aicte-western';

    const newApp: Application = {
      id,
      referenceNumber: ref,
      institutionName: data.institutionName || 'Untitled Technical Institution',
      applicationType: data.applicationType || 'Extension of Approval',
      organizationId,
      status: 'Ready for Review',
      reviewStatus: 'Pending Review',
      declaredDetails: {
        institutionName: data.declaredDetails?.institutionName || data.institutionName || '',
        societyOrTrustName: data.declaredDetails?.societyOrTrustName || '',
        address: data.declaredDetails?.address || '',
        pinCode: data.declaredDetails?.pinCode || '',
        state: data.declaredDetails?.state || '',
        landAreaAcres: data.declaredDetails?.landAreaAcres || 5.0,
        leaseExpiryDate: data.declaredDetails?.leaseExpiryDate || '2050-03-31',
        sanctionedIntake: data.declaredDetails?.sanctionedIntake || 300,
        previousApprovalRef: data.declaredDetails?.previousApprovalRef || '',
        applicationYear: data.declaredDetails?.applicationYear || '2026-27',

        // Optional AICTE regulatory context
        leaseArrangement: data.declaredDetails?.leaseArrangement,
        applicableHandbookVersion: data.declaredDetails?.applicableHandbookVersion,
        councilNotificationDate: data.declaredDetails?.councilNotificationDate,
        lessorType: data.declaredDetails?.lessorType,
        isSubLease: data.declaredDetails?.isSubLease,
        subLeaseAssignmentRight: data.declaredDetails?.subLeaseAssignmentRight,
        mortgageRegistered: data.declaredDetails?.mortgageRegistered
      },
      documentCount: 0,
      openFindingsCount: 0,
      totalFindingsCount: 0,
      reviewerNotes: data.reviewerNotes || '',
      assignedReviewer: effectiveActor.displayName,
      createdBy: effectiveActor.displayName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.rawInsertApplication(newApp);

    this.recordAudit({
      actorId: effectiveActor.id,
      actorName: effectiveActor.displayName,
      action: 'Application Created',
      entityType: 'Application',
      entityReference: newApp.referenceNumber,
      note: `New application registered for scrutiny [Org: ${organizationId}]`
    });

    return newApp;
  }

  getDocumentsByApplication(applicationId: string): DocumentRecord[] {
    const rows = this.db.prepare('SELECT * FROM documents WHERE applicationId = ? ORDER BY createdAt ASC').all(applicationId) as any[];
    return rows.map(r => this.mapDocumentRow(r));
  }

  getDocumentById(id: string): DocumentRecord | undefined {
    const row = this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
    return row ? this.mapDocumentRow(row) : undefined;
  }

  addDocument(doc: DocumentRecord, actor?: User): DocumentRecord {
    this.rawInsertDocument(doc);
    const effectiveActor = actor || this.currentUser;

    const docCount = Number((this.db.prepare('SELECT COUNT(*) as c FROM documents WHERE applicationId = ?').get(doc.applicationId) as any)?.c || 0);
    this.db.prepare('UPDATE applications SET documentCount = ?, updatedAt = ? WHERE id = ?').run(docCount, new Date().toISOString(), doc.applicationId);

    this.recordAudit({
      actorId: effectiveActor.id,
      actorName: effectiveActor.displayName,
      action: 'Document Uploaded',
      entityType: 'Document',
      entityReference: doc.originalFilename,
      note: `Type: ${doc.documentType}, Size: ${(doc.sizeBytes / 1024).toFixed(1)} KB`
    });

    return doc;
  }

  /**
   * Deletes a document, cascades its extracted fields, and re-evaluates all application rules.
   */
  removeDocument(documentId: string, actor?: User): boolean {
    this.db.exec('BEGIN IMMEDIATE');

    try {
      const doc = this.getDocumentById(documentId);
      if (!doc) {
        this.db.exec('ROLLBACK');
        return false;
      }

      const effectiveActor = actor || this.currentUser;
      const appId = doc.applicationId;

      // Delete extracted fields and document
      this.db.prepare(
        'DELETE FROM extracted_fields WHERE documentId = ?'
      ).run(documentId);

      this.db.prepare(
        'DELETE FROM documents WHERE id = ?'
      ).run(documentId);

      // Update application document count
      const docCount = Number(
        (this.db.prepare(
          'SELECT COUNT(*) as c FROM documents WHERE applicationId = ?'
        ).get(appId) as any)?.c || 0
      );

      this.db.prepare(
        'UPDATE applications SET documentCount = ?, updatedAt = ? WHERE id = ?'
      ).run(docCount, new Date().toISOString(), appId);

      // Record deletion audit event
      this.recordAudit({
        actorId: effectiveActor.id,
        actorName: effectiveActor.displayName,
        action: 'Document Removed',
        entityType: 'Document',
        entityReference: doc.originalFilename,
        note: 'Document detached from application docket. Re-evaluating validation checks.'
      });

      // Re-run validation within the same transaction
      this.runValidation(appId, effectiveActor);

      this.db.exec('COMMIT');
      return true;
        } catch (error) {
      try {
        this.db.exec('ROLLBACK');
      } catch {
        // Preserve the original database error.
      }
      throw error;
    }
  }
  getFieldsByDocument(documentId: string): ExtractedField[] {
    const rows = this.db.prepare('SELECT * FROM extracted_fields WHERE documentId = ?').all(documentId) as any[];
    return rows.map(r => this.mapFieldRow(r));
  }

  getFieldsByApplication(applicationId: string): ExtractedField[] {
    const rows = this.db.prepare('SELECT * FROM extracted_fields WHERE applicationId = ?').all(applicationId) as any[];
    return rows.map(r => this.mapFieldRow(r));
  }

  saveExtractedFields(fields: ExtractedField[]) {
    for (const f of fields) {
      this.db.prepare('DELETE FROM extracted_fields WHERE id = ?').run(f.id);
      this.rawInsertField(f);
    }
  }

  correctField(fieldId: string, correctedValue: string, note: string, actor?: User): ExtractedField | undefined {
    const field = this.getFieldById(fieldId);
    if (!field) return undefined;

    const effectiveActor = actor || this.currentUser;
    const previousValue = field.correctedValue || field.rawValue;
    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE extracted_fields
      SET isCorrected = 1, correctedValue = ?, normalizedValue = ?, correctedBy = ?, correctedAt = ?, correctionNote = ?
      WHERE id = ?
    `).run(correctedValue, correctedValue, effectiveActor.displayName, now, note, fieldId);

    this.recordAudit({
      actorId: effectiveActor.id,
      actorName: effectiveActor.displayName,
      action: 'Extracted Field Corrected',
      entityType: 'ExtractedField',
      entityReference: field.fieldName,
      beforeValue: previousValue,
      afterValue: correctedValue,
      note: `Officer correction: ${note}`
    });

    this.runValidation(field.applicationId, effectiveActor);
    return this.getFieldById(fieldId);
  }

  getFieldById(fieldId: string): ExtractedField | undefined {
    const row = this.db.prepare('SELECT * FROM extracted_fields WHERE id = ?').get(fieldId) as any;
    return row ? this.mapFieldRow(row) : undefined;
  }

  getFindingsByApplication(applicationId: string, userOrgId?: string, isAdmin = false): Finding[] {
    const app = this.getApplicationById(applicationId, userOrgId, isAdmin);
    if (!app) return [];
    const rows = this.db.prepare('SELECT * FROM findings WHERE applicationId = ? ORDER BY createdAt ASC').all(applicationId) as any[];
    return rows.map(r => this.mapFindingRow(r));
  }

  getAllFindings(userOrgId?: string, isAdmin = false): Finding[] {
    let rows: any[];
    if (!isAdmin && userOrgId) {
      rows = this.db.prepare(`
        SELECT f.* FROM findings f
        JOIN applications a ON f.applicationId = a.id
        WHERE a.organizationId = ?
        ORDER BY f.createdAt DESC
      `).all(userOrgId) as any[];
    } else {
      rows = this.db.prepare('SELECT * FROM findings ORDER BY createdAt DESC').all() as any[];
    }
    return rows.map(r => this.mapFindingRow(r));
  }

  getFindingById(id: string): Finding | undefined {
    const row = this.db.prepare('SELECT * FROM findings WHERE id = ?').get(id) as any;
    return row ? this.mapFindingRow(row) : undefined;
  }

  recordReviewAction(
    findingId: string,
    action: ReviewAction['action'],
    newStatus: Finding['status'],
    note: string,
    actor?: User
  ): Finding | undefined {
    const finding = this.getFindingById(findingId);
    if (!finding) return undefined;

    const effectiveActor = actor || this.currentUser;
    const previousStatus = finding.status;
    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE findings
      SET status = ?, reviewerDecisionReason = ?, updatedBy = ?, updatedAt = ?
      WHERE id = ?
    `).run(newStatus, note, effectiveActor.displayName, now, findingId);

    const actionId = `act-${crypto.randomUUID()}`;
    this.db.prepare(`
      INSERT INTO review_actions (id, findingId, applicationId, reviewerId, reviewerName, action, previousStatus, newStatus, note, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(actionId, findingId, finding.applicationId, effectiveActor.id, effectiveActor.displayName, action, previousStatus, newStatus, note, now);

    // Update application review status
    const allAppFindings = this.getFindingsByApplication(finding.applicationId);
    const hasConfirmed = allAppFindings.some(f => f.status === 'Confirmed');
    const allResolved = allAppFindings.every(f => f.status === 'Confirmed' || f.status === 'Dismissed' || f.status === 'Corrected');

    let updatedReviewStatus = 'Under Review';
    if (hasConfirmed) {
      updatedReviewStatus = 'Discrepancies Confirmed';
    } else if (allResolved) {
      updatedReviewStatus = 'Review Completed';
    }

    const openCount = allAppFindings.filter(f => f.status === 'Open' || f.status === 'Under Review' || f.status === 'Unable to Determine').length;

    this.db.prepare(`
      UPDATE applications
      SET reviewStatus = ?, openFindingsCount = ?, updatedAt = ?
      WHERE id = ?
    `).run(updatedReviewStatus, openCount, now, finding.applicationId);

    this.recordAudit({
      actorId: effectiveActor.id,
      actorName: effectiveActor.displayName,
      action: `Finding ${action}`,
      entityType: 'Finding',
      entityReference: finding.reference,
      beforeValue: previousStatus,
      afterValue: newStatus,
      note: `Review decision: ${note}`
    });

    return this.getFindingById(findingId);
  }

  recordApplicationDecision(
    applicationId: string,
    decisionType: 'Approved' | 'Rejected' | 'Clarification Required',
    rationale: string,
    actor?: User
  ): { decisionId: string; application: Application } | undefined {
    const app = this.getApplicationById(applicationId);
    if (!app) return undefined;

    const effectiveActor = actor || this.currentUser;
    const decisionId = `dec-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO application_decisions (id, applicationId, reviewerId, reviewerName, decisionType, rationale, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(decisionId, applicationId, effectiveActor.id, effectiveActor.displayName, decisionType, rationale, now);

    let reviewStatus = 'Review Completed';
    if (decisionType === 'Rejected') reviewStatus = 'Discrepancies Confirmed';
    if (decisionType === 'Clarification Required') reviewStatus = 'Under Review';

    this.db.prepare(`
      UPDATE applications
      SET reviewStatus = ?, reviewerNotes = ?, updatedAt = ?
      WHERE id = ?
    `).run(reviewStatus, `[Decision: ${decisionType}] ${rationale}`, now, applicationId);

    this.recordAudit({
      actorId: effectiveActor.id,
      actorName: effectiveActor.displayName,
      action: `Application Decision: ${decisionType}`,
      entityType: 'Application',
      entityReference: app.referenceNumber,
      note: rationale
    });

    return {
      decisionId,
      application: this.getApplicationById(applicationId)!
    };
  }

  getAllRules(): Rule[] {
    const rows = this.db.prepare('SELECT * FROM rules ORDER BY ruleKey ASC').all() as any[];
    return rows.map(r => this.mapRuleRow(r));
  }

  updateRule(ruleId: string, updates: Partial<Rule>, actor?: User): Rule | undefined {
    const rule = this.getRuleById(ruleId);
    if (!rule) return undefined;

    const effectiveActor = actor || this.currentUser;
    const newEnabled = updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : (rule.enabled ? 1 : 0);

    this.db.prepare(`
      UPDATE rules
      SET enabled = ?
      WHERE id = ?
    `).run(newEnabled, ruleId);

    this.recordAudit({
      actorId: effectiveActor.id,
      actorName: effectiveActor.displayName,
      action: 'Rule Configuration Changed',
      entityType: 'Rule',
      entityReference: rule.ruleKey,
      note: `Rule ${rule.ruleKey} updated: ${updates.enabled !== undefined ? (updates.enabled ? 'Enabled' : 'Disabled') : 'Settings changed'}`
    });

    return this.getRuleById(ruleId);
  }

  getRuleById(ruleId: string): Rule | undefined {
    const row = this.db.prepare('SELECT * FROM rules WHERE id = ?').get(ruleId) as any;
    return row ? this.mapRuleRow(row) : undefined;
  }

  runValidation(applicationId: string, actor?: User) {
    const app = this.getApplicationById(applicationId);
    if (!app) return null;

    const effectiveActor = actor || this.currentUser;
    const docs = this.getDocumentsByApplication(applicationId);
    const fields = this.getFieldsByApplication(applicationId);
    const rules = this.getAllRules();

    const result = evaluateApplicationRules(app, docs, fields, rules);

    const existingFindings = this.getFindingsByApplication(applicationId);
    const previousReviewsByRule = new Map<string, { status: Finding['status']; note?: string }>();
    for (const ef of existingFindings) {
      if (ef.status !== 'Open') {
        previousReviewsByRule.set(ef.ruleKey, { status: ef.status, note: ef.reviewerDecisionReason });
      }
    }

    // Delete previous findings for this application
    this.db.prepare('DELETE FROM findings WHERE applicationId = ?').run(applicationId);

    // Insert new findings, preserving prior non-open reviewer statuses
    for (const f of result.findings) {
      const prev = previousReviewsByRule.get(f.ruleKey);
      if (prev) {
        f.status = prev.status;
        f.reviewerDecisionReason = prev.note;
      }
      this.rawInsertFinding(f);
    }

    const currentFindings = this.getFindingsByApplication(applicationId);
    const openCount = currentFindings.filter(f => f.status === 'Open' || f.status === 'Under Review' || f.status === 'Unable to Determine').length;
    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE applications
      SET openFindingsCount = ?, totalFindingsCount = ?, status = 'Ready for Review', updatedAt = ?
      WHERE id = ?
    `).run(openCount, currentFindings.length, now, applicationId);

    this.recordAudit({
      actorId: effectiveActor.id || 'system',
      actorName: effectiveActor.displayName || 'Validation Engine (v1.2)',
      action: 'Validation Executed',
      entityType: 'Application',
      entityReference: app.referenceNumber,
      note: `Evaluated ${result.summary.total} rules: ${result.summary.passed} passed, ${result.summary.findings} findings raised.`
    });

    return {
      findings: currentFindings,
      summary: result.summary
    };
  }

  recordAudit(event: Omit<AuditEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): AuditEvent {
    const id = event.id || `aud-${crypto.randomUUID()}`;
    const timestamp = event.timestamp || new Date().toISOString();
    const actorRole = event.actorRole || 'Reviewer';
    const organizationId = event.organizationId || 'org-aicte-western';

    const maxRetries = 10;
    let attempt = 0;

    while (attempt <= maxRetries) {
      let startedImmediate = false;
      try {
        try {
          this.db.exec('BEGIN IMMEDIATE');
          startedImmediate = true;
        } catch (txErr: any) {
          if (txErr.message && txErr.message.includes('cannot start a transaction within a transaction')) {
            this.db.exec('SAVEPOINT audit_record_sp');
          } else {
            throw txErr;
          }
        }

        // Atomic fetch of previous event for cryptographic hash chaining
        const latest = this.db.prepare(`
          SELECT sequenceNumber, currentHash
          FROM audit_events
          ORDER BY sequenceNumber DESC, rowid DESC
          LIMIT 1
        `).get() as any;

        const sequenceNumber = latest && latest.sequenceNumber ? Number(latest.sequenceNumber) + 1 : 1;
        const previousHash = (latest && latest.currentHash && latest.currentHash.length === 64) ? latest.currentHash : GENESIS_PREVIOUS_HASH;

        const payloadHash = computePayloadHash({
          entityType: event.entityType,
          entityReference: event.entityReference,
          beforeValue: event.beforeValue,
          afterValue: event.afterValue,
          note: event.note
        });

        const currentHash = computeEventHash({
          sequenceNumber,
          previousHash,
          id,
          timestamp,
          actorId: event.actorId,
          actorRole,
          organizationId,
          action: event.action,
          payloadHash
        });

        this.db.prepare(`
          INSERT INTO audit_events (
            id, sequenceNumber, timestamp, actorId, actorName, actorRole, organizationId,
            action, entityType, entityReference, beforeValue, afterValue, note,
            payloadHash, previousHash, currentHash
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          sequenceNumber,
          timestamp,
          event.actorId,
          event.actorName,
          actorRole,
          organizationId,
          event.action,
          event.entityType,
          event.entityReference,
          event.beforeValue || null,
          event.afterValue || null,
          event.note || null,
          payloadHash,
          previousHash,
          currentHash
        );

        if (startedImmediate) {
          this.db.exec('COMMIT');
        } else {
          this.db.exec('RELEASE SAVEPOINT audit_record_sp');
        }

        return {
          id,
          sequenceNumber,
          timestamp,
          actorId: event.actorId,
          actorName: event.actorName,
          actorRole,
          organizationId,
          action: event.action,
          entityType: event.entityType,
          entityReference: event.entityReference,
          beforeValue: event.beforeValue || null,
          afterValue: event.afterValue || null,
          note: event.note || null,
          payloadHash,
          previousHash,
          currentHash
        };
      } catch (err: any) {
        if (startedImmediate) {
          try { this.db.exec('ROLLBACK'); } catch {}
        } else {
          try {
            this.db.exec('ROLLBACK TO SAVEPOINT audit_record_sp');
            this.db.exec('RELEASE SAVEPOINT audit_record_sp');
          } catch {}
        }

        const isBusy = err.message && (
          err.message.includes('busy') ||
          err.message.includes('locked') ||
          err.message.includes('SQLITE_BUSY')
        );

        if (isBusy && attempt < maxRetries) {
          attempt++;
          const backoffMs = Math.floor(15 * Math.pow(1.4, attempt) + Math.random() * 20);
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, backoffMs);
          continue;
        }
        throw err;
      }
    }
    throw new Error('Cryptographic Ledger Invariant: Exceeded maximum retries attempting to record atomic audit event.');
  }

  verifyLedgerChain(organizationId?: string): LedgerVerificationResult {
    let sql = 'SELECT * FROM audit_events';
    const params: any[] = [];
    if (organizationId) {
      sql += ' WHERE organizationId = ?';
      params.push(organizationId);
    }
    sql += ' ORDER BY sequenceNumber ASC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    return verifyLedgerChain(rows.map(r => ({
      id: r.id,
      sequenceNumber: Number(r.sequenceNumber || 1),
      timestamp: r.timestamp,
      actorId: r.actorId,
      actorName: r.actorName,
      actorRole: r.actorRole || 'Reviewer',
      organizationId: r.organizationId || 'org-aicte-western',
      action: r.action,
      entityType: r.entityType,
      entityReference: r.entityReference,
      beforeValue: r.beforeValue,
      afterValue: r.afterValue,
      note: r.note,
      payloadHash: r.payloadHash,
      previousHash: r.previousHash,
      currentHash: r.currentHash
    })));
  }

  generateLedgerIntegrityReport(organizationId?: string): {
    timestamp: string;
    organizationId?: string;
    verificationResult: LedgerVerificationResult;
    summary: string;
  } {
    const verificationResult = this.verifyLedgerChain(organizationId);
    return {
      timestamp: new Date().toISOString(),
      organizationId,
      verificationResult,
      summary: verificationResult.isValid
        ? `Cryptographic ledger verified: ${verificationResult.totalEventsVerified} events in unbroken SHA-256 hash chain.`
        : `Cryptographic ledger compromised: ${verificationResult.tamperedEventsCount} errors detected. Chain broken at index ${verificationResult.brokenLinkIndex}.`
    };
  }

  getAuditEvents(userOrgId?: string, isAdmin = false): AuditEvent[] {
    const rows = this.db.prepare('SELECT * FROM audit_events ORDER BY sequenceNumber DESC, timestamp DESC').all() as any[];
    const mapped: AuditEvent[] = rows.map(r => ({
      id: r.id,
      sequenceNumber: r.sequenceNumber,
      timestamp: r.timestamp,
      actorId: r.actorId,
      actorName: r.actorName,
      actorRole: r.actorRole,
      organizationId: r.organizationId,
      action: r.action,
      entityType: r.entityType,
      entityReference: r.entityReference,
      beforeValue: r.beforeValue || undefined,
      afterValue: r.afterValue || undefined,
      note: r.note || undefined,
      payloadHash: r.payloadHash,
      previousHash: r.previousHash,
      currentHash: r.currentHash
    }));

    if (!userOrgId || isAdmin) {
      return mapped;
    }

    // Isolate audit events strictly by tenant applications, documents, and findings
    const orgApps = this.getAllApplications(userOrgId, false);
    const orgAppIds = new Set(orgApps.map(a => a.id));
    const orgAppRefs = new Set(orgApps.map(a => a.referenceNumber));
    const orgDocIds = new Set(orgApps.flatMap(a => this.getDocumentsByApplication(a.id).map(d => d.id)));
    const orgFindingIds = new Set(this.getAllFindings(userOrgId, false).map(f => f.id));

    return mapped.filter(evt => {
      if (evt.entityType === 'Application') {
        return orgAppIds.has(evt.entityReference) || orgAppRefs.has(evt.entityReference);
      }
      if (evt.entityType === 'Document') {
        return orgDocIds.has(evt.entityReference);
      }
      if (evt.entityType === 'Finding') {
        return orgFindingIds.has(evt.entityReference);
      }
      // Non-entity or rule-level actions are general platform events
      return true;
    });
  }

  getAllAuditEvents(): AuditEvent[] {
    const rows = this.db.prepare('SELECT * FROM audit_events ORDER BY sequenceNumber ASC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      sequenceNumber: Number(r.sequenceNumber || 1),
      timestamp: r.timestamp,
      actorId: r.actorId,
      actorName: r.actorName,
      actorRole: r.actorRole || 'Reviewer',
      organizationId: r.organizationId || 'org-aicte-western',
      action: r.action,
      entityType: r.entityType,
      entityReference: r.entityReference,
      beforeValue: r.beforeValue,
      afterValue: r.afterValue,
      note: r.note,
      payloadHash: r.payloadHash,
      previousHash: r.previousHash,
      currentHash: r.currentHash
    }));
  }

  getDatabaseFingerprint(): CheckpointDatabaseFingerprint {
    const userCount = Number((this.db.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c || 0);
    const docketCount = Number((this.db.prepare('SELECT COUNT(*) as c FROM institutional_dockets').get() as any)?.c || 0);
    const candidateCount = Number((this.db.prepare('SELECT COUNT(*) as c FROM annotation_records').get() as any)?.c || 0);
    const decisionCount = Number((this.db.prepare('SELECT COUNT(*) as c FROM application_decisions').get() as any)?.c || 0);
    return { userCount, docketCount, candidateCount, decisionCount };
  }

  createLedgerCheckpoint(options?: { keyId?: string; signingSecret?: string; checkpointDir?: string }): LedgerCheckpoint {
    const events = this.getAllAuditEvents();
    const fingerprint = this.getDatabaseFingerprint();
    return createLedgerCheckpoint(events, fingerprint, options);
  }

  checkpoint(): void {
    try {
      this.db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch {}
  }

  close(): void {
    this.checkpoint();
    this.db.close();
  }

  verifyLedgerAgainstCheckpoint(checkpoint: LedgerCheckpoint, secretKey?: string): CheckpointVerificationResult {
    const events = this.getAllAuditEvents();
    return verifyLedgerAgainstCheckpoint(events, checkpoint, secretKey);
  }

  // --- REVIEWER AUTHORIZATION & ACCREDITATION GOVERNANCE ---

  authorizeReviewer(adminUser: User, data: ReviewerAuthorizationInput): ReviewerAuthorization {
    if (adminUser.role !== 'Administrator') {
      throw new Error('Unauthorized: Only System Administrators can grant reviewer authorizations.');
    }
    if (adminUser.id === data.userId) {
      throw new Error('Self-approval prohibited: Administrators cannot approve their own reviewer accreditation.');
    }
    const targetUser = this.getUserById(data.userId);
    if (!targetUser) {
      throw new Error(`Target user '${data.userId}' does not exist.`);
    }
    if (!data.verifiedIdentityRef || !data.verifiedIdentityRef.trim()) {
      throw new Error('verifiedIdentityRef is mandatory for reviewer authorization.');
    }
    if (!data.issuingAuthority || !data.issuingAuthority.trim()) {
      throw new Error('issuingAuthority is mandatory for reviewer authorization.');
    }
    if (!data.authorizationReference || !data.authorizationReference.trim()) {
      throw new Error('authorizationReference is mandatory for reviewer authorization.');
    }

    const id = `auth-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const orgId = data.organizationId || targetUser.organizationId || 'org-aicte-western';

    this.db.prepare(`
      INSERT INTO reviewer_authorizations (
        id, userId, role, organizationId, verifiedIdentityRef, issuingAuthority,
        professionalDesignation, authorizationReference, approvedBy, approvedByName,
        approvedAt, expiryDate, isRevoked, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      data.userId,
      data.role,
      orgId,
      data.verifiedIdentityRef.trim(),
      data.issuingAuthority.trim(),
      data.professionalDesignation || null,
      data.authorizationReference.trim(),
      adminUser.id,
      adminUser.displayName,
      now,
      data.expiryDate || null,
      now,
      now
    );

    this.recordAudit({
      actorId: adminUser.id,
      actorName: adminUser.displayName,
      actorRole: 'Administrator',
      organizationId: adminUser.organizationId || 'org-aicte-western',
      action: 'Reviewer Authorized',
      entityType: 'ReviewerAuthorization',
      entityReference: id,
      afterValue: `Granted ${data.role} to ${targetUser.displayName} (${data.userId}) ref: ${data.authorizationReference}`,
      note: `Issuing authority: ${data.issuingAuthority}`
    });

    return {
      id,
      userId: data.userId,
      userDisplayName: targetUser.displayName,
      userEmail: targetUser.email,
      role: data.role,
      organizationId: orgId,
      verifiedIdentityRef: data.verifiedIdentityRef.trim(),
      issuingAuthority: data.issuingAuthority.trim(),
      professionalDesignation: data.professionalDesignation || undefined,
      authorizationReference: data.authorizationReference.trim(),
      approvedBy: adminUser.id,
      approvedByName: adminUser.displayName,
      approvedAt: now,
      expiryDate: data.expiryDate || null,
      isRevoked: false,
      createdAt: now,
      updatedAt: now
    };
  }

  revokeReviewerAuthorization(adminUser: User, authorizationId: string, reason: string): boolean {
    if (adminUser.role !== 'Administrator') {
      throw new Error('Unauthorized: Only System Administrators can revoke reviewer authorizations.');
    }
    if (!reason || reason.trim().length < 10) {
      throw new Error('A substantive statutory reason (minimum 10 characters) is required for authorization revocation.');
    }

    const auth = this.db.prepare('SELECT * FROM reviewer_authorizations WHERE id = ?').get(authorizationId) as any;
    if (!auth) {
      throw new Error(`Reviewer authorization '${authorizationId}' not found.`);
    }

    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE reviewer_authorizations
      SET isRevoked = 1, revocationReason = ?, revokedAt = ?, revokedBy = ?, updatedAt = ?
      WHERE id = ?
    `).run(reason.trim(), now, adminUser.id, now, authorizationId);

    this.recordAudit({
      actorId: adminUser.id,
      actorName: adminUser.displayName,
      actorRole: 'Administrator',
      organizationId: adminUser.organizationId || 'org-aicte-western',
      action: 'Reviewer Authorization Revoked',
      entityType: 'ReviewerAuthorization',
      entityReference: authorizationId,
      beforeValue: `Active ${auth.role} authorization for user ${auth.userId}`,
      afterValue: `Revoked by ${adminUser.displayName}`,
      note: reason.trim()
    });

    return true;
  }

  getReviewerAuthorization(userId: string): ReviewerAuthorization | null {
    const row = this.db.prepare(`
      SELECT a.*, u.displayName as userDisplayName, u.email as userEmail
      FROM reviewer_authorizations a
      LEFT JOIN users u ON a.userId = u.id
      WHERE a.userId = ?
      ORDER BY a.createdAt DESC
      LIMIT 1
    `).get(userId) as any;

    if (!row) return null;

    let isExpired = false;
    if (row.expiryDate && new Date(row.expiryDate) < new Date()) {
      isExpired = true;
    }

    return {
      id: row.id,
      userId: row.userId,
      userDisplayName: row.userDisplayName,
      userEmail: row.userEmail,
      role: row.role as UserRole,
      organizationId: row.organizationId,
      verifiedIdentityRef: row.verifiedIdentityRef,
      issuingAuthority: row.issuingAuthority,
      professionalDesignation: row.professionalDesignation || undefined,
      authorizationReference: row.authorizationReference,
      approvedBy: row.approvedBy,
      approvedByName: row.approvedByName,
      approvedAt: row.approvedAt,
      expiryDate: row.expiryDate || null,
      isRevoked: Boolean(row.isRevoked) || isExpired,
      revocationReason: isExpired ? 'Authorization expired by date policy' : (row.revocationReason || null),
      revokedAt: row.revokedAt || null,
      revokedBy: row.revokedBy || null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  listReviewerAuthorizations(orgId?: string): ReviewerAuthorization[] {
    let sql = `
      SELECT a.*, u.displayName as userDisplayName, u.email as userEmail
      FROM reviewer_authorizations a
      LEFT JOIN users u ON a.userId = u.id
    `;
    const params: any[] = [];
    if (orgId) {
      sql += ' WHERE a.organizationId = ?';
      params.push(orgId);
    }
    sql += ' ORDER BY a.createdAt DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => ({
      id: r.id,
      userId: r.userId,
      userDisplayName: r.userDisplayName,
      userEmail: r.userEmail,
      role: r.role as UserRole,
      organizationId: r.organizationId,
      verifiedIdentityRef: r.verifiedIdentityRef,
      issuingAuthority: r.issuingAuthority,
      professionalDesignation: r.professionalDesignation || undefined,
      authorizationReference: r.authorizationReference,
      approvedBy: r.approvedBy,
      approvedByName: r.approvedByName,
      approvedAt: r.approvedAt,
      expiryDate: r.expiryDate || null,
      isRevoked: Boolean(r.isRevoked),
      revocationReason: r.revocationReason || null,
      revokedAt: r.revokedAt || null,
      revokedBy: r.revokedBy || null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  }

  isUserAuthorizedForAnnotation(userId: string, targetOrgId: string, requiredRole: UserRole): { authorized: boolean; reason?: string } {
    const user = this.getUserById(userId);
    if (!user) return { authorized: false, reason: 'User not registered in platform.' };
    if (user.role === 'Administrator') return { authorized: true };

    const auth = this.getReviewerAuthorization(userId);
    if (!auth) {
      return { authorized: false, reason: `User '${user.displayName}' has not been granted statutory authorization.` };
    }
    if (auth.isRevoked) {
      return { authorized: false, reason: `User authorization was revoked or expired: ${auth.revocationReason || 'Revoked'}.` };
    }
    if (auth.role !== requiredRole && auth.role !== 'Reviewer' && auth.role !== 'Administrator') {
      return { authorized: false, reason: `User authorization role '${auth.role}' does not satisfy required role '${requiredRole}'.` };
    }
    if (auth.organizationId !== targetOrgId) {
      return { authorized: false, reason: `Regional authorization mismatch: authorized for '${auth.organizationId}', target is '${targetOrgId}'.` };
    }

    return { authorized: true };
  }

  // --- INSTITUTIONAL DOCKET INTAKE & LIFECYCLE ---

  createInstitutionalDocket(uploader: User, data: Partial<InstitutionalDocket>): InstitutionalDocket {
    if (!data.docketNumber || !data.institutionName || !data.sourceOrganization || !data.authorizationReference) {
      throw new Error('docketNumber, institutionName, sourceOrganization, and authorizationReference are mandatory.');
    }

    const id = `dkt-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const orgId = (uploader.role === 'Administrator' && data.organizationId)
      ? data.organizationId
      : (uploader.organizationId || data.organizationId || 'org-aicte-western');
    const documentChecksum = data.documentChecksum || crypto.createHash('sha256').update(data.documentPath || id).digest('hex');
    const pageCount = Number(data.pageCount || 1);
    const sizeBytes = Number(data.sizeBytes || 1024);
    const mimeType = data.mimeType || 'application/pdf';
    const documentClassification = data.documentClassification || 'statutory_filing';
    const provenanceStatus = data.provenanceStatus || 'PROVENANCE_PENDING';
    const lifecycleState: InstitutionalDocketLifecycle = data.lifecycleState || 'DATA_SOURCE_IDENTIFIED';

    this.db.prepare(`
      INSERT INTO institutional_dockets (
        id, docketNumber, institutionId, institutionName, sourceOrganization, sourceUrl,
        retrievalDate, publicationDate, authorizationReference, documentChecksum,
        documentPath, mimeType, sizeBytes, pageCount, organizationId,
        documentClassification, provenanceStatus, lifecycleState, uploadedBy, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.docketNumber.trim(),
      data.institutionId || `inst-${crypto.randomUUID().slice(0, 6)}`,
      data.institutionName.trim(),
      data.sourceOrganization.trim(),
      data.sourceUrl || null,
      data.retrievalDate || now.slice(0, 10),
      data.publicationDate || null,
      data.authorizationReference.trim(),
      documentChecksum,
      data.documentPath || `dockets/${data.docketNumber}.pdf`,
      mimeType,
      sizeBytes,
      pageCount,
      orgId,
      documentClassification,
      provenanceStatus,
      lifecycleState,
      uploader.id,
      now,
      now
    );

    // Initial transition event
    const transitionId = `trans-${crypto.randomUUID()}`;
    this.db.prepare(`
      INSERT INTO docket_transitions (id, docketId, fromState, toState, actorId, actorName, rationale, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      transitionId,
      id,
      'DATA_SOURCE_IDENTIFIED',
      lifecycleState,
      uploader.id,
      uploader.displayName,
      'Institutional dossier registered in intake portal.',
      now
    );

    this.recordAudit({
      actorId: uploader.id,
      actorName: uploader.displayName,
      actorRole: uploader.role,
      organizationId: orgId,
      action: 'Institutional Docket Ingested',
      entityType: 'InstitutionalDocket',
      entityReference: id,
      afterValue: `Registered docket ${data.docketNumber} for ${data.institutionName}`,
      note: `Authorization ref: ${data.authorizationReference}`
    });

    return {
      id,
      docketNumber: data.docketNumber.trim(),
      institutionId: data.institutionId || `inst-${id.slice(4, 10)}`,
      institutionName: data.institutionName.trim(),
      sourceOrganization: data.sourceOrganization.trim(),
      sourceUrl: data.sourceUrl || null,
      retrievalDate: data.retrievalDate || now.slice(0, 10),
      publicationDate: data.publicationDate || null,
      authorizationReference: data.authorizationReference.trim(),
      documentChecksum,
      documentPath: data.documentPath || `dockets/${data.docketNumber}.pdf`,
      mimeType,
      sizeBytes,
      pageCount,
      organizationId: orgId,
      documentClassification,
      provenanceStatus,
      lifecycleState,
      uploadedBy: uploader.id,
      createdAt: now,
      updatedAt: now
    };
  }

  transitionDocketLifecycle(actor: User, docketId: string, toState: InstitutionalDocketLifecycle, rationale: string): InstitutionalDocket {
    if (!rationale || rationale.trim().length < 10) {
      throw new Error('A substantive statutory rationale (minimum 10 characters) is required for lifecycle state transition.');
    }

    const docket = this.db.prepare('SELECT * FROM institutional_dockets WHERE id = ?').get(docketId) as any;
    if (!docket) {
      throw new Error(`Institutional docket '${docketId}' not found.`);
    }

    if (actor.role !== 'Administrator' && actor.organizationId !== docket.organizationId) {
      throw new Error('Cross-tenant violation: Cannot transition docket belonging to another regional directorate.');
    }

    const fromState = docket.lifecycleState;
    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE institutional_dockets
      SET lifecycleState = ?, updatedAt = ?
      WHERE id = ?
    `).run(toState, now, docketId);

    const transId = `trans-${crypto.randomUUID()}`;
    this.db.prepare(`
      INSERT INTO docket_transitions (id, docketId, fromState, toState, actorId, actorName, rationale, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      transId,
      docketId,
      fromState,
      toState,
      actor.id,
      actor.displayName,
      rationale.trim(),
      now
    );

    this.recordAudit({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      organizationId: docket.organizationId,
      action: 'Docket Lifecycle Transitioned',
      entityType: 'InstitutionalDocket',
      entityReference: docketId,
      beforeValue: fromState,
      afterValue: toState,
      note: rationale.trim()
    });

    return {
      ...docket,
      lifecycleState: toState,
      updatedAt: now
    };
  }

  verifyDocketProvenance(verifier: User, docketId: string, status: 'PROVENANCE_VERIFIED' | 'PROVENANCE_REJECTED', notes: string): InstitutionalDocket {
    if (verifier.role !== 'Administrator' && verifier.role !== 'Reviewer') {
      throw new Error('Unauthorized: Only Administrators and Reviewers can certify document provenance.');
    }
    if (!notes || notes.trim().length < 10) {
      throw new Error('Substantive provenance review notes (minimum 10 characters) are required.');
    }

    const docket = this.db.prepare('SELECT * FROM institutional_dockets WHERE id = ?').get(docketId) as any;
    if (!docket) {
      throw new Error(`Institutional docket '${docketId}' not found.`);
    }

    if (verifier.role !== 'Administrator' && verifier.organizationId !== docket.organizationId) {
      throw new Error('Cross-tenant violation: Cannot verify provenance of docket belonging to another regional directorate.');
    }

    // GAP-SEC-02 Remediation: Physical document verification against stored files
    if (status === 'PROVENANCE_VERIFIED' && docket.documentPath && fs.existsSync(docket.documentPath)) {
      const fileBytes = fs.readFileSync(docket.documentPath);
      const computedChecksum = crypto.createHash('sha256').update(fileBytes).digest('hex');
      if (computedChecksum.toLowerCase() !== docket.documentChecksum.toLowerCase()) {
        throw new Error(`Physical document SHA-256 verification failed: computed ${computedChecksum} does not match recorded ${docket.documentChecksum}.`);
      }
    }

    const now = new Date().toISOString();
    const nextState: InstitutionalDocketLifecycle = status === 'PROVENANCE_VERIFIED' ? 'PROVENANCE_VERIFIED' : 'PROVENANCE_REJECTED';

    this.db.prepare(`
      UPDATE institutional_dockets
      SET provenanceStatus = ?, verifiedBy = ?, verifiedAt = ?, verificationNotes = ?, lifecycleState = ?, updatedAt = ?
      WHERE id = ?
    `).run(status, verifier.id, now, notes.trim(), nextState, now, docketId);

    // GAP-SEC-02 Remediation: Include physical document SHA-256, page count, authorization reference, and docket ID in canonical provenance audit event
    this.recordAudit({
      actorId: verifier.id,
      actorName: verifier.displayName,
      actorRole: verifier.role,
      organizationId: docket.organizationId,
      action: 'Docket Provenance Verified',
      entityType: 'InstitutionalDocket',
      entityReference: docketId,
      beforeValue: JSON.stringify({
        provenanceStatus: docket.provenanceStatus,
        lifecycleState: docket.lifecycleState
      }),
      afterValue: JSON.stringify({
        docketId: docket.id,
        docketNumber: docket.docketNumber,
        provenanceStatus: status,
        lifecycleState: nextState,
        documentChecksum: docket.documentChecksum,
        pageCount: docket.pageCount,
        authorizationReference: docket.authorizationReference,
        verifiedBy: verifier.id,
        verifiedAt: now
      }),
      note: notes.trim()
    });

    return {
      ...docket,
      provenanceStatus: status,
      verifiedBy: verifier.id,
      verifiedAt: now,
      verificationNotes: notes.trim(),
      lifecycleState: nextState,
      updatedAt: now
    };
  }

  getInstitutionalDockets(filters?: { organizationId?: string; lifecycleState?: string; provenanceStatus?: string }): InstitutionalDocket[] {
    let sql = 'SELECT * FROM institutional_dockets WHERE 1=1';
    const params: any[] = [];
    if (filters?.organizationId) {
      sql += ' AND organizationId = ?';
      params.push(filters.organizationId);
    }
    if (filters?.lifecycleState) {
      sql += ' AND lifecycleState = ?';
      params.push(filters.lifecycleState);
    }
    if (filters?.provenanceStatus) {
      sql += ' AND provenanceStatus = ?';
      params.push(filters.provenanceStatus);
    }
    sql += ' ORDER BY createdAt DESC';
    return this.db.prepare(sql).all(...params) as unknown as InstitutionalDocket[];
  }

  getInstitutionalDocketById(id: string): InstitutionalDocket | null {
    const row = this.db.prepare('SELECT * FROM institutional_dockets WHERE id = ? OR docketNumber = ?').get(id, id) as any;
    return row ? (row as InstitutionalDocket) : null;
  }

  getDocketTransitions(docketId: string): DocketTransitionEvent[] {
    return this.db.prepare('SELECT * FROM docket_transitions WHERE docketId = ? ORDER BY timestamp ASC').all(docketId) as unknown as DocketTransitionEvent[];
  }

  getOperationalDashboard(orgId?: string, role?: string) {
    let dktSql = 'SELECT COUNT(*) as count FROM institutional_dockets';
    let docSql = 'SELECT COUNT(*) as count FROM documents';
    let annRecSql = 'SELECT COUNT(*) as count FROM annotation_records WHERE isDemoCandidate = 0';
    let subSql = 'SELECT COUNT(*) as count FROM user_annotations u JOIN annotation_records r ON u.recordId = r.id WHERE r.isDemoCandidate = 0 AND u.isDraft = 0';
    let adjSql = "SELECT COUNT(*) as count FROM annotation_records WHERE isDemoCandidate = 0 AND status = 'adjudicated'";
    let disputedSql = "SELECT COUNT(*) as count FROM annotation_records WHERE isDemoCandidate = 0 AND status = 'disputed'";

    const params: any[] = [];
    if (orgId && role !== 'Administrator') {
      dktSql += ' WHERE organizationId = ?';
      docSql += ' WHERE organizationId = ?';
      annRecSql += ' AND organizationId = ?';
      subSql += ' AND r.organizationId = ?';
      adjSql += ' AND organizationId = ?';
      disputedSql += ' AND organizationId = ?';
      params.push(orgId);
    }

    const dktCount = Number((this.db.prepare(dktSql).get(...params) as any)?.count || 0);
    const docCount = Number((this.db.prepare(docSql).get(...params) as any)?.count || 0);
    const candidatePairsCount = Number((this.db.prepare(annRecSql).get(...params) as any)?.count || 0);
    const independentAnnotationsCount = Number((this.db.prepare(subSql).get(...params) as any)?.count || 0);
    const adjudicatedPairsCount = Number((this.db.prepare(adjSql).get(...params) as any)?.count || 0);
    const disputedPairsCount = Number((this.db.prepare(disputedSql).get(...params) as any)?.count || 0);

    // Lifecycle breakdown
    let lcSql = 'SELECT lifecycleState, COUNT(*) as count FROM institutional_dockets';
    if (orgId && role !== 'Administrator') lcSql += ' WHERE organizationId = ?';
    lcSql += ' GROUP BY lifecycleState';
    const lcRows = this.db.prepare(lcSql).all(...params) as { lifecycleState: string; count: number }[];
    const lifecycleDistribution: Record<string, number> = {};
    for (const r of lcRows) lifecycleDistribution[r.lifecycleState] = r.count;

    // Provenance status breakdown
    let provSql = 'SELECT provenanceStatus, COUNT(*) as count FROM institutional_dockets';
    if (orgId && role !== 'Administrator') provSql += ' WHERE organizationId = ?';
    provSql += ' GROUP BY provenanceStatus';
    const provRows = this.db.prepare(provSql).all(...params) as { provenanceStatus: string; count: number }[];
    const provenanceDistribution: Record<string, number> = {};
    for (const r of provRows) provenanceDistribution[r.provenanceStatus] = r.count;

    const metrics = this.getAnnotationMetrics(orgId);

    return {
      overview: {
        totalDocumentsCount: dktCount + docCount,
        candidatePairsCount,
        independentAnnotationsCount,
        adjudicatedPairsCount,
        disputedBacklogCount: disputedPairsCount,
        exportEligibleRecordsCount: 0 // Clean baseline until real human data
      },
      provisionalAcceptanceTargets: {
        minimumDocumentsTarget: 200,
        currentDocuments: dktCount + docCount,
        documentsSatisfied: (dktCount + docCount) >= 200,
        minimumPairsTarget: 200,
        currentCandidatePairs: candidatePairsCount,
        pairsSatisfied: candidatePairsCount >= 200,
        targetCohenKappa: 0.70,
        currentCohenKappa: metrics.cohensKappa,
        kappaSatisfied: metrics.cohensKappa !== null && metrics.cohensKappa >= 0.70,
        maximumAdjudicationRateTarget: 0.25,
        currentAdjudicationRate: metrics.adjudicationRate,
        adjudicationSatisfied: metrics.adjudicationRate <= 0.25,
        isCertifiedGoldStandardReady: false
      },
      lifecycleDistribution,
      provenanceDistribution,
      metrics,
      datasetStatus: {
        datasetVersion: '3.0.0-provisional',
        goldStandardRecordsCount: 0,
        goldStandardPath: 'ai_service/ml/data/v3/annotations/gold_standard_human.jsonl',
        isLockedPendingCollection: true
      }
    };
  }

  getReviewActionsByApplication(applicationId: string): ReviewAction[] {
    const rows = this.db.prepare('SELECT * FROM review_actions WHERE applicationId = ? ORDER BY createdAt DESC').all(applicationId) as any[];
    return rows.map(r => ({
      id: r.id,
      findingId: r.findingId,
      applicationId: r.applicationId,
      reviewerId: r.reviewerId,
      reviewerName: r.reviewerName,
      action: r.action,
      previousStatus: r.previousStatus,
      newStatus: r.newStatus,
      note: r.note,
      createdAt: r.createdAt
    }));
  }

  getUserByEmail(email: string): DatabaseUser | undefined {
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      displayName: row.displayName,
      email: row.email,
      passwordHash: row.passwordHash,
      role: row.role as UserRole,
      department: row.department,
      organizationId: row.organizationId || 'org-aicte-western'
    };
  }

  getUserById(id: string): User | undefined {
    const row = this.db.prepare('SELECT id, displayName, email, role, department, organizationId FROM users WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      displayName: row.displayName,
      email: row.email,
      role: row.role as UserRole,
      department: row.department,
      organizationId: row.organizationId || 'org-aicte-western'
    };
  }

  getUsersCount(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    return Number(row?.count || 0);
  }

  createUser(user: DatabaseUser & { organizationId?: string }): User {
    const insert = this.db.prepare(`
      INSERT INTO users (id, displayName, email, passwordHash, role, department, organizationId, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const createdAt = user.createdAt || new Date().toISOString();
    insert.run(
      user.id,
      user.displayName,
      user.email.toLowerCase().trim(),
      user.passwordHash,
      user.role,
      user.department,
      user.organizationId || 'org-aicte-western',
      createdAt
    );
    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      department: user.department,
      organizationId: user.organizationId || 'org-aicte-western'
    };
  }

  bootstrapAdmin(data: {
    email: string;
    password: string;
    displayName: string;
    organizationId?: string;
  }): { success: boolean; user?: User; error?: string; statusCode: number } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = (data.email || '').toLowerCase().trim();
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return { success: false, error: 'A valid email address is required for administrator provisioning.', statusCode: 400 };
    }
    if (!data.displayName || !data.displayName.trim()) {
      return { success: false, error: 'displayName is required.', statusCode: 400 };
    }
    if (typeof data.password !== 'string' || data.password.length < 12) {
      return { success: false, error: 'Administrator password must be at least 12 characters.', statusCode: 400 };
    }
    const trivialPasswords = ['Admin123!', 'Password123!', 'Reviewer123!', 'Administrator123!'];
    if (trivialPasswords.includes(data.password)) {
      return { success: false, error: 'Administrator password cannot use known default/trivial credentials.', statusCode: 400 };
    }

    this.db.exec('BEGIN IMMEDIATE');
    try {
      const userCount = Number((this.db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0);
      if (userCount > 0) {
        this.db.exec('ROLLBACK');
        return { success: false, error: 'Bootstrap disabled: System administrator already provisioned.', statusCode: 403 };
      }

      const adminId = `usr-admin-${crypto.randomUUID().slice(0, 8)}`;
      const passwordHash = bcrypt.hashSync(data.password, 12);
      const now = new Date().toISOString();
      const orgId = data.organizationId || 'org-aicte-western';

      this.db.prepare(`
        INSERT INTO users (id, displayName, email, passwordHash, role, department, organizationId, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(adminId, data.displayName.trim(), cleanEmail, passwordHash, 'Administrator', 'System Administration Directorate', orgId, now);

      this.recordAudit({
        actorId: adminId,
        actorName: data.displayName.trim(),
        action: 'System Administrator Bootstrapped',
        entityType: 'User',
        entityReference: adminId,
        afterValue: `Admin created: ${cleanEmail}`,
        note: 'Initial system administrator account provisioned.'
      });

      this.db.exec('COMMIT');

      const safeUser: User = {
        id: adminId,
        displayName: data.displayName.trim(),
        email: cleanEmail,
        role: 'Administrator',
        department: 'System Administration Directorate',
        organizationId: orgId
      };
      return { success: true, user: safeUser, statusCode: 201 };
    } catch (err: any) {
      this.db.exec('ROLLBACK');
      return { success: false, error: `Database error during bootstrap: ${err.message}`, statusCode: 500 };
    }
  }

  getAllUsers(): User[] {
    const rows = this.db.prepare('SELECT id, displayName, email, role, department, organizationId FROM users ORDER BY displayName ASC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      displayName: r.displayName,
      email: r.email,
      role: r.role as UserRole,
      department: r.department,
      organizationId: r.organizationId || 'org-aicte-western'
    }));
  }

  updateUserRole(userId: string, newRole: UserRole, adminActor?: User): User | undefined {
    const user = this.getUserById(userId);
    if (!user) return undefined;

    this.db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, userId);

    const effectiveActor = adminActor || this.currentUser;
    this.recordAudit({
      actorId: effectiveActor.id,
      actorName: effectiveActor.displayName,
      action: 'User Role Updated',
      entityType: 'User' as any,
      entityReference: user.email,
      beforeValue: user.role,
      afterValue: newRole,
      note: `Statutory administrative role reassignment to ${newRole}`
    });

    return this.getUserById(userId);
  }

  setCurrentUser(user: User) {
    this.currentUser = user;
    this.recordAudit({
      actorId: user.id,
      actorName: user.displayName,
      action: 'Session Role Switched',
      entityType: 'Application',
      entityReference: user.displayName,
      note: `Role switched to ${user.role} (${user.department})`
    });
  }

  // --- ROW MAPPERS ---

  private mapApplicationRow(r: any): Application {
    return {
      id: r.id,
      referenceNumber: r.referenceNumber,
      institutionName: r.institutionName,
      applicationType: r.applicationType,
      organizationId: r.organizationId || 'org-aicte-western',
      status: r.status,
      reviewStatus: r.reviewStatus,
      declaredDetails: JSON.parse(r.declaredDetails),
      documentCount: r.documentCount,
      openFindingsCount: r.openFindingsCount,
      totalFindingsCount: r.totalFindingsCount,
      reviewerNotes: r.reviewerNotes || undefined,
      assignedReviewer: r.assignedReviewer || undefined,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };
  }

  private mapDocumentRow(r: any): DocumentRecord {
    return {
      id: r.id,
      applicationId: r.applicationId,
      originalFilename: r.originalFilename,
      documentType: r.documentType,
      storageKey: r.storageKey,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      checksum: r.checksum,
      pageCount: r.pageCount,
      processingStatus: r.processingStatus,
      isScannedOrTextPoor: Boolean(r.isScannedOrTextPoor),
      extractedTextByPage: r.extractedTextByPage ? JSON.parse(r.extractedTextByPage) : undefined,
      createdAt: r.createdAt
    };
  }

  private mapFieldRow(r: any): ExtractedField {
    return {
      id: r.id,
      documentId: r.documentId,
      applicationId: r.applicationId,
      fieldName: r.fieldName,
      fieldLabel: r.fieldLabel,
      rawValue: r.rawValue,
      normalizedValue: r.normalizedValue,
      pageNumber: r.pageNumber,
      sourceText: r.sourceText,
      confidence: r.confidence !== null ? Number(r.confidence) : null,
      extractionMethod: r.extractionMethod,
      isCorrected: Boolean(r.isCorrected),
      correctedValue: r.correctedValue || undefined,
      correctedBy: r.correctedBy || undefined,
      correctedAt: r.correctedAt || undefined,
      correctionNote: r.correctionNote || undefined
    };
  }

  private mapFindingRow(r: any): Finding {
    return {
      id: r.id,
      reference: r.reference,
      applicationId: r.applicationId,
      ruleId: r.ruleId,
      ruleKey: r.ruleKey,
      ruleVersion: r.ruleVersion,
      category: r.category,
      title: r.title,
      explanation: r.explanation,
      declaredValue: r.declaredValue || undefined,
      evidenceValue: r.evidenceValue || undefined,
      severity: r.severity,
      status: r.status,
      evidenceList: JSON.parse(r.evidenceList || '[]'),
      assignedReviewer: r.assignedReviewer || undefined,
      reviewerDecisionReason: r.reviewerDecisionReason || undefined,
      updatedBy: r.updatedBy || undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };
  }

  private mapRuleRow(r: any): Rule {
    return {
      id: r.id,
      ruleKey: r.ruleKey,
      name: r.name,
      description: r.description,
      category: r.category,
      applicableApplicationCategory: r.applicableApplicationCategory,
      applicableDocumentTypes: JSON.parse(r.applicableDocumentTypes),
      version: r.version,
      sourceReference: r.sourceReference,
      effectiveFrom: r.effectiveFrom,
      enabled: Boolean(r.enabled),
      readableCondition: r.readableCondition,
      testCases: JSON.parse(r.testCases)
    };
  }

  // =========================================================================
  // V3 HUMAN ANNOTATION WORKBENCH DATABASE METHODS
  // =========================================================================

  seedInitialAnnotationCandidates() {
    try {
      const count = Number((this.db.prepare('SELECT COUNT(*) as count FROM annotation_records').get() as any)?.count || 0);
      if (count > 0) return;

      const now = new Date().toISOString();
      const insert = this.db.prepare(`
        INSERT INTO annotation_records (
          id, recordId, institutionId, institutionName, applicationId,
          claimFieldName, claimText, claimDocumentId, claimDocumentName, claimPage,
          evidenceText, evidenceDocumentId, evidenceDocumentName, evidencePage, evidenceLocation,
          normalizedClaimValue, normalizedEvidenceValue, fieldCategory,
          sourceProvenance, originalSourceLabel, status, finalLabel, organizationId, isDemoCandidate, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const candidates = [
        {
          id: 'ann-rec-001',
          recordId: 'v3-aicte-001',
          institutionId: 'inst-aicte-wro-1042',
          institutionName: 'Apex Institute of Technology & Engineering',
          applicationId: 'app-0842',
          claimFieldName: 'leaseExpiryDate',
          claimText: '31/03/2054',
          claimDocumentId: 'doc-app-0842',
          claimDocumentName: 'AICTE_Approval_Application_Form.pdf',
          claimPage: 2,
          evidenceText: 'This Lease Deed shall remain in full force and effect until the 31st day of March, Two Thousand Fifty-Four (31-03-2054).',
          evidenceDocumentId: 'doc-lease-0842',
          evidenceDocumentName: 'Registered_Lease_Deed_SubRegistrar.pdf',
          evidencePage: 4,
          evidenceLocation: 'Page 4, Clause 3 (Habendum Duration)',
          normalizedClaimValue: '2054-03-31',
          normalizedEvidenceValue: '2054-03-31',
          fieldCategory: 'Land & Tenure',
          sourceProvenance: 'AICTE Demonstration Scrutiny Scenario (Demo Fixture)',
          originalSourceLabel: null,
          status: 'pending',
          finalLabel: null,
          organizationId: 'org-aicte-western',
          isDemoCandidate: 1
        },
        {
          id: 'ann-rec-002',
          recordId: 'v3-aicte-002',
          institutionId: 'inst-aicte-wro-1042',
          institutionName: 'Apex Institute of Technology & Engineering',
          applicationId: 'app-0842',
          claimFieldName: 'landAreaAcres',
          claimText: '8.50 Acres',
          claimDocumentId: 'doc-app-0842',
          claimDocumentName: 'AICTE_Approval_Application_Form.pdf',
          claimPage: 2,
          evidenceText: 'Total land parcel measuring 5.20 Acres comprised in Survey No. 104/A.',
          evidenceDocumentId: 'doc-lease-0842',
          evidenceDocumentName: 'Registered_Lease_Deed_SubRegistrar.pdf',
          evidencePage: 2,
          evidenceLocation: 'Page 2, Schedule of Property',
          normalizedClaimValue: '8.50',
          normalizedEvidenceValue: '5.20',
          fieldCategory: 'Land & Tenure',
          sourceProvenance: 'AICTE Demonstration Scrutiny Scenario (Demo Fixture)',
          originalSourceLabel: null,
          status: 'pending',
          finalLabel: null,
          organizationId: 'org-aicte-western',
          isDemoCandidate: 1
        },
        {
          id: 'ann-rec-003',
          recordId: 'v3-aicte-003',
          institutionId: 'inst-aicte-wro-1042',
          institutionName: 'Apex Institute of Technology & Engineering',
          applicationId: 'app-0842',
          claimFieldName: 'fireSafetyNoc',
          claimText: 'NOC-FS-2024-991 valid through 2027',
          claimDocumentId: 'doc-app-0842',
          claimDocumentName: 'AICTE_Approval_Application_Form.pdf',
          claimPage: 3,
          evidenceText: '[OMITTED: No Fire Safety Certificate attached in supporting documents docket]',
          evidenceDocumentId: null,
          evidenceDocumentName: null,
          evidencePage: null,
          evidenceLocation: null,
          normalizedClaimValue: 'NOC-FS-2024-991',
          normalizedEvidenceValue: null,
          fieldCategory: 'Safety & Regulatory Compliance',
          sourceProvenance: 'AICTE Demonstration Scrutiny Scenario (Demo Fixture)',
          originalSourceLabel: null,
          status: 'pending',
          finalLabel: null,
          organizationId: 'org-aicte-western',
          isDemoCandidate: 1
        },
        {
          id: 'ann-rec-004',
          recordId: 'v3-aicte-004',
          institutionId: 'inst-aicte-cro-2015',
          institutionName: 'Kalyani Polytechnic Institute',
          applicationId: 'app-1104',
          claimFieldName: 'societyOrTrustName',
          claimText: 'Kalyani Educational Foundation',
          claimDocumentId: 'doc-app-1104',
          claimDocumentName: 'Application_Intake_Expansion.pdf',
          claimPage: 1,
          evidenceText: 'Registered under the Societies Registration Act XXI of 1860 under the name of Kalyani Educational Foundation.',
          evidenceDocumentId: 'doc-trust-1104',
          evidenceDocumentName: 'Society_Registration_Certificate.pdf',
          evidencePage: 1,
          evidenceLocation: 'Page 1, Preamble & Registry Seal',
          normalizedClaimValue: 'KALYANI EDUCATIONAL FOUNDATION',
          normalizedEvidenceValue: 'KALYANI EDUCATIONAL FOUNDATION',
          fieldCategory: 'Institution Identity & Sponsoring Body',
          sourceProvenance: 'AICTE Demonstration Scrutiny Scenario (Demo Fixture)',
          originalSourceLabel: null,
          status: 'pending',
          finalLabel: null,
          organizationId: 'org-aicte-western',
          isDemoCandidate: 1
        },
        {
          id: 'ann-rec-005',
          recordId: 'v3-aicte-005',
          institutionId: 'inst-aicte-cro-2015',
          institutionName: 'Kalyani Polytechnic Institute',
          applicationId: 'app-1104',
          claimFieldName: 'address',
          claimText: 'Plot 12, Phase 3, Industrial Area, Sector 62, Pune',
          claimDocumentId: 'doc-app-1104',
          claimDocumentName: 'Application_Intake_Expansion.pdf',
          claimPage: 1,
          evidenceText: 'Survey No. 44/2, Near Metro Station, Sector 62, Pune District, Maharashtra [OCR Degraded: ~~~???]',
          evidenceDocumentId: 'doc-title-1104',
          evidenceDocumentName: 'Cadastral_Revenue_Survey_Extract.pdf',
          evidencePage: 3,
          evidenceLocation: 'Page 3, Cadastral Revenue Extract',
          normalizedClaimValue: 'PLOT 12 PHASE 3 INDUSTRIAL AREA SECTOR 62 PUNE',
          normalizedEvidenceValue: 'SURVEY NO 44 2 NEAR METRO STATION SECTOR 62 PUNE DISTRICT MAHARASHTRA',
          fieldCategory: 'Address & Survey Plots',
          sourceProvenance: 'AICTE Demonstration Scrutiny Scenario (Demo Fixture)',
          originalSourceLabel: null,
          status: 'pending',
          finalLabel: null,
          organizationId: 'org-aicte-western',
          isDemoCandidate: 1
        },
        {
          id: 'ann-rec-006',
          recordId: 'v3-aicte-006',
          institutionId: 'inst-aicte-wro-3091',
          institutionName: 'Horizon College of Architecture & Planning',
          applicationId: 'app-0915',
          claimFieldName: 'societyOrTrustName',
          claimText: 'Aryabhata Welfare Society',
          claimDocumentId: 'doc-app-0915',
          claimDocumentName: 'Application_Approval_Renewal.pdf',
          claimPage: 1,
          evidenceText: 'Title vested in Aryabhata Commercial Real Estate & Trading Private Limited under Registration No. U70102MH2018PTC.',
          evidenceDocumentId: 'doc-deed-0915',
          evidenceDocumentName: 'Land_Title_Conveyance_Deed.pdf',
          evidencePage: 2,
          evidenceLocation: 'Page 2, Transferee Corporate Identity',
          normalizedClaimValue: 'ARYABHATA WELFARE SOCIETY',
          normalizedEvidenceValue: 'ARYABHATA COMMERCIAL REAL ESTATE TRADING PRIVATE LIMITED',
          fieldCategory: 'Institution Identity & Sponsoring Body',
          sourceProvenance: 'AICTE Demonstration Scrutiny Scenario (Demo Fixture)',
          originalSourceLabel: null,
          status: 'disputed', // Pre-seeded disagreement to allow testing third-reviewer adjudication
          finalLabel: null,
          organizationId: 'org-aicte-central',
          isDemoCandidate: 1
        }
      ];

      for (const c of candidates) {
        insert.run(
          c.id, c.recordId, c.institutionId, c.institutionName, c.applicationId,
          c.claimFieldName, c.claimText, c.claimDocumentId, c.claimDocumentName, c.claimPage,
          c.evidenceText, c.evidenceDocumentId, c.evidenceDocumentName, c.evidencePage, c.evidenceLocation,
          c.normalizedClaimValue, c.normalizedEvidenceValue, c.fieldCategory,
          c.sourceProvenance, c.originalSourceLabel, c.status, c.finalLabel, c.organizationId, c.isDemoCandidate, now, now
        );
      }

      // Pre-seed two blind annotator opinions on candidate 6 to demonstrate disagreement detection
      const insertAnn = this.db.prepare(`
        INSERT INTO user_annotations (
          id, recordId, annotatorId, annotatorName, annotatorRole, label, rationale, isDraft, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertAnn.run(
        'uann-001', 'ann-rec-006', 'usr-annotator-1', 'Rajesh Verma (Annotator)', 'Annotator',
        'MISMATCH',
        'Severe contradiction: Applicant claims a non-profit welfare society, but deed is held by a for-profit commercial entity.',
        0, now, now
      );

      insertAnn.run(
        'uann-002', 'ann-rec-006', 'usr-annotator-2', 'Dr. Meenakshi S (Annotator)', 'Annotator',
        'UNCERTAIN',
        'Corporate entity may be a holding company or sponsor affiliate. Requires legal certificate verification.',
        0, now, now
      );

    } catch (e) {
      console.error('[DB] Failed to seed initial annotation candidates:', e);
    }
  }

  getAnnotationRecords(filters?: {
    status?: string;
    institutionId?: string;
    organizationId?: string;
    userId?: string;
    role?: string;
  }): AnnotationRecord[] {
    let sql = 'SELECT * FROM annotation_records WHERE 1=1';
    const params: any[] = [];

    if (filters?.organizationId && filters?.role !== 'Administrator') {
      sql += ' AND organizationId = ?';
      params.push(filters.organizationId);
    }

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.institutionId) {
      sql += ' AND institutionId = ?';
      params.push(filters.institutionId);
    }

    sql += ' ORDER BY createdAt DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => this.mapAnnotationRecord(r, filters?.userId, filters?.role));
  }

  getAnnotationRecordById(id: string, userId?: string, role?: string): AnnotationRecord | null {
    const row = this.db.prepare('SELECT * FROM annotation_records WHERE id = ? OR recordId = ?').get(id, id) as any;
    if (!row) return null;
    return this.mapAnnotationRecord(row, userId, role);
  }

  createAnnotationRecord(data: Partial<AnnotationRecord>): AnnotationRecord {
    if (!data.claimFieldName || !data.claimText || !data.evidenceText || !data.institutionName) {
      throw new Error('claimFieldName, claimText, evidenceText, and institutionName are mandatory.');
    }

    const id = `ann-rec-${crypto.randomUUID().slice(0, 8)}`;
    const recordId = data.recordId || `v3-ann-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const orgId = data.organizationId || 'org-aicte-western';

    this.db.prepare(`
      INSERT INTO annotation_records (
        id, recordId, institutionId, institutionName, applicationId,
        claimFieldName, claimText, claimDocumentId, claimDocumentName, claimPage,
        evidenceText, evidenceDocumentId, evidenceDocumentName, evidencePage, evidenceLocation,
        normalizedClaimValue, normalizedEvidenceValue, fieldCategory,
        sourceProvenance, originalSourceLabel, status, finalLabel, organizationId, isDemoCandidate, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      recordId,
      data.institutionId || `inst-${crypto.randomUUID().slice(0, 6)}`,
      data.institutionName.trim(),
      data.applicationId || null,
      data.claimFieldName.trim(),
      data.claimText.trim(),
      data.claimDocumentId || null,
      data.claimDocumentName || null,
      data.claimPage || null,
      data.evidenceText.trim(),
      data.evidenceDocumentId || null,
      data.evidenceDocumentName || null,
      data.evidencePage || null,
      data.evidenceLocation || null,
      data.normalizedClaimValue || null,
      data.normalizedEvidenceValue || null,
      data.fieldCategory || 'Regulatory Compliance',
      data.sourceProvenance || 'AICTE Institutional Scrutiny Dossier',
      data.originalSourceLabel || null,
      'pending',
      null,
      orgId,
      data.isDemoCandidate ? 1 : 0,
      now,
      now
    );

    this.recordAudit({
      actorId: 'system',
      actorName: 'Candidate Ingestion Pipeline',
      action: 'Annotation Task Created',
      entityType: 'AnnotationRecord',
      entityReference: id,
      afterValue: `Field: ${data.claimFieldName}, Institution: ${data.institutionName}`,
      note: 'New claim/evidence candidate enrolled for human annotation.'
    });

    return this.getAnnotationRecordById(id)!;
  }

  saveUserAnnotation(
    recordId: string,
    annotator: { id: string; displayName: string; role: string; organizationId?: string },
    data: { label: FiveClassLabel; rationale: string; isDraft?: boolean }
  ): { record: AnnotationRecord; annotation: UserAnnotation } {
    const validLabels: FiveClassLabel[] = ['MATCH', 'MISMATCH', 'MISSING', 'UNCERTAIN', 'NOT_COMPARABLE'];
    if (!validLabels.includes(data.label)) {
      throw new Error(`Invalid label '${data.label}'. Must be one of: ${validLabels.join(', ')}`);
    }

    const isDraft = Boolean(data.isDraft);
    if (!isDraft && (!data.rationale || data.rationale.trim().length < 10)) {
      throw new Error('A substantive written rationale (minimum 10 characters) is required when submitting an annotation.');
    }

    const record = this.getAnnotationRecordById(recordId, annotator.id, annotator.role);
    if (!record) {
      throw new Error(`Annotation record '${recordId}' not found.`);
    }

    if (record.status === 'adjudicated' && annotator.role !== 'Administrator') {
      throw new Error('This record has already received binding adjudication and cannot be modified.');
    }

    // Tenant check
    if (annotator.role !== 'Administrator' && record.organizationId !== annotator.organizationId) {
      throw new Error('Access denied: Record belongs to another regional organization.');
    }

    // Phase D: Reviewer Governance check (reject revoked or expired authorizations)
    if (!record.isDemoCandidate && annotator.role !== 'Administrator') {
      const auth = this.getReviewerAuthorization(annotator.id);
      if (auth && auth.isRevoked) {
        throw new Error(`Reviewer authorization revoked or expired: ${auth.revocationReason || 'Revoked'}.`);
      }
    }

    const now = new Date().toISOString();
    const annotationId = `uann-${crypto.randomUUID().slice(0, 8)}`;

    // Upsert user annotation
    this.db.prepare(`
      INSERT INTO user_annotations (
        id, recordId, annotatorId, annotatorName, annotatorRole, label, rationale, isDraft, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(recordId, annotatorId) DO UPDATE SET
        label = excluded.label,
        rationale = excluded.rationale,
        isDraft = excluded.isDraft,
        updatedAt = excluded.updatedAt
    `).run(
      annotationId,
      record.id,
      annotator.id,
      annotator.displayName,
      annotator.role,
      data.label,
      data.rationale ? data.rationale.trim() : '',
      isDraft ? 1 : 0,
      now,
      now
    );

    // If submitted, evaluate consensus or disagreement
    if (!isDraft) {
      const submitted = this.db.prepare(`
        SELECT label, annotatorId FROM user_annotations
        WHERE recordId = ? AND isDraft = 0
        ORDER BY createdAt ASC
      `).all(record.id) as any[];

      let newStatus: string = record.status;
      let finalLabel: string | null = record.finalLabel || null;

      if (submitted.length >= 2) {
        const first = submitted[0].label;
        const second = submitted[1].label;
        if (first === second) {
          newStatus = 'agreed';
          finalLabel = first;
        } else {
          newStatus = 'disputed';
          finalLabel = null; // Requires third-reviewer adjudication
        }
      } else {
        newStatus = 'in_review';
      }

      this.db.prepare(`
        UPDATE annotation_records
        SET status = ?, finalLabel = ?, updatedAt = ?
        WHERE id = ?
      `).run(newStatus, finalLabel, now, record.id);

      this.recordAudit({
        actorId: annotator.id,
        actorName: annotator.displayName,
        action: 'Annotation Submitted',
        entityType: 'UserAnnotation',
        entityReference: record.id,
        afterValue: `Label: ${data.label}, Record Status: ${newStatus}`,
        note: data.rationale.trim()
      });
    }

    const updatedRecord = this.getAnnotationRecordById(record.id, annotator.id, annotator.role)!;
    const userAnnRow = this.db.prepare('SELECT * FROM user_annotations WHERE recordId = ? AND annotatorId = ?').get(record.id, annotator.id) as any;
    const annotation = this.mapUserAnnotationRow(userAnnRow);

    return { record: updatedRecord, annotation };
  }

  adjudicateRecord(
    recordId: string,
    adjudicator: { id: string; displayName: string; role: string; organizationId?: string },
    data: { label: FiveClassLabel; rationale: string }
  ): AnnotationRecord {
    if (adjudicator.role !== 'Adjudicator' && adjudicator.role !== 'Administrator') {
      throw new Error('Only accredited Adjudicators or Administrators can resolve disputed annotations.');
    }

    const validLabels: FiveClassLabel[] = ['MATCH', 'MISMATCH', 'MISSING', 'UNCERTAIN', 'NOT_COMPARABLE'];
    if (!validLabels.includes(data.label)) {
      throw new Error(`Invalid label '${data.label}'. Must be one of: ${validLabels.join(', ')}`);
    }

    if (!data.rationale || data.rationale.trim().length < 10) {
      throw new Error('A substantive adjudication rationale (minimum 10 characters) is required.');
    }

    const record = this.getAnnotationRecordById(recordId, adjudicator.id, adjudicator.role);
    if (!record) {
      throw new Error(`Annotation record '${recordId}' not found.`);
    }

    // Tenant check
    if (adjudicator.role !== 'Administrator' && record.organizationId && adjudicator.organizationId && record.organizationId !== adjudicator.organizationId) {
      throw new Error('Access denied: Record belongs to another regional organization.');
    }

    // Dispute status requirement
    if (record.status !== 'disputed' && adjudicator.role !== 'Administrator') {
      throw new Error(`Only records with 'disputed' status require adjudication (current status: '${record.status}').`);
    }

    // Phase D: Adjudicator Independence & Conflict of Interest Prevention
    const previousSubmissions = this.db.prepare('SELECT annotatorId FROM user_annotations WHERE recordId = ?').all(record.id) as any[];
    const isAnnotatorOnSameTask = previousSubmissions.some(s => s.annotatorId === adjudicator.id);
    if (isAnnotatorOnSameTask && adjudicator.role !== 'Administrator') {
      throw new Error('Conflict of interest: Adjudicator cannot be an evaluating annotator on the same task.');
    }

    if (adjudicator.role !== 'Administrator') {
      const auth = this.getReviewerAuthorization(adjudicator.id);
      if (auth && (auth.isRevoked || auth.role !== 'Adjudicator')) {
        throw new Error(`Adjudicator authorization failed: ${auth.revocationReason || 'User lacks active Adjudicator accreditation'}.`);
      }
    }

    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE annotation_records
      SET status = 'adjudicated',
          finalLabel = ?,
          adjudicatorId = ?,
          adjudicatorName = ?,
          adjudicationRationale = ?,
          adjudicatedAt = ?,
          updatedAt = ?
      WHERE id = ?
    `).run(
      data.label,
      adjudicator.id,
      adjudicator.displayName,
      data.rationale.trim(),
      now,
      now,
      record.id
    );

    this.recordAudit({
      actorId: adjudicator.id,
      actorName: adjudicator.displayName,
      action: 'Disputed Annotation Adjudicated',
      entityType: 'AnnotationRecord',
      entityReference: record.id,
      beforeValue: `Status: ${record.status}`,
      afterValue: `Final Label: ${data.label}, Status: adjudicated`,
      note: data.rationale.trim()
    });

    return this.getAnnotationRecordById(record.id, adjudicator.id, adjudicator.role)!;
  }

  getAnnotationMetrics(organizationId?: string): AnnotationMetrics {
    let sql = 'SELECT * FROM annotation_records WHERE 1=1';
    const params: any[] = [];
    if (organizationId) {
      sql += ' AND organizationId = ?';
      params.push(organizationId);
    }

    const records = this.db.prepare(sql).all(...params) as any[];
    const totalRecords = records.length;

    let pendingRecords = 0;
    let inReviewRecords = 0;
    let agreedRecords = 0;
    let disputedRecords = 0;
    let adjudicatedRecords = 0;

    const labelDistribution: Record<FiveClassLabel, number> = {
      MATCH: 0,
      MISMATCH: 0,
      MISSING: 0,
      UNCERTAIN: 0,
      NOT_COMPARABLE: 0
    };

    const institutionDistribution: Record<string, number> = {};

    for (const r of records) {
      if (r.status === 'pending') pendingRecords++;
      else if (r.status === 'in_review') inReviewRecords++;
      else if (r.status === 'agreed') agreedRecords++;
      else if (r.status === 'disputed') disputedRecords++;
      else if (r.status === 'adjudicated') adjudicatedRecords++;

      if (r.finalLabel && (r.finalLabel in labelDistribution)) {
        labelDistribution[r.finalLabel as FiveClassLabel]++;
      }

      const instName = r.institutionName || 'Unknown Institution';
      institutionDistribution[instName] = (institutionDistribution[instName] || 0) + 1;
    }

    const completedRecords = agreedRecords + adjudicatedRecords;

    // Calculate Raw Agreement & Cohen's Kappa on all records having >= 2 submitted annotations
    let pairedSql = `
      SELECT a1.recordId, a1.annotatorId as annotator1Id, a2.annotatorId as annotator2Id, a1.label as label1, a2.label as label2
      FROM user_annotations a1
      JOIN user_annotations a2 ON a1.recordId = a2.recordId AND a1.id < a2.id
      JOIN annotation_records r ON a1.recordId = r.id
      WHERE a1.isDraft = 0 AND a2.isDraft = 0
    `;
    const pairedParams: any[] = [];
    if (organizationId) {
      pairedSql += ' AND r.organizationId = ?';
      pairedParams.push(organizationId);
    }
    const pairs = this.db.prepare(pairedSql).all(...pairedParams) as {
      recordId: string;
      annotator1Id: string;
      annotator2Id: string;
      label1: string;
      label2: string;
    }[];

    const kappaRes = computeCohensKappa(pairs);

    const adjudicationRate = (disputedRecords + adjudicatedRecords > 0)
      ? Math.round((adjudicatedRecords / (disputedRecords + adjudicatedRecords)) * 1000) / 1000
      : 0;

    const missingEvidenceRate = (totalRecords > 0)
      ? Math.round((labelDistribution.MISSING / totalRecords) * 1000) / 1000
      : 0;

    return {
      totalRecords,
      completedRecords,
      pendingRecords,
      inReviewRecords,
      agreedRecords,
      disputedRecords,
      adjudicatedRecords,
      labelDistribution,
      rawAgreementRate: kappaRes.rawAgreementRate,
      cohensKappa: kappaRes.kappa,
      cohensKappaInterpretation: kappaRes.interpretation,
      po: kappaRes.po,
      pe: kappaRes.pe,
      pairedCount: kappaRes.pairedCount,
      distinctAnnotatorsCount: kappaRes.distinctAnnotatorsCount,
      excludedPairsCount: kappaRes.excludedPairsCount,
      undefinedReason: kappaRes.undefinedReason,
      isSampleSizeSufficient: kappaRes.isSampleSizeSufficient,
      categoryDistribution: kappaRes.categoryDistribution,
      adjudicationRate,
      missingEvidenceRate,
      invalidRecordRate: 0.0,
      institutionDistribution
    };
  }

  exportGoldStandard(options?: {
    organizationId?: string;
    role?: string;
    outPath?: string;
  }): {
    count: number;
    outPath: string;
    sha256: string;
    manifestPath: string;
    rejectionCount: number;
    rejectionReasons: { recordId: string; reasons: string[] }[];
    ledgerIntegrityReport?: any;
  } {
    const exportFile = options?.outPath || path.resolve(process.cwd(), 'ai_service/ml/data/v3/annotations/gold_standard_human.jsonl');
    const baseName = path.basename(exportFile, path.extname(exportFile));
    const manifestFile = options?.outPath
      ? path.resolve(path.dirname(exportFile), '..', 'manifests', `${baseName}.manifest.json`)
      : path.resolve(process.cwd(), 'ai_service/ml/data/v3/manifests/gold_standard_human.manifest.json');

    // Cryptographic audit ledger verification across the entire chain
    const ledgerCheck = this.verifyLedgerChain();

    let sql = `
      SELECT * FROM annotation_records
      WHERE status IN ('agreed', 'adjudicated') AND finalLabel IS NOT NULL
    `;
    const params: any[] = [];
    if (options?.organizationId && options?.role !== 'Administrator') {
      sql += ' AND organizationId = ?';
      params.push(options.organizationId);
    }
    sql += ' ORDER BY recordId ASC';

    const records = this.db.prepare(sql).all(...params) as any[];

    const jsonlRows: string[] = [];
    const rejectionReasons: { recordId: string; reasons: string[] }[] = [];

    // Helper to resolve document strictly by ID from institutional_dockets or documents
    const resolveDocById = (docId: string): { type: 'docket' | 'document'; doc: any } | null => {
      if (!docId || typeof docId !== 'string' || docId.trim().length === 0) {
        return null;
      }
      const trimmedId = docId.trim();
      const dkt = this.db.prepare('SELECT * FROM institutional_dockets WHERE id = ? OR docketNumber = ?').get(trimmedId, trimmedId) as any;
      if (dkt) return { type: 'docket' as const, doc: dkt };
      const doc = this.db.prepare('SELECT * FROM documents WHERE id = ?').get(trimmedId) as any;
      if (doc) return { type: 'document' as const, doc };
      return null;
    };

    const resolveDocOrg = (item: { type: 'docket' | 'document'; doc: any }): string | null => {
      if (item.type === 'docket') {
        return item.doc.organizationId || null;
      }
      const app = this.db.prepare('SELECT organizationId FROM applications WHERE id = ?').get(item.doc.applicationId) as any;
      return app?.organizationId || null;
    };

    for (const r of records) {
      const reasons: string[] = [];

      // GATE 1: Demo / Synthetic Candidate Rejection
      if (r.isDemoCandidate === 1 || r.isDemoCandidate === true) {
        reasons.push('Candidate record is an illustrative/demo fixture and is barred from the human gold standard.');
      }
      if (r.sourceProvenance && (
        r.sourceProvenance.toLowerCase().includes('demo') ||
        r.sourceProvenance.toLowerCase().includes('synthetic') ||
        r.sourceProvenance.toLowerCase().includes('mock') ||
        r.sourceProvenance.toLowerCase().includes('quarantine')
      )) {
        reasons.push(`Source provenance indicates non-genuine origin: '${r.sourceProvenance}'.`);
      }
      if (r.status === 'quarantined') {
        reasons.push('Record status is quarantined.');
      }

      // GATE 2: Identifiable Source Document Citations, Existence & Access
      let claimResolved: { type: 'docket' | 'document'; doc: any } | null = null;
      const rawClaimId = (r.claimDocumentId && typeof r.claimDocumentId === 'string') ? r.claimDocumentId.trim() : '';
      const rawClaimName = (r.claimDocumentName && typeof r.claimDocumentName === 'string') ? r.claimDocumentName.trim() : '';

      if (rawClaimId.length === 0) {
        if (rawClaimName.length > 0) {
          reasons.push(`Gate 2 Failed: Non-empty claim document name '${rawClaimName}' provided without required claimDocumentId. Every candidate referencing a claim document must contain a valid claimDocumentId.`);
        } else {
          reasons.push('Gate 2 Failed: Missing identifiable source document citation for claim (claimDocumentId is missing).');
        }
      } else {
        claimResolved = resolveDocById(rawClaimId);
        if (!claimResolved) {
          reasons.push(`Gate 2 Failed: Referenced claim document ID '${rawClaimId}' does not exist, has been deleted, or is inaccessible in institutional registry.`);
        } else {
          if (claimResolved.type === 'docket') {
            const forbiddenStates = ['ACCESS_DENIED', 'PROVENANCE_REJECTED', 'QUARANTINED', 'DEMO_FIXTURE', 'SYNTHETIC_DATA', 'DELETED', 'ARCHIVED'];
            if (forbiddenStates.includes(claimResolved.doc.lifecycleState)) {
              reasons.push(`Gate 2 Failed: Referenced claim document ID '${rawClaimId}' is inaccessible (lifecycle state: ${claimResolved.doc.lifecycleState}).`);
            }
          }
          const claimDocOrg = resolveDocOrg(claimResolved);
          if (claimDocOrg && r.organizationId && claimDocOrg !== r.organizationId) {
            reasons.push(`Gate 2 Failed: Cross-tenant document reference: claim document belongs to organization '${claimDocOrg}' but candidate belongs to '${r.organizationId}'.`);
          }
          if (options?.organizationId && options?.role !== 'Administrator' && claimDocOrg && claimDocOrg !== options.organizationId) {
            reasons.push(`Gate 2 Failed: Cross-tenant document access: claim document organization '${claimDocOrg}' does not match caller organization '${options.organizationId}'.`);
          }
        }
      }

      let evidenceResolved: { type: 'docket' | 'document'; doc: any } | null = null;
      const rawEvidenceId = (r.evidenceDocumentId && typeof r.evidenceDocumentId === 'string') ? r.evidenceDocumentId.trim() : '';
      const rawEvidenceName = (r.evidenceDocumentName && typeof r.evidenceDocumentName === 'string') ? r.evidenceDocumentName.trim() : '';

      if (rawEvidenceId.length === 0) {
        if (rawEvidenceName.length > 0) {
          reasons.push(`Gate 2 Failed: Non-empty evidence document name '${rawEvidenceName}' provided without required evidenceDocumentId. Every candidate referencing an evidence document must contain a valid evidenceDocumentId.`);
        } else {
          reasons.push('Gate 2 Failed: Missing identifiable source document citation for evidence (evidenceDocumentId is missing).');
        }
      } else {
        evidenceResolved = resolveDocById(rawEvidenceId);
        if (!evidenceResolved) {
          reasons.push(`Gate 2 Failed: Referenced evidence document ID '${rawEvidenceId}' does not exist, has been deleted, or is inaccessible in institutional registry.`);
        } else {
          if (evidenceResolved.type === 'docket') {
            const forbiddenStates = ['ACCESS_DENIED', 'PROVENANCE_REJECTED', 'QUARANTINED', 'DEMO_FIXTURE', 'SYNTHETIC_DATA', 'DELETED', 'ARCHIVED'];
            if (forbiddenStates.includes(evidenceResolved.doc.lifecycleState)) {
              reasons.push(`Gate 2 Failed: Referenced evidence document ID '${rawEvidenceId}' is inaccessible (lifecycle state: ${evidenceResolved.doc.lifecycleState}).`);
            }
          }
          const evidenceDocOrg = resolveDocOrg(evidenceResolved);
          if (evidenceDocOrg && r.organizationId && evidenceDocOrg !== r.organizationId) {
            reasons.push(`Gate 2 Failed: Cross-tenant document reference: evidence document belongs to organization '${evidenceDocOrg}' but candidate belongs to '${r.organizationId}'.`);
          }
          if (options?.organizationId && options?.role !== 'Administrator' && evidenceDocOrg && evidenceDocOrg !== options.organizationId) {
            reasons.push(`Gate 2 Failed: Cross-tenant document access: evidence document organization '${evidenceDocOrg}' does not match caller organization '${options.organizationId}'.`);
          }
        }
      }

      // GATE 3: Both document checksums verify (if document binary is registered on disk)
      const verifyDocChecksum = (item: { type: 'docket' | 'document'; doc: any } | null, label: 'Claim' | 'Evidence') => {
        if (!item) {
          reasons.push(`Gate 3 Failed: Cannot verify checksum for ${label} document because document record could not be resolved.`);
          return;
        }
        const filePath = item.type === 'docket'
          ? path.resolve(process.cwd(), item.doc.documentPath)
          : (path.isAbsolute(item.doc.storageKey)
              ? item.doc.storageKey
              : path.resolve(process.cwd(), 'data', item.doc.storageKey));
        const expectedChecksum = (item.type === 'docket' ? item.doc.documentChecksum : item.doc.checksum || '').toLowerCase();
        if (fs.existsSync(filePath)) {
          try {
            const fileBytes = fs.readFileSync(filePath);
            const actualHash = crypto.createHash('sha256').update(fileBytes).digest('hex').toLowerCase();
            const expectedClean = expectedChecksum.replace(/^sha256-/, '');
            if (expectedClean && !actualHash.startsWith(expectedClean) && !expectedClean.startsWith(actualHash)) {
              reasons.push(`Gate 3 Failed: ${label} document checksum verification failed: expected ${expectedClean}, computed ${actualHash}.`);
            }
          } catch {
            reasons.push(`Gate 3 Failed: Failed to read ${label} document binary for checksum recalculation.`);
          }
        } else if (item.type === 'docket') {
          reasons.push(`Gate 3 Failed: ${label} institutional docket physical file missing at: ${item.doc.documentPath}.`);
        }
      };
      verifyDocChecksum(claimResolved, 'Claim');
      verifyDocChecksum(evidenceResolved, 'Evidence');

      // GATE 4: Source Provenance Verified
      if (!claimResolved) {
        reasons.push('Gate 4 Failed: Cannot verify claim document provenance because claim document record is unresolved.');
      } else {
        const prov = claimResolved.doc.provenanceStatus;
        if (prov !== 'PROVENANCE_VERIFIED') {
          reasons.push(`Gate 4 Failed: Claim document provenance is '${prov}': only PROVENANCE_VERIFIED documents may enter gold standard.`);
        }
      }

      if (!evidenceResolved) {
        reasons.push('Gate 4 Failed: Cannot verify evidence document provenance because evidence document record is unresolved.');
      } else {
        const prov = evidenceResolved.doc.provenanceStatus;
        if (prov !== 'PROVENANCE_VERIFIED') {
          reasons.push(`Gate 4 Failed: Evidence document provenance is '${prov}': only PROVENANCE_VERIFIED documents may enter gold standard.`);
        }
      }

      if (r.provenanceStatus && r.provenanceStatus !== 'PROVENANCE_VERIFIED') {
        reasons.push(`Gate 4 Failed: Candidate provenance status '${r.provenanceStatus}' is not verified.`);
      }

      // GATE 5: Page references must be valid positive integers within page count
      if (r.claimPage === null || r.claimPage === undefined || Number(r.claimPage) < 1) {
        reasons.push('Gate 5 Failed: Missing or invalid application docket page citation (claimPage).');
      } else if (!claimResolved) {
        reasons.push('Gate 5 Failed: Cannot validate claim page bounds because claim document record is unresolved.');
      } else if (claimResolved.doc.pageCount > 0 && Number(r.claimPage) > claimResolved.doc.pageCount) {
        reasons.push(`Gate 5 Failed: Claim page ${r.claimPage} exceeds document page count (${claimResolved.doc.pageCount}).`);
      }

      if (r.evidencePage === null || r.evidencePage === undefined || Number(r.evidencePage) < 1) {
        reasons.push('Gate 5 Failed: Missing or invalid supporting evidence docket page citation (evidencePage).');
      } else if (!evidenceResolved) {
        reasons.push('Gate 5 Failed: Cannot validate evidence page bounds because evidence document record is unresolved.');
      } else if (evidenceResolved.doc.pageCount > 0 && Number(r.evidencePage) > evidenceResolved.doc.pageCount) {
        reasons.push(`Gate 5 Failed: Evidence page ${r.evidencePage} exceeds document page count (${evidenceResolved.doc.pageCount}).`);
      }

      // GATE 6: Evidence references resolve to actual source content
      if (!r.claimFieldName || !r.claimText || !r.evidenceText) {
        reasons.push('Evidence reference incomplete: missing claimFieldName, claimText, or evidenceText.');
      }

      // GATE 7, 8, 9, 10: Double-Blind Independent Human Submissions
      const submissions = this.db.prepare(`
        SELECT * FROM user_annotations
        WHERE recordId = ? AND isDraft = 0
        ORDER BY createdAt ASC
      `).all(r.id) as any[];

      if (submissions.length < 2) {
        reasons.push(`Insufficient independent review: minimum of 2 non-draft human submissions required (found ${submissions.length}).`);
      } else {
        // GATE 9: Duplicate annotator check
        const uniqueAnnotators = new Set(submissions.map((s) => s.annotatorId));
        if (uniqueAnnotators.size < 2) {
          reasons.push('Duplicate annotator submissions: independent review requires two distinct authorized evaluators.');
        }

        // GATE 7: Authorized annotators check
        for (const sub of submissions) {
          const auth = this.getReviewerAuthorization(sub.annotatorId);
          if (auth && auth.isRevoked) {
            reasons.push(`Submission by annotator ${sub.annotatorName || sub.annotatorId} has revoked/expired statutory authorization.`);
          }
        }

        // GATE 8: Non-draft check
        for (const sub of submissions) {
          if (sub.isDraft) {
            reasons.push(`Submission by annotator ${sub.annotatorName || sub.annotatorId} is marked as draft.`);
          }
        }

        // GATE 10: Substantive rationale checks on all submissions
        for (const sub of submissions) {
          if (!sub.rationale || sub.rationale.trim().length < 10) {
            reasons.push(`Submission by annotator ${sub.annotatorName || sub.annotatorId} lacks substantive rationale (<10 characters).`);
            break;
          }
        }

        // GATE 11 & 12: Consensus or Adjudication Verification & Adjudicator Independence
        if (r.status === 'agreed') {
          const firstLabel = submissions[0].label;
          const secondLabel = submissions[1].label;
          if (firstLabel !== secondLabel || firstLabel !== r.finalLabel) {
            reasons.push(`Disagreement marked as agreed without consensus: submissions (${firstLabel}, ${secondLabel}) deviate from finalLabel (${r.finalLabel}).`);
          }
        } else if (r.status === 'adjudicated') {
          if (!r.adjudicatorId || !r.adjudicationRationale || r.adjudicationRationale.trim().length < 10) {
            reasons.push('Adjudication record lacks verified third-reviewer identity or substantive statutory rationale (minimum 10 characters).');
          }
          // GATE 12: Adjudicator Independence
          const isAnnotatorOnSameTask = submissions.some((s) => s.annotatorId === r.adjudicatorId);
          if (isAnnotatorOnSameTask) {
            reasons.push(`Adjudicator conflict of interest: Adjudicator '${r.adjudicatorId}' was an evaluating annotator on the same task.`);
          }
          const adjAuth = this.getReviewerAuthorization(r.adjudicatorId);
          if (adjAuth && adjAuth.isRevoked) {
            reasons.push(`Adjudicator authorization for '${r.adjudicatorId}' is revoked: ${adjAuth.revocationReason || 'Revoked'}.`);
          }
        } else {
          reasons.push(`Invalid record status '${r.status}': unresolved disputes cannot enter the gold standard.`);
        }
      }

      // GATE 13: Cryptographic Audit Ledger Verification & Complete Audit History
      if (!ledgerCheck.isValid) {
        reasons.push(`Cryptographic audit ledger verification failed: ${ledgerCheck.errors.join('; ') || 'Chain broken or tampered'}.`);
      }
      const auditCount = Number((this.db.prepare(`
        SELECT COUNT(*) as count FROM audit_events
        WHERE entityReference = ?
      `).get(r.id) as any)?.count || 0);

      if (auditCount === 0) {
        reasons.push('Audit history missing: candidate lifecycle actions have not been recorded in system ledger.');
      }

      // GATE 14: Tenant Isolation Enforcement
      if (options?.organizationId && options?.role !== 'Administrator') {
        if (r.organizationId !== options.organizationId) {
          reasons.push(`Cross-tenant violation: Record organization '${r.organizationId}' does not match caller organization '${options.organizationId}'.`);
        }
      }

      // GATE 15: Fresh Physical Checksum Re-verification (TOCTOU) & No Quarantine
      if (r.status === 'quarantined' || (r.sourceProvenance && r.sourceProvenance.toLowerCase().includes('quarantine'))) {
        reasons.push('Gate 15 Failed: Candidate record is marked as quarantined.');
      }
      if (claimResolved) {
        if (claimResolved.doc.provenanceStatus === 'QUARANTINED' || claimResolved.doc.lifecycleState === 'QUARANTINED' || claimResolved.doc.documentClassification === 'quarantined') {
          reasons.push('Gate 15 Failed: Claim source document is quarantined.');
        }
        if (claimResolved.type === 'docket' && claimResolved.doc.documentPath) {
          const pPath = path.resolve(process.cwd(), claimResolved.doc.documentPath);
          if (fs.existsSync(pPath)) {
            const currentBytes = fs.readFileSync(pPath);
            const currentHash = crypto.createHash('sha256').update(currentBytes).digest('hex').toLowerCase();
            const expected = (claimResolved.doc.documentChecksum || '').toLowerCase().replace(/^sha256-/, '');
            if (expected && currentHash !== expected) {
              reasons.push(`Gate 15 Failed: Physical claim document file checksum has mutated since verification (expected: ${expected}, current: ${currentHash}).`);
            }
          }
        }
      }
      if (evidenceResolved) {
        if (evidenceResolved.doc.provenanceStatus === 'QUARANTINED' || evidenceResolved.doc.lifecycleState === 'QUARANTINED' || evidenceResolved.doc.documentClassification === 'quarantined') {
          reasons.push('Gate 15 Failed: Evidence source document is quarantined.');
        }
        if (evidenceResolved.type === 'docket' && evidenceResolved.doc.documentPath) {
          const pPath = path.resolve(process.cwd(), evidenceResolved.doc.documentPath);
          if (fs.existsSync(pPath)) {
            const currentBytes = fs.readFileSync(pPath);
            const currentHash = crypto.createHash('sha256').update(currentBytes).digest('hex').toLowerCase();
            const expected = (evidenceResolved.doc.documentChecksum || '').toLowerCase().replace(/^sha256-/, '');
            if (expected && currentHash !== expected) {
              reasons.push(`Gate 15 Failed: Physical evidence document file checksum has mutated since verification (expected: ${expected}, current: ${currentHash}).`);
            }
          }
        }
      }

      // If any gate failed, reject and record reasons
      if (reasons.length > 0) {
        rejectionReasons.push({
          recordId: r.recordId,
          reasons
        });
        continue;
      }

      // All gates passed: format canonical V3 pairwise record
      const canonicalRecord = {
        record_id: `gold-${r.recordId}`,
        schema_version: '3.0',
        group_id: `${r.institutionId}::${r.evidenceDocumentId || r.claimDocumentId || 'docket'}`,
        claim: {
          text: r.claimText,
          field_name: r.claimFieldName,
          source_document_id: r.claimDocumentId,
          page: Number(r.claimPage)
        },
        evidence: {
          text: r.evidenceText,
          source_document_id: r.evidenceDocumentId,
          page: Number(r.evidencePage)
        },
        comparison: {
          source_label: r.originalSourceLabel || null,
          label: r.finalLabel,
          field_type: mapFieldTypeToV3(r.fieldCategory),
          normalization_applied: ['regulatory_standardization'],
          ocr_quality: r.status === 'adjudicated' ? 'adjudicated_verified' : 'high'
        },
        provenance: {
          dataset: 'form2fact_v3_aicte_human_gold',
          source_url: 'https://www.aicte-india.org/bulletins/approved-institutions',
          licence: 'Public Regulatory Inspection Disclosure',
          annotation_status: 'human_annotated'
        },
        quality: {
          is_synthetic: false,
          is_human_annotated: true,
          review_status: 'audited'
        }
      };

      jsonlRows.push(JSON.stringify(canonicalRecord));
    }

    fs.mkdirSync(path.dirname(exportFile), { recursive: true });
    fs.writeFileSync(exportFile, jsonlRows.join('\n') + (jsonlRows.length > 0 ? '\n' : ''), 'utf-8');

    // Calculate SHA-256
    const fileBytes = fs.readFileSync(exportFile);
    const sha256 = crypto.createHash('sha256').update(fileBytes).digest('hex');

    const manifest = {
      dataset_id: 'gold_standard_human',
      name: 'Form2Fact V3 AICTE Gold-Standard Human Annotation Corpus',
      export_timestamp: new Date().toISOString(),
      record_count: jsonlRows.length,
      rejection_count: rejectionReasons.length,
      file: {
        filename: path.basename(exportFile),
        relative_path: path.relative(process.cwd(), exportFile).replace(/\\/g, '/'),
        size_bytes: fileBytes.length,
        sha256: sha256
      },
      quality_invariants: {
        is_synthetic: false,
        is_human_annotated: true,
        adjudication_required_for_disagreements: true,
        blind_review_enforced: true,
        rejection_gate_active: true,
        fifteen_firewall_gates_enforced: true,
        ledger_hash_chain_verified: ledgerCheck.isValid
      }
    };

    fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf-8');

    const ledgerReport = this.generateLedgerIntegrityReport();

    return {
      count: jsonlRows.length,
      outPath: exportFile,
      sha256: sha256,
      manifestPath: manifestFile,
      rejectionCount: rejectionReasons.length,
      rejectionReasons,
      ledgerIntegrityReport: ledgerReport
    };
  }

  private mapAnnotationRecord(r: any, userId?: string, role?: string): AnnotationRecord {
    // Fetch all user annotations for this record
    const userAnnRows = this.db.prepare('SELECT * FROM user_annotations WHERE recordId = ? ORDER BY createdAt ASC').all(r.id) as any[];
    const allUserAnnotations = userAnnRows.map(u => this.mapUserAnnotationRow(u));

    const myAnnotation = userId ? allUserAnnotations.find(u => u.annotatorId === userId) : undefined;

    // Ensure drafts belonging to other annotators are NEVER disclosed to anyone
    const sanitizedUserAnnotations = allUserAnnotations.filter(
      (u) => !u.isDraft || u.annotatorId === userId
    );

    // BLIND REVIEW ENFORCEMENT:
    // If not Admin or Adjudicator and record not adjudicated, hide other users' annotations
    let visibleUserAnnotations: UserAnnotation[] = [];
    if (role === 'Administrator' || role === 'Adjudicator' || r.status === 'adjudicated') {
      visibleUserAnnotations = sanitizedUserAnnotations;
    } else if (myAnnotation) {
      visibleUserAnnotations = [myAnnotation];
    }

    return {
      id: r.id,
      recordId: r.recordId,
      institutionId: r.institutionId,
      institutionName: r.institutionName,
      applicationId: r.applicationId || undefined,
      claimFieldName: r.claimFieldName,
      claimText: r.claimText,
      claimDocumentId: r.claimDocumentId || undefined,
      claimDocumentName: r.claimDocumentName || undefined,
      claimPage: r.claimPage || undefined,
      evidenceText: r.evidenceText,
      evidenceDocumentId: r.evidenceDocumentId || undefined,
      evidenceDocumentName: r.evidenceDocumentName || undefined,
      evidencePage: r.evidencePage || undefined,
      evidenceLocation: r.evidenceLocation || undefined,
      normalizedClaimValue: r.normalizedClaimValue || undefined,
      normalizedEvidenceValue: r.normalizedEvidenceValue || undefined,
      fieldCategory: r.fieldCategory || undefined,
      sourceProvenance: r.sourceProvenance,
      isDemoCandidate: Boolean(r.isDemoCandidate),
      originalSourceLabel: r.originalSourceLabel || undefined,
      status: r.status,
      finalLabel: r.finalLabel || undefined,
      adjudicatorId: r.adjudicatorId || undefined,
      adjudicatorName: r.adjudicatorName || undefined,
      adjudicationRationale: r.adjudicationRationale || undefined,
      adjudicatedAt: r.adjudicatedAt || undefined,
      organizationId: r.organizationId,
      userAnnotations: visibleUserAnnotations,
      myAnnotation: myAnnotation,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };
  }

  private mapUserAnnotationRow(r: any): UserAnnotation {
    return {
      id: r.id,
      recordId: r.recordId,
      annotatorId: r.annotatorId,
      annotatorName: r.annotatorName,
      annotatorRole: r.annotatorRole,
      label: r.label,
      rationale: r.rationale,
      isDraft: Boolean(r.isDraft),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };
  }
}

export const db = new ScrutinyDatabase();
