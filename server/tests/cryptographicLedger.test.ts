import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import {
  computePayloadHash,
  computeEventHash,
  verifyLedgerChain,
  GENESIS_PREVIOUS_HASH
} from '../ledger/cryptographicLedger.ts';
import { ScrutinyDatabase } from '../db.ts';
import { AuditEvent } from '../../src/types/index.ts';

function testAssert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✅ Passed: ${message}`);
}

async function runLedgerTests() {
  console.log('================================================================');
  console.log('   FORM2FACT V3 — CRYPTOGRAPHIC AUDIT LEDGER TESTS');
  console.log('================================================================');

  let passed = 0;
  let total = 0;
  const runTest = (name: string, fn: () => void | Promise<void>) => {
    total++;
    try {
      console.log(`\n--- TEST ${total}: ${name} ---`);
      const res = fn();
      if (res && typeof (res as any).then === 'function') {
        return (res as any).then(() => {
          passed++;
        });
      }
      passed++;
    } catch (err: any) {
      console.error(`Test ${total} failed:`, err.message);
      throw err;
    }
  };

  // TEST 1: Canonical payload hashing determinism
  runTest('Canonical payload hashing determinism across key orders', () => {
    const hash1 = computePayloadHash({
      entityType: 'AnnotationRecord',
      entityReference: 'rec-101',
      beforeValue: 'pending',
      afterValue: 'agreed',
      note: 'Consensus reached'
    });

    const hash2 = computePayloadHash({
      entityReference: 'rec-101',
      entityType: 'AnnotationRecord',
      note: 'Consensus reached',
      afterValue: 'agreed',
      beforeValue: 'pending'
    });

    testAssert(hash1 === hash2, 'Payload hashes match identically regardless of input key ordering');
    testAssert(/^[0-9a-f]{64}$/.test(hash1), 'Payload hash is valid 64-char hex SHA-256');
  });

  // TEST 2: Event hash chaining from genesis
  runTest('Event hash chaining from genesis block', () => {
    const timestamp1 = '2026-11-07T10:00:00.000Z';
    const payloadHash1 = computePayloadHash({
      entityType: 'AnnotationRecord',
      entityReference: 'rec-001',
      beforeValue: null,
      afterValue: 'pending'
    });

    const eventHash1 = computeEventHash({
      sequenceNumber: 1,
      previousHash: GENESIS_PREVIOUS_HASH,
      id: 'evt-001',
      timestamp: timestamp1,
      actorId: 'usr-admin',
      actorRole: 'Administrator',
      organizationId: 'org-aicte-western',
      action: 'Create Task',
      payloadHash: payloadHash1
    });

    testAssert(typeof eventHash1 === 'string' && eventHash1.length === 64, 'Event 1 hash generated');

    const timestamp2 = '2026-11-07T10:01:00.000Z';
    const payloadHash2 = computePayloadHash({
      entityType: 'UserAnnotation',
      entityReference: 'uann-001',
      beforeValue: null,
      afterValue: 'MATCH'
    });

    const eventHash2 = computeEventHash({
      sequenceNumber: 2,
      previousHash: eventHash1,
      id: 'evt-002',
      timestamp: timestamp2,
      actorId: 'usr-ann-1',
      actorRole: 'Annotator',
      organizationId: 'org-aicte-western',
      action: 'Submit Annotation',
      payloadHash: payloadHash2
    });

    testAssert(eventHash2 !== eventHash1, 'Event 2 hash is distinct and cryptographically chained to Event 1');
  });

  // TEST 3: Verification of a valid synthetic chain
  runTest('Verification of a valid 5-event cryptographic chain', () => {
    const events: AuditEvent[] = [];
    let prev = GENESIS_PREVIOUS_HASH;

    for (let i = 1; i <= 5; i++) {
      const pHash = computePayloadHash({
        entityType: 'AnnotationRecord',
        entityReference: `rec-${i}`,
        afterValue: 'val'
      });
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
        afterValue: 'val'
      });

      prev = curr;
    }

    const verification = verifyLedgerChain(events);
    testAssert(verification.isValid === true, 'Valid chain passes ledger verification');
    testAssert(verification.totalEventsVerified === 5, '5 events verified');
    testAssert(verification.tamperedEventsCount === 0, 'Zero tampered events');
    testAssert(verification.errors.length === 0, 'Zero verification errors');
  });

  // TEST 4: Detection of payload tampering
  runTest('Detection of payload tampering inside chained event', () => {
    const events: AuditEvent[] = [];
    let prev = GENESIS_PREVIOUS_HASH;
    for (let i = 1; i <= 3; i++) {
      const pHash = computePayloadHash({
        entityType: 'AnnotationRecord',
        entityReference: `rec-${i}`,
        afterValue: 'original'
      });
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
        afterValue: 'original'
      });
      prev = curr;
    }

    // Malicious actor modifies event 2's note/value without recalculating payloadHash
    events[1].afterValue = 'tampered-value';
    const verification = verifyLedgerChain(events);
    testAssert(verification.isValid === false, 'Tampered payload correctly invalidates ledger');
    testAssert(verification.brokenEventId === 'evt-2', 'Broken event accurately identified as evt-2');
    testAssert(verification.errors.some(e => e.includes('Payload tampering detected')), 'Error records payload tampering');
  });

  // TEST 5: Detection of event deletion
  runTest('Detection of event deletion in ledger', () => {
    const events: AuditEvent[] = [];
    let prev = GENESIS_PREVIOUS_HASH;
    for (let i = 1; i <= 4; i++) {
      const pHash = computePayloadHash({ entityType: 'AnnotationRecord', entityReference: `rec-${i}` });
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
        afterValue: 'val'
      });
      prev = curr;
    }

    // Malicious actor deletes event 2
    const deletedChain = [events[0], events[2], events[3]];
    const verification = verifyLedgerChain(deletedChain);
    testAssert(verification.isValid === false, 'Event deletion correctly invalidates ledger');
    testAssert(verification.errors.some(e => e.includes('Sequence discontinuity') || e.includes('Broken hash link')), 'Error captures sequence discontinuity or broken hash linkage');
  });

  // TEST 6: Detection of event reordering
  runTest('Detection of event reordering', () => {
    const events: AuditEvent[] = [];
    let prev = GENESIS_PREVIOUS_HASH;
    for (let i = 1; i <= 3; i++) {
      const pHash = computePayloadHash({ entityType: 'AnnotationRecord', entityReference: `rec-${i}` });
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
        afterValue: 'val'
      });
      prev = curr;
    }

    // Swap event 1 and event 2
    const reordered = [events[1], events[0], events[2]];
    const verification = verifyLedgerChain(reordered);
    testAssert(verification.isValid === false, 'Reordered events detected as invalid');
  });

  // TEST 7: Detection of invalid genesis / previous hash
  runTest('Detection of invalid genesis previousHash', () => {
    const pHash = computePayloadHash({ entityType: 'AnnotationRecord', entityReference: 'rec-1' });
    const roguePrev = '1'.repeat(64);
    const curr = computeEventHash({
      sequenceNumber: 1,
      previousHash: roguePrev,
      id: 'evt-1',
      timestamp: '2026-11-07T10:00:00.000Z',
      actorId: 'usr-1',
      actorRole: 'Annotator',
      organizationId: 'org-aicte-western',
      action: 'Action',
      payloadHash: pHash
    });

    const rogueEvent: AuditEvent = {
      id: 'evt-1',
      sequenceNumber: 1,
      timestamp: '2026-11-07T10:00:00.000Z',
      actorId: 'usr-1',
      actorName: 'Alice',
      actorRole: 'Annotator',
      organizationId: 'org-aicte-western',
      action: 'Action',
      entityType: 'AnnotationRecord',
      entityReference: 'rec-1',
      payloadHash: pHash,
      previousHash: roguePrev,
      currentHash: curr
    };

    const verification = verifyLedgerChain([rogueEvent]);
    testAssert(verification.isValid === false, 'Invalid genesis hash correctly rejected');
    testAssert(verification.genesisHashVerified === false, 'genesisHashVerified is false');
  });

  // TEST 8: SQLite append-only triggers prevent UPDATE & DELETE
  await runTest('SQLite triggers reject direct UPDATE and DELETE on audit_events', () => {
    const testDbPath = path.resolve(process.cwd(), 'data', `test_ledger_${Date.now()}.db`);
    const db = new ScrutinyDatabase(testDbPath);

    // Record an audit event
    const event = db.recordAudit({
      actorId: 'usr-admin',
      actorName: 'Admin',
      actorRole: 'Administrator',
      organizationId: 'org-aicte-western',
      action: 'Test Trigger',
      entityType: 'AnnotationRecord',
      entityReference: 'ent-1',
      afterValue: 'initial'
    });

    testAssert(typeof event.sequenceNumber === 'number' && event.sequenceNumber >= 1, 'Event recorded with sequence number');
    testAssert(typeof event.currentHash === 'string', 'Event recorded with cryptographic hash');

    // Attempt direct UPDATE via raw SQLite - must be rejected by trigger
    let updateThrew = false;
    try {
      (db as any).db.prepare("UPDATE audit_events SET action = 'tampered' WHERE id = ?").run(event.id);
    } catch (err: any) {
      updateThrew = true;
      testAssert(err.message.includes('append-only'), `SQLite UPDATE rejected by trigger: ${err.message}`);
    }
    testAssert(updateThrew, 'Direct UPDATE strictly blocked by audit_events_no_update trigger');

    // Attempt direct DELETE via raw SQLite - must be rejected by trigger
    let deleteThrew = false;
    try {
      (db as any).db.prepare("DELETE FROM audit_events WHERE id = ?").run(event.id);
    } catch (err: any) {
      deleteThrew = true;
      testAssert(err.message.includes('append-only'), `SQLite DELETE rejected by trigger: ${err.message}`);
    }
    testAssert(deleteThrew, 'Direct DELETE strictly blocked by audit_events_no_delete trigger');

    // Verify ledger report
    const report = db.generateLedgerIntegrityReport();
    testAssert(report.verificationResult.isValid === true, 'Ledger verification on DB instance is valid');
    testAssert(report.verificationResult.totalEventsVerified >= 1, 'Total events count >= 1');
    testAssert(report.summary.includes('Cryptographic ledger verified'), 'Summary confirms ledger verification');

    (db as any).db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  console.log(`\n================================================================`);
  console.log(`   LEDGER AUDIT RESULTS: ${passed}/${total} TEST SUITES PASSED`);
  console.log(`================================================================`);
}

runLedgerTests().catch(err => {
  console.error('Fatal ledger test error:', err);
  process.exit(1);
});
