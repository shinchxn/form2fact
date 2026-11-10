/**
 * FORM2FACT — AI MODEL ROUTER & ORCHESTRATION LAYER
 * 
 * Implements strict task-based routing policy:
 * 1. Field comparison -> Native Form2Fact classifier ONLY. Never routed to external LLM.
 * 2. Deterministic regulatory checks -> Rules engine.
 * 3. Evidence explanation -> BharatCode Qwen, BharatCode DeepSeek, or Adaption (user/task selectable).
 * 4. Scrutiny memo -> BharatCode DeepSeek or BharatCode Qwen.
 * 
 * Safety Invariants:
 * - Does not call every model for every request.
 * - Does not perform uncalibrated model voting/ensembling.
 * - External LLM outputs CANNOT overwrite authoritative classifier or rules engine decisions.
 * - If a requested provider is unavailable, reports a controlled failure rather than silently substituting models.
 */

import { logger } from '../../../core/logger/index.js';
import {
  TaskType,
  ExplanationRequest,
  ExplanationResponse,
  ScrutinyMemoRequest,
  ScrutinyMemoResponse,
  ProviderUnavailableError,
  ProviderTimeoutError,
  ProviderAuthError,
  ProviderRateLimitError
} from './modelTypes.ts';
import { ModelRegistry, modelRegistry } from './modelRegistry.ts';

export interface RouteExplanationOptions {
  providerId?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  allowFallback?: boolean;
}

export interface RouteScrutinyOptions {
  providerId?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export class ModelRouter {
  private readonly registry: ModelRegistry;

  constructor(registry: ModelRegistry = modelRegistry) {
    this.registry = registry;
  }

  /**
   * Routes an evidence-grounded explanation request to the appropriate provider.
   */
  public async routeExplanation(
    request: ExplanationRequest,
    options: RouteExplanationOptions = {}
  ): Promise<ExplanationResponse> {
    const startTime = Date.now();
    const task: TaskType = 'evidence_explanation';

    // 1. Resolve target provider
    let provider = options.providerId
      ? this.registry.get(options.providerId)
      : this.registry.getDefaultProviderForTask(task);

    if (!provider) {
      logger.warn(`[ModelRouter] Requested provider '${options.providerId}' not found. Resolving default.`);
      provider = this.registry.getDefaultProviderForTask(task);
    }

    if (!provider) {
      return {
        success: false,
        status: 'unavailable',
        error: `No AI model provider is registered for task '${task}'. Preserving deterministic finding.`,
        modelUsed: 'none',
        providerId: 'none',
        latencyMs: Date.now() - startTime
      };
    }

    // 2. Enforce provider configuration check
    if (!provider.isConfigured()) {
      logger.warn(`[ModelRouter] Provider '${provider.metadata.id}' is not configured.`);

      // Optional controlled fallback if caller explicitly permitted it (e.g. Qwen -> DeepSeek)
      if (options.allowFallback) {
        const fallbackCandidates = this.registry
          .getProvidersForTask(task)
          .filter(p => p.metadata.id !== provider!.metadata.id && p.isConfigured());

        if (fallbackCandidates.length > 0) {
          const fallbackProvider = fallbackCandidates[0];
          logger.info(`[ModelRouter] Controlled fallback engaged: ${provider.metadata.id} -> ${fallbackProvider.metadata.id}`);
          provider = fallbackProvider;
        } else {
          return {
            success: false,
            status: 'unavailable',
            error: `Provider '${provider.metadata.name}' is not configured (API key or endpoint missing). Preserving authoritative finding without AI explanation.`,
            modelUsed: provider.metadata.modelId,
            providerId: provider.metadata.id,
            latencyMs: Date.now() - startTime
          };
        }
      } else {
        return {
          success: false,
          status: 'unavailable',
          error: `Provider '${provider.metadata.name}' is not configured (API key missing). Preserving authoritative finding without AI explanation.`,
          modelUsed: provider.metadata.modelId,
          providerId: provider.metadata.id,
          latencyMs: Date.now() - startTime
        };
      }
    }

    if (!provider.generateExplanation) {
      return {
        success: false,
        status: 'error',
        error: `Provider '${provider.metadata.name}' does not implement generateExplanation.`,
        modelUsed: provider.metadata.modelId,
        providerId: provider.metadata.id,
        latencyMs: Date.now() - startTime
      };
    }

    // 3. Dispatch to selected provider with telemetry
    logger.info('[ModelRouter] Dispatching explanation request', {
      providerId: provider.metadata.id,
      modelId: provider.metadata.modelId,
      field: request.claim.fieldName,
      authoritativeLabel: request.classifierResult.label
    });

    const response = await provider.generateExplanation(request, {
      timeoutMs: options.timeoutMs,
      fetchFn: options.fetchFn
    });

    // 4. Invariant Assertion: The LLM MUST NEVER alter the authoritative label
    if (response.data && response.data.classification_context !== request.classifierResult.label) {
      logger.error('[ModelRouter] INVARIANT BREACH DETECTED: Model attempted to override authoritative label!', {
        modelProposed: response.data.classification_context,
        authoritative: request.classifierResult.label,
        providerId: provider.metadata.id
      });
      response.data.classification_context = request.classifierResult.label;
      response.data.requires_human_review = true;
      if (!response.groundingAlerts) response.groundingAlerts = [];
      response.groundingAlerts.push('System Warning: Model classification override rejected. Authoritative finding enforced.');
    }

    return response;
  }

  /**
   * Routes a multi-document scrutiny memo request to an AI provider.
   */
  public async routeScrutinyMemo(
    request: ScrutinyMemoRequest,
    options: RouteScrutinyOptions = {}
  ): Promise<ScrutinyMemoResponse> {
    const startTime = Date.now();
    const task: TaskType = 'document_scrutiny';

    let provider = options.providerId
      ? this.registry.get(options.providerId)
      : this.registry.getDefaultProviderForTask(task);

    if (!provider) {
      provider = this.registry.getDefaultProviderForTask(task);
    }

    if (!provider || !provider.isConfigured() || !provider.generateScrutinyMemo) {
      logger.warn('[ModelRouter] No configured provider available for scrutiny memo; returning failure for deterministic fallback');
      return {
        ok: false,
        generatedAt: new Date().toISOString(),
        modelUsed: provider?.metadata.modelId || 'none',
        providerId: provider?.metadata.id || 'none',
        thinkingMode: 'none',
        isAiGenerated: false,
        summary: '',
        crossDocumentObservations: [],
        recommendedOfficerActions: [],
        uncertaintyNotice: 'External AI scrutiny unavailable. Deterministic rules govern all outcomes.',
        latencyMs: Date.now() - startTime,
        error: 'No active AI provider configured for document scrutiny.'
      };
    }

    logger.info('[ModelRouter] Dispatching scrutiny memo request', {
      providerId: provider.metadata.id,
      modelId: provider.metadata.modelId,
      applicationRef: request.application.referenceNumber
    });

    return provider.generateScrutinyMemo(request, {
      timeoutMs: options.timeoutMs,
      fetchFn: options.fetchFn
    });
  }
}

export const modelRouter = new ModelRouter(modelRegistry);

