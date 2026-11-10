/**
 * FORM2FACT — MULTI-MODEL AI INTEGRATION ARCHITECTURE
 * Common Model Orchestration Types, Schemas, and Provider Contracts.
 * 
 * Target Competition: BharatCode Build League 2026
 * Architecture Rule: Authoritative verification decisions remain with the
 * deterministic rules engine and calibrated pairwise classifier.
 * LLM providers function strictly as an evidence-grounded explanation
 * and reasoning layer.
 */

import { z } from 'zod';

// =========================================================================
// 1. TASK TAXONOMY & CAPABILITY CONTRACTS
// =========================================================================

export type TaskType =
  | 'field_comparison'
  | 'evidence_explanation'
  | 'complex_reasoning'
  | 'document_scrutiny'
  | 'learned_inference';

export type ProviderPlatform = 'bharatcode' | 'adaption' | 'form2fact_native' | 'fallback_local';

export interface ModelCapability {
  task: TaskType;
  supportsStreaming: boolean;
  supportsJsonOutput: boolean;
  maxContextTokens: number;
  languages: string[];
}

export interface ProviderMetadata {
  id: string;
  name: string;
  platform: ProviderPlatform;
  modelId: string;
  modelVersion: string;
  description: string;
  capabilities: ModelCapability[];
  /**
   * Only true for the native Form2Fact deterministic rules and hybrid classifier.
   * False for all external LLM reasoning and explanation providers.
   */
  isAuthoritativeVerification: boolean;
  /**
   * Maximum timeout in milliseconds before controlled failure/abstention.
   */
  defaultTimeoutMs: number;
}

export interface ProviderHealthStatus {
  providerId: string;
  isConfigured: boolean;
  isHealthy: boolean;
  latencyMs?: number;
  lastChecked: string;
  message?: string;
  details?: Record<string, unknown>;
}

// =========================================================================
// 2. EXPLANATION DATA CONTRACTS & VALIDATION SCHEMAS
// =========================================================================

export const EvidenceCitationSchema = z.object({
  documentName: z.string(),
  pageNumber: z.number().int().positive(),
  citedText: z.string().optional()
});

export type EvidenceCitation = z.infer<typeof EvidenceCitationSchema>;

export const FiveClassLabelSchema = z.enum([
  'MATCH',
  'MISMATCH',
  'MISSING',
  'UNCERTAIN',
  'NOT_COMPARABLE'
]);

export type FiveClassLabel = z.infer<typeof FiveClassLabelSchema>;

export const ModelExplanationOutputSchema = z.object({
  summary: z.string().min(5),
  classification_context: FiveClassLabelSchema,
  reasoning: z.string().min(10),
  evidence_references: z.array(EvidenceCitationSchema),
  uncertainties: z.array(z.string()),
  requires_human_review: z.boolean()
});

export type ModelExplanationOutput = z.infer<typeof ModelExplanationOutputSchema>;

export interface ExplanationRequest {
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
    label: FiveClassLabel;
    confidence: number;
    explanation: string;
  };
  ruleContext?: {
    ruleKey?: string;
    ruleTitle?: string;
    requirement?: string;
  };
  customQuery?: string;
  preferredLanguage?: 'en' | 'ta';
}

export interface ExplanationResponse {
  success: boolean;
  status: 'success' | 'unavailable' | 'auth_error' | 'subscription_required' | 'rate_limited' | 'service_unavailable' | 'timeout' | 'validation_error' | 'error';
  data?: ModelExplanationOutput;
  error?: string;
  modelUsed: string;
  providerId: string;
  latencyMs: number;
  tokensUsed?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  groundingAlerts?: string[];
}

// =========================================================================
// 3. DOCUMENT SCRUTINY MEMO CONTRACTS
// =========================================================================

export interface ScrutinyMemoRequest {
  application: {
    referenceNumber: string;
    institutionName: string;
    applicationType: string;
    declaredDetails: Record<string, unknown>;
  };
  documents: Array<{
    originalFilename: string;
    documentType: string;
    pageCount: number;
    processingStatus: string;
    isScannedOrTextPoor?: boolean;
    extractedTextByPage?: Array<{ pageNumber: number; text: string }>;
  }>;
  fields: Array<{
    fieldName: string;
    rawValue: string;
    normalizedValue?: string;
    pageNumber: number;
    sourceText?: string;
  }>;
  findings: Array<{
    reference: string;
    ruleKey: string;
    ruleVersion: string;
    title: string;
    declaredValue?: string;
    evidenceValue?: string;
    status: string;
  }>;
  customQuery?: string;
}

export interface ScrutinyMemoResponse {
  ok: boolean;
  generatedAt: string;
  modelUsed: string;
  providerId: string;
  thinkingMode: string;
  isAiGenerated: boolean;
  summary: string;
  crossDocumentObservations: string[];
  recommendedOfficerActions: string[];
  uncertaintyNotice: string;
  latencyMs: number;
  error?: string;
}

// =========================================================================
// 4. MODEL PROVIDER INTERFACE
// =========================================================================

export interface ModelProvider {
  readonly metadata: ProviderMetadata;

  /**
   * Fast synchronous check of whether required credentials and configurations exist.
   */
  isConfigured(): boolean;

  /**
   * Live health check against provider endpoint or local artifact state.
   */
  checkHealth(options?: { timeoutMs?: number; fetchFn?: typeof fetch }): Promise<ProviderHealthStatus>;

  /**
   * Generates an evidence-grounded explanation for an existing finding.
   */
  generateExplanation?(
    request: ExplanationRequest,
    options?: { timeoutMs?: number; fetchFn?: typeof fetch }
  ): Promise<ExplanationResponse>;

  /**
   * Generates a multi-document deep scrutiny advisory synthesis.
   */
  generateScrutinyMemo?(
    request: ScrutinyMemoRequest,
    options?: { timeoutMs?: number; fetchFn?: typeof fetch }
  ): Promise<ScrutinyMemoResponse>;

  /**
   * Executes pairwise field comparison (supported by native Form2Fact classifier).
   */
  classifyPair?(request: unknown): Promise<unknown>;
}

// =========================================================================
// 5. ERROR ABSTRACTIONS
// =========================================================================

export class AIProviderError extends Error {
  public readonly providerId: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;

  constructor(message: string, providerId: string, options?: { statusCode?: number; retryable?: boolean }) {
    super(message);
    this.name = 'AIProviderError';
    this.providerId = providerId;
    this.statusCode = options?.statusCode;
    this.retryable = options?.retryable ?? false;
  }
}

export class ProviderUnavailableError extends AIProviderError {
  constructor(message: string, providerId: string) {
    super(message, providerId, { retryable: false });
    this.name = 'ProviderUnavailableError';
  }
}

export class ProviderTimeoutError extends AIProviderError {
  constructor(message: string, providerId: string) {
    super(message, providerId, { retryable: true });
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderAuthError extends AIProviderError {
  constructor(message: string, providerId: string) {
    super(message, providerId, { statusCode: 401, retryable: false });
    this.name = 'ProviderAuthError';
  }
}

export class ProviderRateLimitError extends AIProviderError {
  constructor(message: string, providerId: string) {
    super(message, providerId, { statusCode: 429, retryable: true });
    this.name = 'ProviderRateLimitError';
  }
}

export class ProviderValidationError extends AIProviderError {
  constructor(message: string, providerId: string) {
    super(message, providerId, { statusCode: 422, retryable: false });
    this.name = 'ProviderValidationError';
  }
}

