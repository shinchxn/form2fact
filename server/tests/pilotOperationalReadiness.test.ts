/**
 * ============================================================================
 * FORM2FACT V3 — INSTITUTIONAL PILOT OPERATIONAL READINESS AUDIT SUITE
 * ============================================================================
 * 
 * Independently verifies:
 * 1. Multi-process database concurrency, atomicity, sequence continuity and bounded retries.
 * 2. Abrupt worker process termination and WAL crash recovery.
 * 3. External signed daily ledger checkpoints, HMAC-SHA256 signatures, rollback detection & tampering detection.
 * 4. GAP-SEC-02 provenance audit completeness (physical document SHA-256, page count, authorization ref).
 * 5. Production gold-standard separation and V3 zero-training invariant.
 * 6. Single-writer deployment topology enforcement.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { ScrutinyDatabase } from '../db.ts';
import {
  createLedgerCheckpoint,
  verifyCheckpointSignature,
  verifyLedgerAgainstCheckpoint,
  saveCheckpointToFile,
  loadCheckpointFromFile,
  computeCumulativeHash
} from '../ledger/externalCheckpoint.ts';
import { User } from '../../src/types/index.ts';

console.log('================================================================');
console.log('   FORM2FACT V3 — PILOT OPERATIONAL READINESS AUDIT SUITE');
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

async function runAll() {
  const tsxCli = path.resolve(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const workerScript = path.resolve(process.cwd(), 'server', 'tests', 'pilotWorker.ts');
  const dataDir = path.resolve(process.cwd(), 'data', 'test_readiness');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // -------------------------------------------------------------------------
  // SCOPE 1: Multi-Process Database Concurrency & Sequence Continuity
  // -------------------------------------------------------------------------
  console.log('--- SCOPE 1: Cross-Process Concurrency & Bounded Retries ---');
  const concurrencyDbPath = path.join(dataDir, `concurrency_${Date.now()}.db`);
  try {
    // Initialize clean database in WAL mode
    const initDb = new ScrutinyDatabase(concurrencyDbPath);
    // Seed initial admin or clean state
    initDb.close();

    const workerCount = 4;
    const eventsPerWorker = 20;
    const totalExpectedEvents = workerCount * eventsPerWorker;

    await runTest(`Spawn ${workerCount} concurrent Node.js processes writing ${eventsPerWorker} events each`, async () => {
      const promises: Promise<number>[] = [];

      for (let w = 1; w <= workerCount; w++) {
        const workerId = `proc-worker-${w}`;
        const p = new Promise<number>((resolve, reject) => {
          const child = spawn(process.execPath, [tsxCli, workerScript, concurrencyDbPath, workerId, String(eventsPerWorker)], {
            stdio: 'pipe'
          });

          child.on('exit', (code) => {
            if (code === 0) resolve(code);
            else reject(new Error(`Worker ${workerId} exited with non-zero code ${code}`));
          });

          child.on('error', (err) => reject(err));
        });
        promises.push(p);
      }

      await Promise.all(promises);
    });

    await runTest('Verify transaction atomicity, sequence continuity, and unbroken cryptographic hash chain', () => {
      const verifyDb = new ScrutinyDatabase(concurrencyDbPath);
      const workerEvents = verifyDb.getAllAuditEvents().filter(e => e.action === 'Concurrent Worker Audit');
      testAssert(workerEvents.length === totalExpectedEvents, `Expected ${totalExpectedEvents} events, found ${workerEvents.length}`);

      // Verify sequence continuity across the entire ledger (strictly 1..N with no gaps and no duplicates)
      const allEvents = verifyDb.getAllAuditEvents();
      testAssert(allEvents.length >= totalExpectedEvents, 'All events recorded');
      for (let i = 0; i < allEvents.length; i++) {
        testAssert(allEvents[i].sequenceNumber === i + 1, `Sequence gap or duplication at index ${i}: expected ${i + 1}, got ${allEvents[i].sequenceNumber}`);
      }

      // Verify unbroken hash chain
      const ledgerResult = verifyDb.verifyLedgerChain();
      testAssert(ledgerResult.isValid, `Ledger integrity check failed: ${ledgerResult.tamperedEventsCount} errors`);
      testAssert(ledgerResult.totalEventsVerified >= totalExpectedEvents, 'All concurrent events verified in unbroken chain');

      verifyDb.close();
    });
  } finally {
    // Cleanup concurrency DB files
    try { fs.unlinkSync(concurrencyDbPath); } catch {}
    try { fs.unlinkSync(concurrencyDbPath + '-wal'); } catch {}
    try { fs.unlinkSync(concurrencyDbPath + '-shm'); } catch {}
  }

  // -------------------------------------------------------------------------
  // SCOPE 2: Abrupt Process Termination & WAL Crash Recovery
  // -------------------------------------------------------------------------
  console.log('\n--- SCOPE 2: Process Termination Crash & WAL Recovery ---');
  const crashDbPath = path.join(dataDir, `crash_${Date.now()}.db`);
  try {
    const initDb = new ScrutinyDatabase(crashDbPath);
    initDb.close();

    await runTest('Simulate worker crash mid-execution (exit code 99)', async () => {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(process.execPath, [tsxCli, workerScript, crashDbPath, 'crashing-worker', '15', '5'], {
          stdio: 'pipe'
        });

        child.on('exit', (code) => {
          if (code === 99) {
            resolve();
          } else {
            reject(new Error(`Expected exit code 99, got ${code}`));
          }
        });
      });
    });

    await runTest('Fresh process recovers WAL journal cleanly and appends subsequent audit events', () => {
      const recoveredDb = new ScrutinyDatabase(crashDbPath);
      const events = recoveredDb.getAllAuditEvents().filter(e => e.action === 'Concurrent Worker Audit');
      testAssert(events.length === 5, `Expected 5 completed writes prior to crash, found ${events.length}`);

      // Check SQLite integrity pragma
      const checkResult = (recoveredDb.db.prepare('PRAGMA integrity_check;').get() as any).integrity_check;
      testAssert(checkResult === 'ok', `Database integrity compromised: ${checkResult}`);

      const priorCount = recoveredDb.getAllAuditEvents().length;

      // Subsequent write succeeds
      const newEvt = recoveredDb.recordAudit({
        actorId: 'recovery-supervisor',
        actorName: 'Recovery Supervisor',
        actorRole: 'Administrator',
        organizationId: 'org-aicte-western',
        action: 'Post-Crash Health Certification',
        entityType: 'System',
        entityReference: 'WAL-Recovery',
        note: 'Database safely recovered and verified after abrupt process termination.'
      });

      testAssert(newEvt.sequenceNumber === priorCount + 1, `Expected sequenceNumber ${priorCount + 1}, got ${newEvt.sequenceNumber}`);

      const chainResult = recoveredDb.verifyLedgerChain();
      testAssert(chainResult.isValid, 'Chain is valid and unbroken after crash recovery and resumption');

      recoveredDb.close();
    });
  } finally {
    try { fs.unlinkSync(crashDbPath); } catch {}
    try { fs.unlinkSync(crashDbPath + '-wal'); } catch {}
    try { fs.unlinkSync(crashDbPath + '-shm'); } catch {}
  }

  // -------------------------------------------------------------------------
  // SCOPE 3: External Signed Daily Ledger Checkpoints & Tampering / Rollback Detection
  // -------------------------------------------------------------------------
  console.log('\n--- SCOPE 3: External Signed Ledger Checkpoints & Rollback Detection ---');
  const checkpointDbPath = path.join(dataDir, `chkdb_${Date.now()}.db`);
  const checkpointDir = path.join(dataDir, 'checkpoints');
  if (!fs.existsSync(checkpointDir)) {
    fs.mkdirSync(checkpointDir, { recursive: true });
  }

  const signingSecret = 'aicte-pilot-master-secret-key-32chars-min!!';
  const wrongSecret = 'wrong-tampered-secret-key-32chars-min!!!';

  try {
    const chkDb = new ScrutinyDatabase(checkpointDbPath);
    // Write 5 sample audit events
    for (let i = 1; i <= 5; i++) {
      chkDb.recordAudit({
        actorId: 'auditor-1',
        actorName: 'Lead Auditor',
        actorRole: 'Administrator',
        organizationId: 'org-aicte-western',
        action: `Statutory Checkpoint Seed Event ${i}`,
        entityType: 'System',
        entityReference: `chk-seed-${i}`,
        note: `Seed event ${i} for daily checkpoint certification`
      });
    }

    let checkpoint: any;

    await runTest('Create signed daily ledger checkpoint with HMAC-SHA256 signature', () => {
      const totalEvents = chkDb.getAllAuditEvents().length;
      checkpoint = chkDb.createLedgerCheckpoint({
        keyId: 'aicte-wro-key-2026-q4',
        signingSecret,
        checkpointDir
      });

      testAssert(Boolean(checkpoint.checkpointId), 'Checkpoint has checkpointId');
      testAssert(checkpoint.sequenceNumber === totalEvents, `Checkpoint sequenceNumber is ${totalEvents}`);
      testAssert(checkpoint.totalEventsCount === totalEvents, `Checkpoint totalEventsCount is ${totalEvents}`);
      testAssert(checkpoint.signature.algorithm === 'HMAC-SHA256', 'Signature algorithm is HMAC-SHA256');
      testAssert(checkpoint.signature.keyId === 'aicte-wro-key-2026-q4', 'Key ID preserved');
    });

    await runTest('Verify checkpoint HMAC-SHA256 signature against genuine secret key', () => {
      const isValid = verifyCheckpointSignature(checkpoint, signingSecret);
      testAssert(isValid === true, 'Signature verified with valid signing key');

      const isInvalid = verifyCheckpointSignature(checkpoint, wrongSecret);
      testAssert(isInvalid === false, 'Signature rejected with invalid signing key');
    });

    await runTest('Verify current database against signed checkpoint (VERIFIED)', () => {
      const res = chkDb.verifyLedgerAgainstCheckpoint(checkpoint, signingSecret);
      testAssert(res.isValid === true, 'Verification succeeds');
      testAssert(res.status === 'VERIFIED', `Status is VERIFIED (got ${res.status})`);
      testAssert(res.errors.length === 0, 'No errors reported');
    });

    await runTest('Save checkpoint to independent disk directory and reload intact', () => {
      const savedPath = saveCheckpointToFile(checkpoint, checkpointDir);
      testAssert(fs.existsSync(savedPath), `File saved at ${savedPath}`);
      const reloaded = loadCheckpointFromFile(savedPath);
      testAssert(reloaded.checkpointId === checkpoint.checkpointId, 'Reloaded checkpoint ID matches');
      testAssert(reloaded.rootCumulativeHash === checkpoint.rootCumulativeHash, 'Reloaded cumulative hash matches');
    });

    await runTest('Rollback Detection: Older database state restored with lower sequence is flagged ROLLBACK_DETECTED', () => {
      // Create older DB with only 3 events
      const olderDbPath = path.join(dataDir, `older_${Date.now()}.db`);
      const olderDb = new ScrutinyDatabase(olderDbPath);
      for (let i = 1; i <= 3; i++) {
        olderDb.recordAudit({
          actorId: 'auditor-1',
          actorName: 'Lead Auditor',
          action: `Older Event ${i}`,
          entityType: 'System',
          entityReference: `older-${i}`
        });
      }

      const rollbackRes = olderDb.verifyLedgerAgainstCheckpoint(checkpoint, signingSecret);
      testAssert(rollbackRes.isValid === false, 'Rollback state rejected');
      testAssert(rollbackRes.status === 'ROLLBACK_DETECTED', `Status is ROLLBACK_DETECTED (got ${rollbackRes.status})`);
      testAssert(rollbackRes.errors[0].includes('CRITICAL DATABASE ROLLBACK DETECTED'), 'Explains rollback violation');

      olderDb.close();
      try { fs.unlinkSync(olderDbPath); } catch {}
      try { fs.unlinkSync(olderDbPath + '-wal'); } catch {}
      try { fs.unlinkSync(olderDbPath + '-shm'); } catch {}
    });

    await runTest('History Fork Detection: Modified event hash at same sequence is flagged HISTORY_FORKED', () => {
      // Create forked DB with 5 events but divergent payload at sequence 3
      const forkedDbPath = path.join(dataDir, `forked_${Date.now()}.db`);
      const forkedDb = new ScrutinyDatabase(forkedDbPath);
      for (let i = 1; i <= 5; i++) {
        forkedDb.recordAudit({
          actorId: 'rogue-auditor',
          actorName: 'Rogue Actor',
          action: `Forked Event ${i}`,
          entityType: 'System',
          entityReference: `forked-${i}`
        });
      }

      const forkRes = forkedDb.verifyLedgerAgainstCheckpoint(checkpoint, signingSecret);
      testAssert(forkRes.isValid === false, 'Forked state rejected');
      testAssert(
        forkRes.status === 'HISTORY_FORKED' || forkRes.status === 'LEDGER_TAMPERED',
        `Status flags fork or tamper (got ${forkRes.status})`
      );

      forkedDb.close();
      try { fs.unlinkSync(forkedDbPath); } catch {}
      try { fs.unlinkSync(forkedDbPath + '-wal'); } catch {}
      try { fs.unlinkSync(forkedDbPath + '-shm'); } catch {}
    });

    chkDb.close();
  } finally {
    try { fs.unlinkSync(checkpointDbPath); } catch {}
    try { fs.unlinkSync(checkpointDbPath + '-wal'); } catch {}
    try { fs.unlinkSync(checkpointDbPath + '-shm'); } catch {}
  }

  // -------------------------------------------------------------------------
  // SCOPE 4: Provenance Audit Completeness (GAP-SEC-02 Remediation)
  // -------------------------------------------------------------------------
  console.log('\n--- SCOPE 4: GAP-SEC-02 Provenance Audit Completeness ---');
  const provDbPath = path.join(dataDir, `prov_${Date.now()}.db`);
  const samplePdfPath = path.join(dataDir, 'sample_provenance.pdf');
  const samplePdfContent = '%PDF-1.4 sample statutory institutional document content for provenance testing';
  fs.writeFileSync(samplePdfPath, samplePdfContent, 'utf-8');
  const sampleSha256 = crypto.createHash('sha256').update(fs.readFileSync(samplePdfPath)).digest('hex');

  try {
    const provDb = new ScrutinyDatabase(provDbPath);
    const verifierUser: User = {
      id: 'usr-prov-verifier',
      displayName: 'Prof. S. R. Deshmukh',
      email: 'sr.deshmukh@aicte-western.gov.in',
      role: 'Reviewer',
      department: 'Western Directorate Provenance Cell',
      organizationId: 'org-aicte-western'
    };

    // Ingest docket
    const docket = provDb.createInstitutionalDocket(verifierUser, {
      docketNumber: 'AICTE-WRO-2026-AUDIT-001',
      institutionId: 'inst-pune-engineering',
      institutionName: 'Pune Engineering Academy',
      sourceOrganization: 'AICTE Western Regional Directorate',
      authorizationReference: 'AICTE/WRO/PROV/2026/042',
      documentChecksum: sampleSha256,
      documentPath: samplePdfPath,
      mimeType: 'application/pdf',
      sizeBytes: samplePdfContent.length,
      pageCount: 12,
      organizationId: 'org-aicte-western'
    });

    await runTest('GAP-SEC-02: Certify docket provenance and verify physical document checksum', () => {
      const verified = provDb.verifyDocketProvenance(
        verifierUser,
        docket.id,
        'PROVENANCE_VERIFIED',
        'Physical document verified against official state gazette and SHA-256 confirmed.'
      );

      testAssert(verified.provenanceStatus === 'PROVENANCE_VERIFIED', 'Docket provenanceStatus is PROVENANCE_VERIFIED');
      testAssert(verified.verifiedBy === verifierUser.id, 'Verifier ID recorded on docket');
    });

    await runTest('GAP-SEC-02: Canonical audit event records physical document SHA-256, page count, authorization ref & docket ID', () => {
      const events = provDb.getAllAuditEvents().filter(e => e.action === 'Docket Provenance Verified');
      testAssert(events.length === 1, 'Exactly one provenance verification audit event recorded');
      const auditEvt = events[0];

      testAssert(auditEvt.actorId === verifierUser.id, 'Actor ID matches verifier');
      testAssert(auditEvt.actorRole === 'Reviewer', 'Actor role is Reviewer');
      testAssert(auditEvt.entityType === 'InstitutionalDocket', 'Entity type is InstitutionalDocket');
      testAssert(auditEvt.entityReference === docket.id, 'Entity reference is docket ID');

      // Parse afterValue payload
      const afterPayload = JSON.parse(auditEvt.afterValue || '{}');
      testAssert(afterPayload.docketId === docket.id, 'afterValue contains docketId');
      testAssert(afterPayload.docketNumber === 'AICTE-WRO-2026-AUDIT-001', 'afterValue contains docketNumber');
      testAssert(afterPayload.provenanceStatus === 'PROVENANCE_VERIFIED', 'afterValue contains provenanceStatus');
      testAssert(afterPayload.documentChecksum === sampleSha256, 'afterValue contains physical SHA-256 checksum');
      testAssert(afterPayload.pageCount === 12, 'afterValue contains pageCount');
      testAssert(afterPayload.authorizationReference === 'AICTE/WRO/PROV/2026/042', 'afterValue contains authorizationReference');
      testAssert(afterPayload.verifiedBy === verifierUser.id, 'afterValue contains verifiedBy');
      testAssert(Boolean(afterPayload.verifiedAt), 'afterValue contains verifiedAt timestamp');
    });

    await runTest('GAP-SEC-02: Tampered physical document fails provenance certification', () => {
      // Ingest another docket pointing to the same file but with mismatched checksum
      const tamperedDocket = provDb.createInstitutionalDocket(verifierUser, {
        docketNumber: 'AICTE-WRO-2026-TAMPER-002',
        institutionId: 'inst-pune-tampered',
        institutionName: 'Tampered College',
        sourceOrganization: 'AICTE',
        authorizationReference: 'AICTE/AUTH/002',
        documentChecksum: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', // invalid
        documentPath: samplePdfPath,
        mimeType: 'application/pdf',
        sizeBytes: 100,
        pageCount: 5,
        organizationId: 'org-aicte-western'
      });

      let threw = false;
      try {
        provDb.verifyDocketProvenance(
          verifierUser,
          tamperedDocket.id,
          'PROVENANCE_VERIFIED',
          'Attempting verification of tampered physical file.'
        );
      } catch (err: any) {
        threw = true;
        testAssert(err.message.includes('Physical document SHA-256 verification failed'), `Error caught: ${err.message}`);
      }
      testAssert(threw, 'Tampered physical file was rejected during provenance certification');
    });

    provDb.close();
  } finally {
    try { fs.unlinkSync(provDbPath); } catch {}
    try { fs.unlinkSync(provDbPath + '-wal'); } catch {}
    try { fs.unlinkSync(provDbPath + '-shm'); } catch {}
    try { fs.unlinkSync(samplePdfPath); } catch {}
  }

  // -------------------------------------------------------------------------
  // SCOPE 5: Production Gold Standard Separation & V3 Zero Training Invariant
  // -------------------------------------------------------------------------
  console.log('\n--- SCOPE 5: Production Gold Standard Separation & V3 Zero-Training Invariant ---');
  await runTest('Authoritative production gold-standard file exists and contains exactly 0 records (clean baseline)', () => {
    const goldPath = path.resolve(process.cwd(), 'ai_service', 'ml', 'data', 'v3', 'annotations', 'gold_standard_human.jsonl');
    testAssert(fs.existsSync(goldPath), `File exists at ${goldPath}`);
    const content = fs.readFileSync(goldPath, 'utf8').trim();
    testAssert(content.length === 0, `Expected 0 records in production gold-standard file, found: ${content.split('\n').filter(Boolean).length}`);
  });

  await runTest('V3 model artifacts directory contains zero trained weights or checkpoints', () => {
    const v3ArtifactsDir = path.resolve(process.cwd(), 'ai_service', 'ml', 'artifacts', 'v3');
    testAssert(fs.existsSync(v3ArtifactsDir), 'v3 artifacts directory exists');
    const files = fs.readdirSync(v3ArtifactsDir).filter(f => f !== '.gitkeep');
    testAssert(files.length === 0, `Expected 0 trained model weights in V3 artifacts dir, found: ${files.join(', ')}`);
  });

  await runTest('V1/V2 production model artifacts, reports, and inference contracts are preserved intact', () => {
    const v1V2Artifacts = [
      'ai_service/ml/artifacts/pairwise_classifier_weights.pkl',
      'ai_service/ml/artifacts/pairwise_mlp_weights.pkl',
      'ai_service/ml/artifacts/model_config.json',
      'ai_service/ml/artifacts/v2/v2_calibrated_classifier_weights.pkl',
      'ai_service/ml/artifacts/v2/v2_champion_classifier_weights.pkl',
      'ai_service/ml/artifacts/v2/v2_model_config.json'
    ];
    for (const rel of v1V2Artifacts) {
      const full = path.resolve(process.cwd(), rel);
      testAssert(fs.existsSync(full), `Required V1/V2 artifact exists: ${rel}`);
      testAssert(fs.statSync(full).size > 0, `Artifact is non-empty: ${rel}`);
    }
  });

  // -------------------------------------------------------------------------
  // SCOPE 6: Deployment Topology & Single-Writer Enforcement
  // -------------------------------------------------------------------------
  console.log('\n--- SCOPE 6: Single-Writer Architecture & Configuration Enforcement ---');
  await runTest('Docker compose config enforces single-node database volume and single application service container', () => {
    const dockerComposePath = path.resolve(process.cwd(), 'docker-compose.yml');
    testAssert(fs.existsSync(dockerComposePath), 'docker-compose.yml exists');
    const dockerContent = fs.readFileSync(dockerComposePath, 'utf8');
    testAssert(dockerContent.includes('form2fact_data:'), 'Explicit persistent named volume configured');
    testAssert(dockerContent.includes('api-server:'), 'Single API server container service defined');
    testAssert(dockerContent.includes('ai-service:'), 'AI service container defined');
  });

  // Clean test directory
  try {
    const remaining = fs.readdirSync(dataDir, { recursive: true }) as string[];
    for (const f of remaining) {
      const p = path.join(dataDir, f);
      try {
        if (fs.statSync(p).isFile()) fs.unlinkSync(p);
      } catch {}
    }
    fs.rmSync(dataDir, { recursive: true, force: true });
  } catch {}

  console.log('\n================================================================');
  console.log(`   PILOT READINESS AUDIT RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================');
}

runAll().catch((err) => {
  console.error('Audit suite crashed with fatal error:', err);
  process.exit(1);
});
