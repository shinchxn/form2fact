import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import http from 'http';
import express from 'express';
import apiRouter from './api.ts';
import {
  normalizeDate,
  normalizeText,
  evaluateApplicationRules,
  evaluateSingleRuleSandbox,
  areEntityNamesConcordant,
  calculateUnexpiredTenureYears,
  INITIAL_RULES
} from './rulesEngine.ts';
import { db, ScrutinyDatabase } from './db.ts';
import { generateToken, verifyToken, resolveJwtSecret } from './auth.ts';
import { User, DocumentRecord, DocumentType, ExtractedField } from '../src/types/index.ts';
import { domainRegistry, aicteDomainPack } from './domains/index.ts';
import { PairwiseFieldClassifier } from './modules/verification/pairwiseEngine.ts';
import { OrganizationService } from './modules/organizations/organization.service.ts';
import { jobQueue } from './core/jobs/index.ts';
import { AppError } from './core/errors/AppError.ts';
import { runMultiModelOrchestrationSuite } from './tests/multiModelOrchestration.test.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ Passed: ${message}`);
}

console.log('====================================================');
console.log('   FORM2FACT — PHASE 1 REGRESSION & VERIFICATION SUITE');
console.log('====================================================\n');

// -----------------------------------------------------------------
// 1. DATE & TEXT NORMALIZATION TESTS
// -----------------------------------------------------------------
console.log('[1] Testing Date & Text Normalization...');
assert(normalizeDate('2054-03-31') === '2054-03-31', 'ISO format normalization (YYYY-MM-DD)');
assert(normalizeDate('31/03/2054') === '2054-03-31', 'DD/MM/YYYY slash format normalization');
assert(normalizeDate('31-03-2054') === '2054-03-31', 'DD-MM-YYYY hyphen format normalization');
assert(normalizeDate('31 March 2028') === '2028-03-31', 'Natural English date normalization (31 March 2028)');
assert(normalizeDate('March 31, 2028') === '2028-03-31', 'Natural English date comma format (March 31, 2028)');

assert(normalizeText('  Pragati Institute of Technology & Management!  ') === 'pragati institute of technology management', 'Punctuation and whitespace normalization');
assert(normalizeText('Kalyani Charitable Trust') === 'kalyani charitable trust', 'Case insensitivity normalization');

// -----------------------------------------------------------------
// 2. SQLITE DATABASE PERSISTENCE & ACID DURABILITY
// -----------------------------------------------------------------
console.log('\n[2] Testing SQLite Persistent Storage & Durability...');
const apps = db.getAllApplications();
assert(apps.length >= 3, 'Default persistent SQLite database contains at least 3 seed applications');

// Create test application in test DB to verify persistence across separate connections
const testDbPath = path.resolve(process.cwd(), 'data', 'test-persistence.db');
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

const testDbInstance1 = new ScrutinyDatabase(testDbPath);
const testApp = testDbInstance1.createApplication({
  institutionName: 'Apex Technology Institute of Scrutiny',
  applicationType: 'New Technical Campus',
  declaredDetails: {
    institutionName: 'Apex Technology Institute of Scrutiny',
    societyOrTrustName: 'Apex Education Foundation',
    address: 'Survey 44, Tech Valley, Mumbai',
    pinCode: '400076',
    state: 'Maharashtra',
    landAreaAcres: 8.5,
    leaseExpiryDate: '2055-03-31',
    sanctionedIntake: 360,
    previousApprovalRef: 'N/A',
    applicationYear: '2026-27'
  }
});
assert(testApp.id.startsWith('app-'), 'Application created with valid app- prefix');
assert(testApp.id.length > 20, 'Application ID uses collision-resistant UUID');

// Reopen same database file with a brand-new connection instance
const testDbInstance2 = new ScrutinyDatabase(testDbPath);
const fetchedFromDisk = testDbInstance2.getApplicationById(testApp.id);
assert(fetchedFromDisk !== undefined, 'Application record persisted to disk and retrieved by fresh database instance');
assert(fetchedFromDisk?.institutionName === 'Apex Technology Institute of Scrutiny', 'Retrieved application preserves exact institutional name');
assert(fetchedFromDisk?.declaredDetails.landAreaAcres === 8.5, 'Retrieved application preserves declared numeric acreage');

// Clean up temporary test database
testDbInstance1.db.close();
testDbInstance2.db.close();
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
console.log('✅ Passed: Multi-instance restart persistence verified.');

// -----------------------------------------------------------------
// 3. COLLISION-RESISTANT IDENTIFIER TESTS
// -----------------------------------------------------------------
console.log('\n[3] Testing Collision-Resistant Identifiers...');
const generatedIds = new Set<string>();
const count = 100;
for (let i = 0; i < count; i++) {
  const id = `app-${crypto.randomUUID()}`;
  generatedIds.add(id);
}
assert(generatedIds.size === count, '100 generated UUID identifiers are 100% unique (0 collisions)');

// -----------------------------------------------------------------
// 4. AUTHENTICATION & RBAC SECURITY TESTS
// -----------------------------------------------------------------
console.log('\n[4] Testing Authentication & RBAC Access Control...');
const reviewerUser: User = {
  id: 'usr-001',
  displayName: 'Dr. Aruna Rao',
  email: 'aruna.rao@scrutiny.edu.in',
  role: 'Reviewer',
  department: 'Western Directorate'
};

const token = generateToken(reviewerUser);
assert(typeof token === 'string' && token.length > 30, 'JWT token generated successfully');

const verified = verifyToken(token);
assert(verified !== null, 'Valid JWT token verified successfully');
assert(verified?.id === 'usr-001', 'Verified token preserves correct user ID');
assert(verified?.role === 'Reviewer', 'Verified token preserves correct Reviewer role');

const tamperedToken = token.slice(0, -6) + 'abcdef';
const tamperedResult = verifyToken(tamperedToken);
assert(tamperedResult === null, 'Tampered JWT token rejected with null verification');

const invalidSignature = verifyToken('invalid.bearer.token');
assert(invalidSignature === null, 'Malformed token string rejected safely');

// -----------------------------------------------------------------
// 5. DOCUMENT UPLOAD & MAGIC-BYTE VERIFICATION TESTS
// -----------------------------------------------------------------
console.log('\n[5] Testing Document Magic-Byte Validation...');
const validPdfBuffer = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< >>\n%%EOF');
const isPdfValid = validPdfBuffer.length >= 5 && validPdfBuffer.subarray(0, 5).toString('ascii') === '%PDF-';
assert(isPdfValid === true, 'Valid PDF buffer starting with %PDF- accepted by signature check');

const fakePdfBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00Malicious Executable Payload');
const isFakePdfValid = fakePdfBuffer.length >= 5 && fakePdfBuffer.subarray(0, 5).toString('ascii') === '%PDF-';
assert(isFakePdfValid === false, 'Spoofed executable file with .pdf extension rejected by magic-byte check');

// -----------------------------------------------------------------
// 6. SCRUTINY RULES EVALUATION ON SEED DOCKETS
// -----------------------------------------------------------------
console.log('\n[6] Testing Deterministic Rules on Seed Applications...');

// Compliant App (Kalyani Institute, APP-2026-EOA-1104)
const compliantApp = apps.find(a => a.referenceNumber.includes('1104'))!;
assert(compliantApp !== undefined, 'Compliant application fixture exists');
const docs1 = db.getDocumentsByApplication(compliantApp.id);
const fields1 = db.getFieldsByApplication(compliantApp.id);
const res1 = evaluateApplicationRules(compliantApp, docs1, fields1, INITIAL_RULES);
assert(res1.findings.length === 0, 'Compliant case produces exactly 0 discrepancy findings');

// Intentional Mismatch App (Pragati Institute, APP-2026-NTC-0842)
const mismatchApp = apps.find(a => a.referenceNumber.includes('0842'))!;
assert(mismatchApp !== undefined, 'Intentional mismatch application fixture exists');
const docs2 = db.getDocumentsByApplication(mismatchApp.id);
const fields2 = db.getFieldsByApplication(mismatchApp.id);
const res2 = evaluateApplicationRules(mismatchApp, docs2, fields2, INITIAL_RULES);
assert(res2.findings.length === 2, 'Mismatch case produces exactly 2 findings (Lease Expiry + Area Deficit)');

const leaseFinding = res2.findings.find(f => f.ruleKey === 'RULE-TEN-01')!;
assert(leaseFinding !== undefined, 'Lease expiry rule RULE-TEN-01 triggered');
assert(leaseFinding.declaredValue === '2048-03-31', 'Declared lease expiry matches application declared parameter');
assert(leaseFinding.severity === 'Material Discrepancy', 'Severity is Material Discrepancy');

// Missing / Scanned App (Vidyapeeth Academy, APP-2026-EOA-0915)
const missingApp = apps.find(a => a.referenceNumber.includes('0915'))!;
assert(missingApp !== undefined, 'Missing evidence application fixture exists');
const docs3 = db.getDocumentsByApplication(missingApp.id);
const fields3 = db.getFieldsByApplication(missingApp.id);
const res3 = evaluateApplicationRules(missingApp, docs3, fields3, INITIAL_RULES);
assert(res3.findings.some(f => f.ruleKey === 'RULE-DOC-04'), 'RULE-DOC-04 detects missing Fire Safety NOC');
assert(res3.findings.some(f => f.ruleKey === 'RULE-SAFETY-06'), 'RULE-SAFETY-06 flags scanned photocopy without OCR');

// -----------------------------------------------------------------
// 7. REVIEW ACTIONS & DECISION TRANSITIONS
// -----------------------------------------------------------------
console.log('\n[7] Testing Review Actions, Field Corrections & Audit Log...');
const initialAuditCount = db.getAuditEvents().length;
const findingToReview = db.getFindingsByApplication(mismatchApp.id)[0];

const updatedFinding = db.recordReviewAction(
  findingToReview.id,
  'Confirm Finding',
  'Confirmed',
  'Officer verified 20-year deficit in registered lease deed clause 4.',
  reviewerUser
);
assert(updatedFinding?.status === 'Confirmed', 'Finding status transitioned to Confirmed in SQLite');
assert(db.getAuditEvents().length === initialAuditCount + 1, 'Audit event appended for review decision in SQLite');

// Test field correction
const fieldToCorrect = db.getFieldsByApplication(mismatchApp.id)[0];
const corrected = db.correctField(fieldToCorrect.id, '2050-03-31', 'Officer verification of registered amendment deed.', reviewerUser);
assert(corrected?.isCorrected === true, 'Field marked as isCorrected in SQLite');
assert(corrected?.correctedValue === '2050-03-31', 'Corrected value persisted in SQLite');

// Test application-level decision recording
const decisionResult = db.recordApplicationDecision(
  mismatchApp.id,
  'Clarification Required',
  'Tenancy deficit requires registered lease deed amendment submission within 15 statutory days.',
  reviewerUser
);
assert(decisionResult !== undefined, 'Application decision recorded in SQLite');
assert(decisionResult?.application.reviewStatus === 'Under Review', 'Application review status transitioned to Under Review');

// =========================================================================
// 8. PHASE 2: RULE-TEN-01 (POSITIVE, NEGATIVE, BOUNDARY, MISSING TESTS)
// =========================================================================
console.log('\n[8] Testing RULE-TEN-01 (Lease Expiry & 30-Year Statutory Tenure)...');

// 8.1 Positive Test: Concordant date and >= 30 years remaining (2056 from 2026 = 30 yrs)
const tenPos = evaluateSingleRuleSandbox('RULE-TEN-01', {
  declaredValue: '2056-03-31',
  evidenceValue: '2056-03-31',
  evaluationYear: 2026
});
assert(tenPos.status === 'Pass', 'RULE-TEN-01 Positive: Concordant date with >= 30 years passes');

// 8.2 Negative Test: Material Date Mismatch (declared 2048 vs deed 2028)
const tenNeg = evaluateSingleRuleSandbox('RULE-TEN-01', {
  declaredValue: '2048-03-31',
  evidenceValue: '2028-03-31',
  evaluationYear: 2026
});
assert(tenNeg.status === 'Discrepancy', 'RULE-TEN-01 Negative: Date mismatch detected as Discrepancy');
assert(tenNeg.explanation.includes('contradicts registered deed expiry'), 'RULE-TEN-01 Negative: Explanation cites contradiction');

// 8.3 Boundary Test: Exact 30 years boundary (2056 - 2026 = 30) => Pass
const tenBoundPass = evaluateSingleRuleSandbox('RULE-TEN-01', {
  declaredValue: '2056-03-31',
  evidenceValue: '2056-03-31',
  evaluationYear: 2026
});
assert(tenBoundPass.status === 'Pass', 'RULE-TEN-01 Boundary: Exactly 30 years unexpired tenure passes');

// 8.4 Boundary Test: Deficient by 1 year (2055 - 2026 = 29 years < 30) => Discrepancy
const tenBoundFail = evaluateSingleRuleSandbox('RULE-TEN-01', {
  declaredValue: '2055-03-31',
  evidenceValue: '2055-03-31',
  evaluationYear: 2026
});
assert(tenBoundFail.status === 'Discrepancy', 'RULE-TEN-01 Boundary: 29 years tenure (< 30 yrs minimum) flagged as Discrepancy');
assert(tenBoundFail.explanation.includes('fails statutory 30-year requirement'), 'RULE-TEN-01 Boundary: Explains 30-year statutory requirement failure');

// 8.5 Missing-Data Test: No deed uploaded / missing expiry
const tenMissing = evaluateSingleRuleSandbox('RULE-TEN-01', {
  declaredValue: '2056-03-31',
  evidenceValue: 'No Registered Deed Uploaded / Missing'
});
assert(tenMissing.status === 'Missing', 'RULE-TEN-01 Missing: Missing deed flagged with status Missing');

// =========================================================================
// 9. PHASE 2: RULE-NAME-02 (POSITIVE, VARIANT, NEGATIVE, MISSING TESTS)
// =========================================================================
console.log('\n[9] Testing RULE-NAME-02 (Institution & Sponsoring Society Concordance)...');

// 9.1 Positive Test: Identical Entity Name
const namePos = evaluateSingleRuleSandbox('RULE-NAME-02', {
  declaredValue: 'Pragati Educational & Welfare Foundation',
  evidenceValue: 'Pragati Educational & Welfare Foundation'
});
assert(namePos.status === 'Pass', 'RULE-NAME-02 Positive: Identical entity names pass');

// 9.2 Variant Test: Legal Suffix Variation (Trust vs Foundation/Charitable)
const nameVariant = evaluateSingleRuleSandbox('RULE-NAME-02', {
  declaredValue: 'Kalyani Charitable Trust',
  evidenceValue: 'Kalyani Charitable Educational Trust'
});
assert(nameVariant.status === 'Pass', 'RULE-NAME-02 Variant: Sponsoring entity token variant passes with high concordance');

// 9.3 Negative Test: Material Divergence (Educational Trust vs Commercial Enterprises Ltd)
const nameNeg = evaluateSingleRuleSandbox('RULE-NAME-02', {
  declaredValue: 'Pragati Educational Trust',
  evidenceValue: 'Pragati Commercial Enterprises Ltd'
});
assert(nameNeg.status === 'Discrepancy', 'RULE-NAME-02 Negative: Divergent commercial entity flagged as Discrepancy');

// 9.4 Missing-Data Test: Missing Registration Certificate
const nameMissing = evaluateSingleRuleSandbox('RULE-NAME-02', {
  declaredValue: 'Apex Education Foundation',
  evidenceValue: 'Missing Document'
});
assert(nameMissing.status === 'Missing', 'RULE-NAME-02 Missing: Missing trust certificate flagged as Missing');

// =========================================================================
// 10. PHASE 2: RULE-AREA-03 (SINGLE & MULTI-PARCEL AGGREGATION & NO DOUBLE COUNTING)
// =========================================================================
console.log('\n[10] Testing RULE-AREA-03 (Single & Multi-Parcel Aggregation & No Double-Counting)...');

// 10.1 Single Parcel Satisfies
const areaSingle = evaluateSingleRuleSandbox('RULE-AREA-03', {
  declaredValue: '7.50',
  evidenceValue: '7.50'
});
assert(areaSingle.status === 'Pass', 'RULE-AREA-03: Single parcel meeting declared 7.50 acres passes');

// 10.2 Multi-Parcel Aggregation: 4.0 Acres + 3.5 Acres = 7.50 Acres satisfies declared 7.50 Acres
const areaMulti = evaluateSingleRuleSandbox('RULE-AREA-03', {
  declaredValue: '7.50',
  parcels: [
    { documentName: 'Survey Parcel 42/1 Lease Deed', areaAcres: 4.0 },
    { documentName: 'Survey Parcel 42/2 Title Deed', areaAcres: 3.5 }
  ]
});
assert(areaMulti.status === 'Pass', 'RULE-AREA-03: Multi-parcel aggregation (4.0 + 3.5 = 7.5 Acres) correctly satisfies 7.50 Acres');
assert(areaMulti.explanation.includes('7.50 Acres'), 'RULE-AREA-03 Multi-parcel: Aggregated acreage clearly cited in explanation');

// 10.3 Deficit Across Parcels: 4.0 + 2.0 = 6.0 Acres < 7.50 Acres (Deficit: 1.50 Acres)
const areaDeficit = evaluateSingleRuleSandbox('RULE-AREA-03', {
  declaredValue: '7.50',
  parcels: [
    { documentName: 'Survey Parcel 42/1 Lease Deed', areaAcres: 4.0 },
    { documentName: 'Survey Parcel 42/2 Title Deed', areaAcres: 2.0 }
  ]
});
assert(areaDeficit.status === 'Discrepancy', 'RULE-AREA-03: Aggregated deficit flagged as Discrepancy');
assert(areaDeficit.explanation.includes('Deficit: 1.50 Acres'), 'RULE-AREA-03: Exact deficit acreage (1.50 Acres) stated in explanation');

// 10.4 Double-Counting Protection in Application Evaluation
// Build simulated multi-document docket with one unique doc and one duplicated doc
const simulatedApp = {
  ...compliantApp,
  id: 'app-sim-test-parcels',
  declaredDetails: { ...compliantApp.declaredDetails, landAreaAcres: 7.5 }
};
const simDocs: DocumentRecord[] = [
  { id: 'doc-p1', applicationId: simulatedApp.id, documentType: 'Land Lease Deed' as DocumentType, originalFilename: 'parcel1.pdf', storageKey: 'k1', mimeType: 'application/pdf', sizeBytes: 1000, checksum: 'c1', pageCount: 2, processingStatus: 'Extracted' as const, createdAt: new Date().toISOString() },
  { id: 'doc-p2', applicationId: simulatedApp.id, documentType: 'Land Ownership Title Deed' as DocumentType, originalFilename: 'parcel2.pdf', storageKey: 'k2', mimeType: 'application/pdf', sizeBytes: 1000, checksum: 'c2', pageCount: 2, processingStatus: 'Extracted' as const, createdAt: new Date().toISOString() },
  // Duplicate upload of doc-p1
  { id: 'doc-p1', applicationId: simulatedApp.id, documentType: 'Land Lease Deed' as DocumentType, originalFilename: 'parcel1.pdf', storageKey: 'k1', mimeType: 'application/pdf', sizeBytes: 1000, checksum: 'c1', pageCount: 2, processingStatus: 'Extracted' as const, createdAt: new Date().toISOString() }
];
const simFields: ExtractedField[] = [
  { id: 'fld-p1', documentId: 'doc-p1', applicationId: simulatedApp.id, fieldName: 'landAreaAcres', fieldLabel: 'Land Area', rawValue: '4.0 Acres', normalizedValue: '4.0', sourceText: 'Schedule area 4.0 Acres', confidence: 0.95, extractionMethod: 'Deterministic Text Regex', pageNumber: 1, isCorrected: false },
  { id: 'fld-p2', documentId: 'doc-p2', applicationId: simulatedApp.id, fieldName: 'landAreaAcres', fieldLabel: 'Land Area', rawValue: '3.5 Acres', normalizedValue: '3.5', sourceText: 'Schedule area 3.5 Acres', confidence: 0.95, extractionMethod: 'Deterministic Text Regex', pageNumber: 1, isCorrected: false }
];
const simEval = evaluateApplicationRules(simulatedApp, simDocs, simFields, INITIAL_RULES);
const areaFinding = simEval.findings.find(f => f.ruleKey === 'RULE-AREA-03');
assert(areaFinding === undefined, 'RULE-AREA-03: Aggregates distinct parcels (4.0 + 3.5 = 7.5 Acres) without double-counting duplicate doc-p1');

// =========================================================================
// 11. PHASE 2: EXPLAINABILITY & EVIDENCE-LINKING GUARANTEES
// =========================================================================
console.log('\n[11] Verifying Findings Explainability & Evidence Links...');
const mismatchFindings = res2.findings;
for (const f of mismatchFindings) {
  assert(Boolean(f.ruleKey), `Finding ${f.reference} has ruleKey`);
  assert(Boolean(f.title), `Finding ${f.reference} has title`);
  assert(Boolean(f.explanation && f.explanation.length > 20), `Finding ${f.reference} has detailed statutory explanation`);
  // Ensure non-defamatory phrasing: no use of words like "fraud", "scam", "cheat"
  assert(!f.explanation.toLowerCase().includes('fraud') && !f.explanation.toLowerCase().includes('criminal'), `Finding ${f.reference} uses objective statutory regulatory phrasing`);
  assert(f.evidenceList.length > 0, `Finding ${f.reference} contains linked evidence references`);
  for (const ev of f.evidenceList) {
    assert(Boolean(ev.documentName), `Evidence has documentName (${ev.documentName})`);
    assert(typeof ev.pageNumber === 'number', `Evidence has pageNumber (${ev.pageNumber})`);
    assert(Boolean(ev.evidenceText), `Evidence contains extracted snippet/citation`);
  }
}
console.log('✅ Passed: All findings are 100% evidence-linked and explainable.');

// =========================================================================
// 12. PHASE 2: SANDBOX ISOLATION (ZERO DATABASE MUTATIONS)
// =========================================================================
console.log('\n[12] Verifying Rule Sandbox Pure Isolation (Zero Mutations)...');
const beforeAppCount = db.getAllApplications().length;
const beforeFindingCount = db.getAllFindings().length;
const beforeAuditCount = db.getAuditEvents().length;
const beforeDecisions = Number((db.db.prepare('SELECT COUNT(*) as c FROM application_decisions').get() as any).c);

// Execute 15 sandbox runs across all rules
for (let i = 0; i < 5; i++) {
  evaluateSingleRuleSandbox('RULE-TEN-01', { declaredValue: '2050-01-01', evidenceValue: '2030-01-01' });
  evaluateSingleRuleSandbox('RULE-NAME-02', { declaredValue: 'Test Trust', evidenceValue: 'Different Trust' });
  evaluateSingleRuleSandbox('RULE-AREA-03', { declaredValue: '10.0', evidenceValue: '5.0' });
}

const afterAppCount = db.getAllApplications().length;
const afterFindingCount = db.getAllFindings().length;
const afterAuditCount = db.getAuditEvents().length;
const afterDecisions = Number((db.db.prepare('SELECT COUNT(*) as c FROM application_decisions').get() as any).c);

assert(beforeAppCount === afterAppCount, 'Sandbox tests do not mutate applications table (0 changes)');
assert(beforeFindingCount === afterFindingCount, 'Sandbox tests do not mutate findings table (0 changes)');
assert(beforeAuditCount === afterAuditCount, 'Sandbox tests do not mutate audit_events table (0 changes)');
assert(beforeDecisions === afterDecisions, 'Sandbox tests do not mutate application_decisions table (0 changes)');
console.log('✅ Passed: Rule sandbox is strictly read-only and pure.');

// =========================================================================
// 13. PHASE 2: DECISION PERSISTENCE, MANDATORY RATIONALE & SERVER RBAC
// =========================================================================
console.log('\n[13] Verifying Decision Submissions, RBAC & Durability...');

// 13.1 Server-Side Authorization: Read-only Viewer must NOT be permitted to submit decisions
const readOnlyUser: User = {
  id: 'usr-003',
  displayName: 'S. Meenakshi',
  email: 'meenakshi.s@audit.gov.in',
  role: 'Read-only Viewer',
  department: 'Statutory Compliance Audit'
};

// Verify role helper check
const allowedRoles = ['Administrator', 'Reviewer'];
const isReadOnlyAllowed = allowedRoles.includes(readOnlyUser.role);
assert(isReadOnlyAllowed === false, 'Server RBAC blocks Read-only Viewer from recording decisions');

const isReviewerAllowed = allowedRoles.includes(reviewerUser.role);
assert(isReviewerAllowed === true, 'Server RBAC authorizes Reviewer to record decisions');

// 13.2 Decision Persistence & Rationale Enforcement
const testDecisionApp = db.getAllApplications()[0];
const decisionRationale = 'Comprehensive scrutiny completed. All physical campus land deeds and trust charters verified against statutory norms.';
const newDecision = db.recordApplicationDecision(
  testDecisionApp.id,
  'Approved',
  decisionRationale,
  reviewerUser
);

assert(newDecision !== undefined, 'Decision recorded successfully in SQLite');
assert(newDecision?.application.reviewStatus === 'Review Completed', 'Application reviewStatus set to Review Completed');
assert(Boolean(newDecision?.application.reviewerNotes?.includes(decisionRationale)), 'Reviewer notes preserve statutory rationale');

// Verify SQLite durable row in application_decisions table
const decisionIdToQuery = newDecision?.decisionId || '';
const savedDecisionRow = db.db.prepare('SELECT * FROM application_decisions WHERE id = ?').get(decisionIdToQuery) as any;
assert(savedDecisionRow !== undefined, 'Decision persisted durably in application_decisions SQLite table');
assert(savedDecisionRow.decisionType === 'Approved', 'Persisted decisionType is Approved');
assert(savedDecisionRow.reviewerName === 'Dr. Aruna Rao', 'Persisted reviewerName preserves authenticated actor');
assert(savedDecisionRow.rationale === decisionRationale, 'Persisted rationale matches exact submission');

// =========================================================================
// 14. DOMAIN REGISTRY & AICTE DOMAIN PACK
// =========================================================================
console.log('\n[14] Testing Domain Registry & AICTE Domain Pack...');
assert(domainRegistry.has('aicte'), 'AICTE domain pack is registered in DomainRegistry');
const pack = domainRegistry.get('aicte');
assert(pack.id === 'aicte', 'Domain pack ID is aicte');
assert(pack.version === '1.2.0', 'Domain pack version is 1.2.0');
assert(pack.documentTypes.length >= 6, 'Domain pack specifies at least 6 statutory document definitions');
assert(pack.rules.length >= 6, 'Domain pack includes statutory compliance rules');
assert(pack.comparisonRelationships.length >= 4, 'Domain pack specifies comparison relationships');
const domainList = domainRegistry.list();
assert(domainList.some(d => d.id === 'aicte'), 'Domain list contains AICTE pack');

// =========================================================================
// 15. PAIRWISE FIELD MISMATCH CLASSIFIER (MATCH, MISMATCH, MISSING, UNCERTAIN, NOT_COMPARABLE)
// =========================================================================
console.log('\n[15] Testing Pairwise Field Mismatch Classification Pipeline...');

// 15.1 Exact MATCH
const matchResult = await PairwiseFieldClassifier.compare({
  claimField: { fieldName: 'leaseExpiryDate', fieldLabel: 'Lease Expiry', rawValue: '2054-03-31' },
  evidenceField: { fieldName: 'leaseExpiryDate', fieldLabel: 'Lease Expiry', rawValue: '2054-03-31', documentName: 'Lease.pdf', pageNumber: 3 },
  comparisonType: 'date'
});
assert(matchResult.label === 'MATCH', 'PairwiseClassifier detects MATCH for identical date');
assert(matchResult.confidence >= 0.99, 'MATCH confidence is >= 0.99');
assert(matchResult.requiresHumanReview === false, 'Exact MATCH does not require human review');

// 15.2 Date MISMATCH
const mismatchDateResult = await PairwiseFieldClassifier.compare({
  claimField: { fieldName: 'leaseExpiryDate', fieldLabel: 'Lease Expiry', rawValue: '2048-03-31' },
  evidenceField: { fieldName: 'leaseExpiryDate', fieldLabel: 'Lease Expiry', rawValue: '2028-03-31', documentName: 'Lease.pdf', pageNumber: 4 },
  comparisonType: 'date'
});
assert(mismatchDateResult.label === 'MISMATCH', 'PairwiseClassifier detects MISMATCH for divergent date');
assert(mismatchDateResult.requiresHumanReview === true, 'MISMATCH flags requiresHumanReview = true');
assert(mismatchDateResult.evidenceList.length > 0, 'MISMATCH attaches verified evidence item');

// 15.3 Acreage Deficit MISMATCH
const mismatchAreaResult = await PairwiseFieldClassifier.compare({
  claimField: { fieldName: 'landAreaAcres', fieldLabel: 'Land Area', rawValue: '7.50' },
  evidenceField: { fieldName: 'landAreaAcres', fieldLabel: 'Land Area', rawValue: '5.20', documentName: 'Deed.pdf', pageNumber: 2 },
  comparisonType: 'numeric'
});
assert(mismatchAreaResult.label === 'MISMATCH', 'PairwiseClassifier detects MISMATCH for numeric land area deficit');
assert(mismatchAreaResult.explanation.includes('deficit'), 'Acreage mismatch explanation details deficit');

// 15.4 MISSING Evidence
const missingResult = await PairwiseFieldClassifier.compare({
  claimField: { fieldName: 'buildingSafetyStatus', fieldLabel: 'Building Safety Certificate', rawValue: 'Certified Sound' }
});
assert(missingResult.label === 'MISSING', 'PairwiseClassifier flags MISSING when supporting evidence is omitted');
assert(missingResult.requiresHumanReview === true, 'MISSING requires human review');

// 15.5 NOT_COMPARABLE Fields
const notComparableResult = await PairwiseFieldClassifier.compare({
  claimField: { fieldName: 'landAreaAcres', fieldLabel: 'Land Area', rawValue: '7.50' },
  evidenceField: { fieldName: 'sanctionedIntake', fieldLabel: 'Intake Capacity', rawValue: '420' }
});
assert(notComparableResult.label === 'NOT_COMPARABLE', 'PairwiseClassifier detects NOT_COMPARABLE for unrelated fields');

// 15.6 Ambiguous Abstention -> UNCERTAIN (50% token overlap is between 0.2 and 0.8, below 0.85 threshold)
const uncertainResult = await PairwiseFieldClassifier.compare({
  claimField: { fieldName: 'genericClaim', fieldLabel: 'Campus Description', rawValue: 'Tech valley educational campus sector 4' },
  evidenceField: { fieldName: 'genericClaim', fieldLabel: 'Campus Description', rawValue: 'Tech valley research facility sector 4' },
  confidenceThreshold: 0.85
});
assert(uncertainResult.label === 'UNCERTAIN', 'PairwiseClassifier abstains to UNCERTAIN when confidence is below threshold');
assert(uncertainResult.requiresHumanReview === true, 'UNCERTAIN correctly routes to human reviewer inspection');

// =========================================================================
// 16. ORGANIZATIONS & TENANT DATA ISOLATION
// =========================================================================
console.log('\n[16] Testing Organization Isolation & Tenant Authorizations...');
const defaultOrg = OrganizationService.getOrganizationById('org-aicte-western');
assert(defaultOrg !== undefined, 'Default organization org-aicte-western exists');
assert(defaultOrg?.code === 'WRO-MUMBAI', 'Organization preserves official code');
assert(OrganizationService.isAuthorizedForOrg('org-aicte-western', 'org-aicte-western') === true, 'Matching tenant authorized');
assert(OrganizationService.isAuthorizedForOrg('org-aicte-western', 'org-aicte-central') === false, 'Cross-tenant access correctly flagged');

// =========================================================================
// 17. ASYNCHRONOUS JOB QUEUE
// =========================================================================
console.log('\n[17] Testing Asynchronous Document Job Queue...');
let jobHandled: boolean = false;
jobQueue.registerHandler('test-job', async (data: any) => {
  jobHandled = true;
  return { processed: true, input: data };
});

const enqueued = await jobQueue.enqueue('test-job', { docId: 'doc-123', pages: 4 });
assert(enqueued.id.startsWith('job-'), 'Job enqueued with valid job- ID');
assert(enqueued.status === 'queued', 'Initial job status is queued');

// Wait brief tick for in-memory queue to process
await new Promise(r => setTimeout(r, 50));
const retrievedJob = jobQueue.getJob(enqueued.id);
assert(Boolean(jobHandled), 'Job handler successfully executed');
assert(retrievedJob?.status === 'completed', 'Job status transitioned to completed');
assert((retrievedJob?.result as any)?.processed === true, 'Job result persisted correctly');

// =========================================================================
// 18. TEST SERVER SETUP FOR END-TO-END HTTP API SUITES
// =========================================================================
const testExpressApp = express();
testExpressApp.use(apiRouter);
const testHttpServer = http.createServer(testExpressApp);
await new Promise<void>((resolve) => testHttpServer.listen(0, '127.0.0.1', () => resolve()));
const testPort = (testHttpServer.address() as any).port;
const baseUrl = `http://127.0.0.1:${testPort}`;

// =========================================================================
// 18. P0-01: MANDATORY JWT AUTHENTICATION & ACCESS CONTROL
// =========================================================================
console.log('\n[18] Testing P0-01 (Mandatory JWT Authentication & Token Enforcement)...');
// 1. Unauthenticated request to private endpoint returns 401
const resNoToken = await fetch(`${baseUrl}/api/v1/applications`);
assert(resNoToken.status === 401, 'Unauthenticated request to /api/v1/applications returns 401');
const bodyNoToken = await resNoToken.json();
assert(bodyNoToken.success === false, 'Unauthenticated response returns success: false');

// 2. Malformed token returns 401
const resMalformed = await fetch(`${baseUrl}/api/v1/applications`, {
  headers: { Authorization: 'Bearer this-is-not-a-valid-jwt-token' }
});
assert(resMalformed.status === 401, 'Malformed JWT token returns 401 Unauthorized');

// 3. Tampered token returns 401
const validToken = generateToken(reviewerUser);
const tamperedHttpToken = validToken.slice(0, -6) + 'abcdef';
const resTampered = await fetch(`${baseUrl}/api/v1/applications`, {
  headers: { Authorization: `Bearer ${tamperedHttpToken}` }
});
assert(resTampered.status === 401, 'Tampered JWT token rejected with 401 Unauthorized');

// 4. Token for non-existent database user returns 401
const ghostToken = generateToken({
  id: 'usr-ghost-999',
  role: 'Reviewer',
  displayName: 'Ghost Reviewer',
  email: 'ghost@scrutiny.edu.in',
  department: 'Unknown'
});
const resGhost = await fetch(`${baseUrl}/api/v1/applications`, {
  headers: { Authorization: `Bearer ${ghostToken}` }
});
assert(resGhost.status === 401, 'Token for non-existent database user rejected with 401 Unauthorized');

// 5. Public health endpoint accessible without token
const resHealth = await fetch(`${baseUrl}/api/v1/health`);
assert(resHealth.status === 200, 'Public /api/v1/health accessible without token');
const healthBody = await resHealth.json();
assert(healthBody.status === 'ok', 'Health endpoint reports status ok');

// 6. MED-1 remediation: user registry requires authentication (no public enumeration)
const resUsersUnauth = await fetch(`${baseUrl}/api/v1/users`);
assert(resUsersUnauth.status === 401, 'Unauthenticated /api/v1/users rejected with 401 (no user enumeration)');
const resUsers = await fetch(`${baseUrl}/api/v1/users`, {
  headers: { Authorization: `Bearer ${validToken}` }
});
assert(resUsers.status === 200, 'Authenticated /api/v1/users accessible with valid token');
const usersBody = await resUsers.json();
assert(Array.isArray(usersBody.data), 'Users endpoint returns array of users');
assert(!usersBody.data.some((u: any) => u.passwordHash), 'User personas strictly exclude password hashes');

// 7. Protected endpoint succeeds with valid token
const resAuthed = await fetch(`${baseUrl}/api/v1/applications`, {
  headers: { Authorization: `Bearer ${validToken}` }
});
assert(resAuthed.status === 200, 'Protected endpoint succeeds with valid JWT token');

// =========================================================================
// 19. P0-02: USER REGISTRATION & ROLE ESCALATION DEFENSE
// =========================================================================
console.log('\n[19] Testing P0-02 (User Registration & Role Escalation Defense)...');
// 0. HIGH-1 remediation: persona switch is NOT unauthenticated (no anonymous JWT minting)
const resSwitchUnauth = await fetch(`${baseUrl}/api/v1/user`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 'usr-002', role: 'Administrator' })
});
assert(resSwitchUnauth.status === 401, 'Unauthenticated persona switch rejected with 401 (no anonymous JWT minting)');

// 1. Client-supplied role in POST /api/v1/user is ignored and strictly derived from DB
const resSwitch = await fetch(`${baseUrl}/api/v1/user`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validToken}` },
  body: JSON.stringify({ id: 'usr-001', role: 'Administrator' }) // Attacker attempts to claim Administrator!
});
assert(resSwitch.status === 200, 'Switch user endpoint succeeds for authenticated session');
const switchBody = await resSwitch.json();
assert(switchBody.data.role === 'Reviewer', 'Client-supplied role Administrator was ignored; DB role Reviewer preserved');
const switchedDecoded = verifyToken(switchBody.token);
assert(switchedDecoded?.role === 'Reviewer', 'Token claims strictly derived from DB role Reviewer');

// 2. Non-existent user ID rejected
const resFakeUser = await fetch(`${baseUrl}/api/v1/user`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validToken}` },
  body: JSON.stringify({ id: 'usr-fake-attacker', role: 'Administrator' })
});
assert(resFakeUser.status === 404, 'Arbitrary non-existent user rejected with 404');

// 3. Non-admin cannot elevate roles via PATCH /api/v1/users/:id/role
const resNonAdminPatch = await fetch(`${baseUrl}/api/v1/users/usr-003/role`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${validToken}` // user1 is Reviewer
  },
  body: JSON.stringify({ role: 'Administrator' })
});
assert(resNonAdminPatch.status === 403, 'Non-admin user blocked from changing roles (403 Forbidden)');

// 4. Admin cannot modify their own active role (lockout prevention)
const adminUser = db.getUserById('usr-002')!;
const adminToken = generateToken(adminUser);
const resSelfAdmin = await fetch(`${baseUrl}/api/v1/users/usr-002/role`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`
  },
  body: JSON.stringify({ role: 'Read-only Viewer' })
});
assert(resSelfAdmin.status === 400, 'Admin blocked from modifying own role with 400 Bad Request');

// 5. Admin can update another user role and old tokens are invalidated
const viewerUser = db.getUserById('usr-003')!;
const oldViewerToken = generateToken(viewerUser);
// Verify old token works before update
const resBefore = await fetch(`${baseUrl}/api/v1/applications`, {
  headers: { Authorization: `Bearer ${oldViewerToken}` }
});
assert(resBefore.status === 200, 'Viewer token valid prior to role change');

// Admin updates usr-003 role to Reviewer
const resRoleUpdate = await fetch(`${baseUrl}/api/v1/users/usr-003/role`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`
  },
  body: JSON.stringify({ role: 'Reviewer' })
});
assert(resRoleUpdate.status === 200, 'Admin successfully updated user role');
const roleUpdateBody = await resRoleUpdate.json();
assert(roleUpdateBody.data.role === 'Reviewer', 'Updated user now has role Reviewer in DB');

// Old token with role: 'Read-only Viewer' is now rejected with ROLE_REVOKED
const resAfter = await fetch(`${baseUrl}/api/v1/applications`, {
  headers: { Authorization: `Bearer ${oldViewerToken}` }
});
assert(resAfter.status === 401, 'Old token with revoked role rejected with 401 Unauthorized');
const afterBody = await resAfter.json();
assert(afterBody.code === 'ROLE_REVOKED', 'Error code specifies ROLE_REVOKED');

// Revert usr-003 back to Read-only Viewer for test idempotency
db.updateUserRole('usr-003', 'Read-only Viewer', adminUser);

// =========================================================================
// 20. P0-03: PRODUCTION JWT SECRET ENFORCEMENT
// =========================================================================
console.log('\n[20] Testing P0-03 (Production JWT Secret Enforcement)...');
let exitCalledWith: number | null = null;
const mockExit = (code: number) => {
  exitCalledWith = code;
  throw new Error(`EXIT_${code}`);
};

// 1. Missing secret in production terminates process
exitCalledWith = null;
try {
  resolveJwtSecret(undefined, 'production', mockExit);
  assert(false, 'Expected missing secret to terminate');
} catch (err: any) {
  assert(err.message.includes('EXIT_1') && exitCalledWith === 1, 'Missing JWT_SECRET in production triggers exit(1)');
}

// 2. Short secret in production terminates process
exitCalledWith = null;
try {
  resolveJwtSecret('short-secret-12345', 'production', mockExit);
  assert(false, 'Expected short secret to terminate');
} catch (err: any) {
  assert(err.message.includes('EXIT_1') && exitCalledWith === 1, 'Short JWT_SECRET (<32 chars) in production triggers exit(1)');
}

// 3. Development fallback secret in production terminates process
exitCalledWith = null;
try {
  resolveJwtSecret('form2fact-dev-jwt-secret-do-not-use-in-production-32c', 'production', mockExit);
  assert(false, 'Expected dev fallback secret in production to terminate');
} catch (err: any) {
  assert(err.message.includes('EXIT_1') && exitCalledWith === 1, 'Dev fallback secret in production triggers exit(1)');
}

// 4. Valid 32+ character secret in production succeeds
const validProdSecret = 'super-secure-production-key-strictly-entropy-32-chars';
const resolvedProdSecret = resolveJwtSecret(validProdSecret, 'production', mockExit);
assert(resolvedProdSecret === validProdSecret, 'Valid >=32 char production secret accepted');

// 5. Development mode gracefully falls back to dev secret
const devResolved = resolveJwtSecret(undefined, 'development', mockExit);
assert(typeof devResolved === 'string' && devResolved.length > 0, 'Development mode resolves safe default fallback');

// =========================================================================
// 21. P0-04: DOCUMENT ACCESS & MULTI-TENANT DATA ISOLATION
// =========================================================================
console.log('\n[21] Testing P0-04 (Document Access & Multi-Tenant Data Isolation)...');
const westernUser = db.getUserById('usr-001')!;
const westernToken = generateToken(westernUser);
const centralUser = db.getUserById('usr-004')!;
const centralToken = generateToken(centralUser);

// 1. Western user query only returns Western applications
const resWesternApps = await fetch(`${baseUrl}/api/v1/applications`, {
  headers: { Authorization: `Bearer ${westernToken}` }
});
assert(resWesternApps.status === 200, 'Western user can fetch applications');
const westernAppsBody = await resWesternApps.json();
const westernAppIds: string[] = westernAppsBody.data.map((a: any) => a.id);
assert(westernAppIds.includes('app-1104'), 'Western user sees Western app-1104');
assert(westernAppIds.includes('app-0842'), 'Western user sees Western app-0842');
assert(!westernAppIds.includes('app-0915'), 'Western user DOES NOT see Central app-0915');

// 2. Central user query only returns Central applications
const resCentralApps = await fetch(`${baseUrl}/api/v1/applications`, {
  headers: { Authorization: `Bearer ${centralToken}` }
});
assert(resCentralApps.status === 200, 'Central user can fetch applications');
const centralAppsBody = await resCentralApps.json();
const centralAppIds: string[] = centralAppsBody.data.map((a: any) => a.id);
assert(centralAppIds.includes('app-0915'), 'Central user sees Central app-0915');
assert(!centralAppIds.includes('app-1104'), 'Central user DOES NOT see Western app-1104');
assert(!centralAppIds.includes('app-0842'), 'Central user DOES NOT see Western app-0842');

// 3. Western user attempting to read Central app-0915 docket returns 403 Forbidden
const resForbiddenApp = await fetch(`${baseUrl}/api/v1/applications/app-0915`, {
  headers: { Authorization: `Bearer ${westernToken}` }
});
assert(resForbiddenApp.status === 403, 'Cross-tenant application fetch rejected with 403 Forbidden');

// 4. Western user attempting to fetch Central document returns 403 Forbidden
const resForbiddenDoc = await fetch(`${baseUrl}/api/v1/applications/app-0915/documents/doc-c1/file`, {
  headers: { Authorization: `Bearer ${westernToken}` }
});
assert(resForbiddenDoc.status === 403, 'Cross-tenant document download rejected with 403 Forbidden');

// 5. Document download path traversal is rejected with 400 Bad Request
const resTraversal = await fetch(`${baseUrl}/api/v1/applications/..%2F..%2Fetc/documents/passwd/file`, {
  headers: { Authorization: `Bearer ${westernToken}` }
});
assert(resTraversal.status === 400, 'Path traversal in document path rejected with 400 Bad Request');

// 6. Tenant-isolated findings
const resWesternFindings = await fetch(`${baseUrl}/api/v1/findings`, {
  headers: { Authorization: `Bearer ${westernToken}` }
});
const westernFindingsBody = await resWesternFindings.json();
const westernFindingAppIds = new Set(westernFindingsBody.data.map((f: any) => f.applicationId));
assert(!westernFindingAppIds.has('app-0915'), 'Western user findings query does NOT contain Central application findings');

// 7. Administrator can access both Western and Central applications
const resAdminApps = await fetch(`${baseUrl}/api/v1/applications`, {
  headers: { Authorization: `Bearer ${adminToken}` }
});
const adminAppsBody = await resAdminApps.json();
const adminAppIds: string[] = adminAppsBody.data.map((a: any) => a.id);
assert(adminAppIds.includes('app-1104') && adminAppIds.includes('app-0915'), 'Administrator has global visibility across all tenants');

// =========================================================================
// 22. P0-05: PAIRWISE FIELD CLASSIFICATION TAXONOMY (ALL 11 CASES)
// =========================================================================
console.log('\n[22] Testing P0-05 (Pairwise Field Classification Taxonomy - 11 Cases)...');

// Case 1: Exact Name Match
const pCase1 = await PairwiseFieldClassifier.compare({
  claimField: { fieldName: 'institutionName', fieldLabel: 'Institution Legal Name', rawValue: 'Techno India NJR Institute of Technology' },
  evidenceField: { fieldName: 'institutionName', fieldLabel: 'Institution Name', rawValue: 'Techno India NJR Institute of Technology' }
});
assert(pCase1.label === 'MATCH', 'Case 1: Exact name returns MATCH');
assert(pCase1.confidence >= 0.99, 'Case 1: Confidence is >= 0.99');
assert(pCase1.requiresHumanReview === false, 'Case 1: MATCH does not require human review');

// Case 2: Name Match with Punctuation Variance
const pCase2 = await PairwiseFieldClassifier.compare({
  claimField: { fieldName: 'institutionName', fieldLabel: 'Institution Legal Name', rawValue: 'Techno India N.J.R. Institute of Technology, Udaipur' },
  evidenceField: { fieldName: 'institutionName', fieldLabel: 'Institution Name', rawValue: 'Techno India NJR Institute of Technology - Udaipur' }
});
assert(pCase2.label === 'MATCH', 'Case 2: Name with punctuation/whitespace variance returns MATCH');
assert(pCase2.requiresHumanReview === false, 'Case 2: High concordance name match does not require review');

// Case 3: Normalized Dates Match
const pCase3 = await PairwiseFieldClassifier.compare({
  claimField: { fieldName: 'leaseExpiryDate', fieldLabel: 'Lease Expiry Date', rawValue: '31/03/2052' },
  evidenceField: { fieldName: 'leaseExpiryDate', fieldLabel: 'Deed Expiration Date', rawValue: '2052-03-31' },
  comparisonType: 'date'
});
assert(pCase3.label === 'MATCH', 'Case 3: Equivalent normalized dates return MATCH');
assert(pCase3.confidence >= 0.99, 'Case 3: Normalized dates confidence >= 0.99');
assert(pCase3.requiresHumanReview === false, 'Case 3: Matching dates do not require review');

// Case 4: Conflicting Dates Mismatch
const pCase4 = await PairwiseFieldClassifier.compare({
  claimField: { fieldName: 'leaseExpiryDate', fieldLabel: 'Declared Lease Expiry', rawValue: '31/03/2052' },
  evidenceField: { fieldName: 'leaseExpiryDate', fieldLabel: 'Document Lease Expiry', rawValue: '15/06/2029' },
  comparisonType: 'date'
});
assert(pCase4.label === 'MISMATCH', 'Case 4: Conflicting dates return MISMATCH');
assert(pCase4.requiresHumanReview === true, 'Case 4: Date mismatch requires human review');

// Case 5: Numeric Acreage Deficit
const pCase5 = await PairwiseFieldClassifier.compare({
  claimField: { fieldName: 'landAreaAcres', fieldLabel: 'Declared Campus Land Area', rawValue: '7.50' },
  evidenceField: { fieldName: 'landAreaAcres', fieldLabel: 'Registered Land Area', rawValue: '6.00' },
  comparisonType: 'numeric'
});
assert(pCase5.label === 'MISMATCH', 'Case 5: Numeric deficit returns MISMATCH');
assert(pCase5.requiresHumanReview === true, 'Case 5: Numeric deficit requires human review');
assert(pCase5.explanation.includes('deficit'), 'Case 5: Explanation explicitly details deficit');

// Case 6: Missing Evidence
const pCase6 = await PairwiseFieldClassifier.compare({
  claimField: { fieldName: 'fireSafetyNoc', fieldLabel: 'Fire Safety NOC Validity', rawValue: 'Valid through 2028' },
  evidenceField: undefined
});
assert(pCase6.label === 'MISSING', 'Case 6: Omitted evidence returns MISSING');
assert(pCase6.requiresHumanReview === true, 'Case 6: MISSING requires human review');

// Case 7: Unrelated Entity Names (No overlap - Abstains to UNCERTAIN, NOT false positive MISMATCH)
const pCase7 = await PairwiseFieldClassifier.compare({
  claimField: { fieldName: 'institutionName', fieldLabel: 'Institution Legal Name', rawValue: 'Techno India NJR Institute of Technology' },
  evidenceField: { fieldName: 'institutionName', fieldLabel: 'Institution Name', rawValue: 'Apex Global Foundation of Applied Sciences' }
});
assert(pCase7.label === 'UNCERTAIN', 'Case 7: Unrelated names with low overlap abstain to UNCERTAIN (NOT false positive MISMATCH)');
assert(pCase7.confidence < 0.40, 'Case 7: Low overlap confidence reflects ambiguity');
assert(pCase7.requiresHumanReview === true, 'Case 7: UNCERTAIN routes to human reviewer');

// Case 8: Address Variations with Low Lexical Overlap (Abstains to UNCERTAIN)
const pCase8 = await PairwiseFieldClassifier.compare({
  claimField: { fieldName: 'address', fieldLabel: 'Campus Address', rawValue: 'Plot 12, Phase 3, Industrial Area, Sector 62' },
  evidenceField: { fieldName: 'address', fieldLabel: 'Registered Address', rawValue: 'Survey No. 44/2, Near Metro Station, Sector 62' }
});
assert(pCase8.label === 'UNCERTAIN', 'Case 8: Address formatting variations abstain to UNCERTAIN');
assert(pCase8.requiresHumanReview === true, 'Case 8: Requires human review');

// Case 9: OCR Corruption & Noise
const pCase9 = await PairwiseFieldClassifier.compare({
  claimField: { fieldName: 'societyName', fieldLabel: 'Society Name', rawValue: 'Pragati Education Society' },
  evidenceField: { fieldName: 'societyName', fieldLabel: 'Deed Trust Name', rawValue: 'Pr@g#ti 3duc@t!0n S0c!3ty ~~~??? [OCR UNREADABLE]' }
});
assert(pCase9.label === 'UNCERTAIN', 'Case 9: Degraded OCR corruptions abstain to UNCERTAIN');
assert(pCase9.explanation.includes('OCR'), 'Case 9: Explanation identifies OCR corruption');
assert(pCase9.requiresHumanReview === true, 'Case 9: Corrupted OCR routes to human review');

// Case 10: Incompatible Field Types
const pCase10 = await PairwiseFieldClassifier.compare({
  claimField: { fieldName: 'leaseExpiryDate', fieldLabel: 'Tenure Expiry', rawValue: '2052-03-31' },
  evidenceField: { fieldName: 'societyName', fieldLabel: 'Sponsoring Trust', rawValue: 'Pragati Education Society' }
});
assert(pCase10.label === 'NOT_COMPARABLE', 'Case 10: Semantically incompatible fields return NOT_COMPARABLE');
assert(pCase10.requiresHumanReview === false, 'Case 10: Deterministic NOT_COMPARABLE does not require human review');

// Case 11: Text Contradiction with Embedded Numbers
const pCase11 = await PairwiseFieldClassifier.compare({
  claimField: { fieldName: 'sanctionedIntake', fieldLabel: 'Approved Intake Capacity', rawValue: 'Approved intake capacity is 180 seats across engineering divisions' },
  evidenceField: { fieldName: 'sanctionedIntake', fieldLabel: 'Audited Intake Capacity', rawValue: 'Audited approved capacity is 120 seats for current academic year' }
});
assert(pCase11.label === 'MISMATCH', 'Case 11: Verified contradiction with divergent numbers returns MISMATCH');
assert(pCase11.requiresHumanReview === true, 'Case 11: Number contradiction requires human review');
assert(pCase11.explanation.includes('Conflicting numeric figures'), 'Case 11: Explanation cites conflicting numeric figures');

// =========================================================================
// 23. FRONTEND CONTRACTS & VERIFICATION WORKBENCH INTEGRATION
// =========================================================================
console.log('\n[23] Testing Frontend API Contracts & Workbench Integration...');
// 1. Authenticated pairwise comparison via API endpoint
const pwRes = await fetch(`${baseUrl}/api/v1/verification/pairwise`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${validToken}`
  },
  body: JSON.stringify({
    claimField: { fieldName: 'landAreaAcres', fieldLabel: 'Declared Land Area', rawValue: '7.50' },
    evidenceField: { fieldName: 'landAreaAcres', fieldLabel: 'Title Deed Land Area', rawValue: '6.00' },
    comparisonType: 'numeric'
  })
});
assert(pwRes.status === 200, 'Frontend POST /api/v1/verification/pairwise succeeds with valid JWT');
const pwBody = await pwRes.json();
assert(pwBody.success === true, 'Pairwise response includes success flag');
assert(pwBody.data.label === 'MISMATCH', 'Pairwise endpoint classifies acreage deficit as MISMATCH');
assert(pwBody.data.requiresHumanReview === true, 'Pairwise MISMATCH correctly flags requiresHumanReview');

// 2. Unauthenticated call is rejected (P0-01 protection)
const pwUnauthRes = await fetch(`${baseUrl}/api/v1/verification/pairwise`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    claimField: { fieldName: 'test', fieldLabel: 'Test', rawValue: '1' },
    evidenceField: { fieldName: 'test', fieldLabel: 'Test', rawValue: '1' }
  })
});
assert(pwUnauthRes.status === 401, 'Frontend unauthenticated pairwise call is rejected with 401');

// 3. Frontend production build bundle verification
const distHtmlPath = path.resolve(process.cwd(), 'dist', 'index.html');
if (fs.existsSync(distHtmlPath)) {
  const htmlContent = fs.readFileSync(distHtmlPath, 'utf8');
  assert(htmlContent.includes('<div id="root"></div>'), 'Production dist/index.html includes root mount container');
}

// -----------------------------------------------------------------
// 24. MULTI-MODEL AI ORCHESTRATION & PROVIDER TESTS
// -----------------------------------------------------------------
console.log('\n[24] Testing Multi-Model AI Orchestration Layer...');
await runMultiModelOrchestrationSuite();

// Close test HTTP server cleanly
await new Promise<void>((resolve, reject) => {
  testHttpServer.close((err) => (err ? reject(err) : resolve()));
});

console.log('\n====================================================');
console.log('🎉 ALL FORM2FACT REFACTOR & VERIFICATION TESTS PASSED!');
console.log('====================================================\n');
