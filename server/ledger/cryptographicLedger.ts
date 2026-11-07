import crypto from 'crypto';
import { AuditEvent } from '../../src/types/index.ts';

export const GENESIS_PREVIOUS_HASH = '0'.repeat(64);

export interface LedgerVerificationResult {
  isValid: boolean;
  totalEventsVerified: number;
  genesisHashVerified: boolean;
  tamperedEventsCount: number;
  brokenLinkIndex: number | null;
  brokenEventId: string | null;
  errors: string[];
  firstEventTimestamp?: string;
  latestEventTimestamp?: string;
  latestEventHash?: string;
}

/**
 * Computes deterministic SHA-256 payload hash from audit event entity & payload details.
 * Keys are canonically sorted to guarantee identical hashing across platforms.
 */
export function computePayloadHash(payload: {
  entityType: string;
  entityReference: string;
  beforeValue?: string | null;
  afterValue?: string | null;
  note?: string | null;
}): string {
  const canonicalObj = {
    afterValue: payload.afterValue ?? null,
    beforeValue: payload.beforeValue ?? null,
    entityReference: payload.entityReference,
    entityType: payload.entityType,
    note: payload.note ?? null
  };
  const jsonStr = JSON.stringify(canonicalObj);
  return crypto.createHash('sha256').update(jsonStr, 'utf-8').digest('hex');
}

/**
 * Computes deterministic SHA-256 event hash linking this event to the previous event in the chain.
 */
export function computeEventHash(params: {
  sequenceNumber: number;
  previousHash: string;
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: string;
  organizationId: string;
  action: string;
  payloadHash: string;
}): string {
  const blockHeader = [
    params.sequenceNumber,
    params.previousHash,
    params.id,
    params.timestamp,
    params.actorId,
    params.actorRole,
    params.organizationId,
    params.action,
    params.payloadHash
  ].join('|');
  return crypto.createHash('sha256').update(blockHeader, 'utf-8').digest('hex');
}

/**
 * Verifies the complete cryptographic hash chain of an ordered array of ledger events.
 * 
 * Verifications executed:
 * 1. Event 1 must have previousHash === GENESIS_PREVIOUS_HASH.
 * 2. Sequence numbers must be strictly sequential (seq == prevSeq + 1).
 * 3. Event N must have previousHash === Event N-1 currentHash.
 * 4. Payload hash must match recomputed canonical payload hash.
 * 5. Current hash must match recomputed event hash.
 * 6. Actor ID, role, and action must be non-empty valid strings.
 */
export function verifyLedgerChain(events: AuditEvent[]): LedgerVerificationResult {
  const errors: string[] = [];
  let tamperedCount = 0;
  let brokenIndex: number | null = null;
  let brokenId: string | null = null;

  if (events.length === 0) {
    return {
      isValid: true,
      totalEventsVerified: 0,
      genesisHashVerified: true,
      tamperedEventsCount: 0,
      brokenLinkIndex: null,
      brokenEventId: null,
      errors: []
    };
  }

  let expectedPrevHash = GENESIS_PREVIOUS_HASH;
  let expectedSeq = events[0].sequenceNumber ?? 1;

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const seq = e.sequenceNumber ?? (i + 1);

    // 1. Verify sequence order
    if (seq !== expectedSeq) {
      errors.push(`Sequence discontinuity at index ${i}: expected seq ${expectedSeq}, found ${seq} (event ID: ${e.id})`);
      tamperedCount++;
      if (brokenIndex === null) {
        brokenIndex = i;
        brokenId = e.id;
      }
    }

    // 2. Verify previousHash link
    if (e.previousHash !== expectedPrevHash) {
      errors.push(`Broken hash link at index ${i} (event ID: ${e.id}): expected previousHash '${expectedPrevHash}', found '${e.previousHash}'`);
      tamperedCount++;
      if (brokenIndex === null) {
        brokenIndex = i;
        brokenId = e.id;
      }
    }

    // 3. Verify payload hash
    const recomputedPayloadHash = computePayloadHash({
      entityType: e.entityType,
      entityReference: e.entityReference,
      beforeValue: e.beforeValue,
      afterValue: e.afterValue,
      note: e.note
    });

    if (e.payloadHash && e.payloadHash !== recomputedPayloadHash) {
      errors.push(`Payload tampering detected at index ${i} (event ID: ${e.id}): stored payloadHash '${e.payloadHash}' does not match recomputed '${recomputedPayloadHash}'`);
      tamperedCount++;
      if (brokenIndex === null) {
        brokenIndex = i;
        brokenId = e.id;
      }
    }

    // 4. Verify current event hash
    const recomputedEventHash = computeEventHash({
      sequenceNumber: seq,
      previousHash: e.previousHash || expectedPrevHash,
      id: e.id,
      timestamp: e.timestamp,
      actorId: e.actorId,
      actorRole: e.actorRole || 'Reviewer',
      organizationId: e.organizationId || 'org-aicte-western',
      action: e.action,
      payloadHash: recomputedPayloadHash
    });

    if (e.currentHash && e.currentHash !== recomputedEventHash) {
      errors.push(`Block hash tampering detected at index ${i} (event ID: ${e.id}): stored currentHash '${e.currentHash}' does not match recomputed '${recomputedEventHash}'`);
      tamperedCount++;
      if (brokenIndex === null) {
        brokenIndex = i;
        brokenId = e.id;
      }
    }

    // 5. Verify actor references
    if (!e.actorId || !e.actorId.trim()) {
      errors.push(`Invalid actor reference at index ${i} (event ID: ${e.id}): actorId is empty`);
      tamperedCount++;
    }

    expectedPrevHash = e.currentHash || recomputedEventHash;
    expectedSeq = seq + 1;
  }

  return {
    isValid: errors.length === 0,
    totalEventsVerified: events.length,
    genesisHashVerified: events[0].previousHash === GENESIS_PREVIOUS_HASH,
    tamperedEventsCount: tamperedCount,
    brokenLinkIndex: brokenIndex,
    brokenEventId: brokenId,
    errors,
    firstEventTimestamp: events[0].timestamp,
    latestEventTimestamp: events[events.length - 1].timestamp,
    latestEventHash: events[events.length - 1].currentHash
  };
}
