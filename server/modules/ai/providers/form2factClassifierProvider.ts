/**
 * FORM2FACT — NATIVE PAIRWISE CLASSIFIER PROVIDER ADAPTER
 * 
 * Target Architecture: Form2Fact Hybrid Pairwise Engine (Fast-path + Calibrated ML)
 * Model: form2fact-hybrid-pairwise-v2.0-champion
 * 
 * Architectural Invariant:
 * THIS IS THE AUTHORITATIVE VERIFICATION COMPONENT.
 * Never replaces verification with an external LLM.
 * Implements the 5-class taxonomy with strict abstention and human-review routing.
 */

import { logger } from '../../../core/logger/index.js';
import { PairwiseFieldClassifier } from '../../verification/pairwiseEngine.ts';
import {
  ModelProvider,
  ProviderMetadata,
  ProviderHealthStatus,
  FiveClassLabel
} from './modelTypes.ts';

export class Form2FactClassifierProvider implements ModelProvider {
  public static readonly PROVIDER_ID = 'form2fact-classifier';
  private static readonly MODEL_ID = 'form2fact-hybrid-pairwise-v2.0-champion';

  public readonly metadata: ProviderMetadata = {
    id: Form2FactClassifierProvider.PROVIDER_ID,
    name: 'Form2Fact Calibrated Pairwise Classifier',
    platform: 'form2fact_native',
    modelId: Form2FactClassifierProvider.MODEL_ID,
    modelVersion: 'v2.0-calibrated',
    description: 'Authoritative statutory verification engine combining deterministic rules with calibrated temperature-scaled embedding inference.',
    isAuthoritativeVerification: true,
    defaultTimeoutMs: 15000,
    capabilities: [
      {
        task: 'field_comparison',
        supportsStreaming: false,
        supportsJsonOutput: true,
        maxContextTokens: 4096,
        languages: ['en', 'ta']
      },
      {
        task: 'learned_inference',
        supportsStreaming: false,
        supportsJsonOutput: true,
        maxContextTokens: 4096,
        languages: ['en']
      }
    ]
  };

  public isConfigured(): boolean {
    // The native classifier is always configured; deterministic fallback is always available
    return true;
  }

  public async checkHealth(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    try {
      // Execute a known synthetic comparison to verify engine responsiveness
      const testResult = await PairwiseFieldClassifier.compare({
        claimField: {
          fieldName: 'institutionName',
          fieldLabel: 'Institution Legal Name',
          rawValue: 'Health Check Institute'
        },
        evidenceField: {
          fieldName: 'institutionName',
          fieldLabel: 'Institution Name',
          rawValue: 'Health Check Institute'
        },
        domainId: 'aicte'
      });

      const latencyMs = Date.now() - startTime;
      const isHealthy = testResult.label === 'MATCH' && testResult.confidence >= 0.95;

      return {
        providerId: this.metadata.id,
        isConfigured: true,
        isHealthy,
        latencyMs,
        lastChecked: new Date().toISOString(),
        message: isHealthy
          ? `Authoritative classifier operational (status: ${testResult.modelStatus}, mode: ${testResult.isDeterministic ? 'deterministic fast-path' : 'ml-inference'}).`
          : 'Classifier test failed expected concordance.',
        details: {
          modelVersion: testResult.modelVersion,
          modelStatus: testResult.modelStatus,
          isDeterministic: testResult.isDeterministic
        }
      };
    } catch (err: any) {
      return {
        providerId: this.metadata.id,
        isConfigured: true,
        isHealthy: false,
        latencyMs: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        message: `Classifier engine health probe failed: ${err.message || 'Unknown error'}`
      };
    }
  }

  public async classifyPair(request: any): Promise<any> {
    return PairwiseFieldClassifier.compare(request);
  }
}

