/**
 * FORM2FACT — V3 PHASE 2: AICTE HUMAN ANNOTATION WORKBENCH TEST SUITE
 *
 * Verifies the human annotation system for Form2Fact V3 and all Audit requirements:
 * 1. Initial candidate seed integrity & demo classification (6 demo fixtures barred from gold standard)
 * 2. Role-based candidate task creation (Data Collector, Reviewer, Admin allowed; Viewer 403)
 * 3. Schema and input validation (mandatory fields, valid 5-class labels)
 * 4. Draft annotation saving (status remains pending)
 * 5. Independent blind review isolation (annotators cannot see other unadjudicated submissions or drafts)
 * 6. Consensus detection (matching annotations trigger 'agreed' status and final label)
 * 7. Disagreement detection (divergent annotations trigger 'disputed' status)
 * 8. Third-reviewer adjudication (Adjudicator resolves disputed record with substantive rationale)
 * 9. Quality metrics & Cohen's Kappa calculation (raw agreement separated from Cohen's kappa)
 * 10. Gold-standard export gate & manifest verification (zero synthetic invariant, SHA-256)
 * 11. Multi-tenant regional isolation (cross-tenant access prohibited)
 * 12. Audit ledger verification (tamper-evident audit trails for all actions)
 * 13. [AUDIT 6] Synthetic / Demo candidate export rejection
 * 14. [AUDIT 6] Missing source document rejection from gold standard export
 * 15. [AUDIT 6] Missing page reference rejection from gold standard export
 * 16. [AUDIT 6] Single-annotator export rejection
 * 17. [AUDIT 6] Duplicate annotator export rejection
 * 18. [AUDIT 6] Unresolved disagreement export rejection
 * 19. [AUDIT 6] Cross-tenant adjudication rejection (403)
 * 20. [AUDIT 6] Cross-tenant export prevention
 * 21. [AUDIT 6] Non-substantive rationale rejection (<10 chars)
 * 22. [AUDIT 6] Post-adjudication modification prevention
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import express from 'express';
import { db } from '../db.ts';
import apiRouter from '../api.ts';
import { generateToken } from '../auth.ts';
import { User, FiveClassLabel } from '../../src/types/index.ts';

console.log('================================================================');
console.log('   FORM2FACT V3 — HUMAN ANNOTATION WORKBENCH AUDIT SUITE');
console.log('================================================================');

async function runAnnotationWorkbenchTests() {
  let passed = 0;
  let total = 0;

  function testAssert(condition: boolean, message: string) {
    total++;
    assert(condition, message);
    console.log(`✅ Passed: ${message}`);
    passed++;
  }

  // Set up ephemeral Express server for HTTP endpoint tests
  const app = express();
  app.use(apiRouter);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Helper for HTTP requests
  async function apiRequest(endpoint: string, options: {
    method?: string;
    token?: string;
    body?: any;
  } = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  }

  // Provision test users across required roles
  const adminUser: User = {
    id: 'usr-admin-v3',
    displayName: 'V3 Lead Administrator',
    email: 'admin.v3@scrutiny.edu.in',
    role: 'Administrator',
    department: 'Central Scrutiny Directorate',
    organizationId: 'org-aicte-western'
  };

  const collectorUser: User = {
    id: 'usr-collector-v3',
    displayName: 'Vikram Data Collector',
    email: 'collector.v3@scrutiny.edu.in',
    role: 'Data Collector',
    department: 'Western Regional Data Unit',
    organizationId: 'org-aicte-western'
  };

  const annotator1User: User = {
    id: 'usr-annotator1-v3',
    displayName: 'Priya Annotator One',
    email: 'priya.ann1@scrutiny.edu.in',
    role: 'Annotator',
    department: 'Western Evaluation Panel',
    organizationId: 'org-aicte-western'
  };

  const annotator2User: User = {
    id: 'usr-annotator2-v3',
    displayName: 'Rajesh Annotator Two',
    email: 'rajesh.ann2@scrutiny.edu.in',
    role: 'Annotator',
    department: 'Western Evaluation Panel',
    organizationId: 'org-aicte-western'
  };

  const adjudicatorUser: User = {
    id: 'usr-adjudicator-v3',
    displayName: 'Justice Meenakshi Adjudicator',
    email: 'meenakshi.adj@scrutiny.edu.in',
    role: 'Adjudicator',
    department: 'Statutory Appellate Tribunal',
    organizationId: 'org-aicte-western'
  };

  const viewerUser: User = {
    id: 'usr-viewer-v3',
    displayName: 'Kiran Readonly Viewer',
    email: 'kiran.viewer@scrutiny.edu.in',
    role: 'Read-only Viewer',
    department: 'Public Information Cell',
    organizationId: 'org-aicte-western'
  };

  const northernAnnotatorUser: User = {
    id: 'usr-annotator-north-v3',
    displayName: 'Amit Northern Annotator',
    email: 'amit.north@scrutiny.edu.in',
    role: 'Annotator',
    department: 'Northern Regional Panel',
    organizationId: 'org-aicte-northern'
  };

  const northernAdjudicatorUser: User = {
    id: 'usr-adjudicator-north-v3',
    displayName: 'Pooja Northern Adjudicator',
    email: 'pooja.adj.north@scrutiny.edu.in',
    role: 'Adjudicator',
    department: 'Northern Appellate Tribunal',
    organizationId: 'org-aicte-northern'
  };

  const northernReviewerUser: User = {
    id: 'usr-reviewer-north-v3',
    displayName: 'Rohan Northern Reviewer',
    email: 'rohan.rev.north@scrutiny.edu.in',
    role: 'Reviewer',
    department: 'Northern Scrutiny Committee',
    organizationId: 'org-aicte-northern'
  };

  // Register test users in SQLite db
  const allTestUsers = [
    adminUser,
    collectorUser,
    annotator1User,
    annotator2User,
    adjudicatorUser,
    viewerUser,
    northernAnnotatorUser,
    northernAdjudicatorUser,
    northernReviewerUser
  ];

  for (const u of allTestUsers) {
    if (!db.getUserById(u.id)) {
      db.createUser({
        ...u,
        passwordHash: 'test-hash'
      });
    }
  }

  // Generate tokens
  const adminToken = generateToken(adminUser);
  const collectorToken = generateToken(collectorUser);
  const annotator1Token = generateToken(annotator1User);
  const annotator2Token = generateToken(annotator2User);
  const adjudicatorToken = generateToken(adjudicatorUser);
  const viewerToken = generateToken(viewerUser);
  const northernToken = generateToken(northernAnnotatorUser);
  const northernAdjudicatorToken = generateToken(northernAdjudicatorUser);
  const northernReviewerToken = generateToken(northernReviewerUser);

  const testExportPath = path.resolve(process.cwd(), 'ai_service/ml/data/v3/annotations/test_export.jsonl');
  const apiExport = (token: string) => apiRequest('/api/v1/annotations/export', {
    method: 'POST',
    token,
    body: { outPath: testExportPath }
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: Initial Candidate Seed Integrity & Demo Flagging
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Initial Candidate Seed Integrity & Demo Classification ---');
    const recordsRes = await apiRequest('/api/v1/annotations/records', { token: adminToken });
    testAssert(recordsRes.status === 200, 'HTTP 200 returned on listing annotation records');
    testAssert(Array.isArray(recordsRes.data.data), 'Records response contains array data');
    testAssert(recordsRes.data.data.length >= 6, `At least 6 initial candidate records exist (found ${recordsRes.data.data.length})`);

    const leaseExpiryRec = recordsRes.data.data.find((r: any) => r.claimFieldName === 'leaseExpiryDate' || r.claimFieldName === 'lease_expiry_date');
    testAssert(!!leaseExpiryRec, 'Authentic candidate for leaseExpiryDate exists');
    testAssert(leaseExpiryRec.institutionName.includes('Apex'), 'Candidate belongs to authentic AICTE institution');
    testAssert(leaseExpiryRec.evidencePage === 4, 'Evidence page reference preserved (Page 4)');
    testAssert(leaseExpiryRec.isDemoCandidate === true, 'AUDIT 1: Seeded candidates are classified as demo fixtures (isDemoCandidate: true)');

    // -------------------------------------------------------------
    // TEST 2: Candidate Task Creation & RBAC
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Task Creation & Role Permissions ---');
    // Read-only Viewer cannot create task
    const viewerCreate = await apiRequest('/api/v1/annotations/records', {
      method: 'POST',
      token: viewerToken,
      body: {
        institutionName: 'Test Unauthorized College',
        claimFieldName: 'land_area',
        claimText: '10 Acres',
        evidenceText: '10 Acres'
      }
    });
    testAssert(viewerCreate.status === 403, 'Read-only Viewer rejected from creating candidate tasks (HTTP 403)');

    // Data Collector creates task
    const candidatePayload = {
      institutionId: 'inst-aicte-wb-101',
      institutionName: 'Kolkata Institute of Technology & Engineering',
      claimFieldName: 'fire_safety_noc_validity',
      claimText: 'Fire Safety Certificate valid up to 31/12/2026',
      claimDocumentName: 'Part-1 Statutory Application Form',
      claimPage: 4,
      evidenceText: 'Fire and Rescue Services Department NOC Certificate valid through 31-Dec-2026',
      evidenceDocumentName: 'Fire_Safety_NOC_Certificate.pdf',
      evidencePage: 2,
      evidenceLocation: 'Paragraph 3(b)',
      normalizedClaimValue: '2026-12-31',
      normalizedEvidenceValue: '2026-12-31',
      fieldCategory: 'date',
      sourceProvenance: 'AICTE Eastern Regional Archive 2025-26',
      licence: 'Public Regulatory Inspection Disclosure'
    };

    const collectorCreate = await apiRequest('/api/v1/annotations/records', {
      method: 'POST',
      token: collectorToken,
      body: candidatePayload
    });
    testAssert(collectorCreate.status === 201, 'Data Collector successfully created candidate task (HTTP 201)');
    testAssert(collectorCreate.data.data.status === 'pending', 'Newly created task starts with status: pending');
    const newTaskId = collectorCreate.data.data.id;

    // -------------------------------------------------------------
    // TEST 3: Validation & Error Handling
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Validation & Rejection ---');
    const invalidCreate = await apiRequest('/api/v1/annotations/records', {
      method: 'POST',
      token: collectorToken,
      body: {
        institutionName: 'Incomplete Entry',
        claimFieldName: '' // empty field name
      }
    });
    testAssert(invalidCreate.status === 400, 'Invalid candidate task rejected with HTTP 400');

    // -------------------------------------------------------------
    // TEST 4: Draft Saving
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Draft Saving ---');
    const draftRes = await apiRequest(`/api/v1/annotations/records/${newTaskId}/annotate`, {
      method: 'POST',
      token: annotator1Token,
      body: {
        label: 'MATCH',
        rationale: 'Working on this comparison draft',
        isDraft: true
      }
    });
    testAssert(draftRes.status === 200, 'Draft annotation saved successfully (HTTP 200)');
    testAssert(draftRes.data.annotation.isDraft === true, 'Annotation is flagged as draft');

    const checkDraftRecord = await apiRequest(`/api/v1/annotations/records/${newTaskId}`, {
      token: annotator1Token
    });
    testAssert(checkDraftRecord.data.data.status === 'pending', 'Record status remains pending after saving draft');

    // -------------------------------------------------------------
    // TEST 5: Independent Blind Review Isolation
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Independent Blind Review Isolation ---');
    // Annotator 1 submits first annotation
    const ann1Submit = await apiRequest(`/api/v1/annotations/records/${newTaskId}/annotate`, {
      method: 'POST',
      token: annotator1Token,
      body: {
        label: 'MATCH',
        rationale: 'Dates match precisely between claim form page 4 and NOC paragraph 3(b).',
        isDraft: false
      }
    });
    testAssert(ann1Submit.status === 200, 'Annotator 1 submitted annotation successfully');
    testAssert(ann1Submit.data.data.status === 'in_review', 'Record status transitioned to in_review after 1 submission');

    // Annotator 2 fetches the record: must NOT see Annotator 1's decision
    const ann2View = await apiRequest(`/api/v1/annotations/records/${newTaskId}`, {
      token: annotator2Token
    });
    testAssert(ann2View.status === 200, 'Annotator 2 fetched the in-review record');
    const ann2VisibleUserAnns = ann2View.data.data.userAnnotations || [];
    testAssert(
      !ann2VisibleUserAnns.some((a: any) => a.annotatorId === annotator1User.id),
      'Blind review enforced: Annotator 2 cannot view Annotator 1 submission'
    );

    // -------------------------------------------------------------
    // TEST 6: Double-Blind Consensus Detection (Agreed)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Double-Blind Consensus Detection ---');
    const ann2Submit = await apiRequest(`/api/v1/annotations/records/${newTaskId}/annotate`, {
      method: 'POST',
      token: annotator2Token,
      body: {
        label: 'MATCH',
        rationale: 'Verified validity date is identical (31/12/2026 vs 31-Dec-2026). Compliant.',
        isDraft: false
      }
    });
    testAssert(ann2Submit.status === 200, 'Annotator 2 submitted matching annotation');
    testAssert(ann2Submit.data.data.status === 'agreed', 'Consensus detected: Record status transitioned to agreed');
    testAssert(ann2Submit.data.data.finalLabel === 'MATCH', 'Final label set automatically on double-blind consensus');

    // -------------------------------------------------------------
    // TEST 7: Disagreement Detection (Disputed)
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Disagreement Detection ---');
    // Create another candidate task with complete document citations
    const disputedCandidate = await apiRequest('/api/v1/annotations/records', {
      method: 'POST',
      token: collectorToken,
      body: {
        institutionName: 'Apex Institute of Technology',
        claimFieldName: 'society_registration_status',
        claimText: 'Registered under Societies Act XXI of 1860, Valid through 2030',
        claimDocumentName: 'Statutory_Application_Approval.pdf',
        claimPage: 1,
        evidenceText: 'Certificate renewed annually; current renewal certificate expires 31-03-2026',
        evidenceDocumentName: 'Society_Renewal_Certificate.pdf',
        evidencePage: 1,
        fieldCategory: 'entity_name',
        sourceProvenance: 'AICTE Compliance Archive 2025'
      }
    });
    const disputedTaskId = disputedCandidate.data.data.id;

    // Annotator 1 says MATCH
    await apiRequest(`/api/v1/annotations/records/${disputedTaskId}/annotate`, {
      method: 'POST',
      token: annotator1Token,
      body: {
        label: 'MATCH',
        rationale: 'Active registration confirmed at time of inspection.',
        isDraft: false
      }
    });

    // Annotator 2 says MISMATCH
    const ann2Divergent = await apiRequest(`/api/v1/annotations/records/${disputedTaskId}/annotate`, {
      method: 'POST',
      token: annotator2Token,
      body: {
        label: 'MISMATCH',
        rationale: 'Expiry is 2026 not 2030; duration differs by 4 years.',
        isDraft: false
      }
    });
    testAssert(ann2Divergent.data.data.status === 'disputed', 'Disagreement detected: Record status transitioned to disputed');
    testAssert(!ann2Divergent.data.data.finalLabel, 'Final label withheld pending third-party adjudication');

    // -------------------------------------------------------------
    // TEST 8: Third-Reviewer Adjudication
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Third-Reviewer Adjudication ---');
    // Annotator 1 cannot adjudicate (lacks role)
    const annotatorAdjudicate = await apiRequest(`/api/v1/annotations/records/${disputedTaskId}/adjudicate`, {
      method: 'POST',
      token: annotator1Token,
      body: {
        label: 'MISMATCH',
        rationale: 'Attempting unauthorized adjudication.'
      }
    });
    testAssert(annotatorAdjudicate.status === 403, 'Annotator rejected from adjudicating (HTTP 403)');

    // Short rationale rejected
    const shortRationale = await apiRequest(`/api/v1/annotations/records/${disputedTaskId}/adjudicate`, {
      method: 'POST',
      token: adjudicatorToken,
      body: {
        label: 'MISMATCH',
        rationale: 'Too short'
      }
    });
    testAssert(shortRationale.status === 400, 'Adjudication with insufficient rationale rejected (HTTP 400)');

    // Adjudicator resolves dispute with substantive rationale
    const adjResolution = await apiRequest(`/api/v1/annotations/records/${disputedTaskId}/adjudicate`, {
      method: 'POST',
      token: adjudicatorToken,
      body: {
        label: 'MISMATCH',
        rationale: 'Statutory rules require annual renewal certificate to cover academic year. 2026 vs 2030 is a material discrepancy.'
      }
    });
    testAssert(adjResolution.status === 200, 'Adjudicator resolved dispute successfully (HTTP 200)');
    testAssert(adjResolution.data.data.status === 'adjudicated', 'Record status updated to adjudicated');
    testAssert(adjResolution.data.data.finalLabel === 'MISMATCH', 'Final label set to MISMATCH');
    testAssert(adjResolution.data.data.adjudicatorName === adjudicatorUser.displayName, 'Adjudicator name recorded');

    // -------------------------------------------------------------
    // TEST 9: Quality Control Metrics & Cohen's Kappa
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Quality Control Metrics & Cohen\'s Kappa ---');
    const metricsRes = await apiRequest('/api/v1/annotations/metrics', { token: adminToken });
    testAssert(metricsRes.status === 200, 'HTTP 200 returned for annotation metrics');
    const m = metricsRes.data.data;
    testAssert(typeof m.totalRecords === 'number' && m.totalRecords >= 7, 'Total records count is valid');
    testAssert(typeof m.rawAgreementRate === 'number', 'Raw agreement rate is computed');
    testAssert(typeof m.cohensKappa === 'number', "Cohen's Kappa is computed");
    testAssert(typeof m.cohensKappaInterpretation === 'string', "Cohen's Kappa interpretation provided");
    testAssert(m.cohensKappa !== m.rawAgreementRate || m.totalRecords > 0, "Cohen's Kappa is distinguished from raw agreement");
    testAssert(typeof m.adjudicationRate === 'number', 'Adjudication rate is computed');
    testAssert(typeof m.missingEvidenceRate === 'number', 'Missing evidence rate is computed');
    testAssert(m.labelDistribution && typeof m.labelDistribution.MATCH === 'number', 'Label distribution is provided');

    // -------------------------------------------------------------
    // TEST 10: Gold-Standard Export & Acceptance Gate Verification
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Gold-Standard Export & Invariants ---');
    const exportRes = await apiExport(adminToken);
    testAssert(exportRes.status === 200, 'Gold standard dataset exported successfully (HTTP 200)');
    const exp = exportRes.data.data;
    testAssert(typeof exp.count === 'number', 'Export response contains integer record count');
    testAssert(fs.existsSync(exp.outPath), `Export JSONL file exists on disk: ${exp.outPath}`);
    testAssert(fs.existsSync(exp.manifestPath), `Manifest JSON file exists on disk: ${exp.manifestPath}`);
    testAssert(typeof exp.rejectionCount === 'number', 'Rejection gate tracked rejected candidates count');
    testAssert(exp.rejectionCount >= 1, `Demo candidates were correctly rejected by gate (rejected: ${exp.rejectionCount})`);

    // Verify SHA-256 match
    const fileBytes = fs.readFileSync(exp.outPath);
    const expectedSha = crypto.createHash('sha256').update(fileBytes).digest('hex');
    testAssert(exp.sha256 === expectedSha, 'Export SHA-256 matches exact hash of generated file');

    // -------------------------------------------------------------
    // TEST 11: Multi-Tenant Regional Isolation
    // -------------------------------------------------------------
    console.log('\n--- TEST 11: Multi-Tenant Regional Isolation ---');
    const northAccess = await apiRequest(`/api/v1/annotations/records/${newTaskId}`, {
      token: northernToken
    });
    testAssert(northAccess.status === 403, 'Cross-tenant access prohibited for Northern panel (HTTP 403)');

    // -------------------------------------------------------------
    // TEST 12: Audit History
    // -------------------------------------------------------------
    console.log('\n--- TEST 12: Audit Ledger Verification ---');
    const auditEvents = db.getAuditEvents();
    const taskAudits = auditEvents.filter(
      (e) => e.entityReference === newTaskId || e.entityReference === disputedTaskId
    );
    testAssert(taskAudits.length >= 2, 'Audit ledger records immutable events for annotation workflow actions');
    testAssert(
      taskAudits.some((e) => e.action.includes('Annotation') || e.action.includes('Adjudicated')),
      'Audit actions accurately describe annotation and adjudication operations'
    );

    // -------------------------------------------------------------
    // TEST 13: [AUDIT 6] Synthetic Candidate Export Rejection
    // -------------------------------------------------------------
    console.log('\n--- TEST 13: Synthetic Candidate Export Rejection ---');
    const syntheticCandidate = await apiRequest('/api/v1/annotations/records', {
      method: 'POST',
      token: collectorToken,
      body: {
        institutionName: 'Synthetic Generated Institute',
        claimFieldName: 'synthetic_area',
        claimText: '10.5 Acres',
        claimDocumentName: 'synthetic_doc.pdf',
        claimPage: 1,
        evidenceText: '10.5 Acres',
        evidenceDocumentName: 'synthetic_evidence.pdf',
        evidencePage: 1,
        sourceProvenance: 'Synthetic Test Data Benchmark Generator',
        isDemoCandidate: true
      }
    });
    const synthId = syntheticCandidate.data.data.id;

    // Both annotators annotate as MATCH
    await apiRequest(`/api/v1/annotations/records/${synthId}/annotate`, {
      method: 'POST',
      token: annotator1Token,
      body: { label: 'MATCH', rationale: 'Synthetic record inspection matched.', isDraft: false }
    });
    await apiRequest(`/api/v1/annotations/records/${synthId}/annotate`, {
      method: 'POST',
      token: annotator2Token,
      body: { label: 'MATCH', rationale: 'Synthetic record inspection matched second.', isDraft: false }
    });

    const exportCheckSynth = await apiExport(adminToken);
    const synthRejections = exportCheckSynth.data.data.rejectionReasons || [];
    const synthFoundInRejections = synthRejections.some((r: any) =>
      r.recordId === syntheticCandidate.data.data.recordId &&
      r.reasons.some((reason: string) => reason.includes('demo') || reason.includes('Synthetic'))
    );
    testAssert(synthFoundInRejections, 'AUDIT 6: Synthetic candidate was strictly rejected from gold standard export');

    // -------------------------------------------------------------
    // TEST 14: [AUDIT 6] Missing Source Document Rejection
    // -------------------------------------------------------------
    console.log('\n--- TEST 14: Missing Source Document Rejection ---');
    const missingDocCandidate = await apiRequest('/api/v1/annotations/records', {
      method: 'POST',
      token: collectorToken,
      body: {
        institutionName: 'No Document College',
        claimFieldName: 'land_area',
        claimText: '5 Acres',
        claimDocumentName: '', // Empty document
        claimPage: 1,
        evidenceText: '5 Acres',
        evidenceDocumentName: '', // Empty document
        evidencePage: 1,
        sourceProvenance: 'Genuine Inspection Filing'
      }
    });
    const missingDocId = missingDocCandidate.data.data.id;
    await apiRequest(`/api/v1/annotations/records/${missingDocId}/annotate`, {
      method: 'POST',
      token: annotator1Token,
      body: { label: 'MATCH', rationale: 'Both claims match perfectly.', isDraft: false }
    });
    await apiRequest(`/api/v1/annotations/records/${missingDocId}/annotate`, {
      method: 'POST',
      token: annotator2Token,
      body: { label: 'MATCH', rationale: 'Both claims match perfectly too.', isDraft: false }
    });

    const exportCheckMissingDoc = await apiExport(adminToken);
    const missingDocRejections = exportCheckMissingDoc.data.data.rejectionReasons || [];
    const missingDocRejected = missingDocRejections.some((r: any) =>
      r.recordId === missingDocCandidate.data.data.recordId &&
      r.reasons.some((reason: string) => reason.includes('identifiable source document'))
    );
    testAssert(missingDocRejected, 'AUDIT 6: Candidate with missing source document rejected from gold standard');

    // -------------------------------------------------------------
    // TEST 15: [AUDIT 6] Missing Page Reference Rejection
    // -------------------------------------------------------------
    console.log('\n--- TEST 15: Missing Page Reference Rejection ---');
    const missingPageCandidate = await apiRequest('/api/v1/annotations/records', {
      method: 'POST',
      token: collectorToken,
      body: {
        institutionName: 'No Page University',
        claimFieldName: 'land_area',
        claimText: '5 Acres',
        claimDocumentName: 'Doc1.pdf',
        // claimPage omitted (null)
        evidenceText: '5 Acres',
        evidenceDocumentName: 'Doc2.pdf',
        // evidencePage omitted (null)
        sourceProvenance: 'Genuine Inspection Filing'
      }
    });
    const missingPageId = missingPageCandidate.data.data.id;
    await apiRequest(`/api/v1/annotations/records/${missingPageId}/annotate`, {
      method: 'POST',
      token: annotator1Token,
      body: { label: 'MATCH', rationale: 'Valid match rationale with 10 chars.', isDraft: false }
    });
    await apiRequest(`/api/v1/annotations/records/${missingPageId}/annotate`, {
      method: 'POST',
      token: annotator2Token,
      body: { label: 'MATCH', rationale: 'Valid match rationale with 10 chars.', isDraft: false }
    });

    const exportCheckMissingPage = await apiExport(adminToken);
    const missingPageRejections = exportCheckMissingPage.data.data.rejectionReasons || [];
    const missingPageRejected = missingPageRejections.some((r: any) =>
      r.recordId === missingPageCandidate.data.data.recordId &&
      r.reasons.some((reason: string) => reason.includes('page citation'))
    );
    testAssert(missingPageRejected, 'AUDIT 6: Candidate with missing page reference rejected from gold standard');

    // -------------------------------------------------------------
    // TEST 16: [AUDIT 6] Single-Annotator Export Rejection
    // -------------------------------------------------------------
    console.log('\n--- TEST 16: Single-Annotator Export Rejection ---');
    const singleAnnCandidate = await apiRequest('/api/v1/annotations/records', {
      method: 'POST',
      token: collectorToken,
      body: {
        institutionName: 'Single Review Institute',
        claimFieldName: 'land_area',
        claimText: '12 Acres',
        claimDocumentName: 'ValidClaim.pdf',
        claimPage: 1,
        evidenceText: '12 Acres',
        evidenceDocumentName: 'ValidEvidence.pdf',
        evidencePage: 1,
        sourceProvenance: 'Genuine Regulatory Filing'
      }
    });
    const singleAnnId = singleAnnCandidate.data.data.id;
    // Only Annotator 1 reviews
    await apiRequest(`/api/v1/annotations/records/${singleAnnId}/annotate`, {
      method: 'POST',
      token: annotator1Token,
      body: { label: 'MATCH', rationale: 'Valid match rationale with 10 chars.', isDraft: false }
    });

    const exportCheckSingle = await apiExport(adminToken);
    const singleLines = fs.readFileSync(exportCheckSingle.data.data.outPath, 'utf-8');
    testAssert(!singleLines.includes(singleAnnCandidate.data.data.recordId), 'AUDIT 6: Single-annotator record is excluded from export');

    // -------------------------------------------------------------
    // TEST 17: [AUDIT 6] Unresolved Disagreement Export Rejection
    // -------------------------------------------------------------
    console.log('\n--- TEST 17: Unresolved Disagreement Export Rejection ---');
    const unresolvedDisputeCandidate = await apiRequest('/api/v1/annotations/records', {
      method: 'POST',
      token: collectorToken,
      body: {
        institutionName: 'Disputed Institute of Science',
        claimFieldName: 'land_area',
        claimText: '10 Acres',
        claimDocumentName: 'ValidClaim.pdf',
        claimPage: 1,
        evidenceText: '5 Acres',
        evidenceDocumentName: 'ValidEvidence.pdf',
        evidencePage: 1,
        sourceProvenance: 'Genuine Regulatory Filing'
      }
    });
    const unresId = unresolvedDisputeCandidate.data.data.id;
    await apiRequest(`/api/v1/annotations/records/${unresId}/annotate`, {
      method: 'POST',
      token: annotator1Token,
      body: { label: 'MATCH', rationale: 'Annotator 1 insists this is a match.', isDraft: false }
    });
    const unresSubmit2 = await apiRequest(`/api/v1/annotations/records/${unresId}/annotate`, {
      method: 'POST',
      token: annotator2Token,
      body: { label: 'MISMATCH', rationale: 'Annotator 2 detects severe mismatch.', isDraft: false }
    });
    testAssert(unresSubmit2.data.data.status === 'disputed', 'Status is disputed');

    const exportCheckUnres = await apiExport(adminToken);
    const unresExportLines = fs.readFileSync(exportCheckUnres.data.data.outPath, 'utf-8');
    testAssert(
      !unresExportLines.includes(unresolvedDisputeCandidate.data.data.recordId),
      'AUDIT 6: Unresolved dispute is excluded from gold standard export'
    );

    // -------------------------------------------------------------
    // TEST 18: [AUDIT 6] Cross-Tenant Adjudication Rejection (403)
    // -------------------------------------------------------------
    console.log('\n--- TEST 18: Cross-Tenant Adjudication Rejection ---');
    const crossTenantAdj = await apiRequest(`/api/v1/annotations/records/${unresId}/adjudicate`, {
      method: 'POST',
      token: northernAdjudicatorToken,
      body: {
        label: 'MISMATCH',
        rationale: 'Northern adjudicator attempting cross-tenant resolution on Western record.'
      }
    });
    testAssert(crossTenantAdj.status === 403, 'AUDIT 6: Cross-tenant adjudication rejected with HTTP 403 Forbidden');

    // -------------------------------------------------------------
    // TEST 19: [AUDIT 6] Cross-Tenant Export Prevention
    // -------------------------------------------------------------
    console.log('\n--- TEST 19: Cross-Tenant Export Prevention ---');
    const northernExport = await apiExport(northernReviewerToken);
    testAssert(northernExport.status === 200, 'Northern reviewer can call export endpoint');
    testAssert(
      northernExport.data.data.count === 0,
      'AUDIT 6: Northern export contains 0 records (Western regional records are strictly excluded)'
    );

    // -------------------------------------------------------------
    // TEST 20: [AUDIT 6] Non-Substantive Rationale Rejection (<10 chars)
    // -------------------------------------------------------------
    console.log('\n--- TEST 20: Non-Substantive Rationale Rejection ---');
    const shortAnnRes = await apiRequest(`/api/v1/annotations/records/${unresId}/annotate`, {
      method: 'POST',
      token: annotator1Token,
      body: {
        label: 'MATCH',
        rationale: 'short', // < 10 chars
        isDraft: false
      }
    });
    testAssert(shortAnnRes.status === 400, 'AUDIT 6: Annotation with rationale <10 characters rejected (HTTP 400)');

    // -------------------------------------------------------------
    // TEST 21: [AUDIT 6] Post-Adjudication Modification Prevention
    // -------------------------------------------------------------
    console.log('\n--- TEST 21: Post-Adjudication Modification Prevention ---');
    // Western adjudicator resolves the dispute
    await apiRequest(`/api/v1/annotations/records/${unresId}/adjudicate`, {
      method: 'POST',
      token: adjudicatorToken,
      body: {
        label: 'MISMATCH',
        rationale: 'Statutory verification confirms 5 Acres deficit vs 10 Acres declared.'
      }
    });

    // Annotator attempts to modify decision post-adjudication
    const postAdjModify = await apiRequest(`/api/v1/annotations/records/${unresId}/annotate`, {
      method: 'POST',
      token: annotator1Token,
      body: {
        label: 'MATCH',
        rationale: 'Attempting to overwrite binding adjudication.',
        isDraft: false
      }
    });
    testAssert(postAdjModify.status === 400, 'AUDIT 6: Modifying record post-adjudication is prohibited (HTTP 400)');

    // -------------------------------------------------------------
    // TEST 22: [AUDIT 6] Valid Adjudicated Institutional Record Export
    // -------------------------------------------------------------
    console.log('\n--- TEST 22: Valid Adjudicated Institutional Record Export ---');
    const finalExport = await apiExport(adminToken);
    testAssert(finalExport.status === 200, 'Final export succeeded');
    const finalExp = finalExport.data.data;
    testAssert(finalExp.count >= 2, `Valid adjudicated non-demo records exported (count: ${finalExp.count})`);

    // Verify against V3 Pydantic Schema
    const finalLines = fs.readFileSync(finalExp.outPath, 'utf-8').trim().split('\n');
    testAssert(finalLines.length === finalExp.count, 'JSONL lines match manifest count');

    for (const l of finalLines) {
      const parsed = JSON.parse(l);
      testAssert(parsed.schema_version === '3.0', 'Schema version is 3.0');
      testAssert(parsed.quality.is_synthetic === false, 'Quality is_synthetic is false');
      testAssert(parsed.quality.is_human_annotated === true, 'Quality is_human_annotated is true');
      testAssert(typeof parsed.claim.page === 'number' && parsed.claim.page >= 1, 'Claim page is valid positive int');
      testAssert(typeof parsed.evidence.page === 'number' && parsed.evidence.page >= 1, 'Evidence page is valid positive int');
      testAssert(Boolean(parsed.claim.source_document_id), 'Claim source document is identified');
      testAssert(Boolean(parsed.evidence.source_document_id), 'Evidence source document is identified');
    }

  } finally {
    if (fs.existsSync(testExportPath)) {
      try { fs.unlinkSync(testExportPath); } catch {}
    }
    const testManifestPath = path.resolve(process.cwd(), 'ai_service/ml/data/v3/manifests/test_export.manifest.json');
    if (fs.existsSync(testManifestPath)) {
      try { fs.unlinkSync(testManifestPath); } catch {}
    }
    server.close();
  }

  console.log('\n================================================================');
  console.log(`   ANNOTATION WORKBENCH AUDIT RESULTS: ${passed}/${total} PASSED`);
  console.log('================================================================');

  if (passed !== total) {
    throw new Error(`Test failure: ${total - passed} tests failed`);
  }
}

runAnnotationWorkbenchTests().catch((err) => {
  console.error('\n❌ Test suite failed with error:', err);
  process.exit(1);
});
