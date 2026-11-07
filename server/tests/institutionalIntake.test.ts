import fs from 'fs';
import path from 'path';
import { ScrutinyDatabase } from '../db.ts';
import { User, InstitutionalDocketLifecycle } from '../../src/types/index.ts';

function testAssert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✅ Passed: ${message}`);
}

async function runInstitutionalIntakeTests() {
  console.log('================================================================');
  console.log('   FORM2FACT V3 — INSTITUTIONAL DOCKET INTAKE & LIFECYCLE TESTS');
  console.log('================================================================');

  const testDbPath = path.resolve(process.cwd(), 'data', `test_intake_${Date.now()}.db`);
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

  const westernReviewer: User = {
    id: 'usr-rev-west',
    email: 'rev_west@form2fact.gov.in',
    displayName: 'Western Reviewer',
    role: 'Reviewer',
    organizationId: 'org-aicte-western',
    department: 'Western Regional Directorate'
  };

  const northernReviewer: User = {
    id: 'usr-rev-north',
    email: 'rev_north@form2fact.gov.in',
    displayName: 'Northern Reviewer',
    role: 'Reviewer',
    organizationId: 'org-aicte-northern',
    department: 'Northern Regional Directorate'
  };

  const collectorUser: User = {
    id: 'usr-col-01',
    email: 'col_anil@form2fact.gov.in',
    displayName: 'Anil Kumar',
    role: 'Data Collector',
    organizationId: 'org-aicte-western',
    department: 'Intake Bureau'
  };

  let createdDocketId = '';

  // TEST 1: Register Institutional Docket with complete metadata
  runTest('Register Institutional Docket with complete statutory metadata', () => {
    const docket = db.createInstitutionalDocket(collectorUser, {
      docketNumber: 'AICTE-WRO-2026-DOC-001',
      institutionId: 'inst-aicte-pune-101',
      institutionName: 'Pune Engineering & Technology Institute',
      sourceOrganization: 'AICTE Western Regional Directorate',
      sourceUrl: 'https://www.aicte-india.org/bulletins/approved-institutions/wro/001',
      retrievalDate: '2026-11-07',
      publicationDate: '2026-05-15',
      authorizationReference: 'AICTE/WRO/SCRUTINY/2026/DKT-001',
      documentChecksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      documentPath: 'data/dockets/AICTE-WRO-2026-DOC-001/statutory_filing.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 245890,
      pageCount: 14,
      organizationId: 'org-aicte-western',
      documentClassification: 'statutory_filing'
    });

    testAssert(Boolean(docket.id), 'Docket ID generated');
    testAssert(docket.docketNumber === 'AICTE-WRO-2026-DOC-001', 'Docket number recorded');
    testAssert(docket.provenanceStatus === 'PROVENANCE_PENDING', 'Initial provenance is PROVENANCE_PENDING');
    testAssert(docket.lifecycleState === 'DATA_SOURCE_IDENTIFIED', 'Initial lifecycle is DATA_SOURCE_IDENTIFIED');
    testAssert(docket.uploadedBy === collectorUser.id, 'Uploader recorded');
    createdDocketId = docket.id;
  });

  // TEST 2: Incomplete docket creation rejected
  runTest('Incomplete docket creation rejected when missing mandatory fields', () => {
    let threw = false;
    try {
      db.createInstitutionalDocket(collectorUser, {
        institutionName: 'Incomplete Institute'
        // Missing docketNumber, sourceOrganization, authorizationReference
      });
    } catch (err: any) {
      threw = true;
      testAssert(err.message.includes('mandatory') || err.message.includes('required'), `Rejected incomplete payload: ${err.message}`);
    }
    testAssert(threw, 'Incomplete docket rejected');
  });

  // TEST 3: Duplicate docket number rejected
  runTest('Duplicate docketNumber registration rejected', () => {
    let threw = false;
    try {
      db.createInstitutionalDocket(collectorUser, {
        docketNumber: 'AICTE-WRO-2026-DOC-001',
        institutionId: 'inst-duplicate',
        institutionName: 'Duplicate College',
        sourceOrganization: 'AICTE',
        authorizationReference: 'AUTH-DUP'
      });
    } catch (err: any) {
      threw = true;
    }
    testAssert(threw, 'Duplicate docketNumber rejected');
  });

  // TEST 4: Provenance verification with short review notes rejected (<10 chars)
  runTest('Provenance certification with short notes (<10 chars) is rejected', () => {
    let threw = false;
    try {
      db.verifyDocketProvenance(westernReviewer, createdDocketId, 'PROVENANCE_VERIFIED', 'ok');
    } catch (err: any) {
      threw = true;
      testAssert(err.message.includes('10 characters'), `Rejected short notes: ${err.message}`);
    }
    testAssert(threw, 'Short provenance notes rejected');
  });

  // TEST 5: Cross-tenant provenance verification rejected
  runTest('Northern reviewer cannot verify Western regional docket (Cross-tenant violation)', () => {
    let threw = false;
    try {
      db.verifyDocketProvenance(
        northernReviewer,
        createdDocketId,
        'PROVENANCE_VERIFIED',
        'Attempting cross-regional provenance certification.'
      );
    } catch (err: any) {
      threw = true;
      testAssert(err.message.includes('Cross-tenant'), `Cross-tenant violation detected: ${err.message}`);
    }
    testAssert(threw, 'Cross-tenant verification rejected');
  });

  // TEST 6: Successful provenance certification by Western Reviewer
  runTest('Authorized regional reviewer successfully certifies document provenance', () => {
    const verified = db.verifyDocketProvenance(
      westernReviewer,
      createdDocketId,
      'PROVENANCE_VERIFIED',
      'Statutory filing verified against AICTE western regional public register gazette.'
    );

    testAssert(verified.provenanceStatus === 'PROVENANCE_VERIFIED', 'provenanceStatus updated to PROVENANCE_VERIFIED');
    testAssert(verified.verifiedBy === westernReviewer.id, 'verifiedBy records reviewer ID');
    testAssert(Boolean(verified.verifiedAt), 'verifiedAt recorded');
  });

  // TEST 7: Lifecycle transition progression
  runTest('Sequential lifecycle transition with substantive rationale', () => {
    const validStates: InstitutionalDocketLifecycle[] = [
      'ACCESS_AUTHORIZATION_PENDING',
      'AUTHORIZED_FOR_COLLECTION',
      'DOCUMENT_INGESTED',
      'PROVENANCE_VERIFIED',
      'ANNOTATION_READY'
    ];

    let current = db.getInstitutionalDocketById(createdDocketId)!;
    for (const st of validStates) {
      current = db.transitionDocketLifecycle(
        westernReviewer,
        createdDocketId,
        st,
        `Transitioning docket to ${st} following regulatory compliance verification protocol.`
      );
      testAssert(current.lifecycleState === st, `Docket transitioned to ${st}`);
    }

    const transitions = db.getDocketTransitions(createdDocketId);
    testAssert(transitions.length >= 5, `Complete transition history recorded (count: ${transitions.length})`);
    testAssert(transitions[0].actorId === collectorUser.id, 'Initial intake actor accurately recorded');
    testAssert(transitions[transitions.length - 1].actorId === westernReviewer.id, 'Subsequent transition actor accurately recorded');
  });

  // TEST 8: Lifecycle transition rejection on short rationale (<10 chars)
  runTest('Transition with short rationale (<10 chars) rejected', () => {
    let threw = false;
    try {
      db.transitionDocketLifecycle(westernReviewer, createdDocketId, 'EXPORT_ELIGIBLE', 'short');
    } catch (err: any) {
      threw = true;
      testAssert(err.message.includes('10 characters'), `Short rationale rejected: ${err.message}`);
    }
    testAssert(threw, 'Short transition rationale rejected');
  });

  // TEST 9: Operational Acceptance Dashboard calculation
  runTest('Operational Acceptance Dashboard accurately tracks provisional targets', () => {
    const dashboard = db.getOperationalDashboard('org-aicte-western', 'Administrator');

    testAssert(dashboard.overview.totalDocumentsCount >= 1, 'Total documents count >= 1');
    testAssert(dashboard.provisionalAcceptanceTargets.minimumDocumentsTarget === 200, 'Minimum documents target is 200');
    testAssert(dashboard.provisionalAcceptanceTargets.minimumPairsTarget === 200, 'Minimum candidate pairs target is 200');
    testAssert(dashboard.provisionalAcceptanceTargets.targetCohenKappa === 0.70, 'Target Cohen Kappa is 0.70');
    testAssert(dashboard.provisionalAcceptanceTargets.maximumAdjudicationRateTarget === 0.25, 'Maximum adjudication rate is 0.25');
    testAssert(dashboard.provisionalAcceptanceTargets.isCertifiedGoldStandardReady === false, 'isCertifiedGoldStandardReady remains false');
    testAssert(dashboard.datasetStatus.goldStandardRecordsCount === 0, 'Clean baseline maintained at 0 gold-standard records');
  });

  // TEST 10: Cryptographic ledger audit verification for intake events
  runTest('Cryptographic audit ledger tracks all intake and transition actions in hash chain', () => {
    const verification = db.verifyLedgerChain();
    testAssert(verification.isValid === true, 'Ledger chain unbroken after docket lifecycle transitions');
    testAssert(verification.totalEventsVerified >= 5, 'Audit events recorded for all lifecycle transitions');
  });

  (db as any).db.close();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  console.log(`\n================================================================`);
  console.log(`   INSTITUTIONAL INTAKE RESULTS: ${passed}/${total} TEST SUITES PASSED`);
  console.log(`================================================================`);
}

runInstitutionalIntakeTests().catch(err => {
  console.error('Fatal institutional intake test error:', err);
  process.exit(1);
});
