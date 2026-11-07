import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AuditEvent } from '../../src/types/index.ts';
import { verifyLedgerChain } from './cryptographicLedger.ts';

export interface CheckpointDatabaseFingerprint {
  userCount: number;
  docketCount: number;
  candidateCount: number;
  decisionCount: number;
}

export interface CheckpointSignature {
  algorithm: 'HMAC-SHA256';
  keyId: string;
  signatureHex: string;
  signedTimestamp: string;
}

export interface LedgerCheckpoint {
  checkpointId: string;
  schemaVersion: '1.0';
  timestamp: string;
  sequenceNumber: number; // Highest sequence number covered
  totalEventsCount: number;
  latestEventId: string;
  latestEventHash: string;
  rootCumulativeHash: string; // Cumulative hash over all event hashes in sequence
  databaseFingerprint: CheckpointDatabaseFingerprint;
  signature: CheckpointSignature;
}

export type CheckpointVerificationStatus =
  | 'VERIFIED'
  | 'SIGNATURE_INVALID'
  | 'ROLLBACK_DETECTED'
  | 'HISTORY_FORKED'
  | 'LEDGER_TAMPERED'
  | 'EVENT_COUNT_MISMATCH';

export interface CheckpointVerificationResult {
  isValid: boolean;
  status: CheckpointVerificationStatus;
  checkpointSequence: number;
  currentLatestSequence: number;
  expectedEventHash: string;
  actualEventHash?: string;
  errors: string[];
}

/**
 * Computes deterministic cumulative SHA-256 hash chaining all event hashes in sequence order.
 * H_cumulative = SHA256(H_1 || H_2 || ... || H_n)
 */
export function computeCumulativeHash(events: AuditEvent[]): string {
  const hasher = crypto.createHash('sha256');
  const sorted = [...events].sort((a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0));
  for (const e of sorted) {
    hasher.update(`${e.sequenceNumber}:${e.currentHash || ''}:`, 'utf-8');
  }
  return hasher.digest('hex');
}

/**
 * Computes canonical payload bytes to sign for the checkpoint.
 */
function getCheckpointCanonicalString(data: Omit<LedgerCheckpoint, 'signature'>): string {
  return [
    data.checkpointId,
    data.schemaVersion,
    data.timestamp,
    data.sequenceNumber,
    data.totalEventsCount,
    data.latestEventId,
    data.latestEventHash,
    data.rootCumulativeHash,
    data.databaseFingerprint.userCount,
    data.databaseFingerprint.docketCount,
    data.databaseFingerprint.candidateCount,
    data.databaseFingerprint.decisionCount
  ].join('|');
}

/**
 * Creates a signed daily external ledger checkpoint.
 * Signing secret is passed explicitly via environment or options; never hardcoded.
 */
export function createLedgerCheckpoint(
  events: AuditEvent[],
  fingerprint: CheckpointDatabaseFingerprint,
  options: {
    keyId?: string;
    signingSecret?: string;
    checkpointDir?: string;
  } = {}
): LedgerCheckpoint {
  if (events.length === 0) {
    throw new Error('Cannot create ledger checkpoint on empty audit log.');
  }

  const sorted = [...events].sort((a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0));
  const latest = sorted[sorted.length - 1];

  const signingSecret = options.signingSecret || process.env.LEDGER_SIGNING_KEY || process.env.JWT_SECRET;
  if (!signingSecret || signingSecret.length < 32) {
    throw new Error('Ledger checkpoint creation requires a signing key of at least 32 characters (LEDGER_SIGNING_KEY).');
  }

  const keyId = options.keyId || process.env.LEDGER_SIGNING_KEY_ID || 'aicte-pilot-key-2026-v1';
  const now = new Date().toISOString();
  const checkpointId = `chk-${now.slice(0, 10)}-seq${latest.sequenceNumber}-${crypto.randomUUID().slice(0, 8)}`;
  const rootCumulativeHash = computeCumulativeHash(sorted);

  const unsignedCheckpoint: Omit<LedgerCheckpoint, 'signature'> = {
    checkpointId,
    schemaVersion: '1.0',
    timestamp: now,
    sequenceNumber: latest.sequenceNumber ?? sorted.length,
    totalEventsCount: sorted.length,
    latestEventId: latest.id,
    latestEventHash: latest.currentHash || '',
    rootCumulativeHash,
    databaseFingerprint: fingerprint
  };

  const canonicalString = getCheckpointCanonicalString(unsignedCheckpoint);
  const signatureHex = crypto.createHmac('sha256', signingSecret).update(canonicalString, 'utf-8').digest('hex');

  const checkpoint: LedgerCheckpoint = {
    ...unsignedCheckpoint,
    signature: {
      algorithm: 'HMAC-SHA256',
      keyId,
      signatureHex,
      signedTimestamp: now
    }
  };

  if (options.checkpointDir) {
    saveCheckpointToFile(checkpoint, options.checkpointDir);
  }

  return checkpoint;
}

/**
 * Validates the cryptographic signature of an external checkpoint.
 */
export function verifyCheckpointSignature(checkpoint: LedgerCheckpoint, secretKey: string): boolean {
  if (!secretKey || !checkpoint.signature || !checkpoint.signature.signatureHex) {
    return false;
  }
  const canonicalString = getCheckpointCanonicalString(checkpoint);
  const expectedSig = crypto.createHmac('sha256', secretKey).update(canonicalString, 'utf-8').digest('hex');
  return crypto.timingSafeEqual(Buffer.from(checkpoint.signature.signatureHex, 'hex'), Buffer.from(expectedSig, 'hex'));
}

/**
 * Verifies a database audit log against an independently stored external checkpoint.
 * Detects database rollback, state replacement, sequence truncation, and fork attacks.
 */
export function verifyLedgerAgainstCheckpoint(
  events: AuditEvent[],
  checkpoint: LedgerCheckpoint,
  secretKey?: string
): CheckpointVerificationResult {
  const errors: string[] = [];

  // 1. Signature check (if key provided)
  const keyToUse = secretKey || process.env.LEDGER_SIGNING_KEY || process.env.JWT_SECRET;
  if (keyToUse) {
    const isSigValid = verifyCheckpointSignature(checkpoint, keyToUse);
    if (!isSigValid) {
      return {
        isValid: false,
        status: 'SIGNATURE_INVALID',
        checkpointSequence: checkpoint.sequenceNumber,
        currentLatestSequence: events.length > 0 ? (events[events.length - 1].sequenceNumber ?? 0) : 0,
        expectedEventHash: checkpoint.latestEventHash,
        errors: ['Checkpoint cryptographic signature is invalid or forged.']
      };
    }
  }

  const sorted = [...events].sort((a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0));
  const currentLatestSeq = sorted.length > 0 ? (sorted[sorted.length - 1].sequenceNumber ?? 0) : 0;

  // 1b. Internal Ledger Chain Verification
  const internalChainResult = verifyLedgerChain(sorted);
  if (!internalChainResult.isValid) {
    errors.push(
      `CRITICAL LEDGER TAMPERING DETECTED: Internal cryptographic hash chain verification failed with ${internalChainResult.tamperedEventsCount} errors. Chain broken at link ${internalChainResult.brokenLinkIndex}.`
    );
    return {
      isValid: false,
      status: 'LEDGER_TAMPERED',
      checkpointSequence: checkpoint.sequenceNumber,
      currentLatestSequence: currentLatestSeq,
      expectedEventHash: checkpoint.latestEventHash,
      errors
    };
  }

  // 2. Rollback Detection: Current DB has fewer events than previously attested checkpoint
  if (currentLatestSeq < checkpoint.sequenceNumber) {
    errors.push(
      `CRITICAL DATABASE ROLLBACK DETECTED: Database highest sequence (${currentLatestSeq}) is lower than certified checkpoint sequence (${checkpoint.sequenceNumber}). An unauthorized restoration or deletion occurred.`
    );
    return {
      isValid: false,
      status: 'ROLLBACK_DETECTED',
      checkpointSequence: checkpoint.sequenceNumber,
      currentLatestSequence: currentLatestSeq,
      expectedEventHash: checkpoint.latestEventHash,
      errors
    };
  }

  // 3. Locate the event at checkpoint.sequenceNumber
  const eventAtCheckpointSeq = sorted.find((e) => e.sequenceNumber === checkpoint.sequenceNumber);
  if (!eventAtCheckpointSeq) {
    errors.push(`Missing event at certified checkpoint sequence ${checkpoint.sequenceNumber}.`);
    return {
      isValid: false,
      status: 'ROLLBACK_DETECTED',
      checkpointSequence: checkpoint.sequenceNumber,
      currentLatestSequence: currentLatestSeq,
      expectedEventHash: checkpoint.latestEventHash,
      errors
    };
  }

  // 4. History Fork Detection: Event hash at checkpoint sequence differs
  if (eventAtCheckpointSeq.currentHash !== checkpoint.latestEventHash) {
    errors.push(
      `CRITICAL HISTORY FORK DETECTED: Event at sequence ${checkpoint.sequenceNumber} has hash '${eventAtCheckpointSeq.currentHash}', but certified checkpoint attested '${checkpoint.latestEventHash}'. Database history has been replaced or regenerated.`
    );
    return {
      isValid: false,
      status: 'HISTORY_FORKED',
      checkpointSequence: checkpoint.sequenceNumber,
      currentLatestSequence: currentLatestSeq,
      expectedEventHash: checkpoint.latestEventHash,
      actualEventHash: eventAtCheckpointSeq.currentHash,
      errors
    };
  }

  // 5. Cumulative Hash Integrity Check (Events 1 through checkpoint.sequenceNumber)
  const eventsUpToCheckpoint = sorted.filter((e) => (e.sequenceNumber ?? 0) <= checkpoint.sequenceNumber);
  const recomputedCumulative = computeCumulativeHash(eventsUpToCheckpoint);
  if (recomputedCumulative !== checkpoint.rootCumulativeHash) {
    errors.push(
      `CRITICAL LEDGER TAMPERING DETECTED: Cumulative hash over events 1..${checkpoint.sequenceNumber} ('${recomputedCumulative}') does not match checkpoint root hash ('${checkpoint.rootCumulativeHash}'). Intermediate events have been modified.`
    );
    return {
      isValid: false,
      status: 'LEDGER_TAMPERED',
      checkpointSequence: checkpoint.sequenceNumber,
      currentLatestSequence: currentLatestSeq,
      expectedEventHash: checkpoint.rootCumulativeHash,
      actualEventHash: recomputedCumulative,
      errors
    };
  }

  return {
    isValid: true,
    status: 'VERIFIED',
    checkpointSequence: checkpoint.sequenceNumber,
    currentLatestSequence: currentLatestSeq,
    expectedEventHash: checkpoint.latestEventHash,
    actualEventHash: eventAtCheckpointSeq.currentHash,
    errors: []
  };
}

/**
 * Saves a checkpoint to independent filesystem storage.
 */
export function saveCheckpointToFile(checkpoint: LedgerCheckpoint, targetDir: string): string {
  fs.mkdirSync(targetDir, { recursive: true });
  const filename = `${checkpoint.checkpointId}.json`;
  const filePath = path.join(targetDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2), 'utf-8');
  return filePath;
}

/**
 * Loads a checkpoint from file.
 */
export function loadCheckpointFromFile(filePath: string): LedgerCheckpoint {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as LedgerCheckpoint;
}

