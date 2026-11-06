import { FindingEvidence } from '../../../src/types/index.ts';
import { normalizeDate, normalizeText, areEntityNamesConcordant } from '../../rulesEngine.ts';
import { logger } from '../../core/logger/index.ts';

export type PairwiseLabel = 'MATCH' | 'MISMATCH' | 'MISSING' | 'UNCERTAIN' | 'NOT_COMPARABLE';

export interface FieldCandidate {
  fieldId?: string;
  documentId?: string;
  documentName?: string;
  fieldName: string;
  fieldLabel: string;
  rawValue: string;
  normalizedValue?: string;
  pageNumber?: number;
  sourceText?: string;
  confidence?: number;
}

export interface PairwiseComparisonInput {
  domainId?: string;
  relationshipId?: string;
  claimField: FieldCandidate;
  evidenceField?: FieldCandidate;
  comparisonType?: 'date' | 'numeric' | 'entity-name' | 'code' | 'address' | 'generic';
  toleranceThreshold?: number;
  confidenceThreshold?: number; // e.g. 0.85 below which it abstains to UNCERTAIN
}

/**
 * NOTICE ON CONFIDENCE RATINGS:
 * The `confidence` score in this output represents a heuristic similarity and
 * deterministic concordance rating on a [0.0, 1.0] scale.
 * It is NOT a calibrated Bayesian or statistical posterior probability.
 * Ambiguous text, rephrased statements, and low-overlap fields strictly abstain
 * to UNCERTAIN to enforce human officer review.
 */
export interface PairwiseComparisonOutput {
  label: PairwiseLabel;
  confidence: number;
  isDeterministic: boolean;
  explanation: string;
  normalizedClaimValue: string;
  normalizedEvidenceValue?: string;
  evidenceList: FindingEvidence[];
  requiresHumanReview: boolean;
  modelVersion: string;
}

export class PairwiseFieldClassifier {
  private static readonly MODEL_VERSION = 'form2fact-hybrid-pairwise-v2.0-remediated';
  private static readonly DEFAULT_CONFIDENCE_THRESHOLD = 0.85;

  /**
   * Executes the hybrid deterministic and pairwise field comparison pipeline.
   * Adheres strictly to the principle that low lexical similarity is NOT proof of contradiction;
   * verified contradictions trigger MISMATCH, while ambiguity abstains to UNCERTAIN.
   */
  public static async compare(input: PairwiseComparisonInput): Promise<PairwiseComparisonOutput> {
    const claim = input.claimField;
    const evidence = input.evidenceField;
    const confidenceThreshold = input.confidenceThreshold ?? this.DEFAULT_CONFIDENCE_THRESHOLD;

    // 1. Missing Evidence Check
    if (!evidence || !evidence.rawValue || evidence.rawValue.trim() === '') {
      return {
        label: 'MISSING',
        confidence: 1.0,
        isDeterministic: true,
        explanation: `Mandatory supporting document or evidence field '${claim.fieldLabel}' not found in submitted docket.`,
        normalizedClaimValue: claim.normalizedValue || claim.rawValue,
        evidenceList: [],
        requiresHumanReview: true,
        modelVersion: this.MODEL_VERSION
      };
    }

    // 2. Compatibility check: verify fields represent comparable statutory claims
    if (claim.fieldName !== evidence.fieldName && !this.areFieldNamesCompatible(claim.fieldName, evidence.fieldName)) {
      return {
        label: 'NOT_COMPARABLE',
        confidence: 1.0,
        isDeterministic: true,
        explanation: `Field '${claim.fieldName}' and field '${evidence.fieldName}' do not represent comparable statutory dimensions.`,
        normalizedClaimValue: claim.rawValue,
        normalizedEvidenceValue: evidence.rawValue,
        evidenceList: [],
        requiresHumanReview: false,
        modelVersion: this.MODEL_VERSION
      };
    }

    // Build evidence item
    const evidenceItems: FindingEvidence[] = [];
    if (evidence.documentName && evidence.pageNumber) {
      evidenceItems.push({
        id: `ev-${Date.now()}`,
        findingId: '',
        documentId: evidence.documentId || 'unknown-doc',
        documentName: evidence.documentName,
        pageNumber: evidence.pageNumber,
        fieldId: evidence.fieldId,
        evidenceText: evidence.sourceText || `Extracted value: ${evidence.rawValue}`,
        evidenceRole: 'Conflicting Evidence'
      });
    }

    // 3. OCR Corruption & Legibility Check
    if (this.isOcrDegradedOrCorrupted(claim.rawValue) || this.isOcrDegradedOrCorrupted(evidence.rawValue)) {
      return {
        label: 'UNCERTAIN',
        confidence: 0.30,
        isDeterministic: true,
        explanation: `Optical character recognition (OCR) legibility degraded or text unreadable. Scanned document requires physical human inspection.`,
        normalizedClaimValue: claim.rawValue,
        normalizedEvidenceValue: evidence.rawValue,
        evidenceList: evidenceItems,
        requiresHumanReview: true,
        modelVersion: this.MODEL_VERSION
      };
    }

    // 4. Exact Normalized String / Identifier Match (Fast Path)
    const normClaim = normalizeText(claim.normalizedValue || claim.rawValue);
    const normEvidence = normalizeText(evidence.normalizedValue || evidence.rawValue);

    if (normClaim === normEvidence && normClaim !== '') {
      return {
        label: 'MATCH',
        confidence: 1.0,
        isDeterministic: true,
        explanation: `Exact normalized string concordance on ${claim.fieldLabel} ("${claim.rawValue}").`,
        normalizedClaimValue: normClaim,
        normalizedEvidenceValue: normEvidence,
        evidenceList: evidenceItems,
        requiresHumanReview: false,
        modelVersion: this.MODEL_VERSION
      };
    }

    // 5. Date Comparison & Expiry Verification
    if (input.comparisonType === 'date' || claim.fieldName.toLowerCase().includes('date') || claim.fieldName.toLowerCase().includes('expiry')) {
      const dateClaim = normalizeDate(claim.rawValue);
      const dateEvidence = normalizeDate(evidence.rawValue);

      if (dateClaim && dateEvidence) {
        if (dateClaim === dateEvidence) {
          return {
            label: 'MATCH',
            confidence: 0.99,
            isDeterministic: true,
            explanation: `Date concordance verified: ${dateClaim}.`,
            normalizedClaimValue: dateClaim,
            normalizedEvidenceValue: dateEvidence,
            evidenceList: evidenceItems,
            requiresHumanReview: false,
            modelVersion: this.MODEL_VERSION
          };
        } else {
          return {
            label: 'MISMATCH',
            confidence: 0.98,
            isDeterministic: true,
            explanation: `Date contradiction verified: Declared ${dateClaim} directly contradicts supporting document evidence ${dateEvidence}.`,
            normalizedClaimValue: dateClaim,
            normalizedEvidenceValue: dateEvidence,
            evidenceList: evidenceItems,
            requiresHumanReview: true,
            modelVersion: this.MODEL_VERSION
          };
        }
      }
    }

    // 6. Numeric / Acreage Tolerance Comparison
    if (input.comparisonType === 'numeric' || claim.fieldName.toLowerCase().includes('acres') || claim.fieldName.toLowerCase().includes('area')) {
      const numClaim = parseFloat(claim.normalizedValue || claim.rawValue);
      const numEvidence = parseFloat(evidence.normalizedValue || evidence.rawValue);
      const tolerance = input.toleranceThreshold ?? 0.05;

      if (!isNaN(numClaim) && !isNaN(numEvidence)) {
        if (Math.abs(numClaim - numEvidence) <= tolerance) {
          return {
            label: 'MATCH',
            confidence: 0.98,
            isDeterministic: true,
            explanation: `Numeric concordance verified: Declared ${numClaim} matches evidence ${numEvidence} within ${tolerance} tolerance.`,
            normalizedClaimValue: String(numClaim),
            normalizedEvidenceValue: String(numEvidence),
            evidenceList: evidenceItems,
            requiresHumanReview: false,
            modelVersion: this.MODEL_VERSION
          };
        } else {
          const delta = Math.abs(numClaim - numEvidence).toFixed(2);
          const isDeficit = numClaim > numEvidence;
          return {
            label: 'MISMATCH',
            confidence: 0.98,
            isDeterministic: true,
            explanation: `Numeric variance verified: Declared ${numClaim} differs from supporting evidence ${numEvidence} by ${delta} (exceeds ${tolerance} tolerance threshold; ${isDeficit ? 'deficit' : 'surplus'}).`,
            normalizedClaimValue: String(numClaim),
            normalizedEvidenceValue: String(numEvidence),
            evidenceList: evidenceItems,
            requiresHumanReview: true,
            modelVersion: this.MODEL_VERSION
          };
        }
      }
    }

    // 7. Embedded Numeric Contradiction Check (e.g. "intake 300 students" vs "intake 420 students")
    const numericContradiction = this.detectNumericContradiction(normClaim, normEvidence);
    if (numericContradiction) {
      return {
        label: 'MISMATCH',
        confidence: 0.95,
        isDeterministic: true,
        explanation: `Conflicting numeric figures detected in textual descriptions: Claim cites ${numericContradiction.claimNum} vs Evidence cites ${numericContradiction.evidenceNum}.`,
        normalizedClaimValue: normClaim,
        normalizedEvidenceValue: normEvidence,
        evidenceList: evidenceItems,
        requiresHumanReview: true,
        modelVersion: this.MODEL_VERSION
      };
    }

    // 8. Legal Entity Name Concordance (Society, Trust, Institution Name)
    if (input.comparisonType === 'entity-name' || claim.fieldName.toLowerCase().includes('name') || claim.fieldName.toLowerCase().includes('trust')) {
      const entityResult = areEntityNamesConcordant(claim.rawValue, evidence.rawValue);

      // Proven corporate commercial conflict (e.g. Private Ltd vs Non-Profit Trust)
      if (entityResult.reason.includes('Commercial corporate entity')) {
        return {
          label: 'MISMATCH',
          confidence: 0.95,
          isDeterministic: false,
          explanation: `Legal entity conflict verified: ${entityResult.reason}.`,
          normalizedClaimValue: normClaim,
          normalizedEvidenceValue: normEvidence,
          evidenceList: evidenceItems,
          requiresHumanReview: true,
          modelVersion: this.MODEL_VERSION
        };
      }

      if (entityResult.isMatch && entityResult.confidence >= confidenceThreshold) {
        return {
          label: 'MATCH',
          confidence: entityResult.confidence,
          isDeterministic: false,
          explanation: `Entity name concordance verified: ${entityResult.reason} (heuristic score: ${(entityResult.confidence * 100).toFixed(0)}%).`,
          normalizedClaimValue: normClaim,
          normalizedEvidenceValue: normEvidence,
          evidenceList: evidenceItems,
          requiresHumanReview: false,
          modelVersion: this.MODEL_VERSION
        };
      }

      // If entity names diverge or overlap is partial without proven fraud -> ABSTAIN TO UNCERTAIN
      return {
        label: 'UNCERTAIN',
        confidence: Math.round(entityResult.confidence * 100) / 100,
        isDeterministic: false,
        explanation: `Entity naming variation detected ("${claim.rawValue}" vs "${evidence.rawValue}"). Sponsoring trust charter requires human officer scrutiny.`,
        normalizedClaimValue: normClaim,
        normalizedEvidenceValue: normEvidence,
        evidenceList: evidenceItems,
        requiresHumanReview: true,
        modelVersion: this.MODEL_VERSION
      };
    }

    // 8.5 Optional Call to Real Python FastAPI ML Microservice when available
    const mlServiceUrl = process.env.AI_SERVICE_URL || process.env.ML_SERVICE_URL;
    if (mlServiceUrl) {
      try {
        const mlRes = await fetch(`${mlServiceUrl.replace(/\/+$/, '')}/api/v1/classify-pair`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain_id: input.domainId || 'aicte',
            relationship_id: input.relationshipId,
            claim_field: {
              field_id: claim.fieldId,
              document_id: claim.documentId,
              document_name: claim.documentName,
              field_name: claim.fieldName,
              field_label: claim.fieldLabel,
              raw_value: claim.rawValue,
              normalized_value: normClaim,
              page_number: claim.pageNumber,
              source_text: claim.sourceText
            },
            evidence_field: {
              field_id: evidence.fieldId,
              document_id: evidence.documentId,
              document_name: evidence.documentName,
              field_name: evidence.fieldName,
              field_label: evidence.fieldLabel,
              raw_value: evidence.rawValue,
              normalized_value: normEvidence,
              page_number: evidence.pageNumber,
              source_text: evidence.sourceText
            },
            comparison_type: input.comparisonType || 'generic',
            confidence_threshold: confidenceThreshold
          }),
          signal: AbortSignal.timeout(3000)
        });

        if (mlRes.ok) {
          const mlData = await mlRes.json() as any;
          return {
            label: mlData.label as PairwiseLabel,
            confidence: mlData.confidence,
            isDeterministic: false,
            explanation: mlData.explanation || `ML inference result with ${(mlData.confidence * 100).toFixed(0)}% confidence.`,
            normalizedClaimValue: normClaim,
            normalizedEvidenceValue: normEvidence,
            evidenceList: evidenceItems,
            requiresHumanReview: mlData.requires_human_review ?? (mlData.confidence < 0.60),
            modelVersion: mlData.model_version || 'form2fact-hybrid-pairwise-v2.0-champion'
          };
        }
      } catch (err: any) {
        logger.debug('ML microservice unavailable; falling back to deterministic screening', { error: err.message });
      }
    }

    // 9. Address and General Textual Comparison (Deterministic Fallback)
    const tokenOverlap = this.calculateTokenOverlap(normClaim, normEvidence);

    // High lexical concordance (>= 0.85) -> MATCH
    if (tokenOverlap >= 0.85) {
      return {
        label: 'MATCH',
        confidence: Number(tokenOverlap.toFixed(2)),
        isDeterministic: true,
        explanation: `Textual concordance verified via deterministic screening (${(tokenOverlap * 100).toFixed(0)}% token overlap).`,
        normalizedClaimValue: normClaim,
        normalizedEvidenceValue: normEvidence,
        evidenceList: evidenceItems,
        requiresHumanReview: tokenOverlap < confidenceThreshold,
        modelVersion: 'form2fact-deterministic-screening-v1.0'
      };
    }

    // Check for proven geographic contradictions (conflicting PIN codes or distinct state names)
    const geoConflict = this.detectGeographicConflict(normClaim, normEvidence);
    if (geoConflict) {
      return {
        label: 'MISMATCH',
        confidence: 0.95,
        isDeterministic: true,
        explanation: `Geographic address conflict verified: ${geoConflict}.`,
        normalizedClaimValue: normClaim,
        normalizedEvidenceValue: normEvidence,
        evidenceList: evidenceItems,
        requiresHumanReview: true,
        modelVersion: this.MODEL_VERSION
      };
    }

    // 10. CRITICAL REMEDIATION: Low or intermediate lexical similarity without proven contradiction
    // MUST strictly abstain to UNCERTAIN rather than falsely asserting MISMATCH!
    logger.info('Pairwise classifier abstaining to UNCERTAIN for human review', {
      claim: claim.rawValue,
      evidence: evidence.rawValue,
      overlap: tokenOverlap
    });

    return {
      label: 'UNCERTAIN',
      confidence: Number(Math.max(0.20, tokenOverlap).toFixed(2)),
      isDeterministic: true,
      explanation: `Textual variation detected via deterministic screening (${(tokenOverlap * 100).toFixed(0)}% lexical overlap). Information formatting or terminology diverges without verified statutory contradiction; referred for human reviewer verification.`,
      normalizedClaimValue: normClaim,
      normalizedEvidenceValue: normEvidence,
      evidenceList: evidenceItems,
      requiresHumanReview: true,
      modelVersion: 'form2fact-deterministic-screening-v1.0'
    };
  }

  private static isOcrDegradedOrCorrupted(text: string): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    if (lower.includes('[scanned bitmap') || lower.includes('ocr text layer not present') || lower.includes('unreadable')) {
      return true;
    }
    // Check for excessive replacement or corruption characters
    const corruptionMatches = text.match(/[\uFFFD\?]{3,}/g);
    if (corruptionMatches && corruptionMatches.length > 0) {
      return true;
    }
    return false;
  }

  private static detectNumericContradiction(normClaim: string, normEvidence: string): { claimNum: string; evidenceNum: string } | null {
    const claimNumbers = normClaim.match(/\b\d+(\.\d+)?\b/g);
    const evidenceNumbers = normEvidence.match(/\b\d+(\.\d+)?\b/g);

    if (claimNumbers && evidenceNumbers && claimNumbers.length === 1 && evidenceNumbers.length === 1) {
      const c = parseFloat(claimNumbers[0]);
      const e = parseFloat(evidenceNumbers[0]);
      // If single numbers exist in both strings and are distinct, and text around them is similar
      if (c !== e && Math.abs(c - e) > 0.01) {
        const claimTextNoNum = normClaim.replace(/\b\d+(\.\d+)?\b/g, '').trim();
        const evidenceTextNoNum = normEvidence.replace(/\b\d+(\.\d+)?\b/g, '').trim();
        const tokensA = new Set(claimTextNoNum.split(/\s+/).filter(t => t.length > 2));
        const tokensB = new Set(evidenceTextNoNum.split(/\s+/).filter(t => t.length > 2));
        let matchCount = 0;
        for (const t of tokensA) {
          if (tokensB.has(t)) matchCount++;
        }
        const unionSize = new Set([...tokensA, ...tokensB]).size;
        const overlap = unionSize > 0 ? matchCount / unionSize : 0;
        if (overlap >= 0.20 || matchCount >= 2) {
          return { claimNum: claimNumbers[0], evidenceNum: evidenceNumbers[0] };
        }
      }
    }
    return null;
  }

  private static detectGeographicConflict(normClaim: string, normEvidence: string): string | null {
    // Check for distinct 6-digit Indian PIN codes
    const claimPin = normClaim.match(/\b\d{6}\b/);
    const evidencePin = normEvidence.match(/\b\d{6}\b/);
    if (claimPin && evidencePin && claimPin[0] !== evidencePin[0]) {
      return `Conflicting PIN codes detected (Claimed: ${claimPin[0]} vs Evidence: ${evidencePin[0]})`;
    }

    // Check for distinct Indian state mentions
    const states = ['maharashtra', 'gujarat', 'karnataka', 'madhya pradesh', 'rajasthan', 'tamil nadu', 'kerala', 'delhi', 'uttar pradesh'];
    const claimStates = states.filter(s => normClaim.includes(s));
    const evidenceStates = states.filter(s => normEvidence.includes(s));
    if (claimStates.length > 0 && evidenceStates.length > 0) {
      const hasOverlap = claimStates.some(s => evidenceStates.includes(s));
      if (!hasOverlap) {
        return `Conflicting State jurisdictions detected (Claimed: ${claimStates.join(', ')} vs Evidence: ${evidenceStates.join(', ')})`;
      }
    }

    return null;
  }

  private static areFieldNamesCompatible(a: string, b: string): boolean {
    const normA = a.toLowerCase().replace(/[^a-z]/g, '');
    const normB = b.toLowerCase().replace(/[^a-z]/g, '');
    if (normA === normB) return true;

    const aliases: Record<string, string[]> = {
      leaseexpirydate: ['validupto', 'terminationdate', 'expirydate'],
      landareaacres: ['campusarea', 'landarea', 'totalarea', 'parcelarea'],
      trustname: ['societyname', 'foundationname', 'sponsoringbody'],
      priorapprovalorderref: ['previousapprovalref', 'fnoreference'],
      address: ['campusaddress', 'location', 'siteaddress']
    };

    for (const [key, list] of Object.entries(aliases)) {
      if ((key === normA && list.includes(normB)) || (key === normB && list.includes(normA))) {
        return true;
      }
    }
    return false;
  }

  private static calculateTokenOverlap(a: string, b: string): number {
    const tokensA = new Set(a.split(/\s+/).filter(t => t.length > 2));
    const tokensB = new Set(b.split(/\s+/).filter(t => t.length > 2));
    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let matchCount = 0;
    for (const t of tokensA) {
      if (tokensB.has(t)) matchCount++;
    }
    const unionSize = new Set([...tokensA, ...tokensB]).size;
    return unionSize > 0 ? matchCount / unionSize : 0;
  }
}
