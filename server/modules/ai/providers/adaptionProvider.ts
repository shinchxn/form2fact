/**
 * FORM2FACT — ADAPTION TRAINED MODEL PROVIDER ADAPTER
 * 
 * Target Platform: Adaption Labs / AutoScientist SFT
 * Model ID: form2fact-adaption-sft-v1.0
 * 
 * Architectural Invariant:
 * 1. Independent AutoScientist jobs are never interrupted, modified, or assumed ready prematurely.
 * 2. Dedicated provider adapter manages model artifact registration, versioning, and validation.
 * 3. Only exported, evaluated, and verified checkpoints can be activated for inference.
 * 4. Preserves 5-class taxonomy, confidence thresholds, and abstention to UNCERTAIN.
 */

import { logger } from '../../../core/logger/index.js';
import {
  ModelProvider,
  ProviderMetadata,
  ProviderHealthStatus,
  ExplanationRequest,
  ExplanationResponse,
  ModelExplanationOutputSchema,
  FiveClassLabel
} from './modelTypes.ts';

export interface AdaptionModelRegistration {
  modelId: string;
  modelVersion: string;
  baseArchitecture: string;
  trainingRunId?: string;
  checkpointHash?: string;
  inferenceUrl?: string;
  localArtifactPath?: string;
  registrationDate: string;
  verificationStatus: 'unregistered' | 'registered_pending_eval' | 'verified_active' | 'retired';
  metrics?: {
    trainLoss?: number;
    valLoss?: number;
    macroF1?: number;
    abstentionRate?: number;
  };
}

export class AdaptionProvider implements ModelProvider {
  public static readonly PROVIDER_ID = 'adaption-form2fact';
  private static readonly DEFAULT_MODEL_ID = 'form2fact-adaption-sft-v1.0';
  private static readonly DEFAULT_TIMEOUT_MS = 30000;

  private currentRegistration: AdaptionModelRegistration = {
    modelId: AdaptionProvider.DEFAULT_MODEL_ID,
    modelVersion: '1.0.0-unregistered',
    baseArchitecture: 'Llama-3.1-8B-Instruct',
    registrationDate: new Date().toISOString(),
    verificationStatus: 'unregistered'
  };

  public readonly metadata: ProviderMetadata = {
    id: AdaptionProvider.PROVIDER_ID,
    name: 'Form2Fact Adaption Fine-Tuned Model',
    platform: 'adaption',
    modelId: AdaptionProvider.DEFAULT_MODEL_ID,
    modelVersion: '1.0.0-draft',
    description: 'Statutory domain-adapted language model trained via Adaption AutoScientist for evidence-grounded institutional discrepancy explanations.',
    isAuthoritativeVerification: false,
    defaultTimeoutMs: AdaptionProvider.DEFAULT_TIMEOUT_MS,
    capabilities: [
      {
        task: 'evidence_explanation',
        supportsStreaming: false,
        supportsJsonOutput: true,
        maxContextTokens: 8192,
        languages: ['en']
      },
      {
        task: 'learned_inference',
        supportsStreaming: false,
        supportsJsonOutput: true,
        maxContextTokens: 8192,
        languages: ['en']
      }
    ]
  };

  constructor() {
    this.refreshRegistrationFromEnv();
  }

  /**
   * Refreshes model registration from project environment without fabricating endpoints.
   */
  public refreshRegistrationFromEnv(): void {
    const endpoint = process.env.ADAPTION_MODEL_ENDPOINT?.trim();
    const artifactPath = process.env.ADAPTION_ARTIFACT_PATH?.trim();
    const version = process.env.ADAPTION_MODEL_VERSION?.trim() || '1.0.0-draft';
    const runId = process.env.ADAPTION_RUN_ID?.trim();
    const hash = process.env.ADAPTION_CHECKPOINT_HASH?.trim();

    if (endpoint || artifactPath) {
      this.currentRegistration = {
        modelId: AdaptionProvider.DEFAULT_MODEL_ID,
        modelVersion: version,
        baseArchitecture: process.env.ADAPTION_BASE_MODEL?.trim() || 'Llama-3.1-8B-Instruct',
        trainingRunId: runId,
        checkpointHash: hash,
        inferenceUrl: endpoint,
        localArtifactPath: artifactPath,
        registrationDate: new Date().toISOString(),
        verificationStatus: process.env.ADAPTION_MODEL_VERIFIED === 'true' ? 'verified_active' : 'registered_pending_eval'
      };
    } else {
      this.currentRegistration = {
        modelId: AdaptionProvider.DEFAULT_MODEL_ID,
        modelVersion: 'unregistered',
        baseArchitecture: 'Llama-3.1-8B-Instruct',
        registrationDate: new Date().toISOString(),
        verificationStatus: 'unregistered'
      };
    }
  }

  public getRegistration(): Readonly<AdaptionModelRegistration> {
    return this.currentRegistration;
  }

  public registerCheckpoint(registration: Partial<AdaptionModelRegistration>): void {
    this.currentRegistration = {
      ...this.currentRegistration,
      ...registration,
      registrationDate: new Date().toISOString()
    };
    logger.info('[AdaptionProvider] Registered new model checkpoint:', {
      modelId: this.currentRegistration.modelId,
      version: this.currentRegistration.modelVersion,
      status: this.currentRegistration.verificationStatus
    });
  }

  public isConfigured(): boolean {
    this.refreshRegistrationFromEnv();
    const hasEndpoint = Boolean(this.currentRegistration.inferenceUrl && this.currentRegistration.inferenceUrl.length > 5);
    const hasLocalPath = Boolean(this.currentRegistration.localArtifactPath && this.currentRegistration.localArtifactPath.length > 3);
    const isVerified = this.currentRegistration.verificationStatus === 'verified_active';
    return (hasEndpoint || hasLocalPath) && isVerified;
  }

  public async checkHealth(options: { timeoutMs?: number; fetchFn?: typeof fetch } = {}): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    this.refreshRegistrationFromEnv();

    if (this.currentRegistration.verificationStatus === 'unregistered') {
      return {
        providerId: this.metadata.id,
        isConfigured: false,
        isHealthy: false,
        lastChecked: new Date().toISOString(),
        message: 'Adaption AutoScientist training is in progress or checkpoint is not yet registered. Preserving native classifier.',
        details: {
          verificationStatus: 'unregistered',
          guidance: 'To onboard an exported Adaption model, configure ADAPTION_MODEL_ENDPOINT and ADAPTION_MODEL_VERIFIED=true.'
        }
      };
    }

    if (this.currentRegistration.verificationStatus === 'registered_pending_eval') {
      return {
        providerId: this.metadata.id,
        isConfigured: false,
        isHealthy: false,
        lastChecked: new Date().toISOString(),
        message: `Adaption checkpoint '${this.currentRegistration.modelVersion}' is registered but pending independent evaluation on held-out test.jsonl.`,
        details: {
          verificationStatus: 'registered_pending_eval',
          checkpointHash: this.currentRegistration.checkpointHash
        }
      };
    }

    const endpoint = this.currentRegistration.inferenceUrl;
    if (!endpoint) {
      return {
        providerId: this.metadata.id,
        isConfigured: false,
        isHealthy: false,
        lastChecked: new Date().toISOString(),
        message: 'No inference endpoint configured for Adaption model.'
      };
    }

    const fetchImpl = options.fetchFn ?? fetch;
    const timeoutMs = options.timeoutMs ?? 5000;

    try {
      const response = await fetchImpl(`${endpoint.replace(/\/+$/, '')}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(timeoutMs)
      });

      const latencyMs = Date.now() - startTime;
      if (response.ok) {
        return {
          providerId: this.metadata.id,
          isConfigured: true,
          isHealthy: true,
          latencyMs,
          lastChecked: new Date().toISOString(),
          message: `Adaption inference endpoint active (${this.currentRegistration.modelVersion}).`,
          details: {
            modelVersion: this.currentRegistration.modelVersion,
            endpoint
          }
        };
      }

      return {
        providerId: this.metadata.id,
        isConfigured: true,
        isHealthy: false,
        latencyMs,
        lastChecked: new Date().toISOString(),
        message: `Adaption inference endpoint returned HTTP ${response.status}.`
      };
    } catch (err: any) {
      return {
        providerId: this.metadata.id,
        isConfigured: true,
        isHealthy: false,
        latencyMs: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        message: `Adaption endpoint health probe failed: ${err.message || 'Unknown network error'}`
      };
    }
  }

  public async generateExplanation(
    request: ExplanationRequest,
    options: { timeoutMs?: number; fetchFn?: typeof fetch } = {}
  ): Promise<ExplanationResponse> {
    const startTime = Date.now();

    if (!this.isConfigured()) {
      return {
        success: false,
        status: 'unavailable',
        error: 'Adaption-trained model is not verified and active. Preserving authoritative Form2Fact finding.',
        modelUsed: this.currentRegistration.modelId,
        providerId: this.metadata.id,
        latencyMs: Date.now() - startTime
      };
    }

    const endpoint = this.currentRegistration.inferenceUrl!;
    const timeoutMs = options.timeoutMs ?? AdaptionProvider.DEFAULT_TIMEOUT_MS;
    const fetchImpl = options.fetchFn ?? fetch;

    try {
      const response = await fetchImpl(`${endpoint.replace(/\/+$/, '')}/v1/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': process.env.ADAPTION_API_KEY ? `Bearer ${process.env.ADAPTION_API_KEY}` : ''
        },
        body: JSON.stringify({
          claim: request.claim,
          evidence: request.evidence,
          classifierResult: request.classifierResult,
          ruleContext: request.ruleContext
        }),
        signal: AbortSignal.timeout(timeoutMs)
      });

      const latencyMs = Date.now() - startTime;
      if (!response.ok) {
        return {
          success: false,
          status: 'error',
          error: `Adaption model server returned HTTP ${response.status}`,
          modelUsed: this.currentRegistration.modelId,
          providerId: this.metadata.id,
          latencyMs
        };
      }

      const body = await response.json() as any;
      const validation = ModelExplanationOutputSchema.safeParse(body);
      if (!validation.success) {
        return {
          success: false,
          status: 'validation_error',
          error: `Adaption model output failed schema validation: ${validation.error.message}`,
          modelUsed: this.currentRegistration.modelId,
          providerId: this.metadata.id,
          latencyMs
        };
      }

      const explanation = validation.data;
      const groundingAlerts: string[] = [];

      // Preserving authoritative classifier label
      if (explanation.classification_context !== request.classifierResult.label) {
        groundingAlerts.push(
          `Adaption model returned '${explanation.classification_context}'; authoritative label '${request.classifierResult.label}' strictly enforced.`
        );
        explanation.classification_context = request.classifierResult.label;
        explanation.requires_human_review = true;
      }

      return {
        success: true,
        status: 'success',
        data: explanation,
        modelUsed: this.currentRegistration.modelVersion,
        providerId: this.metadata.id,
        latencyMs,
        groundingAlerts: groundingAlerts.length > 0 ? groundingAlerts : undefined
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        return {
          success: false,
          status: 'timeout',
          error: `Adaption model timed out after ${timeoutMs}ms.`,
          modelUsed: this.currentRegistration.modelId,
          providerId: this.metadata.id,
          latencyMs
        };
      }
      return {
        success: false,
        status: 'error',
        error: `Adaption model call failed: ${err.message || 'Unknown network error'}`,
        modelUsed: this.currentRegistration.modelId,
        providerId: this.metadata.id,
        latencyMs
      };
    }
  }
}

