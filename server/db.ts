import { Application, DocumentRecord, ExtractedField, Finding, ReviewAction, AuditEvent, Rule, User } from '../src/types/index.ts';
import { INITIAL_RULES, evaluateApplicationRules } from './rulesEngine.ts';
import { extractFieldsFromPages } from './extraction.ts';

class ScrutinyDatabase {
  applications: Map<string, Application> = new Map();
  documents: Map<string, DocumentRecord> = new Map();
  extractedFields: Map<string, ExtractedField> = new Map();
  findings: Map<string, Finding> = new Map();
  reviewActions: ReviewAction[] = [];
  auditEvents: AuditEvent[] = [];
  rules: Map<string, Rule> = new Map();

  currentUser: User = {
    id: 'usr-001',
    displayName: 'Dr. Aruna Rao',
    email: 'aruna.rao@scrutiny.edu.in',
    role: 'Reviewer',
    department: 'Regional Scrutiny Committee - Western Directorate'
  };

  constructor() {
    this.seedDefaultData();
  }

  seedDefaultData() {
    this.applications.clear();
    this.documents.clear();
    this.extractedFields.clear();
    this.findings.clear();
    this.reviewActions = [];
    this.auditEvents = [];
    this.rules.clear();

    for (const r of INITIAL_RULES) {
      this.rules.set(r.id, { ...r });
    }

    // App 1: Compliant
    const app1Id = 'app-1104';
    const app1: Application = {
      id: app1Id,
      referenceNumber: 'APP-2026-EOA-1104',
      institutionName: 'Kalyani Institute of Engineering & Technology',
      applicationType: 'Extension of Approval',
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
    this.applications.set(app1Id, app1);

    const doc1_1: DocumentRecord = {
      id: 'doc-1104-lease',
      applicationId: app1Id,
      originalFilename: 'Registered_Lease_Deed_Kalyani_Trust_30Yr.pdf',
      documentType: 'Land Lease Deed',
      storageKey: 'dockets/app-1104/lease_deed.pdf',
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
    this.documents.set(doc1_1.id, doc1_1);

    const doc1_2: DocumentRecord = {
      id: 'doc-1104-safety',
      applicationId: app1Id,
      originalFilename: 'Building_Safety_Structural_Fitness_2025.pdf',
      documentType: 'Building Safety Certificate',
      storageKey: 'dockets/app-1104/building_safety.pdf',
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
    this.documents.set(doc1_2.id, doc1_2);

    const doc1_3: DocumentRecord = {
      id: 'doc-1104-fire',
      applicationId: app1Id,
      originalFilename: 'Fire_Safety_NOC_Municipal_Corp_2025.pdf',
      documentType: 'Fire Safety NOC',
      storageKey: 'dockets/app-1104/fire_noc.pdf',
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
    this.documents.set(doc1_3.id, doc1_3);

    const doc1_4: DocumentRecord = {
      id: 'doc-1104-trust',
      applicationId: app1Id,
      originalFilename: 'Trust_Registration_Certificate_Bombay_Public_Trust.pdf',
      documentType: 'Society / Trust Registration Certificate',
      storageKey: 'dockets/app-1104/trust_cert.pdf',
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
    this.documents.set(doc1_4.id, doc1_4);

    const flds1_1 = extractFieldsFromPages(doc1_1.id, app1Id, doc1_1.documentType, doc1_1.extractedTextByPage!.map(p => ({ pageNumber: p.page, text: p.text })));
    const flds1_2 = extractFieldsFromPages(doc1_2.id, app1Id, doc1_2.documentType, doc1_2.extractedTextByPage!.map(p => ({ pageNumber: p.page, text: p.text })));
    const flds1_4 = extractFieldsFromPages(doc1_4.id, app1Id, doc1_4.documentType, doc1_4.extractedTextByPage!.map(p => ({ pageNumber: p.page, text: p.text })));
    [...flds1_1, ...flds1_2, ...flds1_4].forEach(f => this.extractedFields.set(f.id, f));

    // App 2: Clear Intentional Discrepancy
    const app2Id = 'app-0842';
    const app2: Application = {
      id: app2Id,
      referenceNumber: 'APP-2026-NTC-0842',
      institutionName: 'Pragati Institute of Technology & Management',
      applicationType: 'New Technical Campus',
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
    this.applications.set(app2Id, app2);

    const doc2_1: DocumentRecord = {
      id: 'doc-0842-lease',
      applicationId: app2Id,
      originalFilename: 'Land_Lease_Agreement_Pragati_Ahmedabad.pdf',
      documentType: 'Land Lease Deed',
      storageKey: 'dockets/app-0842/lease_deed.pdf',
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
    this.documents.set(doc2_1.id, doc2_1);

    const doc2_2: DocumentRecord = {
      id: 'doc-0842-trust',
      applicationId: app2Id,
      originalFilename: 'Trust_Deed_Pragati_Foundation.pdf',
      documentType: 'Society / Trust Registration Certificate',
      storageKey: 'dockets/app-0842/trust_cert.pdf',
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
    this.documents.set(doc2_2.id, doc2_2);

    const doc2_3: DocumentRecord = {
      id: 'doc-0842-safety',
      applicationId: app2Id,
      originalFilename: 'Building_Safety_Inspection_Report.pdf',
      documentType: 'Building Safety Certificate',
      storageKey: 'dockets/app-0842/safety_cert.pdf',
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
    this.documents.set(doc2_3.id, doc2_3);

    const doc2_4: DocumentRecord = {
      id: 'doc-0842-fire',
      applicationId: app2Id,
      originalFilename: 'Fire_NOC_Ahmedabad_Urban_Development.pdf',
      documentType: 'Fire Safety NOC',
      storageKey: 'dockets/app-0842/fire_noc.pdf',
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
    this.documents.set(doc2_4.id, doc2_4);

    const flds2_1 = extractFieldsFromPages(doc2_1.id, app2Id, doc2_1.documentType, doc2_1.extractedTextByPage!.map(p => ({ pageNumber: p.page, text: p.text })));
    const flds2_2 = extractFieldsFromPages(doc2_2.id, app2Id, doc2_2.documentType, doc2_2.extractedTextByPage!.map(p => ({ pageNumber: p.page, text: p.text })));
    const flds2_3 = extractFieldsFromPages(doc2_3.id, app2Id, doc2_3.documentType, doc2_3.extractedTextByPage!.map(p => ({ pageNumber: p.page, text: p.text })));
    [...flds2_1, ...flds2_2, ...flds2_3].forEach(f => this.extractedFields.set(f.id, f));

    const evalResult2 = evaluateApplicationRules(
      app2,
      [doc2_1, doc2_2, doc2_3, doc2_4],
      Array.from(this.extractedFields.values()).filter(f => f.applicationId === app2Id),
      Array.from(this.rules.values())
    );
    evalResult2.findings.forEach(f => this.findings.set(f.id, f));

    // App 3: Uncertain / Missing Evidence
    const app3Id = 'app-0915';
    const app3: Application = {
      id: app3Id,
      referenceNumber: 'APP-2026-EOA-0915',
      institutionName: 'Vidyapeeth Academy of Pharmaceutical Sciences',
      applicationType: 'Increase in Intake',
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
    this.applications.set(app3Id, app3);

    const doc3_1: DocumentRecord = {
      id: 'doc-0915-lease',
      applicationId: app3Id,
      originalFilename: 'Land_Title_Deed_Vidyapeeth_Trust.pdf',
      documentType: 'Land Lease Deed',
      storageKey: 'dockets/app-0915/title_deed.pdf',
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
    this.documents.set(doc3_1.id, doc3_1);

    const doc3_2: DocumentRecord = {
      id: 'doc-0915-safety-scan',
      applicationId: app3Id,
      originalFilename: 'Building_Safety_Photocopy_Scanned.pdf',
      documentType: 'Building Safety Certificate',
      storageKey: 'dockets/app-0915/safety_scan.pdf',
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
    this.documents.set(doc3_2.id, doc3_2);

    const flds3_1 = extractFieldsFromPages(doc3_1.id, app3Id, doc3_1.documentType, doc3_1.extractedTextByPage!.map(p => ({ pageNumber: p.page, text: p.text })));
    flds3_1.forEach(f => this.extractedFields.set(f.id, f));

    const evalResult3 = evaluateApplicationRules(
      app3,
      [doc3_1, doc3_2],
      Array.from(this.extractedFields.values()).filter(f => f.applicationId === app3Id),
      Array.from(this.rules.values())
    );
    evalResult3.findings.forEach(f => this.findings.set(f.id, f));

    // Audit Events
    this.auditEvents.push(
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
        note: 'Preliminary scrutiny identified 20-year lease gap on Page 3. Requesting certified supplementary lease addendum.'
      }
    );
  }

  getAllApplications(): Application[] {
    return Array.from(this.applications.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getApplicationById(id: string): Application | undefined {
    return this.applications.get(id);
  }

  createApplication(data: Partial<Application>): Application {
    const id = `app-${Date.now().toString().slice(-4)}`;
    const ref = data.referenceNumber || `APP-2026-${(data.applicationType || 'EOA').slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newApp: Application = {
      id,
      referenceNumber: ref,
      institutionName: data.institutionName || 'Untitled Technical Institution',
      applicationType: data.applicationType || 'Extension of Approval',
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
        applicationYear: data.declaredDetails?.applicationYear || '2026-27'
      },
      documentCount: 0,
      openFindingsCount: 0,
      totalFindingsCount: 0,
      reviewerNotes: data.reviewerNotes || '',
      assignedReviewer: this.currentUser.displayName,
      createdBy: this.currentUser.displayName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.applications.set(id, newApp);
    this.recordAudit({
      actorId: this.currentUser.id,
      actorName: this.currentUser.displayName,
      action: 'Application Created',
      entityType: 'Application',
      entityReference: newApp.referenceNumber,
      note: 'New application registered for scrutiny'
    });

    return newApp;
  }

  getDocumentsByApplication(applicationId: string): DocumentRecord[] {
    return Array.from(this.documents.values()).filter(d => d.applicationId === applicationId);
  }

  getDocumentById(id: string): DocumentRecord | undefined {
    return this.documents.get(id);
  }

  addDocument(doc: DocumentRecord): DocumentRecord {
    this.documents.set(doc.id, doc);
    const app = this.applications.get(doc.applicationId);
    if (app) {
      app.documentCount = this.getDocumentsByApplication(doc.applicationId).length;
      app.updatedAt = new Date().toISOString();
    }
    this.recordAudit({
      actorId: this.currentUser.id,
      actorName: this.currentUser.displayName,
      action: 'Document Uploaded',
      entityType: 'Document',
      entityReference: doc.originalFilename,
      note: `Type: ${doc.documentType}, Size: ${(doc.sizeBytes / 1024).toFixed(1)} KB`
    });
    return doc;
  }

  removeDocument(documentId: string): boolean {
    const doc = this.documents.get(documentId);
    if (!doc) return false;

    this.documents.delete(documentId);
    for (const [fId, f] of this.extractedFields.entries()) {
      if (f.documentId === documentId) {
        this.extractedFields.delete(fId);
      }
    }
    const app = this.applications.get(doc.applicationId);
    if (app) {
      app.documentCount = this.getDocumentsByApplication(doc.applicationId).length;
      app.updatedAt = new Date().toISOString();
    }
    this.recordAudit({
      actorId: this.currentUser.id,
      actorName: this.currentUser.displayName,
      action: 'Document Removed',
      entityType: 'Document',
      entityReference: doc.originalFilename,
      note: `Document detached from application docket`
    });
    return true;
  }

  getFieldsByDocument(documentId: string): ExtractedField[] {
    return Array.from(this.extractedFields.values()).filter(f => f.documentId === documentId);
  }

  getFieldsByApplication(applicationId: string): ExtractedField[] {
    return Array.from(this.extractedFields.values()).filter(f => f.applicationId === applicationId);
  }

  correctField(fieldId: string, correctedValue: string, note: string): ExtractedField | undefined {
    const field = this.extractedFields.get(fieldId);
    if (!field) return undefined;

    const previousValue = field.correctedValue || field.rawValue;
    field.isCorrected = true;
    field.correctedValue = correctedValue;
    field.normalizedValue = correctedValue;
    field.correctedBy = this.currentUser.displayName;
    field.correctedAt = new Date().toISOString();
    field.correctionNote = note;

    this.recordAudit({
      actorId: this.currentUser.id,
      actorName: this.currentUser.displayName,
      action: 'Extracted Field Corrected',
      entityType: 'ExtractedField',
      entityReference: field.fieldName,
      beforeValue: previousValue,
      afterValue: correctedValue,
      note: `Officer correction: ${note}`
    });

    this.runValidation(field.applicationId);
    return field;
  }

  getFindingsByApplication(applicationId: string): Finding[] {
    return Array.from(this.findings.values()).filter(f => f.applicationId === applicationId);
  }

  getAllFindings(): Finding[] {
    return Array.from(this.findings.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getFindingById(id: string): Finding | undefined {
    return this.findings.get(id);
  }

  recordReviewAction(
    findingId: string,
    action: ReviewAction['action'],
    newStatus: Finding['status'],
    note: string
  ): Finding | undefined {
    const finding = this.findings.get(findingId);
    if (!finding) return undefined;

    const previousStatus = finding.status;
    finding.status = newStatus;
    finding.reviewerDecisionReason = note;
    finding.assignedReviewer = this.currentUser.displayName;
    finding.updatedBy = this.currentUser.displayName;
    finding.updatedAt = new Date().toISOString();

    const reviewAction: ReviewAction = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      findingId,
      applicationId: finding.applicationId,
      reviewerId: this.currentUser.id,
      reviewerName: this.currentUser.displayName,
      action,
      previousStatus,
      newStatus,
      note,
      createdAt: new Date().toISOString()
    };
    this.reviewActions.push(reviewAction);

    const app = this.applications.get(finding.applicationId);
    if (app) {
      const appFindings = this.getFindingsByApplication(app.id);
      app.openFindingsCount = appFindings.filter(f => f.status === 'Open' || f.status === 'Under Review' || f.status === 'Unable to Determine').length;
      app.totalFindingsCount = appFindings.length;
      
      const hasConfirmed = appFindings.some(f => f.status === 'Confirmed');
      const allResolved = appFindings.every(f => f.status === 'Confirmed' || f.status === 'Dismissed' || f.status === 'Corrected');

      if (hasConfirmed) {
        app.reviewStatus = 'Discrepancies Confirmed';
      } else if (allResolved) {
        app.reviewStatus = 'Review Completed';
      } else {
        app.reviewStatus = 'Under Review';
      }
      app.updatedAt = new Date().toISOString();
    }

    this.recordAudit({
      actorId: this.currentUser.id,
      actorName: this.currentUser.displayName,
      action: `Finding ${action}`,
      entityType: 'Finding',
      entityReference: finding.reference,
      beforeValue: previousStatus,
      afterValue: newStatus,
      note: `Review decision: ${note}`
    });

    return finding;
  }

  getAllRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  updateRule(ruleId: string, updates: Partial<Rule>): Rule | undefined {
    const rule = this.rules.get(ruleId);
    if (!rule) return undefined;

    Object.assign(rule, updates);
    this.recordAudit({
      actorId: this.currentUser.id,
      actorName: this.currentUser.displayName,
      action: 'Rule Configuration Changed',
      entityType: 'Rule',
      entityReference: rule.ruleKey,
      note: `Rule ${rule.ruleKey} updated: ${updates.enabled !== undefined ? (updates.enabled ? 'Enabled' : 'Disabled') : 'Settings changed'}`
    });

    return rule;
  }

  runValidation(applicationId: string) {
    const app = this.applications.get(applicationId);
    if (!app) return null;

    app.status = 'Validating';
    const docs = this.getDocumentsByApplication(applicationId);
    const fields = this.getFieldsByApplication(applicationId);
    const rules = Array.from(this.rules.values());

    const result = evaluateApplicationRules(app, docs, fields, rules);

    const existingFindings = this.getFindingsByApplication(applicationId);
    const previousReviewsByRule = new Map<string, { status: Finding['status']; note?: string }>();
    for (const ef of existingFindings) {
      if (ef.status !== 'Open') {
        previousReviewsByRule.set(ef.ruleKey, { status: ef.status, note: ef.reviewerDecisionReason });
      }
      this.findings.delete(ef.id);
    }

    for (const f of result.findings) {
      const prev = previousReviewsByRule.get(f.ruleKey);
      if (prev) {
        f.status = prev.status;
        f.reviewerDecisionReason = prev.note;
      }
      this.findings.set(f.id, f);
    }

    app.openFindingsCount = result.findings.filter(f => f.status === 'Open' || f.status === 'Under Review' || f.status === 'Unable to Determine').length;
    app.totalFindingsCount = result.findings.length;
    app.status = 'Ready for Review';
    app.updatedAt = new Date().toISOString();

    this.recordAudit({
      actorId: 'system',
      actorName: 'Validation Engine (v1.2)',
      action: 'Validation Executed',
      entityType: 'Application',
      entityReference: app.referenceNumber,
      note: `Evaluated ${result.summary.total} rules: ${result.summary.passed} passed, ${result.summary.findings} findings raised.`
    });

    return result;
  }

  recordAudit(event: Omit<AuditEvent, 'id' | 'timestamp'>) {
    const fullEvent: AuditEvent = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...event
    };
    this.auditEvents.unshift(fullEvent);
  }

  getAuditEvents(): AuditEvent[] {
    return this.auditEvents;
  }

  getReviewActionsByApplication(applicationId: string): ReviewAction[] {
    return this.reviewActions.filter(r => r.applicationId === applicationId);
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
}

export const db = new ScrutinyDatabase();
