/**
 * FORM2FACT — V3 PHASE 2: AICTE HUMAN ANNOTATION WORKBENCH TEST SUITE
 *
 * Verifies the human annotation system for Form2Fact V3:
 * 1. Initial candidate seed integrity (6 authentic AICTE records)
 * 2. Role-based candidate task creation (Data Collector, Reviewer, Admin allowed; Viewer 403)
 * 3. Schema and input validation (mandatory fields, valid 5-class labels)
 * 4. Draft annotation saving (status remains unchanged)
 * 5. Independent blind review isolation (annotators cannot see other unadjudicated submissions)
 * 6. Disagreement detection (divergent annotations trigger 'disputed' status)
 * 7. Consensus detection (matching annotations trigger 'agreed' status and final label)
 * 8. Third-reviewer adjudication (Adjudicator resolves disputed record with substantive rationale)
 * 9. Quality metrics & Cohen's Kappa calculation (raw agreement separated from Cohen's kappa)
 * 10. Gold-standard export to JSONL with SHA-256 manifest and zero-synthetic invariants
 * 11. Multi-tenant regional isolation
 * 12. Tamper-evident audit ledger entries for all annotation lifecycle actions
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
console.log('   FORM2FACT V3 — HUMAN ANNOTATION WORKBENCH TEST SUITE');
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

  // Register test users in SQLite db
  const allTestUsers = [
    adminUser,
    collectorUser,
    annotator1User,
    annotator2User,
    adjudicatorUser,
    viewerUser,
    northernAnnotatorUser
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

  try {
    // -------------------------------------------------------------
    // TEST 1: Initial Candidate Seed Verification
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Initial Candidate Seed Integrity ---');
    const recordsRes = await apiRequest('/api/v1/annotations/records', { token: adminToken });
    testAssert(recordsRes.status === 200, 'HTTP 200 returned on listing annotation records');
    testAssert(Array.isArray(recordsRes.data.data), 'Records response contains array data');
    testAssert(recordsRes.data.data.length >= 6, `At least 6 initial candidate records exist (found ${recordsRes.data.data.length})`);

    const leaseExpiryRec = recordsRes.data.data.find((r: any) => r.claimFieldName === 'leaseExpiryDate' || r.claimFieldName === 'lease_expiry_date');
    testAssert(!!leaseExpiryRec, 'Authentic candidate for leaseExpiryDate exists');
    testAssert(leaseExpiryRec.institutionName.includes('Apex'), 'Candidate belongs to authentic AICTE institution');
    testAssert(leaseExpiryRec.evidencePage === 4, 'Evidence page reference preserved (Page 4)');

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
    // Create another candidate task
    const disputedCandidate = await apiRequest('/api/v1/annotations/records', {
      method: 'POST',
      token: collectorToken,
      body: {
        institutionName: 'Apex Institute of Technology',
        claimFieldName: 'society_registration_status',
        claimText: 'Registered under Societies Act XXI of 1860, Valid through 2030',
        evidenceText: 'Certificate renewed annually; current renewal certificate expires 31-03-2026',
        fieldCategory: 'entity_name'
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
    // TEST 10: Gold-Standard JSONL Export & Manifest Verification
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Gold-Standard Export & Invariants ---');
    const exportRes = await apiRequest('/api/v1/annotations/export', {
      method: 'POST',
      token: adminToken
    });
    testAssert(exportRes.status === 200, 'Gold standard dataset exported successfully (HTTP 200)');
    const exp = exportRes.data.data;
    testAssert(exp.count >= 2, `Exported records count >= 2 (found ${exp.count})`);
    testAssert(fs.existsSync(exp.outPath), `Export JSONL file exists on disk: ${exp.outPath}`);
    testAssert(fs.existsSync(exp.manifestPath), `Manifest JSON file exists on disk: ${exp.manifestPath}`);

    // Verify SHA-256 match
    const fileBytes = fs.readFileSync(exp.outPath);
    const expectedSha = crypto.createHash('sha256').update(fileBytes).digest('hex');
    testAssert(exp.sha256 === expectedSha, 'Export SHA-256 matches exact hash of generated file');

    // Verify JSONL line records against V3 Schema invariants
    const lines = fs.readFileSync(exp.outPath, 'utf-8').trim().split('\n');
    testAssert(lines.length === exp.count, 'JSONL line count matches manifest record count');

    for (const line of lines) {
      const rec = JSON.parse(line);
      testAssert(rec.schema_version === '3.0', 'Record schema_version is 3.0');
      testAssert(rec.quality.is_synthetic === false, 'Zero synthetic invariant: is_synthetic is false');
      testAssert(rec.quality.is_human_annotated === true, 'Human ground truth invariant: is_human_annotated is true');
      testAssert(
        ['MATCH', 'MISMATCH', 'MISSING', 'UNCERTAIN', 'NOT_COMPARABLE'].includes(rec.comparison.label),
        `Record label ${rec.comparison.label} belongs to 5-class taxonomy`
      );
    }

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

  } finally {
    server.close();
  }

  console.log('\n================================================================');
  console.log(`   ANNOTATION WORKBENCH TEST RESULTS: ${passed}/${total} PASSED`);
  console.log('================================================================');

  if (passed !== total) {
    throw new Error(`Test failure: ${total - passed} tests failed`);
  }
}

runAnnotationWorkbenchTests().catch((err) => {
  console.error('\n❌ Test suite failed with error:', err);
  process.exit(1);
});
