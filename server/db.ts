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
  FiveClassLabel
} from '../src/types/index.ts';
import { INITIAL_RULES, evaluateApplicationRules } from './rulesEngine.ts';
import { extractFieldsFromPages } from './extraction.ts';

export interface DatabaseUser extends User {
  passwordHash: string;
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
    `);

    // Automatic migration for existing databases: ensure organizationId exists
    try {
      this.db.exec("ALTER TABLE users ADD COLUMN organizationId TEXT NOT NULL DEFAULT 'org-aicte-western';");
    } catch {}
    try {
      this.db.exec("ALTER TABLE applications ADD COLUMN organizationId TEXT NOT NULL DEFAULT 'org-aicte-western';");
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

  recordAudit(event: Omit<AuditEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) {
    const id = event.id || `aud-${crypto.randomUUID()}`;
    const timestamp = event.timestamp || new Date().toISOString();

    this.db.prepare(`
      INSERT INTO audit_events (id, timestamp, actorId, actorName, action, entityType, entityReference, beforeValue, afterValue, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      timestamp,
      event.actorId,
      event.actorName,
      event.action,
      event.entityType,
      event.entityReference,
      event.beforeValue || null,
      event.afterValue || null,
      event.note || null
    );
  }

  getAuditEvents(userOrgId?: string, isAdmin = false): AuditEvent[] {
    const rows = this.db.prepare('SELECT * FROM audit_events ORDER BY timestamp DESC').all() as any[];
    const mapped: AuditEvent[] = rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      actorId: r.actorId,
      actorName: r.actorName,
      action: r.action,
      entityType: r.entityType,
      entityReference: r.entityReference,
      beforeValue: r.beforeValue || undefined,
      afterValue: r.afterValue || undefined,
      note: r.note || undefined
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
          sourceProvenance, originalSourceLabel, status, finalLabel, organizationId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          sourceProvenance: 'AICTE Institutional Scrutiny Dossier 2026',
          originalSourceLabel: null,
          status: 'pending',
          finalLabel: null,
          organizationId: 'org-aicte-western'
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
          sourceProvenance: 'AICTE Institutional Scrutiny Dossier 2026',
          originalSourceLabel: null,
          status: 'pending',
          finalLabel: null,
          organizationId: 'org-aicte-western'
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
          sourceProvenance: 'AICTE Institutional Scrutiny Dossier 2026',
          originalSourceLabel: null,
          status: 'pending',
          finalLabel: null,
          organizationId: 'org-aicte-western'
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
          sourceProvenance: 'AICTE Institutional Scrutiny Dossier 2026',
          originalSourceLabel: null,
          status: 'pending',
          finalLabel: null,
          organizationId: 'org-aicte-western'
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
          sourceProvenance: 'AICTE Institutional Scrutiny Dossier 2026',
          originalSourceLabel: null,
          status: 'pending',
          finalLabel: null,
          organizationId: 'org-aicte-western'
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
          sourceProvenance: 'AICTE Institutional Scrutiny Dossier 2026',
          originalSourceLabel: null,
          status: 'disputed', // Pre-seeded disagreement to allow testing third-reviewer adjudication
          finalLabel: null,
          organizationId: 'org-aicte-central'
        }
      ];

      for (const c of candidates) {
        insert.run(
          c.id, c.recordId, c.institutionId, c.institutionName, c.applicationId,
          c.claimFieldName, c.claimText, c.claimDocumentId, c.claimDocumentName, c.claimPage,
          c.evidenceText, c.evidenceDocumentId, c.evidenceDocumentName, c.evidencePage, c.evidenceLocation,
          c.normalizedClaimValue, c.normalizedEvidenceValue, c.fieldCategory,
          c.sourceProvenance, c.originalSourceLabel, c.status, c.finalLabel, c.organizationId, now, now
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
        sourceProvenance, originalSourceLabel, status, finalLabel, organizationId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

    // Tenant check
    if (annotator.role !== 'Administrator' && record.organizationId !== annotator.organizationId) {
      throw new Error('Access denied: Record belongs to another regional organization.');
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
    adjudicator: { id: string; displayName: string; role: string },
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
    const pairedSql = `
      SELECT a1.recordId, a1.label as label1, a2.label as label2
      FROM user_annotations a1
      JOIN user_annotations a2 ON a1.recordId = a2.recordId AND a1.id < a2.id
      WHERE a1.isDraft = 0 AND a2.isDraft = 0
    `;
    const pairs = this.db.prepare(pairedSql).all() as { recordId: string; label1: string; label2: string }[];
    const N = pairs.length;

    let rawAgreementRate = 0;
    let cohensKappa = 1.0;
    let kappaInterpretation = 'No Double Annotations';

    if (N > 0) {
      let matches = 0;
      const categories: FiveClassLabel[] = ['MATCH', 'MISMATCH', 'MISSING', 'UNCERTAIN', 'NOT_COMPARABLE'];
      const f1: Record<string, number> = {};
      const f2: Record<string, number> = {};
      for (const c of categories) {
        f1[c] = 0;
        f2[c] = 0;
      }

      for (const p of pairs) {
        if (p.label1 === p.label2) matches++;
        if (p.label1 in f1) f1[p.label1]++;
        if (p.label2 in f2) f2[p.label2]++;
      }

      const po = matches / N;
      rawAgreementRate = Math.round(po * 1000) / 1000;

      let pe = 0;
      for (const c of categories) {
        pe += (f1[c] / N) * (f2[c] / N);
      }

      if (pe >= 1.0) {
        cohensKappa = 1.0;
      } else {
        cohensKappa = Math.round(((po - pe) / (1 - pe)) * 1000) / 1000;
      }

      if (cohensKappa >= 0.81) kappaInterpretation = 'Almost Perfect Agreement';
      else if (cohensKappa >= 0.61) kappaInterpretation = 'Substantial Agreement';
      else if (cohensKappa >= 0.41) kappaInterpretation = 'Moderate Agreement';
      else if (cohensKappa >= 0.21) kappaInterpretation = 'Fair Agreement';
      else if (cohensKappa >= 0.0) kappaInterpretation = 'Slight Agreement';
      else kappaInterpretation = 'Poor / Chance Divergence';
    }

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
      rawAgreementRate,
      cohensKappa,
      cohensKappaInterpretation: kappaInterpretation,
      adjudicationRate,
      missingEvidenceRate,
      invalidRecordRate: 0.0,
      institutionDistribution
    };
  }

  exportGoldStandard(outPath?: string): { count: number; outPath: string; sha256: string; manifestPath: string } {
    const exportFile = outPath || path.resolve(process.cwd(), 'ai_service/ml/data/v3/annotations/gold_standard_human.jsonl');
    const manifestFile = path.resolve(process.cwd(), 'ai_service/ml/data/v3/manifests/gold_standard_human.manifest.json');

    // Fetch all agreed or adjudicated records with finalLabel
    const records = this.db.prepare(`
      SELECT * FROM annotation_records
      WHERE status IN ('agreed', 'adjudicated') AND finalLabel IS NOT NULL
      ORDER BY recordId ASC
    `).all() as any[];

    const jsonlRows: string[] = [];

    for (const r of records) {
      const canonicalRecord = {
        record_id: `gold-${r.recordId}`,
        schema_version: '3.0',
        group_id: `${r.institutionId}::${r.evidenceDocumentId || r.claimDocumentId || 'docket'}`,
        claim: {
          text: r.claimText,
          field_name: r.claimFieldName,
          source_document_id: r.claimDocumentId || null,
          page: r.claimPage || null
        },
        evidence: {
          text: r.evidenceText,
          source_document_id: r.evidenceDocumentId || null,
          page: r.evidencePage || null
        },
        comparison: {
          source_label: r.originalSourceLabel || null,
          label: r.finalLabel,
          field_type: r.fieldCategory || 'generic',
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
        blind_review_enforced: true
      }
    };

    fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf-8');

    return {
      count: jsonlRows.length,
      outPath: exportFile,
      sha256: sha256,
      manifestPath: manifestFile
    };
  }

  private mapAnnotationRecord(r: any, userId?: string, role?: string): AnnotationRecord {
    // Fetch all user annotations for this record
    const userAnnRows = this.db.prepare('SELECT * FROM user_annotations WHERE recordId = ? ORDER BY createdAt ASC').all(r.id) as any[];
    const allUserAnnotations = userAnnRows.map(u => this.mapUserAnnotationRow(u));

    const myAnnotation = userId ? allUserAnnotations.find(u => u.annotatorId === userId) : undefined;

    // BLIND REVIEW ENFORCEMENT:
    // If not Admin or Adjudicator and record not adjudicated, hide other users' annotations
    let visibleUserAnnotations: UserAnnotation[] = [];
    if (role === 'Administrator' || role === 'Adjudicator' || r.status === 'adjudicated') {
      visibleUserAnnotations = allUserAnnotations;
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
