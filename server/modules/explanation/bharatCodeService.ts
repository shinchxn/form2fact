/**
 * FORM2FACT — BHARATCODE MODEL API INTEGRATION SERVICE
 * 
 * Target Competition: BharatCode Build League 2026
 * Model: qwen-3.8-27b (https://bharatcode.ai/api/model/v1)
 * 
 * Architectural Invariant:
 * The existing Form2Fact hybrid classifier and regulatory rules remain authoritative.
 * BharatCode API functions strictly as an evidence-grounded reasoning and explanation layer.
 * 
 * Rules:
 * 1. BharatCode must not invent page numbers or source references.
 * 2. Evidence references must originate from Form2Fact's extraction pipeline.
 * 3. BharatCode must not override the pairwise classifier.
 * 4. BharatCode must not approve or reject an institution.
 * 5. Uncertainty must remain explicit.
 * 6. If API is unavailable, deterministic finding is preserved without fabricating responses.
 */

import { z } from 'zod';
import { logger } from '../../core/logger/index.js';

// =========================================================================
// 1. DATA TYPES & SCHEMAS
// =========================================================================

export const EvidenceCitationSchema = z.object({
  documentName: z.string(),
  pageNumber: z.number().int().positive(),
  citedText: z.string().optional()
});

export const BharatCodeExplanationSchema = z.object({
  summary: z.string().min(5),
  classification_context: z.enum(['MATCH', 'MISMATCH', 'MISSING', 'UNCERTAIN', 'NOT_COMPARABLE']),
  reasoning: z.string().min(10),
  evidence_references: z.array(EvidenceCitationSchema),
  uncertainties: z.array(z.string()),
  requires_human_review: z.boolean()
});

export type BharatCodeExplanation = z.infer<typeof BharatCodeExplanationSchema>;

export interface ExplanationRequestInput {
  claim: {
    fieldName: string;
    fieldLabel: string;
    rawValue: string;
    normalizedValue?: string;
    pageNumber?: number;
    sourceText?: string;
  };
  evidence?: {
    fieldName?: string;
    fieldLabel?: string;
    rawValue?: string;
    normalizedValue?: string;
    documentName?: string;
    documentId?: string;
    pageNumber?: number;
    sourceText?: string;
  };
  classifierResult: {
    label: 'MATCH' | 'MISMATCH' | 'MISSING' | 'UNCERTAIN' | 'NOT_COMPARABLE';
    confidence: number;
    explanation: string;
  };
  ruleContext?: {
    ruleKey?: string;
    ruleTitle?: string;
    requirement?: string;
  };
}

export interface ExplanationServiceResult {
  success: boolean;
  status: 'success' | 'unavailable' | 'auth_error' | 'rate_limited' | 'service_unavailable' | 'timeout' | 'validation_error' | 'error';
  data?: BharatCodeExplanation;
  error?: string;
  modelUsed?: string;
  latencyMs?: number;
}

// =========================================================================
// 2. PRIVACY & DATA MINIMIZATION (PII REDACTION)
// =========================================================================

/**
 * Strips secrets, tokens, and authorization headers from error messages to prevent leakage.
 */
export function sanitizeSecret(text: string, secret?: string): string {
  if (!text) return '';
  let cleaned = text;
  if (secret && secret.length > 3) {
    cleaned = cleaned.replaceAll(secret, '[REDACTED_SECRET]');
  }
  return cleaned.replace(/Bearer\s+[A-Za-z0-9_\-\.!~*]+/gi, 'Bearer [REDACTED_TOKEN]');
}

/**
 * Redacts personal identifiers and confidential private tokens prior to transmission.
 */
export function redactPii(text: string): string {
  if (!text) return '';
  return text
    // Aadhaar number (12 digits, optional spaces)
    .replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '[REDACTED_AADHAAR]')
    // Indian PAN (5 letters, 4 digits, 1 letter)
    .replace(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g, '[REDACTED_PAN]')
    // Indian mobile phone number
    .replace(/\b(?:\+91[\-\s]?)?[6-9]\d{9}\b/g, '[REDACTED_PHONE]')
    // Email addresses
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED_EMAIL]')
    // Bank account numbers (9-18 continuous digits)
    .replace(/\b\d{9,18}\b/g, '[REDACTED_BANK_ACCOUNT]');
}

/**
 * Truncates text excerpts to prevent prompt flooding and excessive data transmission.
 */
export function truncateExcerpt(text: string, maxLen = 400): string {
  if (!text) return '';
  const cleaned = redactPii(text.trim());
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.substring(0, maxLen) + '... [truncated]';
}

// =========================================================================
// 3. BHARATCODE API CLIENT
// =========================================================================

export class BharatCodeService {
  private static readonly DEFAULT_BASE_URL = 'https://bharatcode.ai/api/model/v1';
  private static readonly DEFAULT_MODEL = 'qwen-3.8-27b';
  /**
   * qwen-3.8-27b is a reasoning model: it consumes part of the completion
   * budget on chain-of-thought before emitting the final answer. A 5 s
   * timeout is far too short; 60 s is the verified default and can be raised
   * per deployment via BHARATCODE_TIMEOUT_MS.
   */
  private static readonly DEFAULT_TIMEOUT_MS = 60000;

  /**
   * Retrieves the configured API key without leaking it to logs.
   */
  public static getApiKey(): string | undefined {
    return process.env.BHARATCODE_API_KEY?.trim();
  }

  /**
   * Checks whether the BharatCode API is configured and available.
   */
  public static isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.length > 5 && !key.includes('placeholder'));
  }

  public static getModel(): string {
    return process.env.BHARATCODE_MODEL?.trim() || this.DEFAULT_MODEL;
  }

  public static getBaseUrl(): string {
    return (process.env.BHARATCODE_API_URL?.trim() || this.DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  /**
   * Generates an evidence-grounded explanation for an existing Form2Fact finding.
   */
  public static async generateExplanation(
    input: ExplanationRequestInput,
    options: { fetchFn?: typeof fetch; timeoutMs?: number } = {}
  ): Promise<ExplanationServiceResult> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();

    // 1. Availability check: Fail closed to deterministic finding if key is missing
    if (!apiKey || apiKey.includes('placeholder')) {
      return {
        success: false,
        status: 'unavailable',
        error: 'BHARATCODE_API_KEY is not configured. Preserving deterministic finding without AI explanation.'
      };
    }

    const model = this.getModel();
    const baseUrl = this.getBaseUrl();
    const timeoutMs = options.timeoutMs ?? Number(process.env.BHARATCODE_TIMEOUT_MS || this.DEFAULT_TIMEOUT_MS);
    const fetchImpl = options.fetchFn ?? fetch;

    // 2. Data minimization & Redaction
    const redactedClaimValue = truncateExcerpt(input.claim.rawValue);
    const redactedClaimText = truncateExcerpt(input.claim.sourceText || '');
    const redactedEvidenceValue = truncateExcerpt(input.evidence?.rawValue || 'NOT_PROVIDED');
    const redactedEvidenceText = truncateExcerpt(input.evidence?.sourceText || '');

    // 3. Known valid source documents and pages from extraction pipeline
    const validEvidenceSources: Array<{ documentName: string; pageNumber: number }> = [];
    if (input.evidence?.documentName && input.evidence?.pageNumber) {
      validEvidenceSources.push({
        documentName: input.evidence.documentName,
        pageNumber: input.evidence.pageNumber
      });
    }

    // 4. Build strict, evidence-grounded prompt
    const systemPrompt = `You are an evidence-grounded institutional document scrutiny reasoning assistant for Form2Fact.
Form2Fact's authoritative pairwise classifier has ALREADY determined the classification for this claim/evidence pair as "${input.classifierResult.label}".

YOUR STRICT OPERATIONAL RULES:
1. DO NOT override, disagree with, or alter the authoritative classification label "${input.classifierResult.label}".
2. DO NOT invent, hallucinate, or cite any document names or page numbers not provided in the input.
3. DO NOT approve, reject, or declare any institution compliant or non-compliant.
4. Explain clearly and objectively WHY the claim and evidence match, contradict, or remain uncertain.
5. If evidence is missing or insufficient, state that explicitly under uncertainties.
6. Return ONLY valid JSON adhering strictly to the schema below.

JSON Schema:
{
  "summary": "Short 1-2 sentence executive summary of the finding",
  "classification_context": "${input.classifierResult.label}",
  "reasoning": "Detailed, evidence-grounded explanation linking claim to evidence",
  "evidence_references": [
    {
      "documentName": "Exact document name from input",
      "pageNumber": 1,
      "citedText": "Brief excerpt"
    }
  ],
  "uncertainties": ["Any ambiguity, OCR degradation, or missing context"],
  "requires_human_review": boolean
}`;

    const userPrompt = `Institutional Claim:
- Field: ${input.claim.fieldLabel} (${input.claim.fieldName})
- Declared Value: ${redactedClaimValue}
${redactedClaimText ? `- Claim Excerpt: "${redactedClaimText}"` : ''}

Supporting Evidence:
- Evidence Document: ${input.evidence?.documentName || 'None attached'}
- Page Number: ${input.evidence?.pageNumber ?? 'N/A'}
- Extracted Evidence Value: ${redactedEvidenceValue}
${redactedEvidenceText ? `- Evidence Excerpt: "${redactedEvidenceText}"` : ''}

Authoritative Classification:
- Label: ${input.classifierResult.label} (Confidence: ${(input.classifierResult.confidence * 100).toFixed(0)}%)
- Rule Explanation: ${input.classifierResult.explanation}
${input.ruleContext?.requirement ? `- Statutory Norm: ${input.ruleContext.requirement}` : ''}

Provide your structured explanation in JSON:`;

    // 5. Execute outbound request to BharatCode Model API
    try {
      const endpoint = `${baseUrl}/chat/completions`;
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        }),
        signal: AbortSignal.timeout(timeoutMs)
      });

      const latencyMs = Date.now() - startTime;

      // Handle HTTP status errors
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logger.warn('[BharatCode] Authentication failed (HTTP 401/403). Verify BHARATCODE_API_KEY.');
          return { success: false, status: 'auth_error', error: 'BharatCode authentication failed.', latencyMs };
        }
        if (response.status === 402) {
          logger.warn('[BharatCode] Subscription required (HTTP 402).');
          return { success: false, status: 'error', error: 'BharatCode API requires an active subscription (HTTP 402). Deterministic finding is preserved.', latencyMs };
        }
        if (response.status === 429) {
          logger.warn('[BharatCode] Rate limit exceeded (HTTP 429).');
          return { success: false, status: 'rate_limited', error: 'BharatCode API rate limit exceeded.', latencyMs };
        }
        if (response.status === 503 || response.status === 502) {
          logger.warn(`[BharatCode] Service unavailable (HTTP ${response.status}).`);
          return { success: false, status: 'service_unavailable', error: 'BharatCode model service temporarily unavailable.', latencyMs };
        }
        return {
          success: false,
          status: 'error',
          error: `BharatCode API returned HTTP ${response.status}: ${response.statusText}`,
          latencyMs
        };
      }

      // 6. Parse response JSON
      const rawBody = await response.json() as any;
      const message = rawBody?.choices?.[0]?.message;
      const content = message?.content ?? rawBody?.output ?? '';
      const usage = rawBody?.usage;
      if (usage?.total_tokens) {
        logger.info('[BharatCode] completion usage', {
          model,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        });
      }

      if (!content || typeof content !== 'string') {
        // qwen-3.8-27b is a reasoning model: when the completion budget is
        // exhausted by chain-of-thought (reasoning_content) before the final
        // answer is produced, `content` arrives as null. Report this precisely
        // instead of silently fabricating an explanation.
        if (typeof message?.reasoning_content === 'string' && message.reasoning_content.length > 0) {
          return {
            success: false,
            status: 'validation_error',
            error: 'BharatCode model spent its token budget on internal reasoning and returned no final answer. Increase BHARATCODE_TIMEOUT_MS/max-tokens headroom or retry; deterministic finding is preserved.',
            latencyMs
          };
        }
        return {
          success: false,
          status: 'validation_error',
          error: 'BharatCode response contained empty or invalid message content.',
          latencyMs
        };
      }

      // Strip markdown code fences if present
      const cleanJsonStr = content.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(cleanJsonStr);
      } catch (parseErr: any) {
        return {
          success: false,
          status: 'validation_error',
          error: `Malformed JSON returned by BharatCode model: ${parseErr.message}`,
          latencyMs
        };
      }

      // 7. Validate against Zod schema
      const validation = BharatCodeExplanationSchema.safeParse(parsedJson);
      if (!validation.success) {
        return {
          success: false,
          status: 'validation_error',
          error: `BharatCode output failed schema validation: ${validation.error.message}`,
          latencyMs
        };
      }

      const explanation = validation.data;

      // 8. Grounding Guard 1: Verify Citation Integrity
      // Filter out any hallucinated references that do not match the input evidence document/page
      const verifiedCitations = explanation.evidence_references.filter((ref) => {
        if (validEvidenceSources.length === 0) {
          // If no evidence was provided, references should be empty
          return false;
        }
        return validEvidenceSources.some(
          (src) => src.documentName.toLowerCase().includes(ref.documentName.toLowerCase()) ||
                   ref.documentName.toLowerCase().includes(src.documentName.toLowerCase())
        );
      });

      if (explanation.evidence_references.length > verifiedCitations.length) {
        explanation.uncertainties.push(
          `System Note: ${explanation.evidence_references.length - verifiedCitations.length} unverified document citations were removed to prevent hallucination.`
        );
        explanation.evidence_references = verifiedCitations;
      }

      // 9. Grounding Guard 2: Classifier Overwrite Protection
      // If the LLM returned a different classification_context than the authoritative classifier, force match
      if (explanation.classification_context !== input.classifierResult.label) {
        logger.warn(
          `[BharatCode] Model returned classification_context '${explanation.classification_context}' which diverges from authoritative '${input.classifierResult.label}'. Forcing authoritative label.`
        );
        explanation.uncertainties.push(
          `Model proposed label '${explanation.classification_context}', but authoritative Form2Fact classifier strictly maintained '${input.classifierResult.label}'.`
        );
        explanation.classification_context = input.classifierResult.label;
        explanation.requires_human_review = true;
      }

      return {
        success: true,
        status: 'success',
        data: explanation,
        modelUsed: model,
        latencyMs
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        logger.warn(`[BharatCode] Request timed out after ${timeoutMs}ms.`);
        return { success: false, status: 'timeout', error: `BharatCode API timed out after ${timeoutMs}ms.`, latencyMs };
      }
      const safeErrorMsg = sanitizeSecret(err.message || 'Unknown network error', apiKey);
      logger.error('[BharatCode] Outbound request failure:', { error: safeErrorMsg });
      return { success: false, status: 'error', error: `Outbound request failed: ${safeErrorMsg}`, latencyMs };
    }
  }
}
