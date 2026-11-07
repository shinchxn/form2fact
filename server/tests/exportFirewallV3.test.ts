import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ScrutinyDatabase } from '../db.ts';
import { User, FiveClassLabel } from '../../src/types/index.ts';

function testAssert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✅ Passed: ${message}`);
}

async function runExportFirewallTests() {
  console.log('================================================================');
  console.log('   FORM2FACT V3 — 15 EXPORT FIREWALL GATES ACCEPTANCE TESTS');
  console.log('================================================================');

  const testDbPath = path.resolve(process.cwd(), 'data', `test_firewall_${Date.now()}.db`);
  const testOutPath = path.resolve(process.cwd(), 'ai_service/ml/data/v3/annotations', `test_firewall_export_${Date.now()}.jsonl`);
  const testManifestPath = path.resolve(process.cwd(), 'ai_service/ml/data/v3/manifests', `${path.basename(testOutPath, '.jsonl')}.manifest.json`);

  const db = new ScrutinyDatabase(testDbPath);

  let passed = 0;
  let total = 0;
  const runTest = (name: string, fn: () => void) => {
    total++;
    try {
      console.log(`\n--- TEST ${total}: ${name} ---`);
      fn();
      passed++;
    } catch (err: any) {
      console.error(`Test ${total} failed:`, err.message);
      throw err;
    }
  };

  const adminUser: User = {
    id: 'usr-admin-fw',
    email: 'admin_fw@form2fact.gov.in',
    displayName: 'Admin Auditor',
    role: 'Administrator',
    organizationId: 'org-aicte-western',
    department: 'Central Administration'
  };

  const annotator1: User = {
    id: 'usr-ann-fw-1',
    email: 'ann1_fw@form2fact.gov.in',
    displayName: 'Evaluator One',
    role: 'Annotator',
    organizationId: 'org-aicte-western',
    department: 'Western Directorate'
  };

  const annotator2: User = {
    id: 'usr-ann-fw-2',
    email: 'ann2_fw@form2fact.gov.in',
    displayName: 'Evaluator Two',
    role: 'Annotator',
    organizationId: 'org-aicte-western',
    department: 'Western Directorate'
  };

  const adjudicatorUser: User = {
    id: 'usr-adj-fw',
    email: 'adj_fw@form2fact.gov.in',
    displayName: 'Adjudicator Board Member',
    role: 'Adjudicator',
    organizationId: 'org-aicte-western',
    department: 'National Scrutiny Board'
  };

  // Insert users
  const insertUser = (u: User) => {
    (db as any).db.prepare(`
      INSERT OR REPLACE INTO users (id, displayName, email, passwordHash, role, department, organizationId, createdAt)
      VALUES (?, ?, ?, 'hash', ?, ?, ?, datetime('now'))
    `).run(u.id, u.displayName, u.email, u.role, u.department, u.organizationId);
  };
  insertUser(adminUser);
  insertUser(annotator1);
  insertUser(annotator2);
  insertUser(adjudicatorUser);

  // Authorize annotators and adjudicator
  db.authorizeReviewer(adminUser, {
    userId: annotator1.id,
    role: 'Annotator',
    organizationId: 'org-aicte-western',
    verifiedIdentityRef: 'GOV-IN-ID-FW-01',
    issuingAuthority: 'AICTE',
    authorizationReference: 'AUTH-FW-01'
  });
  db.authorizeReviewer(adminUser, {
    userId: annotator2.id,
    role: 'Annotator',
    organizationId: 'org-aicte-western',
    verifiedIdentityRef: 'GOV-IN-ID-FW-02',
    issuingAuthority: 'AICTE',
    authorizationReference: 'AUTH-FW-02'
  });
  db.authorizeReviewer(adminUser, {
    userId: adjudicatorUser.id,
    role: 'Adjudicator',
    organizationId: 'org-aicte-western',
    verifiedIdentityRef: 'GOV-IN-ID-FW-03',
    issuingAuthority: 'AICTE',
    authorizationReference: 'AUTH-FW-03'
  });

  // Create real temporary test documents on disk
  const testDocDir = path.resolve(process.cwd(), 'data', 'test_docs');
  fs.mkdirSync(testDocDir, { recursive: true });

  const dummyPdfContent1 = Buffer.from('%PDF-1.4 Application Statutory Docket Content for AICTE inspection');
  const docPath1 = path.join(testDocDir, 'statutory_application.pdf');
  fs.writeFileSync(docPath1, dummyPdfContent1);
  const hash1 = crypto.createHash('sha256').update(dummyPdfContent1).digest('hex');

  const dummyPdfContent2 = Buffer.from('%PDF-1.4 Registered Land Lease Deed Document valid 30 years');
  const docPath2 = path.join(testDocDir, 'lease_deed_compliant.pdf');
  fs.writeFileSync(docPath2, dummyPdfContent2);
  const hash2 = crypto.createHash('sha256').update(dummyPdfContent2).digest('hex');

  // Register verified institutional dockets
  const claimDocket = db.createInstitutionalDocket(adminUser, {
    docketNumber: `DKT-FW-CLAIM-${Date.now()}`,
    institutionId: 'inst-fw-001',
    institutionName: 'Bharati Vidyapeeth College of Engineering',
    sourceOrganization: 'AICTE Western Regional Office',
    authorizationReference: 'AICTE/WRO/SCRUTINY/2026/001',
    documentChecksum: hash1,
    documentPath: path.relative(process.cwd(), docPath1).replace(/\\/g, '/'),
    mimeType: 'application/pdf',
    sizeBytes: dummyPdfContent1.length,
    pageCount: 10,
    organizationId: 'org-aicte-western',
    provenanceStatus: 'PROVENANCE_VERIFIED',
    lifecycleState: 'PROVENANCE_VERIFIED'
  });

  const evidenceDocket = db.createInstitutionalDocket(adminUser, {
    docketNumber: `DKT-FW-EVID-${Date.now()}`,
    institutionId: 'inst-fw-001',
    institutionName: 'Bharati Vidyapeeth College of Engineering',
    sourceOrganization: 'Revenue Department Government of Maharashtra',
    authorizationReference: 'MAHA/REV/PUNE/LEASE-441',
    documentChecksum: hash2,
    documentPath: path.relative(process.cwd(), docPath2).replace(/\\/g, '/'),
    mimeType: 'application/pdf',
    sizeBytes: dummyPdfContent2.length,
    pageCount: 5,
    organizationId: 'org-aicte-western',
    provenanceStatus: 'PROVENANCE_VERIFIED',
    lifecycleState: 'PROVENANCE_VERIFIED'
  });

  // TEST 1: Gate 1 — Demo / Synthetic Candidate Rejection
  runTest('Gate 1: Rejection of demo fixtures and synthetic origin records', () => {
    const demoCand = db.createAnnotationRecord({
      institutionId: 'inst-fw-001',
      institutionName: 'Bharati Vidyapeeth',
      claimFieldName: 'land_area',
      claimText: '10 Acres',
      claimDocumentId: claimDocket.id,
      claimPage: 2,
      evidenceText: '10 Acres',
      evidenceDocumentId: evidenceDocket.id,
      evidencePage: 1,
      sourceProvenance: 'Illustrative Demo Fixture',
      isDemoCandidate: true
    });

    db.saveUserAnnotation(demoCand.id, annotator1, { label: 'MATCH', rationale: 'Verified against statutory form.', isDraft: false });
    db.saveUserAnnotation(demoCand.id, annotator2, { label: 'MATCH', rationale: 'Verified against lease deed.', isDraft: false });

    const exportRes = db.exportGoldStandard({ outPath: testOutPath });
    const isRejected = exportRes.rejectionReasons.some(r => r.recordId === demoCand.recordId && r.reasons.some(re => re.includes('demo')));
    testAssert(isRejected, 'Demo candidate strictly rejected by Gate 1');
  });

  // TEST 2: Gate 2 — Missing / Unidentifiable Source Document Rejection
  runTest('Gate 2: Rejection of records with missing source document citations', () => {
    const missingDocCand = db.createAnnotationRecord({
      institutionId: 'inst-fw-001',
      institutionName: 'Bharati Vidyapeeth',
      claimFieldName: 'land_area',
      claimText: '10 Acres',
      claimDocumentName: '', // Missing document
      claimPage: 1,
      evidenceText: '10 Acres',
      evidenceDocumentName: '', // Missing document
      evidencePage: 1,
      isDemoCandidate: false
    });

    db.saveUserAnnotation(missingDocCand.id, annotator1, { label: 'MATCH', rationale: 'Valid claim according to form.', isDraft: false });
    db.saveUserAnnotation(missingDocCand.id, annotator2, { label: 'MATCH', rationale: 'Valid claim according to form too.', isDraft: false });

    const exportRes = db.exportGoldStandard({ outPath: testOutPath });
    const isRejected = exportRes.rejectionReasons.some(r => r.recordId === missingDocCand.recordId && r.reasons.some(re => re.includes('identifiable source document')));
    testAssert(isRejected, 'Missing document candidate rejected by Gate 2');
  });

  // TEST 3: Gate 3 — Document Checksum Recalculation Failure Rejection
  runTest('Gate 3: Rejection when on-disk document SHA-256 does not match registered checksum', () => {
    // Create a docket pointing to a file with tampered hash registered
    const tamperedDocket = db.createInstitutionalDocket(adminUser, {
      docketNumber: `DKT-TAMPER-${Date.now()}`,
      institutionId: 'inst-fw-001',
      institutionName: 'Bharati Vidyapeeth',
      sourceOrganization: 'AICTE',
      authorizationReference: 'AUTH-TAMPER',
      documentChecksum: '0000000000000000000000000000000000000000000000000000000000000000', // False hash
      documentPath: path.relative(process.cwd(), docPath1).replace(/\\/g, '/'),
      mimeType: 'application/pdf',
      sizeBytes: dummyPdfContent1.length,
      pageCount: 10,
      provenanceStatus: 'PROVENANCE_VERIFIED'
    });

    const tamperedCand = db.createAnnotationRecord({
      institutionId: 'inst-fw-001',
      institutionName: 'Bharati Vidyapeeth',
      claimFieldName: 'land_area',
      claimText: '10 Acres',
      claimDocumentId: tamperedDocket.id,
      claimPage: 2,
      evidenceText: '10 Acres',
      evidenceDocumentId: evidenceDocket.id,
      evidencePage: 1,
      isDemoCandidate: false
    });

    db.saveUserAnnotation(tamperedCand.id, annotator1, { label: 'MATCH', rationale: 'Valid claim matches lease deed.', isDraft: false });
    db.saveUserAnnotation(tamperedCand.id, annotator2, { label: 'MATCH', rationale: 'Valid claim matches lease deed too.', isDraft: false });

    const exportRes = db.exportGoldStandard({ outPath: testOutPath });
    const isRejected = exportRes.rejectionReasons.some(r => r.recordId === tamperedCand.recordId && r.reasons.some(re => re.includes('checksum verification failed')));
    testAssert(isRejected, 'Tampered checksum strictly rejected by Gate 3');
  });

  // TEST 4: Gate 4 — Unverified Document Provenance Rejection
  runTest('Gate 4: Rejection when document provenance is PROVENANCE_PENDING', () => {
    const pendingDocket = db.createInstitutionalDocket(adminUser, {
      docketNumber: `DKT-PENDING-${Date.now()}`,
      institutionId: 'inst-fw-001',
      institutionName: 'Bharati Vidyapeeth',
      sourceOrganization: 'Unverified Third-party',
      authorizationReference: 'AUTH-PENDING',
      documentChecksum: hash1,
      documentPath: path.relative(process.cwd(), docPath1).replace(/\\/g, '/'),
      mimeType: 'application/pdf',
      sizeBytes: dummyPdfContent1.length,
      pageCount: 10,
      provenanceStatus: 'PROVENANCE_PENDING'
    });

    const pendingCand = db.createAnnotationRecord({
      institutionId: 'inst-fw-001',
      institutionName: 'Bharati Vidyapeeth',
      claimFieldName: 'land_area',
      claimText: '10 Acres',
      claimDocumentId: pendingDocket.id,
      claimPage: 2,
      evidenceText: '10 Acres',
      evidenceDocumentId: evidenceDocket.id,
      evidencePage: 1,
      isDemoCandidate: false
    });

    db.saveUserAnnotation(pendingCand.id, annotator1, { label: 'MATCH', rationale: 'Claim matches evidence document.', isDraft: false });
    db.saveUserAnnotation(pendingCand.id, annotator2, { label: 'MATCH', rationale: 'Claim matches evidence document too.', isDraft: false });

    const exportRes = db.exportGoldStandard({ outPath: testOutPath });
    const isRejected = exportRes.rejectionReasons.some(r => r.recordId === pendingCand.recordId && r.reasons.some(re => re.includes('PROVENANCE_PENDING')));
    testAssert(isRejected, 'PROVENANCE_PENDING document strictly rejected by Gate 4');
  });

  // TEST 5: Gate 5 — Cited Page Exceeds Document Page Count
  runTest('Gate 5: Rejection when cited page exceeds document total page count', () => {
    const pageExceededCand = db.createAnnotationRecord({
      institutionId: 'inst-fw-001',
      institutionName: 'Bharati Vidyapeeth',
      claimFieldName: 'land_area',
      claimText: '10 Acres',
      claimDocumentId: claimDocket.id,
      claimPage: 999, // claimDocket only has 10 pages
      evidenceText: '10 Acres',
      evidenceDocumentId: evidenceDocket.id,
      evidencePage: 1,
      isDemoCandidate: false
    });

    db.saveUserAnnotation(pageExceededCand.id, annotator1, { label: 'MATCH', rationale: 'Claim matches evidence document.', isDraft: false });
    db.saveUserAnnotation(pageExceededCand.id, annotator2, { label: 'MATCH', rationale: 'Claim matches evidence document too.', isDraft: false });

    const exportRes = db.exportGoldStandard({ outPath: testOutPath });
    const isRejected = exportRes.rejectionReasons.some(r => r.recordId === pageExceededCand.recordId && r.reasons.some(re => re.includes('exceeds document page count')));
    testAssert(isRejected, 'Out-of-bounds page citation strictly rejected by Gate 5');
  });

  // TEST 6: Gate 7 & 9 — Single Annotator / Insufficient Submissions Rejection
  runTest('Gate 7 & 9: Rejection of record reviewed by only a single annotator', () => {
    const singleCand = db.createAnnotationRecord({
      institutionId: 'inst-fw-001',
      institutionName: 'Bharati Vidyapeeth',
      claimFieldName: 'land_area',
      claimText: '10 Acres',
      claimDocumentId: claimDocket.id,
      claimPage: 2,
      evidenceText: '10 Acres',
      evidenceDocumentId: evidenceDocket.id,
      evidencePage: 1,
      isDemoCandidate: false
    });

    db.saveUserAnnotation(singleCand.id, annotator1, { label: 'MATCH', rationale: 'Single submission by annotator 1.', isDraft: false });
    // Attempt to set agreed without second annotator
    (db as any).db.prepare("UPDATE annotation_records SET status = 'agreed', finalLabel = 'MATCH' WHERE id = ?").run(singleCand.id);

    const exportRes = db.exportGoldStandard({ outPath: testOutPath });
    const isRejected = exportRes.rejectionReasons.some(r => r.recordId === singleCand.recordId && r.reasons.some(re => re.includes('Insufficient independent review')));
    testAssert(isRejected, 'Single annotator submission strictly rejected by Gate 7 & 9');
  });

  // TEST 7: Gate 11 & 12 — Adjudicator Independence & Conflict of Interest
  runTest('Gate 12: Rejection when adjudicator was also an evaluating annotator', () => {
    const conflictCand = db.createAnnotationRecord({
      institutionId: 'inst-fw-001',
      institutionName: 'Bharati Vidyapeeth',
      claimFieldName: 'land_area',
      claimText: '10 Acres',
      claimDocumentId: claimDocket.id,
      claimPage: 2,
      evidenceText: '5 Acres',
      evidenceDocumentId: evidenceDocket.id,
      evidencePage: 1,
      isDemoCandidate: false
    });

    db.saveUserAnnotation(conflictCand.id, annotator1, { label: 'MATCH', rationale: 'Evaluation by annotator 1.', isDraft: false });
    db.saveUserAnnotation(conflictCand.id, adjudicatorUser, { label: 'MISMATCH', rationale: 'Evaluation by adjudicator as annotator.', isDraft: false });

    // Force adjudication by same adjudicatorUser
    (db as any).db.prepare(`
      UPDATE annotation_records
      SET status = 'adjudicated',
          finalLabel = 'MISMATCH',
          adjudicatorId = ?,
          adjudicatorName = ?,
          adjudicationRationale = 'Binding resolution resolving conflict where adjudicator was annotator.'
      WHERE id = ?
    `).run(adjudicatorUser.id, adjudicatorUser.displayName, conflictCand.id);

    const exportRes = db.exportGoldStandard({ outPath: testOutPath });
    const isRejected = exportRes.rejectionReasons.some(r => r.recordId === conflictCand.recordId && r.reasons.some(re => re.includes('conflict of interest')));
    testAssert(isRejected, 'Adjudicator conflict of interest strictly rejected by Gate 12');
  });

  // TEST 8: Gate 15 — Quarantined Record Rejection
  runTest('Gate 15: Rejection of record or document under quarantine', () => {
    const quarantinedCand = db.createAnnotationRecord({
      institutionId: 'inst-fw-001',
      institutionName: 'Bharati Vidyapeeth',
      claimFieldName: 'land_area',
      claimText: '10 Acres',
      claimDocumentId: claimDocket.id,
      claimPage: 2,
      evidenceText: '10 Acres',
      evidenceDocumentId: evidenceDocket.id,
      evidencePage: 1,
      sourceProvenance: 'Quarantined Non-compliant Inspection Record',
      isDemoCandidate: false
    });

    db.saveUserAnnotation(quarantinedCand.id, annotator1, { label: 'MATCH', rationale: 'Evaluation by annotator 1.', isDraft: false });
    db.saveUserAnnotation(quarantinedCand.id, annotator2, { label: 'MATCH', rationale: 'Evaluation by annotator 2.', isDraft: false });

    const exportRes = db.exportGoldStandard({ outPath: testOutPath });
    const isRejected = exportRes.rejectionReasons.some(r => r.recordId === quarantinedCand.recordId && r.reasons.some(re => re.includes('QUARANTINED') || re.includes('quarantined')));
    testAssert(isRejected, 'Quarantined candidate strictly rejected by Gate 15');
  });

  // TEST 9: Full Acceptance — Valid Record Passing All 15 Gates
  runTest('Full Acceptance: Valid record passing all 15 firewall gates exports to canonical V3 dataset', () => {
    const validCand = db.createAnnotationRecord({
      institutionId: 'inst-fw-001',
      institutionName: 'Bharati Vidyapeeth College of Engineering',
      claimFieldName: 'land_area_acres',
      claimText: 'Campus Land Area: 10 Acres demarcated for educational institution.',
      claimDocumentId: claimDocket.id,
      claimPage: 3,
      evidenceText: 'Registered Lease Deed confirms 10 Acres demarcated for educational institution.',
      evidenceDocumentId: evidenceDocket.id,
      evidencePage: 2,
      evidenceLocation: 'Section 4, Page 2',
      fieldCategory: 'numeric_area',
      sourceProvenance: 'AICTE Western Regional Scrutiny Record 2025-26',
      licence: 'Public Regulatory Inspection Disclosure',
      isDemoCandidate: false,
      organizationId: 'org-aicte-western'
    });

    db.saveUserAnnotation(validCand.id, annotator1, {
      label: 'MATCH',
      rationale: 'Statutory filing on Page 3 declares 10 Acres matching lease deed Page 2.',
      isDraft: false
    });
    db.saveUserAnnotation(validCand.id, annotator2, {
      label: 'MATCH',
      rationale: 'Independent verification confirms 10 Acres declared vs registered deed.',
      isDraft: false
    });

    const exportRes = db.exportGoldStandard({ outPath: testOutPath });
    testAssert(exportRes.count >= 1, `Valid record exported successfully (count: ${exportRes.count})`);

    const jsonlContent = fs.readFileSync(exportRes.outPath, 'utf-8').trim();
    const records = jsonlContent.split('\n').map(l => JSON.parse(l));
    const exportedRecord = records.find(r => r.record_id === `gold-${validCand.recordId}`);

    testAssert(Boolean(exportedRecord), 'Exported JSONL contains valid candidate record');
    testAssert(exportedRecord.schema_version === '3.0', 'Schema version is 3.0');
    testAssert(exportedRecord.quality.is_synthetic === false, 'Quality is_synthetic is false');
    testAssert(exportedRecord.quality.is_human_annotated === true, 'Quality is_human_annotated is true');
    testAssert(exportedRecord.comparison.label === 'MATCH', 'Comparison label is MATCH');

    // Manifest verification
    const manifestContent = JSON.parse(fs.readFileSync(exportRes.manifestPath, 'utf-8'));
    testAssert(manifestContent.record_count === exportRes.count, 'Manifest record count matches export count');
    testAssert(manifestContent.quality_invariants.fifteen_firewall_gates_enforced === true, 'Manifest certifies 15 firewall gates enforced');
    testAssert(manifestContent.quality_invariants.ledger_hash_chain_verified === true, 'Manifest certifies ledger hash chain verified');
  });

  // Cleanup test files
  (db as any).db.close();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  if (fs.existsSync(testOutPath)) fs.unlinkSync(testOutPath);
  if (fs.existsSync(testManifestPath)) fs.unlinkSync(testManifestPath);
  if (fs.existsSync(docPath1)) fs.unlinkSync(docPath1);
  if (fs.existsSync(docPath2)) fs.unlinkSync(docPath2);
  if (fs.existsSync(testDocDir)) fs.rmdirSync(testDocDir);

  console.log(`\n================================================================`);
  console.log(`   EXPORT FIREWALL RESULTS: ${passed}/${total} TEST SUITES PASSED`);
  console.log(`================================================================`);
}

runExportFirewallTests().catch(err => {
  console.error('Fatal export firewall test error:', err);
  process.exit(1);
});
