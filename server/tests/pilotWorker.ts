import path from 'path';
import { ScrutinyDatabase } from '../db.ts';

const dbPath = process.argv[2];
const workerId = process.argv[3] || 'worker-unknown';
const eventCount = parseInt(process.argv[4] || '10', 10);
const killAfterCount = process.argv[5] ? parseInt(process.argv[5], 10) : undefined;

if (!dbPath) {
  console.error('Usage: pilotWorker <dbPath> <workerId> <eventCount> [killAfterCount]');
  process.exit(1);
}

try {
  const db = new ScrutinyDatabase(path.resolve(dbPath));

  for (let i = 1; i <= eventCount; i++) {
    db.recordAudit({
      actorId: workerId,
      actorName: `Concurrent Process ${workerId}`,
      actorRole: 'Reviewer',
      organizationId: 'org-aicte-western',
      action: 'Concurrent Worker Audit',
      entityType: 'System',
      entityReference: `${workerId}-seq-${i}`,
      beforeValue: JSON.stringify({ state: 'PRE_EXECUTION', iteration: i }),
      afterValue: JSON.stringify({ state: 'POST_EXECUTION', iteration: i, worker: workerId }),
      note: `Atomic concurrent ledger write ${i}/${eventCount} from process ${workerId}`
    });

    if (killAfterCount !== undefined && i >= killAfterCount) {
      // Abrupt process termination without closing or checkpointing to test crash recovery
      process.exit(99);
    }

    // Small jitter between writes (0-5ms) to induce lock contention
    const jitterMs = Math.floor(Math.random() * 5);
    if (jitterMs > 0) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, jitterMs);
    }
  }

  db.close();
  process.exit(0);
} catch (err: any) {
  console.error(`Worker ${workerId} failed:`, err);
  process.exit(1);
}
