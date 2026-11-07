import { FiveClassLabel } from '../../src/types/index.ts';

export const FIVE_CLASS_LABELS: FiveClassLabel[] = [
  'MATCH',
  'MISMATCH',
  'MISSING',
  'UNCERTAIN',
  'NOT_COMPARABLE'
];

export const FIVE_CLASS_LABEL_SET = new Set<string>(FIVE_CLASS_LABELS);

export interface AnnotationPairInput {
  recordId: string;
  annotator1Id: string;
  annotator2Id: string;
  label1: string;
  label2: string;
}

export type KappaUndefinedReason =
  | 'no_paired_annotations'
  | 'denominator_zero_chance_agreement_one'
  | 'all_pairs_excluded';

export interface CohenKappaResult {
  kappa: number | null;
  interpretation: string;
  undefinedReason: KappaUndefinedReason | null;
  po: number | null; // Observed agreement
  pe: number | null; // Expected chance agreement
  pairedCount: number; // Valid paired annotations count (N)
  distinctAnnotatorsCount: number;
  excludedPairsCount: number;
  excludedReasons: { pairRecordId: string; reason: string }[];
  isSampleSizeSufficient: boolean; // N >= 30
  categoryDistribution: Record<FiveClassLabel, {
    annotator1: number;
    annotator2: number;
    total: number;
  }>;
  rawAgreementRate: number; // 0.0 to 1.0
}

/**
 * Computes Cohen's Kappa for inter-annotator agreement on Form2Fact 5-class taxonomy.
 * 
 * Mathematical Formulation:
 *   kappa = (po - pe) / (1 - pe)
 * 
 * Strict Boundary Conditions:
 * - When N = 0: returns kappa: null, undefinedReason: 'no_paired_annotations'.
 * - When 1 - pe == 0: returns kappa: null, undefinedReason: 'denominator_zero_chance_agreement_one'.
 *   Never silently returns 0.0 or 1.0 when the denominator is zero.
 * - Enforces independent evaluators (annotator1Id !== annotator2Id).
 * - Enforces valid 5-class taxonomy labels.
 */
export function computeCohensKappa(pairs: AnnotationPairInput[]): CohenKappaResult {
  const categoryDistribution: Record<FiveClassLabel, { annotator1: number; annotator2: number; total: number }> = {
    MATCH: { annotator1: 0, annotator2: 0, total: 0 },
    MISMATCH: { annotator1: 0, annotator2: 0, total: 0 },
    MISSING: { annotator1: 0, annotator2: 0, total: 0 },
    UNCERTAIN: { annotator1: 0, annotator2: 0, total: 0 },
    NOT_COMPARABLE: { annotator1: 0, annotator2: 0, total: 0 }
  };

  const excludedReasons: { pairRecordId: string; reason: string }[] = [];
  const validPairs: AnnotationPairInput[] = [];
  const distinctAnnotators = new Set<string>();

  for (const p of pairs) {
    // 1. Check for duplicate annotator submissions (same user reviewing twice)
    if (p.annotator1Id === p.annotator2Id) {
      excludedReasons.push({
        pairRecordId: p.recordId,
        reason: `Duplicate annotator submission: annotator '${p.annotator1Id}' evaluated record twice.`
      });
      continue;
    }

    // 2. Check for canonical taxonomy labels
    if (!FIVE_CLASS_LABEL_SET.has(p.label1) || !FIVE_CLASS_LABEL_SET.has(p.label2)) {
      excludedReasons.push({
        pairRecordId: p.recordId,
        reason: `Invalid taxonomy label: label1='${p.label1}', label2='${p.label2}'. Must be one of: ${FIVE_CLASS_LABELS.join(', ')}.`
      });
      continue;
    }

    validPairs.push(p);
    distinctAnnotators.add(p.annotator1Id);
    distinctAnnotators.add(p.annotator2Id);
  }

  const N = validPairs.length;
  const excludedPairsCount = excludedReasons.length;
  const distinctAnnotatorsCount = distinctAnnotators.size;
  const isSampleSizeSufficient = N >= 30;

  // Boundary Condition 1: Zero valid pairs
  if (N === 0) {
    const reason: KappaUndefinedReason = pairs.length > 0 && excludedPairsCount > 0
      ? 'all_pairs_excluded'
      : 'no_paired_annotations';

    return {
      kappa: null,
      interpretation: reason === 'all_pairs_excluded'
        ? 'Undefined: All submitted candidate pairs were excluded due to validation failures.'
        : 'Undefined: No double-annotated candidate pairs exist.',
      undefinedReason: reason,
      po: null,
      pe: null,
      pairedCount: 0,
      distinctAnnotatorsCount,
      excludedPairsCount,
      excludedReasons,
      isSampleSizeSufficient: false,
      categoryDistribution,
      rawAgreementRate: 0.0
    };
  }

  // Count concordance and marginal frequencies
  let concordantMatches = 0;
  const f1: Record<FiveClassLabel, number> = {
    MATCH: 0, MISMATCH: 0, MISSING: 0, UNCERTAIN: 0, NOT_COMPARABLE: 0
  };
  const f2: Record<FiveClassLabel, number> = {
    MATCH: 0, MISMATCH: 0, MISSING: 0, UNCERTAIN: 0, NOT_COMPARABLE: 0
  };

  for (const p of validPairs) {
    const l1 = p.label1 as FiveClassLabel;
    const l2 = p.label2 as FiveClassLabel;

    if (l1 === l2) {
      concordantMatches++;
    }

    f1[l1]++;
    f2[l2]++;

    categoryDistribution[l1].annotator1++;
    categoryDistribution[l2].annotator2++;
    categoryDistribution[l1].total++;
    if (l1 !== l2) {
      categoryDistribution[l2].total++;
    }
  }

  // Observed proportional agreement: po = matches / N
  const po = concordantMatches / N;
  const rawAgreementRate = Math.round(po * 1000) / 1000;

  // Expected chance agreement: pe = sum( (f1[c]/N) * (f2[c]/N) )
  let pe = 0;
  for (const c of FIVE_CLASS_LABELS) {
    pe += (f1[c] / N) * (f2[c] / N);
  }

  // Boundary Condition 2: Denominator (1 - pe) == 0
  // When all raters exclusively assign the exact same category, pe == 1.0, making kappa mathematically undefined.
  if (Math.abs(1 - pe) < 1e-9) {
    return {
      kappa: null,
      interpretation: 'Undefined: Expected chance agreement equals 1.0 (zero category variance across pairs).',
      undefinedReason: 'denominator_zero_chance_agreement_one',
      po: Math.round(po * 1000) / 1000,
      pe: Math.round(pe * 1000) / 1000,
      pairedCount: N,
      distinctAnnotatorsCount,
      excludedPairsCount,
      excludedReasons,
      isSampleSizeSufficient,
      categoryDistribution,
      rawAgreementRate
    };
  }

  // Standard Cohen's Kappa calculation
  const rawKappa = (po - pe) / (1 - pe);
  const kappa = Math.round(rawKappa * 1000) / 1000;

  // Standard Landis & Koch (1977) descriptive categorization
  let interpretation = '';
  if (kappa >= 0.81) interpretation = 'Almost Perfect Agreement';
  else if (kappa >= 0.61) interpretation = 'Substantial Agreement';
  else if (kappa >= 0.41) interpretation = 'Moderate Agreement';
  else if (kappa >= 0.21) interpretation = 'Fair Agreement';
  else if (kappa >= 0.0) interpretation = 'Slight Agreement';
  else interpretation = 'Poor / Systematic Divergence';

  if (!isSampleSizeSufficient) {
    interpretation += ` (Advisory: sample size N=${N} < 30 carries high statistical variance)`;
  }

  return {
    kappa,
    interpretation,
    undefinedReason: null,
    po: Math.round(po * 1000) / 1000,
    pe: Math.round(pe * 1000) / 1000,
    pairedCount: N,
    distinctAnnotatorsCount,
    excludedPairsCount,
    excludedReasons,
    isSampleSizeSufficient,
    categoryDistribution,
    rawAgreementRate
  };
}
