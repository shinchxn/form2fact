/**
 * FORM2FACT — AI MODEL REGISTRY
 * 
 * Central registry for multi-model AI providers.
 * Manages provider registration, lifecycle, capability matching, and operational health monitoring.
 */

import { logger } from '../../../core/logger/index.js';
import {
  ModelProvider,
  ProviderMetadata,
  ProviderHealthStatus,
  TaskType
} from './modelTypes.ts';
import { BharatCodeQwenProvider } from './bharatCodeQwenProvider.ts';
import { BharatCodeDeepSeekProvider } from './bharatCodeDeepSeekProvider.ts';
import { AdaptionProvider } from './adaptionProvider.ts';
import { Form2FactClassifierProvider } from './form2factClassifierProvider.ts';

export class ModelRegistry {
  private static instance: ModelRegistry | null = null;
  private readonly providers: Map<string, ModelProvider> = new Map();
  private readonly cachedHealth: Map<string, ProviderHealthStatus> = new Map();

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  private registerDefaults(): void {
    // 1. Authoritative Native Form2Fact Verification Classifier
    this.register(new Form2FactClassifierProvider());

    // 2. BharatCode Qwen 3.8 27B Reasoning Provider
    this.register(new BharatCodeQwenProvider());

    // 3. BharatCode DeepSeek v4.1 Flash Provider
    this.register(new BharatCodeDeepSeekProvider());

    // 4. Adaption AutoScientist Fine-Tuned Model Provider
    this.register(new AdaptionProvider());

    logger.info('[ModelRegistry] Initialized default multi-model providers', {
      count: this.providers.size,
      providers: Array.from(this.providers.keys())
    });
  }

  public register(provider: ModelProvider): void {
    const id = provider.metadata.id;
    if (this.providers.has(id)) {
      logger.warn(`[ModelRegistry] Overwriting existing provider registration: ${id}`);
    }
    this.providers.set(id, provider);
  }

  public unregister(providerId: string): boolean {
    return this.providers.delete(providerId);
  }

  public get(providerId: string): ModelProvider | undefined {
    return this.providers.get(providerId);
  }

  public has(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  public listMetadata(): ProviderMetadata[] {
    return Array.from(this.providers.values()).map(p => p.metadata);
  }

  public listProviders(): ModelProvider[] {
    return Array.from(this.providers.values());
  }

  public getProvidersForTask(task: TaskType): ModelProvider[] {
    return Array.from(this.providers.values()).filter(p =>
      p.metadata.capabilities.some(c => c.task === task)
    );
  }

  /**
   * Resolves the primary default provider for a designated task.
   */
  public getDefaultProviderForTask(task: TaskType): ModelProvider {
    switch (task) {
      case 'field_comparison': {
        const native = this.get(Form2FactClassifierProvider.PROVIDER_ID);
        if (native) return native;
        throw new Error('Authoritative Form2Fact classifier provider is not registered.');
      }
      case 'evidence_explanation': {
        // Priority: BharatCode Qwen if configured, otherwise DeepSeek, otherwise Adaption (if verified)
        const qwen = this.get(BharatCodeQwenProvider.PROVIDER_ID);
        if (qwen && qwen.isConfigured()) return qwen;
        const deepseek = this.get(BharatCodeDeepSeekProvider.PROVIDER_ID);
        if (deepseek && deepseek.isConfigured()) return deepseek;
        const adaption = this.get(AdaptionProvider.PROVIDER_ID);
        if (adaption && adaption.isConfigured()) return adaption;
        // Fallback to Qwen (will report clean 'unavailable' without crashing)
        return qwen || this.listProviders()[0];
      }
      case 'complex_reasoning':
      case 'document_scrutiny': {
        // For long context / complex reasoning: DeepSeek primary if configured, otherwise Qwen
        const deepseek = this.get(BharatCodeDeepSeekProvider.PROVIDER_ID);
        if (deepseek && deepseek.isConfigured()) return deepseek;
        const qwen = this.get(BharatCodeQwenProvider.PROVIDER_ID);
        if (qwen) return qwen;
        return this.listProviders()[0];
      }
      case 'learned_inference': {
        const adaption = this.get(AdaptionProvider.PROVIDER_ID);
        if (adaption && adaption.isConfigured()) return adaption;
        const native = this.get(Form2FactClassifierProvider.PROVIDER_ID);
        if (native) return native;
        throw new Error('No provider available for learned_inference task.');
      }
      default:
        return this.listProviders()[0];
    }
  }

  /**
   * Executes health checks across all registered providers in parallel.
   */
  public async checkAllHealth(options: { timeoutMs?: number; fetchFn?: typeof fetch } = {}): Promise<Record<string, ProviderHealthStatus>> {
    const results: Record<string, ProviderHealthStatus> = {};
    const checkPromises = Array.from(this.providers.entries()).map(async ([id, provider]) => {
      try {
        const status = await provider.checkHealth(options);
        results[id] = status;
        this.cachedHealth.set(id, status);
      } catch (err: any) {
        const failedStatus: ProviderHealthStatus = {
          providerId: id,
          isConfigured: provider.isConfigured(),
          isHealthy: false,
          lastChecked: new Date().toISOString(),
          message: `Health check threw uncaught exception: ${err.message}`
        };
        results[id] = failedStatus;
        this.cachedHealth.set(id, failedStatus);
      }
    });

    await Promise.all(checkPromises);
    return results;
  }

  public getCachedHealth(providerId: string): ProviderHealthStatus | undefined {
    return this.cachedHealth.get(providerId);
  }
}

export const modelRegistry = ModelRegistry.getInstance();

