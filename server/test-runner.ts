import { normalizeDate, normalizeText, evaluateApplicationRules, INITIAL_RULES } from './rulesEngine.ts';
import { db } from './db.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ Passed: ${message}`);
}

console.log('--- STARTING FORM2FACT TEST SUITE ---');

// 1. Date Normalization Tests
console.log('\n[1] Testing Date Normalization...');
assert(normalizeDate('2054-03-31') === '2054-03-31', 'ISO format normalization');
assert(normalizeDate('31/03/2054') === '2054-03-31', 'DD/MM/YYYY slash format normalization');
assert(normalizeDate('31-03-2054') === '2054-03-31', 'DD-MM-YYYY hyphen format normalization');
assert(normalizeDate('31 March 2028') === '2028-03-31', 'Natural English date normalization (31 March 2028)');
assert(normalizeDate('March 31, 2028') === '2028-03-31', 'Natural English date comma format');

// 2. Text Normalization Tests
console.log('\n[2] Testing Text Normalization...');
assert(normalizeText('  Pragati Institute of Technology & Management!  ') === 'pragati institute of technology management', 'Punctuation and whitespace normalization');
assert(normalizeText('Kalyani Charitable Trust') === 'kalyani charitable trust', 'Case insensitivity normalization');

// 3. Deterministic Rules Evaluation
console.log('\n[3] Testing Scrutiny Rules on Seed Applications...');
const apps = db.getAllApplications();
assert(apps.length >= 3, 'At least 3 synthetic applications present in database');

// Compliant App (Kalyani Institute, APP-2026-EOA-1104)
const compliantApp = apps.find(a => a.referenceNumber.includes('1104'))!;
assert(compliantApp !== undefined, 'Compliant application fixture exists');
const docs1 = db.getDocumentsByApplication(compliantApp.id);
const fields1 = db.getFieldsByApplication(compliantApp.id);
const res1 = evaluateApplicationRules(compliantApp, docs1, fields1, INITIAL_RULES);
assert(res1.findings.length === 0, 'Compliant case produces 0 discrepancy findings');

// Intentional Mismatch App (Pragati Institute, APP-2026-NTC-0842)
const mismatchApp = apps.find(a => a.referenceNumber.includes('0842'))!;
assert(mismatchApp !== undefined, 'Intentional mismatch application fixture exists');
const docs2 = db.getDocumentsByApplication(mismatchApp.id);
const fields2 = db.getFieldsByApplication(mismatchApp.id);
const res2 = evaluateApplicationRules(mismatchApp, docs2, fields2, INITIAL_RULES);
assert(res2.findings.length === 2, 'Mismatch case produces exactly 2 findings (Lease Expiry + Area Deficit)');
const leaseFinding = res2.findings.find(f => f.ruleKey === 'RULE-TEN-01')!;
assert(leaseFinding !== undefined, 'Lease expiry rule RULE-TEN-01 triggered');
assert(leaseFinding.declaredValue === '2048-03-31', 'Declared lease expiry matches application');
assert(leaseFinding.severity === 'Material Discrepancy', 'Severity is Material Discrepancy');
assert(leaseFinding.ruleVersion === 'v1.2', 'Rule version v1.2 preserved in finding');

// Missing / Scanned App (Vidyapeeth Academy, APP-2026-EOA-0915)
const missingApp = apps.find(a => a.referenceNumber.includes('0915'))!;
assert(missingApp !== undefined, 'Missing evidence application fixture exists');
const docs3 = db.getDocumentsByApplication(missingApp.id);
const fields3 = db.getFieldsByApplication(missingApp.id);
const res3 = evaluateApplicationRules(missingApp, docs3, fields3, INITIAL_RULES);
assert(res3.findings.some(f => f.ruleKey === 'RULE-DOC-04'), 'RULE-DOC-04 detects missing Fire Safety NOC');
assert(res3.findings.some(f => f.ruleKey === 'RULE-SAFETY-06'), 'RULE-SAFETY-06 flags scanned photocopy without OCR');

// 4. Reviewer Decision Transitions & Audit Log Persistence
console.log('\n[4] Testing Review Actions & Traceability...');
const initialAuditCount = db.getAuditEvents().length;
const findingToReview = res2.findings[0];
const updatedFinding = db.recordReviewAction(
  findingToReview.id,
  'Confirm Finding',
  'Confirmed',
  'Officer verified 20-year deficit in registered lease deed clause 4.'
);
assert(updatedFinding?.status === 'Confirmed', 'Finding status transitioned to Confirmed');
assert(db.getAuditEvents().length === initialAuditCount + 1, 'Audit event appended for review decision');
assert(db.getAuditEvents()[0].action === 'Finding Confirm Finding', 'Audit event recorded correct action');

// 5. Extracted Field Correction
console.log('\n[5] Testing Field Manual Correction...');
const fieldToCorrect = fields2[0];
const corrected = db.correctField(fieldToCorrect.id, '2050-03-31', 'Officer verification of registered amendment deed.');
assert(corrected?.isCorrected === true, 'Field marked as isCorrected');
assert(corrected?.correctedValue === '2050-03-31', 'Corrected value persisted');

console.log('\n🎉 ALL FORM2FACT UNIT AND SYSTEM TESTS PASSED SUCCESSFULLY!');
