import fs from 'fs';
import path from 'path';
import { ScrutinyDatabase } from '../db.ts';
import { User, FiveClassLabel } from '../../src/types/index.ts';

function testAssert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✅ Passed: ${message}`);
}

async function runReviewerGovernanceTests() {
  console.log('================================================================');
  console.log('   FORM2FACT V3 — REVIEWER AUTHORIZATION GOVERNANCE TESTS');
  console.log('================================================================');

  const testDbPath = path.resolve(process.cwd(), 'data', `test_reviewer_${Date.now()}.db`);
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
    id: 'usr-admin-01',
    email: 'admin@form2fact.gov.in',
    displayName: 'System Administrator',
    role: 'Administrator',
    organizationId: 'org-aicte-western',
    department: 'Central Administration'
  };

  const reviewerUser: User = {
    id: 'usr-rev-01',
    email: 'rev_priya@form2fact.gov.in',
    displayName: 'Dr. Priya Sharma',
    role: 'Reviewer',
    organizationId: 'org-aicte-western',
    department: 'Western Regional Scrutiny'
  };

  const annotatorUser1: User = {
    id: 'usr-ann-01',
    email: 'ann_rohit@form2fact.gov.in',
    displayName: 'Rohit Verma',
    role: 'Annotator',
    organizationId: 'org-aicte-western',
    department: 'Western Regional Scrutiny'
  };

  const annotatorUser2: User = {
    id: 'usr-ann-02',
    email: 'ann_sunil@form2fact.gov.in',
    displayName: 'Sunil Mehta',
    role: 'Annotator',
    organizationId: 'org-aicte-western',
    department: 'Western Regional Scrutiny'
  };

  const adjudicatorUser: User = {
    id: 'usr-adj-01',
    email: 'adj_rajesh@form2fact.gov.in',
    displayName: 'Prof. Rajesh Iyer',
    role: 'Adjudicator',
    organizationId: 'org-aicte-western',
    department: 'National Scrutiny Board'
  };

  // Ensure users exist in users table
  const insertUser = (u: User) => {
    (db as any).db.prepare(`
      INSERT OR REPLACE INTO users (id, displayName, email, passwordHash, role, department, organizationId, createdAt)
      VALUES (?, ?, ?, 'hash', ?, ?, ?, datetime('now'))
    `).run(u.id, u.displayName, u.email, u.role, u.department, u.organizationId);
  };
  insertUser(adminUser);
  insertUser(reviewerUser);
  insertUser(annotatorUser1);
  insertUser(annotatorUser2);
  insertUser(adjudicatorUser);

  let ann1AuthId = '';

  // TEST 1: Administrator grants valid reviewer authorization
  runTest('Administrator grants statutory reviewer authorization with complete metadata', () => {
    const auth = db.authorizeReviewer(adminUser, {
      userId: annotatorUser1.id,
      role: 'Annotator',
      organizationId: 'org-aicte-western',
      verifiedIdentityRef: 'GOV-IN-PAN-ABCDE1234F',
      issuingAuthority: 'AICTE Western Regional Directorate',
      professionalDesignation: 'Senior Regulatory Inspector',
      authorizationReference: 'AICTE/WRO/SCRUTINY/2026/AUTH-088'
    });

    testAssert(Boolean(auth.id), 'Authorization ID generated');
    testAssert(auth.userId === annotatorUser1.id, 'Assigned to annotator 1');
    testAssert(auth.approvedBy === adminUser.id, 'Approved by admin');
    testAssert(auth.isRevoked === false, 'isRevoked is false');
    ann1AuthId = auth.id;
  });

  // TEST 2: Self-approval rejection
  runTest('Administrator self-approval is rejected', () => {
    let threw = false;
    try {
      db.authorizeReviewer(adminUser, {
        userId: adminUser.id,
        role: 'Reviewer',
        organizationId: 'org-aicte-western',
        verifiedIdentityRef: 'GOV-IN-PAN-ADMIN001',
        issuingAuthority: 'Self',
        authorizationReference: 'AUTH-SELF-001'
      });
    } catch (err: any) {
      threw = true;
      testAssert(err.message.includes('Self-approval') || err.message.includes('self-approve'), `Error message notes self-approval restriction: ${err.message}`);
    }
    testAssert(threw, 'Self-approval strictly prevented');
  });

  // TEST 3: Non-administrator cannot grant authorization
  runTest('Non-administrator rejected from granting reviewer authorization', () => {
    let threw = false;
    try {
      db.authorizeReviewer(reviewerUser, {
        userId: annotatorUser2.id,
        role: 'Annotator',
        organizationId: 'org-aicte-western',
        verifiedIdentityRef: 'GOV-IN-PAN-XYZ9876',
        issuingAuthority: 'AICTE',
        authorizationReference: 'AUTH-002'
      });
    } catch (err: any) {
      threw = true;
      testAssert(err.message.includes('Unauthorized') || err.message.includes('Administrator'), `Rejected unauthorized actor: ${err.message}`);
    }
    testAssert(threw, 'Reviewer blocked from granting authorization');
  });

  // TEST 4: Authorize Annotator 2 and Adjudicator
  runTest('Authorize Annotator 2 and Adjudicator for testing workflow', () => {
    const auth2 = db.authorizeReviewer(adminUser, {
      userId: annotatorUser2.id,
      role: 'Annotator',
      organizationId: 'org-aicte-western',
      verifiedIdentityRef: 'GOV-IN-PAN-SUNIL002',
      issuingAuthority: 'AICTE Western Regional Directorate',
      authorizationReference: 'AICTE/WRO/AUTH-089'
    });
    testAssert(auth2.userId === annotatorUser2.id, 'Annotator 2 authorized');

    const authAdj = db.authorizeReviewer(adminUser, {
      userId: adjudicatorUser.id,
      role: 'Adjudicator',
      organizationId: 'org-aicte-western',
      verifiedIdentityRef: 'GOV-IN-PAN-RAJESH003',
      issuingAuthority: 'AICTE National Scrutiny Board',
      authorizationReference: 'AICTE/NSB/ADJ-001'
    });
    testAssert(authAdj.userId === adjudicatorUser.id, 'Adjudicator authorized');
  });

  // TEST 5: Active authorized reviewer can annotate institutional tasks
  let candidateId = '';
  runTest('Active authorized reviewer submits annotation on institutional task', () => {
    const candidate = db.createAnnotationRecord({
      institutionId: 'inst-pune-eng-01',
      institutionName: 'Pune Institute of Applied Technology',
      claimFieldName: 'land_area_acres',
      claimText: 'Campus Land Area: 10.5 Acres',
      claimDocumentName: 'Part-1 Statutory Compliance Docket.pdf',
      claimPage: 3,
      evidenceText: 'Registered 30-Year Lease Deed: 10.5 Acres demarcated for educational institution.',
      evidenceDocumentName: 'Registered_Lease_Deed_Pune.pdf',
      evidencePage: 2,
      fieldCategory: 'numeric_area',
      sourceProvenance: 'AICTE Western Regional Filing 2025-26',
      licence: 'Public Regulatory Inspection Disclosure',
      isDemoCandidate: false,
      organizationId: 'org-aicte-western'
    });
    candidateId = candidate.id;

    const annRes = db.saveUserAnnotation(
      candidateId,
      annotatorUser1,
      { label: 'MATCH', rationale: 'Both statutory filing and lease deed confirm 10.5 Acres area.', isDraft: false }
    );
    testAssert(annRes.annotation.annotatorId === annotatorUser1.id, 'Annotation saved successfully');
    testAssert(annRes.record.status === 'in_review', 'Status moved to in_review');
  });

  // TEST 6: Revocation requires substantive rationale (minimum 10 characters)
  runTest('Revoking authorization with short rationale (<10 chars) is rejected', () => {
    let threw = false;
    try {
      db.revokeReviewerAuthorization(adminUser, ann1AuthId, 'short');
    } catch (err: any) {
      threw = true;
      testAssert(err.message.includes('10 characters'), `Rejected short rationale: ${err.message}`);
    }
    testAssert(threw, 'Short rationale rejected');
  });

  // TEST 7: Successful revocation by Administrator
  runTest('Administrator successfully revokes reviewer authorization', () => {
    const revoked = db.revokeReviewerAuthorization(
      adminUser,
      ann1AuthId,
      'Regulatory compliance breach: non-disclosure of institutional affiliation'
    );
    testAssert(revoked === true, 'Revocation succeeded');

    const auth = db.getReviewerAuthorization(annotatorUser1.id);
    testAssert(auth?.isRevoked === true, 'Authorization marked as isRevoked = true');
    testAssert(Boolean(auth?.revokedAt), 'revokedAt timestamp recorded');
  });

  // TEST 8: Revoked reviewer is blocked from submitting non-demo annotations
  runTest('Revoked reviewer is blocked from submitting annotations on institutional tasks', () => {
    let threw = false;
    try {
      db.saveUserAnnotation(
        candidateId,
        annotatorUser1,
        { label: 'MATCH', rationale: 'Attempting to submit annotation while revoked.', isDraft: false }
      );
    } catch (err: any) {
      threw = true;
      testAssert(err.message.includes('revoked') || err.message.includes('expired'), `Blocked revoked reviewer: ${err.message}`);
    }
    testAssert(threw, 'Revoked reviewer strictly blocked');
  });

  // TEST 9: Adjudicator conflict of interest prevention
  runTest('Adjudicator who annotated a task is rejected from adjudicating the same task', () => {
    // Re-authorize annotator 1 for testing conflict
    db.authorizeReviewer(adminUser, {
      userId: annotatorUser1.id,
      role: 'Annotator',
      organizationId: 'org-aicte-western',
      verifiedIdentityRef: 'GOV-IN-PAN-ABCDE1234F',
      issuingAuthority: 'AICTE',
      authorizationReference: 'AICTE/AUTH-090'
    });

    // Create a new task
    const disputeTask = db.createAnnotationRecord({
      institutionId: 'inst-pune-eng-02',
      institutionName: 'Pune Engineering Academy',
      claimFieldName: 'fire_noc_validity',
      claimText: 'Fire Safety NOC Valid up to 31/12/2026',
      claimDocumentName: 'Part-1 Form.pdf',
      claimPage: 4,
      evidenceText: 'Fire NOC Certificate expired on 30/06/2025',
      evidenceDocumentName: 'Fire_NOC.pdf',
      evidencePage: 1,
      fieldCategory: 'date',
      sourceProvenance: 'AICTE Western Regional Filing 2025-26',
      isDemoCandidate: false,
      organizationId: 'org-aicte-western'
    });

    // Annotator 1 (MATCH) and Adjudicator acting as second annotator (MISMATCH)
    db.saveUserAnnotation(
      disputeTask.id,
      annotatorUser1,
      { label: 'MATCH', rationale: 'Valid NOC according to applicant declaration.', isDraft: false }
    );
    db.saveUserAnnotation(
      disputeTask.id,
      adjudicatorUser,
      { label: 'MISMATCH', rationale: 'NOC certificate expired 30/06/2025; renewal pending.', isDraft: false }
    );

    // Task is now in dispute
    const currentTask = db.getAnnotationRecordById(disputeTask.id)!;
    testAssert(currentTask.status === 'disputed', 'Task is in disputed status');

    // Adjudicator attempts to resolve dispute on task they annotated -> must be blocked
    let threw = false;
    try {
      db.adjudicateRecord(
        disputeTask.id,
        adjudicatorUser,
        { label: 'MISMATCH', rationale: 'Resolving dispute where I was also an evaluating annotator.' }
      );
    } catch (err: any) {
      threw = true;
      testAssert(err.message.includes('Conflict of interest') || err.message.includes('annotator on the same task'), `Adjudicator conflict detected: ${err.message}`);
    }
    testAssert(threw, 'Adjudicator conflict of interest strictly blocked');
  });

  // TEST 10: Cryptographic ledger records authorization events
  runTest('Audit ledger records hash-chained authorization grant and revocation events', () => {
    const verification = db.verifyLedgerChain();
    testAssert(verification.isValid === true, 'Ledger chain remains unbroken after reviewer governance operations');
    testAssert(verification.totalEventsVerified >= 4, 'Multiple events recorded in ledger');

    const report = db.generateLedgerIntegrityReport();
    testAssert(report.summary.includes('Cryptographic ledger verified'), 'Integrity report confirms valid audit ledger');
  });

  (db as any).db.close();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  console.log(`\n================================================================`);
  console.log(`   REVIEWER GOVERNANCE RESULTS: ${passed}/${total} TEST SUITES PASSED`);
  console.log(`================================================================`);
}

runReviewerGovernanceTests().catch(err => {
  console.error('Fatal reviewer governance test error:', err);
  process.exit(1);
});
