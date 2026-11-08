/**
 * ============================================================================
 * FORM2FACT V3 — STAGING DEPLOYMENT & OPERATIONAL REHEARSAL SUITE
 * ============================================================================
 * 
 * Executes full Phases 2, 3, and 4 in an isolated staging rehearsal:
 * - Production-style configuration, JWT, WAL, single-writer enforcement.
 * - End-to-end operational lifecycle with dummy documents and test identities.
 * - Checkpoint, key rotation, rollback, tampering, and incident simulation.
 * - Zero-pollution invariant: production gold-standard file remains 0 bytes.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ScrutinyDatabase } from '../db.ts';
import { generateToken, verifyToken } from '../auth.ts';
import { validateProductionConfig } from '../core/config/validateProductionConfig.ts';
import {
  createLedgerCheckpoint,
  verifyCheckpointSignature,
  verifyLedgerAgainstCheckpoint,
  saveCheckpointToFile,
  loadCheckpointFromFile
} from '../ledger/externalCheckpoint.ts';
import { User } from '../../src/types/index.ts';

console.log('================================================================');
console.log('   FORM2FACT V3 — STAGING OPERATIONAL REHEARSAL AUDIT SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name: string, fn: () => void | Promise<void>): Promise<void> {
  totalTests++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res.then(() => {
        passedTests++;
        console.log(`✅ Passed: ${name}`);
      }).catch((err) => {
        console.error(`❌ Failed: ${name}\n`, err);
        throw err;
      });
    }
    passedTests++;
    console.log(`✅ Passed: ${name}`);
    return Promise.resolve();
  } catch (err) {
    console.error(`❌ Failed: ${name}\n`, err);
    throw err;
  }
}

function testAssert(condition: boolean, msg: string) {
  assert(condition, msg);
}

async function runStagingRehearsal() {
  const rehearsalDir = path.resolve(process.cwd(), 'data', 'staging_rehearsal');
  if (fs.existsSync(rehearsalDir)) {
    fs.rmSync(rehearsalDir, { recursive: true, force: true });
  }
  fs.mkdirSync(rehearsalDir, { recursive: true });

  const stagingDbPath = path.join(rehearsalDir, 'staging_rehearsal.db');
  const stagingCheckpointsDir = path.join(rehearsalDir, 'checkpoints');
  fs.mkdirSync(stagingCheckpointsDir, { recursive: true });

  const stagingSigningKeyV1 = 'staging_ledger_hmac_secret_32_characters_minimum_v1!';
  const stagingSigningKeyV2 = 'staging_ledger_hmac_secret_32_characters_minimum_v2_rotated!';
  const stagingJwtSecret = 'staging_rehearsal_jwt_secret_min_32_characters_long!';

  // Staging test personas
  const stagingAdmin: User = {
    id: 'usr-staging-admin',
    displayName: 'Staging System Administrator',
    email: 'admin.staging@aicte-western.gov.in',
    role: 'Administrator',
    department: 'Directorate Systems',
    organizationId: 'org-aicte-western'
  };

  const stagingReviewer1: User = {
    id: 'usr-staging-rev1',
    displayName: 'Dr. Vikram Sarabhai (Test)',
    email: 'vikram.test@scrutiny.edu.in',
    role: 'Reviewer',
    department: 'Western Scrutiny Panel',
    organizationId: 'org-aicte-western'
  };

  const stagingReviewer2: User = {
    id: 'usr-staging-rev2',
    displayName: 'Prof. Homi Bhabha (Test)',
    email: 'homi.test@scrutiny.edu.in',
    role: 'Reviewer',
    department: 'Western Scrutiny Panel',
    organizationId: 'org-aicte-western'
  };

  const stagingAdjudicator: User = {
    id: 'usr-staging-adjudicator',
    displayName: 'Hon. Justice M. C. Chagla (Test Adjudicator)',
    email: 'adjudicator.test@aicte-western.gov.in',
    role: 'Adjudicator',
    department: 'Directorate Appellate Cell',
    organizationId: 'org-aicte-western'
  };

  const northernReviewer: User = {
    id: 'usr-staging-north',
    displayName: 'Northern Directorate Reviewer (Test)',
    email: 'north.reviewer@aicte-northern.gov.in',
    role: 'Reviewer',
    department: 'Northern Regional Directorate',
    organizationId: 'org-aicte-northern'
  };

  // -------------------------------------------------------------------------
  // PHASE 2: STAGING ENVIRONMENT & SECURITY CONFIGURATION
  // -------------------------------------------------------------------------
  console.log('--- PHASE 2: Staging Deployment Configuration Verification ---');

  await runTest('Production-style staging environment validation passes without errors', () => {
    const origEnv = { ...process.env };
    try {
      process.env.NODE_ENV = 'production';
      process.env.PORT = '3001';
      process.env.JWT_SECRET = stagingJwtSecret;
      process.env.AI_SERVICE_URL = 'http://127.0.0.1:8000';
      process.env.REQUIRE_ML_INFERENCE = 'true';
      process.env.ALLOW_DETERMINISTIC_FALLBACK = 'false';

      validateProductionConfig();
      testAssert(true, 'validateProductionConfig passed');
    } finally {
      process.env = origEnv;
    }
  });

  await runTest('Staging JWT token issuance, verification, and role retention', () => {
    const origJwt = process.env.JWT_SECRET;
    try {
      process.env.JWT_SECRET = stagingJwtSecret;
      const token = generateToken(stagingReviewer1);
      const verified = verifyToken(token);
      testAssert(verified !== null, 'Token verified');
      testAssert(verified?.id === stagingReviewer1.id, 'User ID matches');
      testAssert(verified?.role === 'Reviewer', 'Role matches Reviewer');
      testAssert(verified?.organizationId === 'org-aicte-western', 'Organization matches');

      // Tampered token rejected
      const tampered = token.slice(0, -5) + 'xxxxx';
      const tamperedRes = verifyToken(tampered);
      testAssert(tamperedRes === null, 'Tampered token rejected');
    } finally {
      process.env.JWT_SECRET = origJwt;
    }
  });

  let stagingDb!: ScrutinyDatabase;

  await runTest('Staging database initializes with WAL mode, busy timeout, and zero demo records in production mode', () => {
    const origEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      stagingDb = new ScrutinyDatabase(stagingDbPath);

      // Verify WAL mode
      const jMode = (stagingDb.db.prepare('PRAGMA journal_mode;').get() as any).journal_mode;
      testAssert(jMode.toLowerCase() === 'wal', `Expected WAL journal_mode, got ${jMode}`);

      // Verify busy timeout
      const timeout = (stagingDb.db.prepare('PRAGMA busy_timeout;').get() as any).timeout;
      testAssert(Number(timeout) >= 5000, `Expected busy_timeout >= 5000, got ${timeout}`);

      // Verify clean baseline: 0 demo apps, 0 demo findings, 0 demo users
      const appCount = Number((stagingDb.db.prepare('SELECT COUNT(*) as c FROM applications').get() as any)?.c || 0);
      const findCount = Number((stagingDb.db.prepare('SELECT COUNT(*) as c FROM findings').get() as any)?.c || 0);
      testAssert(appCount === 0, `Expected 0 demo applications, got ${appCount}`);
      testAssert(findCount === 0, `Expected 0 demo findings, got ${findCount}`);

      // Seed explicit staging test personas
      const insertUser = stagingDb.db.prepare(`
        INSERT INTO users (id, displayName, email, passwordHash, role, department, organizationId, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const dummyHash = '$2a$12$e80yqXp3Y96m1mQZt1V7u.51b72zY.XhTf8vP0V91o1N8B8V0Xb6y';
      const now = new Date().toISOString();
      (insertUser as any).run(stagingAdmin.id, stagingAdmin.displayName, stagingAdmin.email, dummyHash, stagingAdmin.role, stagingAdmin.department, stagingAdmin.organizationId, now);
      (insertUser as any).run(stagingReviewer1.id, stagingReviewer1.displayName, stagingReviewer1.email, dummyHash, stagingReviewer1.role, stagingReviewer1.department, stagingReviewer1.organizationId, now);
      (insertUser as any).run(stagingReviewer2.id, stagingReviewer2.displayName, stagingReviewer2.email, dummyHash, stagingReviewer2.role, stagingReviewer2.department, stagingReviewer2.organizationId, now);
      (insertUser as any).run(stagingAdjudicator.id, stagingAdjudicator.displayName, stagingAdjudicator.email, dummyHash, stagingAdjudicator.role, stagingAdjudicator.department, stagingAdjudicator.organizationId, now);
      (insertUser as any).run(northernReviewer.id, northernReviewer.displayName, northernReviewer.email, dummyHash, northernReviewer.role, northernReviewer.department, northernReviewer.organizationId, now);
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  await runTest('Single-writer architecture enforcement in docker-compose.staging.yml', () => {
    const stagingComposePath = path.resolve(process.cwd(), 'docker-compose.staging.yml');
    testAssert(fs.existsSync(stagingComposePath), 'docker-compose.staging.yml exists');
    const content = fs.readFileSync(stagingComposePath, 'utf8');
    testAssert(content.includes('form2fact_staging_data:'), 'Isolated named staging volume defined');
    testAssert(content.includes('staging-api-server:'), 'Single staging API server container defined');
    testAssert(content.includes('staging-ai-service:'), 'Staging AI service container defined');
    testAssert(content.includes('REQUIRE_ML_INFERENCE=true'), 'ML inference enforced');
    testAssert(content.includes('ALLOW_DETERMINISTIC_FALLBACK=false'), 'Silent fallback prohibited');
  });

  // -------------------------------------------------------------------------
  // PHASE 3: OPERATIONAL REHEARSAL WITH DUMMY DATA & TEST IDENTITIES
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 3: Operational Rehearsal Lifecycle ---');

  const dummyPdfPath = path.join(rehearsalDir, 'dummy_statutory_filing.pdf');
  const dummyPdfContent = '%PDF-1.4\n% DUMMY STATUTORY FILING FOR STAGING REHEARSAL\nPage 1: Title\nPage 2: Land Area Declared: 7.50 Acres. Deed Area: 7.50 Acres. Survey 44/1.\nPage 3: Fire Safety NOC Issued: 2026-05-15.\nPage 4: Lease Deed Tenure Expiry: 2056-03-31 (30 Years Unexpired).\n%%EOF';
  fs.writeFileSync(dummyPdfPath, dummyPdfContent, 'utf-8');
  const dummyChecksum = crypto.createHash('sha256').update(fs.readFileSync(dummyPdfPath)).digest('hex');

  let rehearsedDocket: any;

  await runTest('REHEARSAL 1: Ingest Institutional Docket with full statutory metadata', () => {
    rehearsedDocket = stagingDb.createInstitutionalDocket(stagingAdmin, {
      docketNumber: 'DUMMY-AICTE-WRO-2026-REHEARSAL-001',
      institutionId: 'dummy-inst-101',
      institutionName: 'Apex Institute of Technology (Staging Dummy)',
      sourceOrganization: 'AICTE Western Regional Directorate (Rehearsal)',
      sourceUrl: 'https://staging.aicte-india.org/bulletins/approved/dummy-001',
      retrievalDate: '2026-11-07',
      publicationDate: '2026-06-01',
      authorizationReference: 'DUMMY/AICTE/WRO/2026/REHEARSAL-AUTH',
      documentChecksum: dummyChecksum,
      documentPath: dummyPdfPath,
      mimeType: 'application/pdf',
      sizeBytes: dummyPdfContent.length,
      pageCount: 4,
      organizationId: 'org-aicte-western',
      documentClassification: 'statutory_filing'
    });

    testAssert(Boolean(rehearsedDocket.id), 'Docket created with ID');
    testAssert(rehearsedDocket.provenanceStatus === 'PROVENANCE_PENDING', 'Initial provenance is PENDING');
    testAssert(rehearsedDocket.lifecycleState === 'DATA_SOURCE_IDENTIFIED', 'Initial lifecycle is DATA_SOURCE_IDENTIFIED');
  });

  await runTest('REHEARSAL 2: Physical SHA-256 verification and Provenance Certification', () => {
    const certified = stagingDb.verifyDocketProvenance(
      stagingReviewer1,
      rehearsedDocket.id,
      'PROVENANCE_VERIFIED',
      'Physical document verified against state gazette records and SHA-256 confirmed.'
    );

    testAssert(certified.provenanceStatus === 'PROVENANCE_VERIFIED', 'Status updated to PROVENANCE_VERIFIED');
    testAssert(certified.verifiedBy === stagingReviewer1.id, 'VerifiedBy recorded');

    // Verify canonical audit event was sealed with physical provenance
    const auditEvt = stagingDb.getAllAuditEvents().find(e => e.action === 'Docket Provenance Verified');
    testAssert(auditEvt !== undefined, 'Provenance audit event recorded');
    const payload = JSON.parse(auditEvt?.afterValue || '{}');
    testAssert(payload.documentChecksum === dummyChecksum, 'Physical checksum sealed in ledger');
    testAssert(payload.authorizationReference === 'DUMMY/AICTE/WRO/2026/REHEARSAL-AUTH', 'Authorization ref sealed in ledger');
    testAssert(payload.pageCount === 4, 'Page count sealed in ledger');
  });

  // Create two annotation candidate records
  let candidateConsensus: any;
  let candidateDisputed: any;

  await runTest('REHEARSAL 3: Create candidate pairs referencing verified docket', () => {
    candidateConsensus = stagingDb.createAnnotationRecord({
      recordId: 'dummy-ann-rec-consensus-001',
      institutionId: 'dummy-inst-101',
      institutionName: 'Apex Institute of Technology (Staging Dummy)',
      claimFieldName: 'landAreaAcres',
      claimText: '7.50 Acres',
      claimDocumentId: rehearsedDocket.id,
      claimDocumentName: 'dummy_statutory_filing.pdf',
      claimPage: 2,
      evidenceText: 'Registered Deed Area: 7.50 Acres',
      evidenceDocumentId: rehearsedDocket.id,
      evidenceDocumentName: 'dummy_statutory_filing.pdf',
      evidencePage: 2,
      normalizedClaimValue: '7.50',
      normalizedEvidenceValue: '7.50',
      fieldCategory: 'numeric',
      sourceProvenance: 'AICTE Institutional Scrutiny Docket',
      organizationId: 'org-aicte-western'
    });

    candidateDisputed = stagingDb.createAnnotationRecord({
      recordId: 'dummy-ann-rec-disputed-002',
      institutionId: 'dummy-inst-101',
      institutionName: 'Apex Institute of Technology (Staging Dummy)',
      claimFieldName: 'leaseExpiryDate',
      claimText: '2056-03-31',
      claimDocumentId: rehearsedDocket.id,
      claimDocumentName: 'dummy_statutory_filing.pdf',
      claimPage: 4,
      evidenceText: 'Lease tenure valid up to 31 March 2056',
      evidenceDocumentId: rehearsedDocket.id,
      evidenceDocumentName: 'dummy_statutory_filing.pdf',
      evidencePage: 4,
      normalizedClaimValue: '2056-03-31',
      normalizedEvidenceValue: '2056-03-31',
      fieldCategory: 'date',
      sourceProvenance: 'AICTE Institutional Scrutiny Docket',
      organizationId: 'org-aicte-western'
    });

    testAssert(candidateConsensus.status === 'pending', 'Candidate 1 is pending');
    testAssert(candidateDisputed.status === 'pending', 'Candidate 2 is pending');
  });

  await runTest('REHEARSAL 4: Double-Blind Consensus Lifecycle (MATCH)', () => {
    // Reviewer 1 submits MATCH
    stagingDb.saveUserAnnotation(candidateConsensus.id, stagingReviewer1, {
      label: 'MATCH',
      rationale: 'Claim of 7.50 acres perfectly matches 7.50 acres on Page 2 deed.'
    });

    const afterRev1 = stagingDb.getAnnotationRecordById(candidateConsensus.id)!;
    testAssert(afterRev1.status === 'in_review', 'Status is in_review after single submission');

    // Reviewer 2 submits MATCH
    stagingDb.saveUserAnnotation(candidateConsensus.id, stagingReviewer2, {
      label: 'MATCH',
      rationale: 'Concordant land acreage verified independently against registered parcel.'
    });

    const afterRev2 = stagingDb.getAnnotationRecordById(candidateConsensus.id)!;
    testAssert(afterRev2.status === 'agreed', 'Consensus reached: status is agreed');
    testAssert(afterRev2.finalLabel === 'MATCH', 'Final label confirmed as MATCH');
  });

  await runTest('REHEARSAL 5: Disagreement and Neutral Adjudication (MISMATCH)', () => {
    // Reviewer 1 submits MATCH
    stagingDb.saveUserAnnotation(candidateDisputed.id, stagingReviewer1, {
      label: 'MATCH',
      rationale: 'Dates appear concordant on quick review.'
    });

    // Reviewer 2 submits MISMATCH
    stagingDb.saveUserAnnotation(candidateDisputed.id, stagingReviewer2, {
      label: 'MISMATCH',
      rationale: 'Clause 4 indicates secondary mortgage restriction conflicting with statutory tenure.'
    });

    const disputedRecord = stagingDb.getAnnotationRecordById(candidateDisputed.id)!;
    testAssert(disputedRecord.status === 'disputed', 'Divergent labels transitioned status to disputed');
    testAssert(!disputedRecord.finalLabel, 'Final label withheld pending adjudication');

    // Conflict of interest check: Reviewer 1 (even with Adjudicator role) cannot adjudicate their own task
    let blockedCoI = false;
    try {
      stagingDb.adjudicateRecord(
        candidateDisputed.id,
        { ...stagingReviewer1, role: 'Adjudicator' },
        { label: 'MATCH', rationale: 'Attempting self-adjudication with long rationale' }
      );
    } catch (err: any) {
      blockedCoI = true;
      testAssert(err.message.includes('Conflict of interest'), `COI blocked: ${err.message}`);
    }
    testAssert(blockedCoI, 'Adjudicator conflict of interest strictly blocked');

    // Neutral adjudicator resolves dispute
    const adjudicated = stagingDb.adjudicateRecord(
      candidateDisputed.id,
      stagingAdjudicator,
      {
        label: 'MISMATCH',
        rationale: 'Appellate review affirms Reviewer 2 findings: mortgage clause restricts clean statutory ownership.'
      }
    );

    testAssert(adjudicated.status === 'adjudicated', 'Status is adjudicated');
    testAssert(adjudicated.finalLabel === 'MISMATCH', 'Final label resolved to MISMATCH');
    testAssert(adjudicated.adjudicatorId === stagingAdjudicator.id, 'Adjudicator recorded');
  });

  let reviewer1AuthId: string = '';

  await runTest('REHEARSAL 6: Reviewer Authorization Registration & Active Certification', () => {
    // Register authorization for Reviewer 1
    const auth1 = stagingDb.authorizeReviewer(stagingAdmin, {
      userId: stagingReviewer1.id,
      role: 'Reviewer',
      organizationId: 'org-aicte-western',
      verifiedIdentityRef: 'FAC-PUNE-2026-884',
      issuingAuthority: 'Savitribai Phule Pune University Directorate',
      authorizationReference: 'AICTE/AUTH/WRO/2026/0884',
      expiryDate: '2027-12-31'
    });
    reviewer1AuthId = auth1.id;

    // Register authorization for Reviewer 2
    stagingDb.authorizeReviewer(stagingAdmin, {
      userId: stagingReviewer2.id,
      role: 'Reviewer',
      organizationId: 'org-aicte-western',
      verifiedIdentityRef: 'FAC-MUM-2026-912',
      issuingAuthority: 'University of Mumbai Directorate',
      authorizationReference: 'AICTE/AUTH/WRO/2026/0912',
      expiryDate: '2027-12-31'
    });

    const activeAuth = stagingDb.getReviewerAuthorization(stagingReviewer1.id);
    testAssert(activeAuth !== null && activeAuth.isRevoked === false, 'Reviewer authorization is active');
  });

  await runTest('REHEARSAL 7: Export Gate Validation and Production Path Isolation', () => {
    const stagingExportFile = path.join(rehearsalDir, 'staging_gold_export.jsonl');
    const exportResult = stagingDb.exportGoldStandard({
      outPath: stagingExportFile
    });

    testAssert(exportResult.count >= 1, `Exported non-zero valid records: ${exportResult.count}`);
    testAssert(fs.existsSync(stagingExportFile), 'Staging export file generated');

    // CRITICAL: Production gold-standard file MUST remain exactly 0 bytes
    const prodGoldFile = path.resolve(process.cwd(), 'ai_service', 'ml', 'data', 'v3', 'annotations', 'gold_standard_human.jsonl');
    testAssert(fs.existsSync(prodGoldFile), 'Production gold standard file exists');
    const prodContent = fs.readFileSync(prodGoldFile, 'utf8').trim();
    testAssert(prodContent.length === 0, `Production gold standard file polluted! Found: ${prodContent}`);
  });

  await runTest('REHEARSAL 8: Revocation of Reviewer Authorization & Export Firewall Defense', () => {
    // Revoke Reviewer 1 authorization
    stagingDb.revokeReviewerAuthorization(stagingAdmin, reviewer1AuthId, 'Tenure expired; transferred to non-scrutiny department.');
    const revokedAuth = stagingDb.getReviewerAuthorization(stagingReviewer1.id);
    testAssert(revokedAuth?.isRevoked === true, 'Reviewer authorization successfully revoked');

    // Export firewall now strictly rejects records submitted by revoked reviewer
    const postRevokeExport = path.join(rehearsalDir, 'post_revoke_export.jsonl');
    const exportResult = stagingDb.exportGoldStandard({
      outPath: postRevokeExport
    });

    testAssert(exportResult.count === 0, 'Zero records exported after reviewer revocation');
    testAssert(exportResult.rejectionCount >= 1, 'Revocation rejection tracked');
    const revReasonFound = exportResult.rejectionReasons.some(r =>
      r.reasons.some(msg => msg.includes('has revoked/expired statutory authorization'))
    );
    testAssert(revReasonFound, 'Export firewall explicitly cites revoked authorization');
  });

  await runTest('REHEARSAL 9: Cross-Tenant Access Rejection', () => {
    let threw = false;
    try {
      // Northern reviewer attempts to annotate Western record
      stagingDb.saveUserAnnotation(candidateConsensus.id, northernReviewer, {
        label: 'MATCH',
        rationale: 'Northern reviewer attempting cross-regional submission.'
      });
    } catch (err: any) {
      threw = true;
      testAssert(err.message.includes('organization') || err.message.includes('Access denied'), `Cross-tenant rejected: ${err.message}`);
    }
    testAssert(threw, 'Cross-tenant annotation strictly rejected');
  });

  // -------------------------------------------------------------------------
  // PHASE 4: CHECKPOINT, KEY ROTATION, ROLLBACK & INCIDENT SIMULATION
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 4: Checkpoint, Recovery & Incident Response ---');

  let checkpointV1: any;
  let checkpointV2Rotated: any;

  await runTest('CHECKPOINT 1: Canonicalization & Signed Checkpoint Creation (Key V1)', () => {
    checkpointV1 = stagingDb.createLedgerCheckpoint({
      keyId: 'staging-key-2026-q4',
      signingSecret: stagingSigningKeyV1,
      checkpointDir: stagingCheckpointsDir
    });

    testAssert(Boolean(checkpointV1.checkpointId), 'Checkpoint V1 created');
    testAssert(checkpointV1.signature.keyId === 'staging-key-2026-q4', 'Key ID matches');
    testAssert(checkpointV1.totalEventsCount >= 5, 'Events covered');

    const verified = verifyCheckpointSignature(checkpointV1, stagingSigningKeyV1);
    testAssert(verified === true, 'Signature verified with Key V1');
  });

  await runTest('CHECKPOINT 2: Key Rotation to Key V2 (Q1-2027 Epoch)', () => {
    // Append an administrative key rotation audit event
    stagingDb.recordAudit({
      actorId: stagingAdmin.id,
      actorName: stagingAdmin.displayName,
      actorRole: 'Administrator',
      organizationId: 'org-aicte-western',
      action: 'Cryptographic Key Rotated',
      entityType: 'System',
      entityReference: 'HMAC-SHA256-KeyRotation',
      beforeValue: JSON.stringify({ activeKeyId: 'staging-key-2026-q4' }),
      afterValue: JSON.stringify({ activeKeyId: 'staging-key-2027-q1' }),
      note: 'Scheduled quarterly rotation of ledger checkpoint signing key.'
    });

    checkpointV2Rotated = stagingDb.createLedgerCheckpoint({
      keyId: 'staging-key-2027-q1',
      signingSecret: stagingSigningKeyV2,
      checkpointDir: stagingCheckpointsDir
    });

    testAssert(checkpointV2Rotated.signature.keyId === 'staging-key-2027-q1', 'Rotated key ID verified');
    const verifiedV2 = verifyCheckpointSignature(checkpointV2Rotated, stagingSigningKeyV2);
    testAssert(verifiedV2 === true, 'Signature verified with rotated Key V2');

    // Old key cannot sign or verify new checkpoint
    const invalidWithOld = verifyCheckpointSignature(checkpointV2Rotated, stagingSigningKeyV1);
    testAssert(invalidWithOld === false, 'Old key rejected on new checkpoint');
  });

  await runTest('INCIDENT SIMULATION 1: Tampered Ledger Event Payload Detected', () => {
    // Create an isolated copy to tamper
    const tamperedDbPath = path.join(rehearsalDir, 'tampered_ledger.db');
    fs.copyFileSync(stagingDbPath, tamperedDbPath);
    const tamperedDb = new ScrutinyDatabase(tamperedDbPath);

    // Disable triggers to simulate direct SQL tampering by rogue root actor
    tamperedDb.db.exec('DROP TRIGGER IF EXISTS audit_events_no_update;');
    tamperedDb.db.prepare("UPDATE audit_events SET note = 'MALICIOUS UNAUTHORIZED TAMPERING' WHERE sequenceNumber = 2;").run();

    const chainRes = tamperedDb.verifyLedgerChain();
    testAssert(chainRes.isValid === false, 'Internal ledger chain correctly flags tampering');
    testAssert(chainRes.tamperedEventsCount >= 1, 'Tampered event count > 0');

    const extRes = tamperedDb.verifyLedgerAgainstCheckpoint(checkpointV2Rotated, stagingSigningKeyV2);
    testAssert(extRes.isValid === false, 'External checkpoint flags tampered database');
    testAssert(extRes.status === 'HISTORY_FORKED' || extRes.status === 'LEDGER_TAMPERED', 'Status indicates tamper/fork');

    tamperedDb.close();
    try { fs.unlinkSync(tamperedDbPath); } catch {}
    try { fs.unlinkSync(tamperedDbPath + '-wal'); } catch {}
    try { fs.unlinkSync(tamperedDbPath + '-shm'); } catch {}
  });

  await runTest('INCIDENT SIMULATION 2: Stale Database Snapshot Rollback Detected', () => {
    // Older DB with only 2 events
    const olderDbPath = path.join(rehearsalDir, 'stale_snapshot.db');
    const olderDb = new ScrutinyDatabase(olderDbPath);

    const rollbackCheck = olderDb.verifyLedgerAgainstCheckpoint(checkpointV2Rotated, stagingSigningKeyV2);
    testAssert(rollbackCheck.isValid === false, 'Stale snapshot rejected');
    testAssert(rollbackCheck.status === 'ROLLBACK_DETECTED', `Status is ROLLBACK_DETECTED (got ${rollbackCheck.status})`);
    testAssert(rollbackCheck.errors[0].includes('CRITICAL DATABASE ROLLBACK DETECTED'), 'Explains rollback error');

    olderDb.close();
    try { fs.unlinkSync(olderDbPath); } catch {}
    try { fs.unlinkSync(olderDbPath + '-wal'); } catch {}
    try { fs.unlinkSync(olderDbPath + '-shm'); } catch {}
  });

  await runTest('RECOVERY: Clean Database Backup and Full State Restoration', () => {
    // Checkpoint WAL and copy backup
    stagingDb.checkpoint();
    const backupDbPath = path.join(rehearsalDir, 'staging_backup_clean.db');
    fs.copyFileSync(stagingDbPath, backupDbPath);

    const origEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      // Open restored database
      const restoredDb = new ScrutinyDatabase(backupDbPath);
      testAssert(restoredDb.getAllApplications().length === 0, 'Zero demo apps preserved in production mode');
      testAssert(restoredDb.getInstitutionalDockets().length >= 1, 'Restored docket preserved');
      testAssert(restoredDb.getAnnotationRecords().length >= 2, 'Restored annotation records preserved');

      const extVerifyRestored = restoredDb.verifyLedgerAgainstCheckpoint(checkpointV2Rotated, stagingSigningKeyV2);
      testAssert(extVerifyRestored.isValid === true, 'Restored database verified against external checkpoint');
      testAssert(extVerifyRestored.status === 'VERIFIED', 'Restored status is VERIFIED');

      restoredDb.close();
    } finally {
      process.env.NODE_ENV = origEnv;
    }

    try { fs.unlinkSync(backupDbPath); } catch {}
    try { fs.unlinkSync(backupDbPath + '-wal'); } catch {}
    try { fs.unlinkSync(backupDbPath + '-shm'); } catch {}
  });

  stagingDb.close();

  // Clean rehearsal directory
  try {
    fs.rmSync(rehearsalDir, { recursive: true, force: true });
  } catch {}

  console.log('\n================================================================');
  console.log(`   STAGING REHEARSAL RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================');
}

runStagingRehearsal().catch((err) => {
  console.error('Staging rehearsal suite failed:', err);
  process.exit(1);
});
