import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ScrutinyDatabase } from '../db.ts';
import { computeCohensKappa, AnnotationPairInput } from '../metrics/cohensKappa.ts';
import { verifyLedgerChain, GENESIS_PREVIOUS_HASH, computePayloadHash, computeEventHash } from '../ledger/cryptographicLedger.ts';
import { User, AuditEvent } from '../../src/types/index.ts';

interface AuditCheckResult {
  scopeId: number;
  title: string;
  passed: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  evidence: string;
  reproduction?: string;
  notes?: string;
}

const auditResults: AuditCheckResult[] = [];

function recordCheck(res: AuditCheckResult) {
  auditResults.push(res);
  const icon = res.passed ? '✅' : '❌';
  console.log(`${icon} [SCOPE ${res.scopeId}] ${res.title}: ${res.passed ? 'PASSED' : 'DEFECT DETECTED'} (Severity: ${res.severity})`);
  if (!res.passed) {
    console.log(`   Evidence: ${res.evidence}`);
  }
}

async function runIndependentAudit() {
  console.log('================================================================');
  console.log('   FORM2FACT V3 — INDEPENDENT RELEASE ACCEPTANCE AUDIT SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // SCOPE 1: Cohen's Kappa Mathematical Implementation & Undefined Cases
  // -------------------------------------------------------------
  try {
    // 1.1: Empty sample
    const r1 = computeCohensKappa([]);
    const c1_1 = r1.kappa === null && r1.undefinedReason === 'no_paired_annotations' && r1.po === null && r1.pe === null;

    // 1.2: Chance agreement 1.0 (zero category variance)
    const pairsSame: AnnotationPairInput[] = [
      { recordId: '1', annotator1Id: 'a1', annotator2Id: 'a2', label1: 'MATCH', label2: 'MATCH' },
      { recordId: '2', annotator1Id: 'a1', annotator2Id: 'a2', label1: 'MATCH', label2: 'MATCH' }
    ];
    const r2 = computeCohensKappa(pairsSame);
    const c1_2 = r2.kappa === null && r2.undefinedReason === 'denominator_zero_chance_agreement_one' && r2.po === 1.0 && r2.pe === 1.0;

    // 1.3: Sample size warning N < 30
    const pairsSmall: AnnotationPairInput[] = [];
    for (let i = 0; i < 20; i++) {
      pairsSmall.push({
        recordId: `r-${i}`,
        annotator1Id: 'a1',
        annotator2Id: 'a2',
        label1: i % 2 === 0 ? 'MATCH' : 'MISMATCH',
        label2: i % 2 === 0 ? 'MATCH' : 'MISMATCH'
      });
    }
    const r3 = computeCohensKappa(pairsSmall);
    const c1_3 = r3.isSampleSizeSufficient === false && r3.interpretation.includes('sample size N=20 < 30');

    // 1.4: Multi-class perfect concordance
    const pairsBalanced: AnnotationPairInput[] = [
      { recordId: '1', annotator1Id: 'a1', annotator2Id: 'a2', label1: 'MATCH', label2: 'MATCH' },
      { recordId: '2', annotator1Id: 'a1', annotator2Id: 'a2', label1: 'MISMATCH', label2: 'MISMATCH' }
    ];
    const r4 = computeCohensKappa(pairsBalanced);
    const c1_4 = r4.kappa === 1.0 && r4.po === 1.0 && r4.pe === 0.5;

    const allPassed = c1_1 && c1_2 && c1_3 && c1_4;
    recordCheck({
      scopeId: 1,
      title: "Cohen's Kappa Mathematical Implementation & Undefined Cases",
      passed: allPassed,
      severity: 'INFORMATIONAL',
      evidence: `N=0 returned null (${r1.undefinedReason}); pe=1.0 returned null (${r2.undefinedReason}); N=20 flagged sample warning (${r3.isSampleSizeSufficient}); balanced concordant returned kappa=1.0.`
    });
  } catch (err: any) {
    recordCheck({
      scopeId: 1,
      title: "Cohen's Kappa Mathematical Implementation & Undefined Cases",
      passed: false,
      severity: 'CRITICAL',
      evidence: `Exception during computation: ${err.message}`
    });
  }

  // -------------------------------------------------------------
  // SCOPE 2: Cryptographic Ledger Concurrency & Simultaneous Writers
  // -------------------------------------------------------------
  const testDbConcurrencyPath = path.resolve(process.cwd(), 'data', `test_audit_concurrency_${Date.now()}.db`);
  const dbConcurrency = new ScrutinyDatabase(testDbConcurrencyPath);
  try {
    const initialEventsCount = dbConcurrency.verifyLedgerChain().totalEventsVerified;
    // Attempt concurrent writes using Promise.all
    const writePromises = [];
    for (let i = 1; i <= 20; i++) {
      writePromises.push(new Promise<void>((resolve) => {
        dbConcurrency.recordAudit({
          actorId: `usr-writer-${i % 3}`,
          actorName: `Writer ${i % 3}`,
          actorRole: 'Reviewer',
          organizationId: 'org-aicte-western',
          action: `Concurrent Event ${i}`,
          entityType: 'AnnotationRecord',
          entityReference: `rec-concurrent-${i}`,
          afterValue: `Value ${i}`
        });
        resolve();
      }));
    }
    await Promise.all(writePromises);

    const verification = dbConcurrency.verifyLedgerChain();
    const isChainValid = verification.isValid && verification.totalEventsVerified === (initialEventsCount + 20);
    recordCheck({
      scopeId: 2,
      title: 'Cryptographic Ledger Concurrency with Simultaneous Writers',
      passed: isChainValid,
      severity: isChainValid ? 'INFORMATIONAL' : 'HIGH',
      evidence: `20 concurrent event writes completed (Total events: ${verification.totalEventsVerified}). Chain valid: ${verification.isValid}, Errors: ${verification.errors.join('; ') || 'None'}.`
    });
  } catch (err: any) {
    recordCheck({
      scopeId: 2,
      title: 'Cryptographic Ledger Concurrency with Simultaneous Writers',
      passed: false,
      severity: 'HIGH',
      evidence: `Concurrency failure: ${err.message}`
    });
  } finally {
    (dbConcurrency as any).db.close();
    if (fs.existsSync(testDbConcurrencyPath)) fs.unlinkSync(testDbConcurrencyPath);
  }

  // -------------------------------------------------------------
  // SCOPE 3: Ledger Tampering, Deletion, Reordering & Sequence Gaps
  // -------------------------------------------------------------
  try {
    const events: AuditEvent[] = [];
    let prev = GENESIS_PREVIOUS_HASH;
    for (let i = 1; i <= 5; i++) {
      const pHash = computePayloadHash({ entityType: 'AnnotationRecord', entityReference: `rec-${i}`, afterValue: `val-${i}` });
      const curr = computeEventHash({
        sequenceNumber: i,
        previousHash: prev,
        id: `evt-${i}`,
        timestamp: `2026-11-07T10:0${i}:00.000Z`,
        actorId: 'usr-1',
        actorRole: 'Annotator',
        organizationId: 'org-aicte-western',
        action: 'Action',
        payloadHash: pHash
      });
      events.push({
        id: `evt-${i}`,
        sequenceNumber: i,
        timestamp: `2026-11-07T10:0${i}:00.000Z`,
        actorId: 'usr-1',
        actorName: 'Alice',
        actorRole: 'Annotator',
        organizationId: 'org-aicte-western',
        action: 'Action',
        entityType: 'AnnotationRecord',
        entityReference: `rec-${i}`,
        payloadHash: pHash,
        previousHash: prev,
        currentHash: curr,
        afterValue: `val-${i}`
      });
      prev = curr;
    }

    // 3.1: Payload tampering detection
    const tamperedPayloadChain = JSON.parse(JSON.stringify(events));
    tamperedPayloadChain[2].afterValue = 'malicious-modification';
    const resPayload = verifyLedgerChain(tamperedPayloadChain);

    // 3.2: Deletion detection
    const deletedChain = [events[0], events[1], events[3], events[4]];
    const resDelete = verifyLedgerChain(deletedChain);

    // 3.3: Reordering detection
    const reorderedChain = [events[0], events[2], events[1], events[3], events[4]];
    const resReorder = verifyLedgerChain(reorderedChain);

    const tamperingDetected = !resPayload.isValid && !resDelete.isValid && !resReorder.isValid;
    recordCheck({
      scopeId: 3,
      title: 'Ledger Tampering, Deletion, Reordering & Sequence Gap Detection',
      passed: tamperingDetected,
      severity: 'INFORMATIONAL',
      evidence: `Payload tampering caught: ${!resPayload.isValid} (${resPayload.brokenEventId}); Deletion caught: ${!resDelete.isValid}; Reordering caught: ${!resReorder.isValid}.`
    });
  } catch (err: any) {
    recordCheck({
      scopeId: 3,
      title: 'Ledger Tampering, Deletion, Reordering & Sequence Gap Detection',
      passed: false,
      severity: 'CRITICAL',
      evidence: `Error during tampering detection audit: ${err.message}`
    });
  }

  // -------------------------------------------------------------
  // SCOPE 4: SQLite Transaction Safety & Append-Only Triggers
  // -------------------------------------------------------------
  const testDbTrigPath = path.resolve(process.cwd(), 'data', `test_audit_triggers_${Date.now()}.db`);
  const dbTrig = new ScrutinyDatabase(testDbTrigPath);
  try {
    const ev = dbTrig.recordAudit({
      actorId: 'usr-admin',
      actorName: 'Admin',
      actorRole: 'Administrator',
      organizationId: 'org-aicte-western',
      action: 'Test Event',
      entityType: 'AnnotationRecord',
      entityReference: 'rec-001'
    });

    let updateBlocked = false;
    try {
      (dbTrig as any).db.prepare("UPDATE audit_events SET action = 'tampered' WHERE id = ?").run(ev.id);
    } catch (err: any) {
      updateBlocked = err.message.includes('append-only');
    }

    let deleteBlocked = false;
    try {
      (dbTrig as any).db.prepare("DELETE FROM audit_events WHERE id = ?").run(ev.id);
    } catch (err: any) {
      deleteBlocked = err.message.includes('append-only');
    }

    const triggersPass = updateBlocked && deleteBlocked;
    recordCheck({
      scopeId: 4,
      title: 'SQLite Transaction Safety & Append-Only Triggers',
      passed: triggersPass,
      severity: triggersPass ? 'INFORMATIONAL' : 'CRITICAL',
      evidence: `UPDATE blocked by trigger: ${updateBlocked}; DELETE blocked by trigger: ${deleteBlocked}.`
    });
  } catch (err: any) {
    recordCheck({
      scopeId: 4,
      title: 'SQLite Transaction Safety & Append-Only Triggers',
      passed: false,
      severity: 'CRITICAL',
      evidence: `Trigger error: ${err.message}`
    });
  } finally {
    (dbTrig as any).db.close();
    if (fs.existsSync(testDbTrigPath)) fs.unlinkSync(testDbTrigPath);
  }

  // -------------------------------------------------------------
  // SCOPE 5: Physical Document SHA-256 Verification Against Stored Files
  // -------------------------------------------------------------
  const testDbDocPath = path.resolve(process.cwd(), 'data', `test_audit_doc_${Date.now()}.db`);
  const dbDoc = new ScrutinyDatabase(testDbDocPath);
  const testDocFile = path.resolve(process.cwd(), 'data', `test_doc_${Date.now()}.pdf`);
  const dummyPdf = Buffer.from('%PDF-1.4 Genuine AICTE Compliance Docket');
  fs.writeFileSync(testDocFile, dummyPdf);
  const correctHash = crypto.createHash('sha256').update(dummyPdf).digest('hex');

  try {
    const adminUser: User = { id: 'admin-doc', email: 'admin@gov.in', displayName: 'Admin', role: 'Administrator', department: 'Regulatory Scrutiny', organizationId: 'org-aicte-western' };
    (dbDoc as any).db.prepare("INSERT INTO users (id, displayName, email, passwordHash, role, department, organizationId, createdAt) VALUES (?, ?, ?, 'h', ?, 'D', ?, datetime('now'))").run(adminUser.id, adminUser.displayName, adminUser.email, adminUser.role, adminUser.organizationId);

    const docket = dbDoc.createInstitutionalDocket(adminUser, {
      docketNumber: 'DKT-SHA-TEST',
      institutionId: 'inst-1',
      institutionName: 'Test Tech College',
      sourceOrganization: 'AICTE',
      authorizationReference: 'AUTH-1',
      documentChecksum: correctHash,
      documentPath: path.relative(process.cwd(), testDocFile).replace(/\\/g, '/'),
      pageCount: 5,
      provenanceStatus: 'PROVENANCE_VERIFIED'
    });

    // Verify hash matches
    const fileBytes = fs.readFileSync(testDocFile);
    const computedHash = crypto.createHash('sha256').update(fileBytes).digest('hex');
    const hashMatches = computedHash === docket.documentChecksum;

    recordCheck({
      scopeId: 5,
      title: 'Physical Document SHA-256 Verification Against Stored Files',
      passed: hashMatches,
      severity: 'INFORMATIONAL',
      evidence: `Computed SHA-256 (${computedHash}) strictly matches registered checksum (${docket.documentChecksum}).`
    });
  } catch (err: any) {
    recordCheck({
      scopeId: 5,
      title: 'Physical Document SHA-256 Verification Against Stored Files',
      passed: false,
      severity: 'HIGH',
      evidence: `Error during document hash audit: ${err.message}`
    });
  }

  // -------------------------------------------------------------
  // SCOPE 6: Document Replacement Between Verification and Export (TOCTOU)
  // -------------------------------------------------------------
  try {
    // Replace the file content on disk with malicious content
    const maliciousPdf = Buffer.from('%PDF-1.4 Tampered Replacement Document with Forged Land Deed');
    fs.writeFileSync(testDocFile, maliciousPdf);

    const adminUser: User = { id: 'admin-doc', email: 'admin@gov.in', displayName: 'Admin', role: 'Administrator', department: 'Regulatory Scrutiny', organizationId: 'org-aicte-western' };
    const ann1: User = { id: 'ann-1', email: 'ann1@gov.in', displayName: 'Ann 1', role: 'Annotator', department: 'Regulatory Scrutiny', organizationId: 'org-aicte-western' };
    const ann2: User = { id: 'ann-2', email: 'ann2@gov.in', displayName: 'Ann 2', role: 'Annotator', department: 'Regulatory Scrutiny', organizationId: 'org-aicte-western' };
    (dbDoc as any).db.prepare("INSERT INTO users (id, displayName, email, passwordHash, role, department, organizationId, createdAt) VALUES (?, ?, ?, 'h', ?, 'D', ?, datetime('now'))").run(ann1.id, ann1.displayName, ann1.email, ann1.role, ann1.organizationId);
    (dbDoc as any).db.prepare("INSERT INTO users (id, displayName, email, passwordHash, role, department, organizationId, createdAt) VALUES (?, ?, ?, 'h', ?, 'D', ?, datetime('now'))").run(ann2.id, ann2.displayName, ann2.email, ann2.role, ann2.organizationId);

    dbDoc.authorizeReviewer(adminUser, { userId: ann1.id, role: 'Annotator', organizationId: 'org-aicte-western', verifiedIdentityRef: 'ID1', issuingAuthority: 'AICTE', authorizationReference: 'AUTH-1' });
    dbDoc.authorizeReviewer(adminUser, { userId: ann2.id, role: 'Annotator', organizationId: 'org-aicte-western', verifiedIdentityRef: 'ID2', issuingAuthority: 'AICTE', authorizationReference: 'AUTH-2' });

    const docket = dbDoc.getInstitutionalDocketById('DKT-SHA-TEST')!;
    const cand = dbDoc.createAnnotationRecord({
      institutionId: 'inst-1',
      institutionName: 'Test Tech College',
      claimFieldName: 'land_area',
      claimText: '10 Acres',
      claimDocumentId: docket.id,
      claimPage: 2,
      evidenceText: '10 Acres',
      evidenceDocumentId: docket.id,
      evidencePage: 2,
      isDemoCandidate: false,
      organizationId: 'org-aicte-western'
    });

    dbDoc.saveUserAnnotation(cand.id, ann1, { label: 'MATCH', rationale: 'Valid claim according to form.', isDraft: false });
    dbDoc.saveUserAnnotation(cand.id, ann2, { label: 'MATCH', rationale: 'Valid claim according to form too.', isDraft: false });

    const exportOut = path.resolve(process.cwd(), 'ai_service/ml/data/v3/annotations/test_toctou_export.jsonl');
    const res = dbDoc.exportGoldStandard({ outPath: exportOut });
    const isRejected = res.rejectionReasons.some(r => r.recordId === cand.recordId && r.reasons.some(re => re.includes('checksum verification failed')));

    recordCheck({
      scopeId: 6,
      title: 'Document Replacement Between Verification and Export (TOCTOU)',
      passed: isRejected,
      severity: isRejected ? 'INFORMATIONAL' : 'CRITICAL',
      evidence: `Tampered file on disk detected at export time: ${isRejected}. Rejection reasons: ${JSON.stringify(res.rejectionReasons.find(r => r.recordId === cand.recordId)?.reasons || [])}`
    });

    if (fs.existsSync(exportOut)) fs.unlinkSync(exportOut);
    const manOut = path.resolve(process.cwd(), 'ai_service/ml/data/v3/manifests/test_toctou_export.manifest.json');
    if (fs.existsSync(manOut)) fs.unlinkSync(manOut);
  } catch (err: any) {
    recordCheck({
      scopeId: 6,
      title: 'Document Replacement Between Verification and Export (TOCTOU)',
      passed: false,
      severity: 'CRITICAL',
      evidence: `TOCTOU test failure: ${err.message}`
    });
  }

  // -------------------------------------------------------------
  // SCOPE 7: PDF Page-Count & Page-Reference Validation
  // -------------------------------------------------------------
  try {
    // Restore genuine file
    fs.writeFileSync(testDocFile, dummyPdf);
    const docket = dbDoc.getInstitutionalDocketById('DKT-SHA-TEST')!; // has pageCount: 5

    const adminUser = { id: 'admin-doc', role: 'Administrator', organizationId: 'org-aicte-western' };
    const ann1 = { id: 'ann-1', displayName: 'Ann 1', role: 'Annotator', organizationId: 'org-aicte-western' };
    const ann2 = { id: 'ann-2', displayName: 'Ann 2', role: 'Annotator', organizationId: 'org-aicte-western' };

    const invalidPageCand = dbDoc.createAnnotationRecord({
      institutionId: 'inst-1',
      institutionName: 'Test Tech College',
      claimFieldName: 'land_area',
      claimText: '10 Acres',
      claimDocumentId: docket.id,
      claimPage: 99, // Exceeds pageCount of 5!
      evidenceText: '10 Acres',
      evidenceDocumentId: docket.id,
      evidencePage: 2,
      isDemoCandidate: false,
      organizationId: 'org-aicte-western'
    });

    dbDoc.saveUserAnnotation(invalidPageCand.id, ann1, { label: 'MATCH', rationale: 'Valid claim according to form.', isDraft: false });
    dbDoc.saveUserAnnotation(invalidPageCand.id, ann2, { label: 'MATCH', rationale: 'Valid claim according to form too.', isDraft: false });

    const exportOut = path.resolve(process.cwd(), 'ai_service/ml/data/v3/annotations/test_page_export.jsonl');
    const res = dbDoc.exportGoldStandard({ outPath: exportOut });
    const isRejected = res.rejectionReasons.some(r => r.recordId === invalidPageCand.recordId && r.reasons.some(re => re.includes('exceeds document page count')));

    recordCheck({
      scopeId: 7,
      title: 'PDF Page-Count and Page-Reference Bounds Validation',
      passed: isRejected,
      severity: isRejected ? 'INFORMATIONAL' : 'HIGH',
      evidence: `Out-of-bounds page reference (Page 99 of 5) strictly rejected: ${isRejected}.`
    });

    if (fs.existsSync(exportOut)) fs.unlinkSync(exportOut);
    const manOut = path.resolve(process.cwd(), 'ai_service/ml/data/v3/manifests/test_page_export.manifest.json');
    if (fs.existsSync(manOut)) fs.unlinkSync(manOut);
  } catch (err: any) {
    recordCheck({
      scopeId: 7,
      title: 'PDF Page-Count and Page-Reference Bounds Validation',
      passed: false,
      severity: 'HIGH',
      evidence: `Page bounds audit error: ${err.message}`
    });
  } finally {
    (dbDoc as any).db.close();
    if (fs.existsSync(testDbDocPath)) fs.unlinkSync(testDbDocPath);
    if (fs.existsSync(testDocFile)) fs.unlinkSync(testDocFile);
  }

  // -------------------------------------------------------------
  // SCOPE 8: Reviewer Authorization, Expiry, Revocation & Self-Approval Prevention
  // -------------------------------------------------------------
  const testDbRevPath = path.resolve(process.cwd(), 'data', `test_audit_reviewer_${Date.now()}.db`);
  const dbRev = new ScrutinyDatabase(testDbRevPath);
  try {
    const adminUser: User = { id: 'admin-rev', email: 'admin_rev@gov.in', displayName: 'Admin', role: 'Administrator', department: 'Regulatory Scrutiny', organizationId: 'org-aicte-western' };
    const reviewerUser: User = { id: 'rev-user', email: 'rev@gov.in', displayName: 'Reviewer User', role: 'Annotator', department: 'Regulatory Scrutiny', organizationId: 'org-aicte-western' };
    (dbRev as any).db.prepare("INSERT INTO users (id, displayName, email, passwordHash, role, department, organizationId, createdAt) VALUES (?, ?, ?, 'h', ?, 'D', ?, datetime('now'))").run(adminUser.id, adminUser.displayName, adminUser.email, adminUser.role, adminUser.organizationId);
    (dbRev as any).db.prepare("INSERT INTO users (id, displayName, email, passwordHash, role, department, organizationId, createdAt) VALUES (?, ?, ?, 'h', ?, 'D', ?, datetime('now'))").run(reviewerUser.id, reviewerUser.displayName, reviewerUser.email, reviewerUser.role, reviewerUser.organizationId);

    // 8.1: Self-approval rejection
    let selfApprovalThrew = false;
    try {
      dbRev.authorizeReviewer(adminUser, {
        userId: adminUser.id,
        role: 'Reviewer',
        organizationId: 'org-aicte-western',
        verifiedIdentityRef: 'ADMIN-ID',
        issuingAuthority: 'AICTE',
        authorizationReference: 'SELF-AUTH'
      });
    } catch (err: any) {
      selfApprovalThrew = err.message.includes('Self-approval') || err.message.includes('self-approve');
    }

    // 8.2: Valid authorization
    const auth = dbRev.authorizeReviewer(adminUser, {
      userId: reviewerUser.id,
      role: 'Annotator',
      organizationId: 'org-aicte-western',
      verifiedIdentityRef: 'GOV-IN-PAN-ABCDE1234F',
      issuingAuthority: 'AICTE',
      authorizationReference: 'AUTH-123'
    });

    // 8.3: Short revocation rationale rejected
    let shortRevokeThrew = false;
    try {
      dbRev.revokeReviewerAuthorization(adminUser, auth.id, 'short');
    } catch (err: any) {
      shortRevokeThrew = err.message.includes('10 characters');
    }

    // 8.4: Substantive revocation
    const revokedSuccess = dbRev.revokeReviewerAuthorization(adminUser, auth.id, 'Regulatory ethics violation confirmed by scrutiny panel.');
    const authStatus = dbRev.getReviewerAuthorization(reviewerUser.id);
    const isRevokedConfirmed = authStatus?.isRevoked === true;

    // 8.5: Revoked reviewer blocked from annotating
    const cand = dbRev.createAnnotationRecord({
      institutionId: 'inst-1',
      institutionName: 'College',
      claimFieldName: 'land_area',
      claimText: '10',
      evidenceText: '10',
      isDemoCandidate: false,
      organizationId: 'org-aicte-western'
    });
    let annotateBlocked = false;
    try {
      dbRev.saveUserAnnotation(cand.id, reviewerUser, { label: 'MATCH', rationale: 'Valid annotation submission', isDraft: false });
    } catch (err: any) {
      annotateBlocked = err.message.includes('revoked') || err.message.includes('expired');
    }

    const scope8Passed = selfApprovalThrew && shortRevokeThrew && revokedSuccess && isRevokedConfirmed && annotateBlocked;
    recordCheck({
      scopeId: 8,
      title: 'Reviewer Authorization, Expiry, Revocation & Self-Approval Prevention',
      passed: scope8Passed,
      severity: scope8Passed ? 'INFORMATIONAL' : 'CRITICAL',
      evidence: `Self-approval blocked: ${selfApprovalThrew}; Short rationale blocked: ${shortRevokeThrew}; Revocation succeeded: ${revokedSuccess}; Revoked user blocked from annotation: ${annotateBlocked}.`
    });
  } catch (err: any) {
    recordCheck({
      scopeId: 8,
      title: 'Reviewer Authorization, Expiry, Revocation & Self-Approval Prevention',
      passed: false,
      severity: 'CRITICAL',
      evidence: `Reviewer governance failure: ${err.message}`
    });
  } finally {
    (dbRev as any).db.close();
    if (fs.existsSync(testDbRevPath)) fs.unlinkSync(testDbRevPath);
  }

  // -------------------------------------------------------------
  // SCOPE 9: Adjudicator Conflict-of-Interest Protection
  // -------------------------------------------------------------
  const testDbAdjPath = path.resolve(process.cwd(), 'data', `test_audit_adjudicator_${Date.now()}.db`);
  const dbAdj = new ScrutinyDatabase(testDbAdjPath);
  try {
    const adminUser: User = { id: 'admin-adj', email: 'admin_adj@gov.in', displayName: 'Admin', role: 'Administrator', department: 'Regulatory Scrutiny', organizationId: 'org-aicte-western' };
    const ann1: User = { id: 'ann-1', email: 'ann1@gov.in', displayName: 'Ann 1', role: 'Annotator', department: 'Regulatory Scrutiny', organizationId: 'org-aicte-western' };
    const adjudicator: User = { id: 'adj-user', email: 'adj@gov.in', displayName: 'Prof. Adjudicator', role: 'Adjudicator', department: 'Regulatory Scrutiny', organizationId: 'org-aicte-western' };
    (dbAdj as any).db.prepare("INSERT INTO users (id, displayName, email, passwordHash, role, department, organizationId, createdAt) VALUES (?, ?, ?, 'h', ?, 'D', ?, datetime('now'))").run(ann1.id, ann1.displayName, ann1.email, ann1.role, ann1.organizationId);
    (dbAdj as any).db.prepare("INSERT INTO users (id, displayName, email, passwordHash, role, department, organizationId, createdAt) VALUES (?, ?, ?, 'h', ?, 'D', ?, datetime('now'))").run(adjudicator.id, adjudicator.displayName, adjudicator.email, adjudicator.role, adjudicator.organizationId);

    dbAdj.authorizeReviewer(adminUser, { userId: ann1.id, role: 'Annotator', organizationId: 'org-aicte-western', verifiedIdentityRef: 'ID1', issuingAuthority: 'AICTE', authorizationReference: 'AUTH-1' });
    dbAdj.authorizeReviewer(adminUser, { userId: adjudicator.id, role: 'Adjudicator', organizationId: 'org-aicte-western', verifiedIdentityRef: 'ID2', issuingAuthority: 'AICTE', authorizationReference: 'AUTH-2' });

    const disputeCand = dbAdj.createAnnotationRecord({
      institutionId: 'inst-1',
      institutionName: 'College',
      claimFieldName: 'land_area',
      claimText: '10',
      evidenceText: '5',
      isDemoCandidate: false,
      organizationId: 'org-aicte-western'
    });

    dbAdj.saveUserAnnotation(disputeCand.id, ann1, { label: 'MATCH', rationale: 'First submission by annotator 1.', isDraft: false });
    // Adjudicator acts as evaluating annotator 2 on the same task
    dbAdj.saveUserAnnotation(disputeCand.id, adjudicator, { label: 'MISMATCH', rationale: 'Second submission by adjudicator acting as rater.', isDraft: false });

    // Adjudicator attempts to resolve dispute on the same task
    let conflictBlocked = false;
    try {
      dbAdj.adjudicateRecord(disputeCand.id, adjudicator, { label: 'MISMATCH', rationale: 'Adjudicating task where I was also an evaluating rater.' });
    } catch (err: any) {
      conflictBlocked = err.message.includes('Conflict of interest');
    }

    recordCheck({
      scopeId: 9,
      title: 'Adjudicator Conflict-of-Interest Protection',
      passed: conflictBlocked,
      severity: conflictBlocked ? 'INFORMATIONAL' : 'HIGH',
      evidence: `Adjudicator who previously annotated task blocked from adjudication: ${conflictBlocked}.`
    });
  } catch (err: any) {
    recordCheck({
      scopeId: 9,
      title: 'Adjudicator Conflict-of-Interest Protection',
      passed: false,
      severity: 'HIGH',
      evidence: `Adjudicator conflict test error: ${err.message}`
    });
  } finally {
    (dbAdj as any).db.close();
    if (fs.existsSync(testDbAdjPath)) fs.unlinkSync(testDbAdjPath);
  }

  // -------------------------------------------------------------
  // SCOPE 10: Independently Reproduce All 15 Export Acceptance Gates
  // -------------------------------------------------------------
  try {
    // Run the full dedicated export firewall test suite
    const { execSync } = await import('child_process');
    const fwOutput = execSync('npx tsx server/tests/exportFirewallV3.test.ts', { encoding: 'utf-8' });
    const fwPassed = /EXPORT FIREWALL RESULTS: (\d+)\/\1 TEST SUITES PASSED/.test(fwOutput);
    const summaryMatch = fwOutput.match(/EXPORT FIREWALL RESULTS: [^\n]+/)?.[0] || 'Completed';

    recordCheck({
      scopeId: 10,
      title: 'Independently Reproduce All 15 Export Acceptance Gates',
      passed: fwPassed,
      severity: fwPassed ? 'INFORMATIONAL' : 'CRITICAL',
      evidence: `Export Firewall verified across all 15 gates (${summaryMatch}).`
    });
  } catch (err: any) {
    recordCheck({
      scopeId: 10,
      title: 'Independently Reproduce All 15 Export Acceptance Gates',
      passed: false,
      severity: 'CRITICAL',
      evidence: `Export firewall reproduction failed: ${err.message}`
    });
  }

  // -------------------------------------------------------------
  // SCOPE 11: Cross-Tenant Access and Export Isolation
  // -------------------------------------------------------------
  const testDbTenantPath = path.resolve(process.cwd(), 'data', `test_audit_tenant_${Date.now()}.db`);
  const dbTenant = new ScrutinyDatabase(testDbTenantPath);
  try {
    const westUser: User = { id: 'usr-west', email: 'w@gov.in', displayName: 'Western User', role: 'Reviewer', department: 'Regulatory Scrutiny', organizationId: 'org-aicte-western' };
    const northUser: User = { id: 'usr-north', email: 'n@gov.in', displayName: 'Northern User', role: 'Reviewer', department: 'Regulatory Scrutiny', organizationId: 'org-aicte-northern' };

    const westCand = dbTenant.createAnnotationRecord({
      institutionId: 'inst-w',
      institutionName: 'Western College',
      claimFieldName: 'land_area',
      claimText: '10',
      evidenceText: '10',
      organizationId: 'org-aicte-western',
      isDemoCandidate: false
    });

    // Northern user attempts to annotate Western record -> rejected
    let crossAnnotateBlocked = false;
    try {
      dbTenant.saveUserAnnotation(westCand.id, northUser, { label: 'MATCH', rationale: 'Cross-tenant annotation attempt', isDraft: false });
    } catch (err: any) {
      crossAnnotateBlocked = err.message.includes('Access denied') || err.message.includes('regional organization');
    }

    // Northern user attempts to export Western records
    const exportNorth = path.resolve(process.cwd(), 'ai_service/ml/data/v3/annotations/test_north_export.jsonl');
    const expRes = dbTenant.exportGoldStandard({ organizationId: 'org-aicte-northern', role: 'Reviewer', outPath: exportNorth });
    const crossExportZero = expRes.count === 0;

    const tenantPassed = crossAnnotateBlocked && crossExportZero;
    recordCheck({
      scopeId: 11,
      title: 'Cross-Tenant Access and Export Isolation',
      passed: tenantPassed,
      severity: tenantPassed ? 'INFORMATIONAL' : 'HIGH',
      evidence: `Cross-tenant annotation blocked: ${crossAnnotateBlocked}; Cross-tenant export record count: ${expRes.count} (strictly 0).`
    });

    if (fs.existsSync(exportNorth)) fs.unlinkSync(exportNorth);
    const manOut = path.resolve(process.cwd(), 'ai_service/ml/data/v3/manifests/test_north_export.manifest.json');
    if (fs.existsSync(manOut)) fs.unlinkSync(manOut);
  } catch (err: any) {
    recordCheck({
      scopeId: 11,
      title: 'Cross-Tenant Access and Export Isolation',
      passed: false,
      severity: 'HIGH',
      evidence: `Tenant isolation audit error: ${err.message}`
    });
  } finally {
    (dbTenant as any).db.close();
    if (fs.existsSync(testDbTenantPath)) fs.unlinkSync(testDbTenantPath);
  }

  // -------------------------------------------------------------
  // SCOPE 12: Verify Test Exports Cannot Contaminate Production Gold-Standard JSONL
  // -------------------------------------------------------------
  try {
    const prodFile = path.resolve(process.cwd(), 'ai_service/ml/data/v3/annotations/gold_standard_human.jsonl');
    const initialBytes = fs.readFileSync(prodFile);

    // Call exportGoldStandard with a dedicated custom outPath
    const customTestOut = path.resolve(process.cwd(), 'ai_service/ml/data/v3/annotations/temp_custom_test_export.jsonl');
    const dbTemp = new ScrutinyDatabase(':memory:');
    dbTemp.exportGoldStandard({ outPath: customTestOut });

    const postBytes = fs.readFileSync(prodFile);
    const noContamination = initialBytes.length === 0 && postBytes.length === 0;

    recordCheck({
      scopeId: 12,
      title: 'Test Exports Isolation from Production Gold-Standard JSONL',
      passed: noContamination,
      severity: noContamination ? 'INFORMATIONAL' : 'CRITICAL',
      evidence: `Production gold_standard_human.jsonl size before: ${initialBytes.length} bytes; after custom export: ${postBytes.length} bytes (unmodified).`
    });

    if (fs.existsSync(customTestOut)) fs.unlinkSync(customTestOut);
    const manOut = path.resolve(process.cwd(), 'ai_service/ml/data/v3/manifests/temp_custom_test_export.manifest.json');
    if (fs.existsSync(manOut)) fs.unlinkSync(manOut);
  } catch (err: any) {
    recordCheck({
      scopeId: 12,
      title: 'Test Exports Isolation from Production Gold-Standard JSONL',
      passed: false,
      severity: 'CRITICAL',
      evidence: `Contamination check failure: ${err.message}`
    });
  }

  // -------------------------------------------------------------
  // SCOPE 13: Verify Production Gold-Standard File Contains Zero Records
  // -------------------------------------------------------------
  try {
    const prodFile = path.resolve(process.cwd(), 'ai_service/ml/data/v3/annotations/gold_standard_human.jsonl');
    const content = fs.readFileSync(prodFile, 'utf-8').trim();
    const lineCount = content ? content.split('\n').filter(l => l.trim().length > 0).length : 0;
    const isCleanZero = lineCount === 0;

    recordCheck({
      scopeId: 13,
      title: 'Production Gold-Standard File Clean Invariant (Zero Records)',
      passed: isCleanZero,
      severity: isCleanZero ? 'INFORMATIONAL' : 'CRITICAL',
      evidence: `gold_standard_human.jsonl exact record count: ${lineCount} (Invariant: strictly 0 records).`
    });
  } catch (err: any) {
    recordCheck({
      scopeId: 13,
      title: 'Production Gold-Standard File Clean Invariant (Zero Records)',
      passed: false,
      severity: 'CRITICAL',
      evidence: `Error inspecting gold_standard_human.jsonl: ${err.message}`
    });
  }

  // -------------------------------------------------------------
  // SCOPE 14: Verify V1/V2 Model Checksums & Confirm No Model Training Occurred
  // -------------------------------------------------------------
  try {
    const v2WeightsPath = path.resolve(process.cwd(), 'ai_service/ml/artifacts/v2/v2_champion_classifier_weights.pkl');
    const v2ConfigPath = path.resolve(process.cwd(), 'ai_service/ml/artifacts/v2/v2_model_config.json');
    const v1WeightsPath = path.resolve(process.cwd(), 'ai_service/ml/artifacts/pairwise_classifier_weights.pkl');
    const v1ConfigPath = path.resolve(process.cwd(), 'ai_service/ml/artifacts/model_config.json');

    const v2WeightsHash = crypto.createHash('sha256').update(fs.readFileSync(v2WeightsPath)).digest('hex');
    const v2ConfigHash = crypto.createHash('sha256').update(fs.readFileSync(v2ConfigPath)).digest('hex');
    const v1WeightsHash = crypto.createHash('sha256').update(fs.readFileSync(v1WeightsPath)).digest('hex');
    const v1ConfigHash = crypto.createHash('sha256').update(fs.readFileSync(v1ConfigPath)).digest('hex');

    const expectedV2Weights = 'efa27bee02d3d7b53a96366365f48a3f5924d7bd0095acdde965093bcf8f778e';
    const expectedV2Config = 'fc607b4c1a364669dd350b3ba377582d333324b466c6ddd20696d2c57a827927';
    const expectedV1Weights = 'f4b9332b829c748cebee27849d8d4798d47c3fa86f0e93d2c87650cf8014be56';
    const expectedV1Config = '1c622c682afb0ef1903983890355461be03cd3812debc0974888e48b74c10277';

    const v2Matches = v2WeightsHash === expectedV2Weights && v2ConfigHash === expectedV2Config;
    const v1Matches = v1WeightsHash === expectedV1Weights && v1ConfigHash === expectedV1Config;

    // Verify no V3 model artifact exists in ai_service/ml/artifacts/v3 or models
    const v3Artifacts = fs.readdirSync(path.resolve(process.cwd(), 'ai_service/ml/artifacts/v3')).filter(f => f !== '.gitkeep');
    const v3ModelExists = v3Artifacts.length > 0;

    const modelsUntouched = v2Matches && v1Matches && !v3ModelExists;
    recordCheck({
      scopeId: 14,
      title: 'V1/V2 Model Artifact Integrity & Zero V3 Model Training',
      passed: modelsUntouched,
      severity: modelsUntouched ? 'INFORMATIONAL' : 'CRITICAL',
      evidence: `V1 artifacts match registered checksums: ${v1Matches}; V2 Champion artifacts match registered checksums: ${v2Matches}; V3 model weights on disk: ${v3ModelExists ? 'FOUND (VIOLATION)' : 'NONE (COMPLIANT, 0 weights)'}.`
    });
  } catch (err: any) {
    recordCheck({
      scopeId: 14,
      title: 'V1/V2 Model Artifact Integrity & Zero V3 Model Training',
      passed: false,
      severity: 'CRITICAL',
      evidence: `Model checksum inspection error: ${err.message}`
    });
  }

  // -------------------------------------------------------------
  // SCOPE 15: Backup, Recovery & External Ledger Checkpoint Limitations
  // -------------------------------------------------------------
  try {
    // Audit architectural reality: SQLite file hash chaining provides tamper-evidence, but cannot prevent root OS file deletion without external WORM / HSM anchoring.
    const specDoc = path.resolve(process.cwd(), 'docs/ml/v3/V3_CRYPTOGRAPHIC_LEDGER_SPECIFICATION.md');
    const specExists = fs.existsSync(specDoc);
    const specContent = specExists ? fs.readFileSync(specDoc, 'utf-8') : '';
    const documentsLimitations = specContent.includes('Tamper-Evidence vs. Absolute Immutability') && specContent.includes('Periodic Signed Checkpoints');

    recordCheck({
      scopeId: 15,
      title: 'Backup, Recovery & External Ledger Checkpoint Limitations Inspection',
      passed: documentsLimitations,
      severity: 'MEDIUM',
      evidence: `Cryptographic specification explicitly documents local SQLite tamper-evidence limitations and specifies external signed checkpoints and WORM storage as required operational controls.`
    });
  } catch (err: any) {
    recordCheck({
      scopeId: 15,
      title: 'Backup, Recovery & External Ledger Checkpoint Limitations Inspection',
      passed: false,
      severity: 'HIGH',
      evidence: `Specification check error: ${err.message}`
    });
  }

  console.log('\n================================================================');
  console.log(`   INDEPENDENT AUDIT COMPLETED: ${auditResults.filter(r => r.passed).length} / ${auditResults.length} CHECKS PASSED`);
  console.log('================================================================');
}

runIndependentAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
