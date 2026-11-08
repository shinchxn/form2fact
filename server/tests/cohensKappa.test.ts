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

  // 2. N = 1: Single pair with disagreement
  runTest('N = 1 with disagreement: Single pair with divergent labels yields kappa = 0', () => {
    const pairs: AnnotationPairInput[] = [
      { recordId: 'rec-1', annotator1Id: 'ann-1', annotator2Id: 'ann-2', label1: 'MATCH', label2: 'MISMATCH' }
    ];
    const res = computeCohensKappa(pairs);
    testAssert(res.kappa === 0.0, 'Kappa is 0.0 for N=1 with complete divergence');
    testAssert(res.undefinedReason === null, 'undefinedReason is null because denominator is non-zero (1 - 0 = 1)');
    testAssert(res.po === 0.0, 'Observed agreement po is 0.0');
    testAssert(res.pe === 0.0, 'Expected agreement pe is 0.0');
    testAssert(res.pairedCount === 1, 'pairedCount is 1');
    testAssert(res.distinctAnnotatorsCount === 2, '2 distinct annotators');
    testAssert(res.isSampleSizeSufficient === false, 'N=1 flags sample size insufficient');
  });

  // 2B. N = 1 with agreement: Zero denominator
  runTest('N = 1 with agreement: Single pair with concordant labels returns null kappa (pe = 1.0)', () => {
    const pairs: AnnotationPairInput[] = [
      { recordId: 'rec-agree', annotator1Id: 'ann-1', annotator2Id: 'ann-2', label1: 'MATCH', label2: 'MATCH' }
    ];
    const res = computeCohensKappa(pairs);
    testAssert(res.kappa === null, 'Kappa must be null for N=1 with agreement (never silently 1.0)');
    testAssert(res.undefinedReason === 'denominator_zero_chance_agreement_one', "undefinedReason is 'denominator_zero_chance_agreement_one'");
    testAssert(res.po === 1.0, 'Observed agreement po is 1.0');
    testAssert(res.pe === 1.0, 'Expected agreement pe is 1.0');
    testAssert(res.pairedCount === 1, 'pairedCount is 1');
    testAssert(res.distinctAnnotatorsCount === 2, '2 distinct annotators');
    testAssert(res.rawAgreementRate === 1.0, 'Raw agreement rate 1.0 is preserved separately');
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

  // 4. Disjoint classes
  runTest('Disjoint classes with zero expected agreement yields kappa = 0.0', () => {
    const pairs: AnnotationPairInput[] = [];
    for (let i = 0; i < 10; i++) {
      pairs.push({ recordId: `rec-${i}`, annotator1Id: 'ann-1', annotator2Id: 'ann-2', label1: 'MATCH', label2: 'MISMATCH' });
    }
    const res = computeCohensKappa(pairs);
    testAssert(res.po === 0.0, 'Observed agreement po is 0.0');
    testAssert(res.pe === 0.0, 'pe is 0.0 when margins are completely disjoint');
    testAssert(res.kappa === 0.0, 'Kappa is 0.0 when po=0 and pe=0');
  });

  // 4B. Complete disagreement where mathematically valid (symmetric reversed ratings)
  runTest('Complete disagreement where mathematically valid yields negative kappa = -1.0', () => {
    // 10 pairs: 5 where Ann1=MATCH, Ann2=MISMATCH; 5 where Ann1=MISMATCH, Ann2=MATCH
    // po = 0.0, pe = (5/10)*(5/10) + (5/10)*(5/10) = 0.25 + 0.25 = 0.50
    // kappa = (0 - 0.50) / (1 - 0.50) = -0.50 / 0.50 = -1.0
    const pairs: AnnotationPairInput[] = [];
    for (let i = 0; i < 5; i++) {
      pairs.push({ recordId: `rec-rev-1-${i}`, annotator1Id: 'ann-1', annotator2Id: 'ann-2', label1: 'MATCH', label2: 'MISMATCH' });
      pairs.push({ recordId: `rec-rev-2-${i}`, annotator1Id: 'ann-1', annotator2Id: 'ann-2', label1: 'MISMATCH', label2: 'MATCH' });
    }
    const res = computeCohensKappa(pairs);
    testAssert(res.po === 0.0, 'Observed agreement po is 0.0');
    testAssert(res.pe === 0.5, 'Expected agreement pe is 0.50');
    testAssert(res.kappa === -1.0, 'Kappa is exactly -1.0 for systematic inverse rating');
    testAssert(res.undefinedReason === null, 'undefinedReason is null for valid negative kappa');
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

  // 8B. 5-Class Full Taxonomy with Unequal Marginal Distributions
  runTest('5-class full taxonomy with unequal marginal distributions', () => {
    const pairs: AnnotationPairInput[] = [
      { recordId: 'c1', annotator1Id: 'a1', annotator2Id: 'a2', label1: 'MATCH', label2: 'MATCH' },
      { recordId: 'c2', annotator1Id: 'a1', annotator2Id: 'a2', label1: 'MATCH', label2: 'MATCH' },
      { recordId: 'c3', annotator1Id: 'a1', annotator2Id: 'a2', label1: 'MISMATCH', label2: 'MISMATCH' },
      { recordId: 'c4', annotator1Id: 'a1', annotator2Id: 'a2', label1: 'MISSING', label2: 'MISSING' },
      { recordId: 'c5', annotator1Id: 'a1', annotator2Id: 'a2', label1: 'UNCERTAIN', label2: 'UNCERTAIN' },
      { recordId: 'c6', annotator1Id: 'a1', annotator2Id: 'a2', label1: 'NOT_COMPARABLE', label2: 'NOT_COMPARABLE' },
      { recordId: 'c7', annotator1Id: 'a1', annotator2Id: 'a2', label1: 'MATCH', label2: 'UNCERTAIN' },
      { recordId: 'c8', annotator1Id: 'a1', annotator2Id: 'a2', label1: 'MISMATCH', label2: 'MATCH' }
    ];

    const res = computeCohensKappa(pairs);
    testAssert(res.pairedCount === 8, '8 pairs evaluated across all 5 classes');
    testAssert(res.po === 6 / 8, '6/8 concordant matches (po = 0.75)');
    testAssert(res.pe !== null && res.pe > 0 && res.pe < 1, 'pe is non-zero and non-degenerate');
    testAssert(res.kappa !== null && res.kappa > 0, 'Kappa is successfully computed for 5-class distribution');
    testAssert(res.categoryDistribution.NOT_COMPARABLE.total === 1, 'NOT_COMPARABLE accounted for');
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

  // 11. Sample size sufficiency heuristic vs universal guarantee
  runTest('Sample size sufficiency: N < 30 carries advisory warning without universal guarantee claims', () => {
    const pairs25: AnnotationPairInput[] = [];
    for (let i = 0; i < 25; i++) {
      pairs25.push({
        recordId: `r-${i}`,
        annotator1Id: 'a1',
        annotator2Id: 'a2',
        label1: i % 2 === 0 ? 'MATCH' : 'MISMATCH',
        label2: i % 2 === 0 ? 'MATCH' : 'MISMATCH'
      });
    }
    const res25 = computeCohensKappa(pairs25);
    testAssert(res25.isSampleSizeSufficient === false, 'N=25 flags isSampleSizeSufficient=false');
    testAssert(res25.interpretation.includes('Advisory: sample size N=25 < 30'), 'Interpretation includes small sample advisory warning');
    testAssert(res25.interpretation.includes('not a universal guarantee'), 'Advisory clarifies N>=30 is an empirical heuristic, not a universal guarantee');

    const pairs35: AnnotationPairInput[] = [];
    for (let i = 0; i < 35; i++) {
      pairs35.push({
        recordId: `r35-${i}`,
        annotator1Id: 'a1',
        annotator2Id: 'a2',
        label1: i % 2 === 0 ? 'MATCH' : 'MISMATCH',
        label2: i % 2 === 0 ? 'MATCH' : 'MISMATCH'
      });
    }
    const res35 = computeCohensKappa(pairs35);
    testAssert(res35.isSampleSizeSufficient === true, 'N=35 flags isSampleSizeSufficient=true');
    testAssert(!res35.interpretation.includes('Advisory: sample size'), 'N=35 omits small sample advisory warning');
  });

  console.log('\n================================================================');
  console.log(`   COHEN'S KAPPA TESTS: ${passed}/${total} PASSED`);
  console.log('================================================================');
}

runCohensKappaTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
