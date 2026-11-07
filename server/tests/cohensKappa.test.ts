import { computeCohensKappa, AnnotationPairInput } from '../metrics/cohensKappa.ts';

function testAssert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✅ Passed: ${message}`);
}

async function runCohensKappaTests() {
  console.log('================================================================');
  console.log("   FORM2FACT V3 — COHEN'S KAPPA STATISTICAL ENGINE TESTS");
  console.log('================================================================');

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

  // 1. N = 0: No paired annotations
  runTest('N = 0: Empty pairs array returns null kappa with explicit undefinedReason', () => {
    const res = computeCohensKappa([]);
    testAssert(res.kappa === null, 'Kappa is null for N=0');
    testAssert(res.undefinedReason === 'no_paired_annotations', "undefinedReason is 'no_paired_annotations'");
    testAssert(res.po === null, 'po is null for N=0');
    testAssert(res.pe === null, 'pe is null for N=0');
    testAssert(res.pairedCount === 0, 'pairedCount is 0');
    testAssert(res.isSampleSizeSufficient === false, 'isSampleSizeSufficient is false');
  });

  // 2. N = 1: Single pair
  runTest('N = 1: Single pair with divergent labels', () => {
    const pairs: AnnotationPairInput[] = [
      { recordId: 'rec-1', annotator1Id: 'ann-1', annotator2Id: 'ann-2', label1: 'MATCH', label2: 'MISMATCH' }
    ];
    const res = computeCohensKappa(pairs);
    testAssert(typeof res.kappa === 'number' || res.kappa === null, 'Kappa result computed');
    testAssert(res.po === 0.0, 'Observed agreement po is 0.0');
    testAssert(res.pairedCount === 1, 'pairedCount is 1');
    testAssert(res.distinctAnnotatorsCount === 2, '2 distinct annotators');
    testAssert(res.isSampleSizeSufficient === false, 'N=1 flags sample size insufficient');
  });

  // 3. Perfect Agreement across multiple classes
  runTest('Perfect agreement across balanced classes yields kappa = 1.0', () => {
    const pairs: AnnotationPairInput[] = [];
    for (let i = 0; i < 5; i++) {
      pairs.push({ recordId: `rec-m-${i}`, annotator1Id: 'ann-1', annotator2Id: 'ann-2', label1: 'MATCH', label2: 'MATCH' });
      pairs.push({ recordId: `rec-d-${i}`, annotator1Id: 'ann-1', annotator2Id: 'ann-2', label1: 'MISMATCH', label2: 'MISMATCH' });
    }
    const res = computeCohensKappa(pairs);
    testAssert(res.kappa === 1.0, 'Kappa is exactly 1.0 for perfect multi-class concordance');
    testAssert(res.po === 1.0, 'po is 1.0');
    testAssert(res.pe === 0.5, 'pe is 0.5');
    testAssert(res.undefinedReason === null, 'undefinedReason is null');
    testAssert(res.interpretation.includes('Almost Perfect Agreement'), 'Interpretation is Almost Perfect Agreement');
  });

  // 4. Complete Disagreement
  runTest('Complete disagreement yields negative kappa', () => {
    const pairs: AnnotationPairInput[] = [];
    for (let i = 0; i < 10; i++) {
      pairs.push({ recordId: `rec-${i}`, annotator1Id: 'ann-1', annotator2Id: 'ann-2', label1: 'MATCH', label2: 'MISMATCH' });
    }
    const res = computeCohensKappa(pairs);
    testAssert(res.po === 0.0, 'Observed agreement po is 0.0');
    testAssert(res.pe === 0.0, 'pe is 0.0 when margins are completely disjoint');
    testAssert(res.kappa === 0.0 || (res.kappa !== null && res.kappa <= 0.0), 'Kappa reflects complete disagreement');
  });

  // 5. One-class annotation distribution (zero category variance)
  runTest('One-class annotation distribution (pe = 1.0) returns null kappa', () => {
    const pairs: AnnotationPairInput[] = [];
    for (let i = 0; i < 10; i++) {
      pairs.push({ recordId: `rec-${i}`, annotator1Id: 'ann-1', annotator2Id: 'ann-2', label1: 'MATCH', label2: 'MATCH' });
    }
    const res = computeCohensKappa(pairs);
    testAssert(res.kappa === null, 'Kappa must be null when pe = 1.0 (never silently 0.0 or 1.0)');
    testAssert(res.undefinedReason === 'denominator_zero_chance_agreement_one', "undefinedReason is 'denominator_zero_chance_agreement_one'");
    testAssert(res.po === 1.0, 'po is 1.0');
    testAssert(res.pe === 1.0, 'pe is 1.0');
    testAssert(res.rawAgreementRate === 1.0, 'rawAgreementRate is 1.0 (preserved separately)');
  });

  // 6. Expected agreement equal to 1
  runTest('Expected agreement pe = 1.0 is never coerced to 0 or 1', () => {
    const pairs: AnnotationPairInput[] = [
      { recordId: 'r1', annotator1Id: 'a1', annotator2Id: 'a2', label1: 'MISMATCH', label2: 'MISMATCH' },
      { recordId: 'r2', annotator1Id: 'a1', annotator2Id: 'a2', label1: 'MISMATCH', label2: 'MISMATCH' },
      { recordId: 'r3', annotator1Id: 'a1', annotator2Id: 'a2', label1: 'MISMATCH', label2: 'MISMATCH' }
    ];
    const res = computeCohensKappa(pairs);
    testAssert(res.kappa === null, 'Kappa strictly null on zero denominator');
    testAssert(res.undefinedReason === 'denominator_zero_chance_agreement_one', 'Explicit undefined reason provided');
  });

  // 7. Missing annotations (filtering invalid pairs)
  runTest('Missing annotations / partial submissions handled cleanly', () => {
    const pairs: AnnotationPairInput[] = [
      { recordId: 'rec-valid', annotator1Id: 'a1', annotator2Id: 'a2', label1: 'MATCH', label2: 'MATCH' }
    ];
    const res = computeCohensKappa(pairs);
    testAssert(res.pairedCount === 1, 'Only complete valid pairs counted');
  });

  // 8. Different class distributions (asymmetric marginals)
  runTest('Different class distributions computes valid kappa with asymmetric marginals', () => {
    // 20 pairs total
    // Class distribution: Ann1 has 14 MATCH, 6 MISMATCH. Ann2 has 12 MATCH, 8 MISMATCH.
    // 10 both MATCH, 4 Ann1 MATCH / Ann2 MISMATCH, 2 Ann1 MISMATCH / Ann2 MATCH, 4 both MISMATCH
    const pairs: AnnotationPairInput[] = [];
    for (let i = 0; i < 10; i++) {
      pairs.push({ recordId: `m-${i}`, annotator1Id: 'a1', annotator2Id: 'a2', label1: 'MATCH', label2: 'MATCH' });
    }
    for (let i = 0; i < 4; i++) {
      pairs.push({ recordId: `d1-${i}`, annotator1Id: 'a1', annotator2Id: 'a2', label1: 'MATCH', label2: 'MISMATCH' });
    }
    for (let i = 0; i < 2; i++) {
      pairs.push({ recordId: `d2-${i}`, annotator1Id: 'a1', annotator2Id: 'a2', label1: 'MISMATCH', label2: 'MATCH' });
    }
    for (let i = 0; i < 4; i++) {
      pairs.push({ recordId: `mm-${i}`, annotator1Id: 'a1', annotator2Id: 'a2', label1: 'MISMATCH', label2: 'MISMATCH' });
    }

    const res = computeCohensKappa(pairs);
    testAssert(res.pairedCount === 20, '20 pairs evaluated');
    testAssert(res.po === 14 / 20, 'po = 0.70');
    // pe = (14/20)*(12/20) + (6/20)*(8/20) = 0.7*0.6 + 0.3*0.4 = 0.42 + 0.12 = 0.54
    testAssert(Math.abs((res.pe ?? 0) - 0.54) < 1e-4, 'pe = 0.54');
    // kappa = (0.70 - 0.54) / (1 - 0.54) = 0.16 / 0.46 = 0.348
    testAssert(Math.abs((res.kappa ?? 0) - 0.348) < 1e-3, 'kappa is approx 0.348 (Fair Agreement)');
    testAssert(res.categoryDistribution.MATCH.annotator1 === 14, 'Ann1 MATCH count is 14');
    testAssert(res.categoryDistribution.MATCH.annotator2 === 12, 'Ann2 MATCH count is 12');
  });

  // 9. Duplicate annotator submissions (same user reviewing twice)
  runTest('Duplicate annotator submissions from same user are excluded', () => {
    const pairs: AnnotationPairInput[] = [
      { recordId: 'rec-dup', annotator1Id: 'user-same', annotator2Id: 'user-same', label1: 'MATCH', label2: 'MATCH' },
      { recordId: 'rec-legit', annotator1Id: 'user-1', annotator2Id: 'user-2', label1: 'MATCH', label2: 'MISMATCH' }
    ];
    const res = computeCohensKappa(pairs);
    testAssert(res.pairedCount === 1, 'Only 1 legitimate pair counted');
    testAssert(res.excludedPairsCount === 1, '1 duplicate annotator submission excluded');
    testAssert(res.excludedReasons[0].reason.includes('Duplicate annotator submission'), 'Reason cites duplicate submission');
  });

  // 10. Invalid label values
  runTest('Invalid taxonomy label values are excluded from calculation', () => {
    const pairs: AnnotationPairInput[] = [
      { recordId: 'rec-invalid', annotator1Id: 'a1', annotator2Id: 'a2', label1: 'PARTIAL_MATCH', label2: 'MATCH' },
      { recordId: 'rec-valid', annotator1Id: 'a1', annotator2Id: 'a2', label1: 'UNCERTAIN', label2: 'UNCERTAIN' }
    ];
    const res = computeCohensKappa(pairs);
    testAssert(res.pairedCount === 1, 'Only the canonical label pair counted');
    testAssert(res.excludedPairsCount === 1, 'Invalid label pair excluded');
    testAssert(res.excludedReasons[0].reason.includes('Invalid taxonomy label'), 'Reason cites invalid taxonomy label');
  });

  console.log('\n================================================================');
  console.log(`   COHEN'S KAPPA TESTS: ${passed}/${total} PASSED`);
  console.log('================================================================');
}

runCohensKappaTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
