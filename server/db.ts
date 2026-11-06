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
  UserRole
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
    `);

    // Automatic migration for existing databases: ensure organizationId exists
    try {
      this.db.exec("ALTER TABLE users ADD COLUMN organizationId TEXT NOT NULL DEFAULT 'org-aicte-western';");
    } catch {}
    try {
      this.db.exec("ALTER TABLE applications ADD COLUMN organizationId TEXT NOT NULL DEFAULT 'org-aicte-western';");
    } catch {}
  }

  seedDefaultData(forceReset = false) {
    const isProduction = process.env.NODE_ENV === 'production';
    const seedDemoDisabled = process.env.SEED_DEMO_DATA === 'false';
    const existingAppsCount = Number((this.db.prepare('SELECT COUNT(*) as count FROM applications').get() as any)?.count || 0);
    const existingRulesCount = Number((this.db.prepare('SELECT COUNT(*) as count FROM rules').get() as any)?.count || 0);
    const existingUsersCount = Number((this.db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0);

    if (!forceReset) {
      if (isProduction && existingRulesCount > 0 && existingUsersCount > 0) {
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

    // 1. Seed Users with verified bcrypt hashes and organization assignments
    const insertUser = this.db.prepare(`
      INSERT INTO users (id, displayName, email, passwordHash, role, department, organizationId, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

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
}

export const db = new ScrutinyDatabase();
