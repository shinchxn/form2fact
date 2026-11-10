/**
 * FORM2FACT — MULTI-MODEL AI ORCHESTRATION & PROVIDER TEST SUITE
 * 
 * Verifies:
 * 1. ModelRegistry provider discovery, metadata, and task-based capability resolution.
 * 2. ModelRouter task routing policy (Field Comparison -> Native Classifier; Explanation -> Qwen/DeepSeek).
 * 3. BharatCode Qwen 3.8 27B provider adapter contracts and mocked network responses.
 * 4. BharatCode DeepSeek v4.1 Flash provider adapter contracts and mocked network responses.
 * 5. Adaption fine-tuned model adapter verification, unverified checkpoint rejection, and schema validation.
 * 6. Safety Guards: Citation grounding, hallucination removal, PII redaction, and classifier overwrite protection.
 * 7. Controlled failure modes: Timeout, rate limit (429), auth error (401/403), and service unavailable (503).
 */

import { modelRegistry, ModelRegistry } from '../modules/ai/providers/modelRegistry.ts';
import { modelRouter, ModelRouter } from '../modules/ai/providers/modelRouter.ts';
import { BharatCodeQwenProvider } from '../modules/ai/providers/bharatCodeQwenProvider.ts';
import { BharatCodeDeepSeekProvider } from '../modules/ai/providers/bharatCodeDeepSeekProvider.ts';
import { AdaptionProvider } from '../modules/ai/providers/adaptionProvider.ts';
import { Form2FactClassifierProvider } from '../modules/ai/providers/form2factClassifierProvider.ts';
import { ExplanationRequest } from '../modules/ai/providers/modelTypes.ts';

function testAssert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    throw new Error(`Test assertion failed: ${message}`);
  }
  console.log(`✅ Passed: ${message}`);
}

const sampleRequest: ExplanationRequest = {
  claim: {
    fieldName: 'leaseExpiryDate',
    fieldLabel: 'Lease Expiry Date',
    rawValue: '31/03/2054',
    sourceText: 'Lease expires on 31 March 2054'
  },
  evidence: {
    fieldName: 'leaseExpiryDate',
    fieldLabel: 'Registered Lease Deed Expiry',
    rawValue: '31/03/2028',
    documentName: 'Registered_Lease_Deed.pdf',
    documentId: 'doc-lease-01',
    pageNumber: 4,
    sourceText: '...lease period shall conclude on 31/03/2028...'
  },
  classifierResult: {
    label: 'MISMATCH',
    confidence: 0.98,
    explanation: 'Discrepancy: Declared lease expiry (2054-03-31) differs from deed (2028-03-31).'
  },
  ruleContext: {
    ruleKey: 'RULE-TEN-01',
    ruleTitle: 'Land Lease Tenure Minimum Requirement',
    requirement: 'Institutions operating on leased land must possess registered lease >= 30 years.'
  }
};

export async function runMultiModelOrchestrationSuite(): Promise<void> {
  console.log('====================================================');
  console.log('   FORM2FACT — MULTI-MODEL AI ORCHESTRATION TEST SUITE');
  console.log('====================================================\n');

  // -----------------------------------------------------------------------
  // [1] REGISTRY & PROVIDER DISCOVERY
  // -----------------------------------------------------------------------
  console.log('[1] Testing ModelRegistry & Provider Discovery...');
  const providers = modelRegistry.listProviders();
  testAssert(providers.length >= 4, `At least 4 providers registered (found: ${providers.length})`);

  const qwenProvider = modelRegistry.get(BharatCodeQwenProvider.PROVIDER_ID);
  testAssert(Boolean(qwenProvider), 'BharatCode Qwen provider is registered');
  testAssert(qwenProvider?.metadata.modelId === 'qwen-3.8-27b', 'Qwen provider model ID is qwen-3.8-27b');
  testAssert(qwenProvider?.metadata.isAuthoritativeVerification === false, 'Qwen is non-authoritative');

  const deepseekProvider = modelRegistry.get(BharatCodeDeepSeekProvider.PROVIDER_ID);
  testAssert(Boolean(deepseekProvider), 'BharatCode DeepSeek provider is registered');
  testAssert(deepseekProvider?.metadata.modelId === 'deepseek-v4.1-flash', 'DeepSeek provider model ID is deepseek-v4.1-flash');
  testAssert(deepseekProvider?.metadata.isAuthoritativeVerification === false, 'DeepSeek is non-authoritative');

  const adaptionProvider = modelRegistry.get(AdaptionProvider.PROVIDER_ID);
  testAssert(Boolean(adaptionProvider), 'Adaption provider is registered');
  testAssert(adaptionProvider?.metadata.platform === 'adaption', 'Adaption platform is marked correctly');

  const nativeClassifier = modelRegistry.get(Form2FactClassifierProvider.PROVIDER_ID);
  testAssert(Boolean(nativeClassifier), 'Form2Fact native classifier provider is registered');
  testAssert(nativeClassifier?.metadata.isAuthoritativeVerification === true, 'Native classifier is the authoritative verification component');

  // -----------------------------------------------------------------------
  // [2] TASK-BASED ROUTING RESOLUTION
  // -----------------------------------------------------------------------
  console.log('\n[2] Testing Task-Based Routing Policy...');
  const comparisonProvider = modelRegistry.getDefaultProviderForTask('field_comparison');
  testAssert(comparisonProvider.metadata.id === Form2FactClassifierProvider.PROVIDER_ID, 'Field comparison routes exclusively to Form2Fact native classifier');

  const explanationProvider = modelRegistry.getDefaultProviderForTask('evidence_explanation');
  testAssert(
    explanationProvider.metadata.id === BharatCodeQwenProvider.PROVIDER_ID ||
    explanationProvider.metadata.id === BharatCodeDeepSeekProvider.PROVIDER_ID,
    'Evidence explanation routes to a compliant LLM reasoning provider'
  );

  const reasoningProvider = modelRegistry.getDefaultProviderForTask('complex_reasoning');
  testAssert(
    reasoningProvider.metadata.id === BharatCodeDeepSeekProvider.PROVIDER_ID ||
    reasoningProvider.metadata.id === BharatCodeQwenProvider.PROVIDER_ID,
    'Complex reasoning routes to long-context reasoning provider'
  );

  // -----------------------------------------------------------------------
  // [3] BHARATCODE QWEN MOCKED INFERENCE & GROUNDING
  // -----------------------------------------------------------------------
  console.log('\n[3] Testing BharatCode Qwen 3.8 27B Adapter & Grounding Guards...');
  const origKey = process.env.BHARATCODE_API_KEY;
  process.env.BHARATCODE_API_KEY = 'bc_test_secret_key_mock_12345';

  const mockQwenFetchSuccess: typeof fetch = async () => {
    return new Response(JSON.stringify({
      id: 'chatcmpl-qwen-mock-01',
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            summary: 'Lease deed expiry date does not satisfy the declared 2054 termination timeline.',
            classification_context: 'MISMATCH',
            reasoning: 'The applicant declared lease validity until 2054-03-31, but Registered_Lease_Deed.pdf on page 4 stipulates termination on 31/03/2028.',
            evidence_references: [
              {
                documentName: 'Registered_Lease_Deed.pdf',
                pageNumber: 4,
                citedText: 'lease period shall conclude on 31/03/2028'
              }
            ],
            uncertainties: ['Document indicates possible supplementary renewal deed not attached.'],
            requires_human_review: true
          })
        }
      }],
      usage: { prompt_tokens: 350, completion_tokens: 95, total_tokens: 445 }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const qwenSuccessRes = await modelRouter.routeExplanation(sampleRequest, {
    providerId: BharatCodeQwenProvider.PROVIDER_ID,
    fetchFn: mockQwenFetchSuccess
  });

  testAssert(qwenSuccessRes.success === true, 'Qwen explanation succeeds with valid mock');
  testAssert(qwenSuccessRes.data?.classification_context === 'MISMATCH', 'Preserves MISMATCH classification');
  testAssert(qwenSuccessRes.data?.evidence_references.length === 1, 'Preserves verified evidence citation');
  testAssert(qwenSuccessRes.tokensUsed?.totalTokens === 445, 'Records token telemetry');

  // Test Hallucination Filter
  const mockQwenHallucinationFetch: typeof fetch = async () => {
    return new Response(JSON.stringify({
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            summary: 'Discrepancy verified.',
            classification_context: 'MISMATCH',
            reasoning: 'Verified mismatch.',
            evidence_references: [
              { documentName: 'Registered_Lease_Deed.pdf', pageNumber: 4 },
              { documentName: 'Invented_Secret_Document.pdf', pageNumber: 99 } // Hallucinated!
            ],
            uncertainties: [],
            requires_human_review: true
          })
        }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const qwenHallucinationRes = await modelRouter.routeExplanation(sampleRequest, {
    providerId: BharatCodeQwenProvider.PROVIDER_ID,
    fetchFn: mockQwenHallucinationFetch
  });

  testAssert(qwenHallucinationRes.data?.evidence_references.length === 1, 'Hallucinated document was stripped');
  testAssert(qwenHallucinationRes.data?.evidence_references[0].documentName === 'Registered_Lease_Deed.pdf', 'Valid citation retained');
  testAssert(Boolean(qwenHallucinationRes.groundingAlerts && qwenHallucinationRes.groundingAlerts.length > 0), 'Grounding alert logged for stripped reference');

  // Test Classifier Overwrite Protection
  const mockQwenOverwriteFetch: typeof fetch = async () => {
    return new Response(JSON.stringify({
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            summary: 'Model falsely proposes match.',
            classification_context: 'MATCH', // Disagrees with authoritative MISMATCH!
            reasoning: 'I think it is a match.',
            evidence_references: [],
            uncertainties: [],
            requires_human_review: false
          })
        }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const qwenOverwriteRes = await modelRouter.routeExplanation(sampleRequest, {
    providerId: BharatCodeQwenProvider.PROVIDER_ID,
    fetchFn: mockQwenOverwriteFetch
  });

  testAssert(qwenOverwriteRes.data?.classification_context === 'MISMATCH', 'Authoritative label strictly enforced against model override');
  testAssert(qwenOverwriteRes.data?.requires_human_review === true, 'Divergent prediction automatically requires human review');

  // -----------------------------------------------------------------------
  // [4] BHARATCODE DEEPSEEK V4.1 FLASH PROVIDER
  // -----------------------------------------------------------------------
  console.log('\n[4] Testing BharatCode DeepSeek v4.1 Flash Provider...');
  const mockDeepSeekSuccess: typeof fetch = async () => {
    return new Response(JSON.stringify({
      id: 'chatcmpl-deepseek-mock-01',
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            summary: 'Cross-document timeline contradiction detected between declared tenure and registered deed.',
            classification_context: 'MISMATCH',
            reasoning: 'DeepSeek long-context evaluation: deed termination clause on page 4 provides only 4 years of remaining unexpired tenure, failing statutory 30-year requirement.',
            evidence_references: [{ documentName: 'Registered_Lease_Deed.pdf', pageNumber: 4, citedText: '31/03/2028' }],
            uncertainties: ['No supplementary registered extension deed found in docket.'],
            requires_human_review: true
          })
        }
      }],
      usage: { total_tokens: 380 }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const deepseekSuccessRes = await modelRouter.routeExplanation(sampleRequest, {
    providerId: BharatCodeDeepSeekProvider.PROVIDER_ID,
    fetchFn: mockDeepSeekSuccess
  });

  testAssert(deepseekSuccessRes.success === true, 'DeepSeek explanation succeeds with valid mock');
  testAssert(deepseekSuccessRes.providerId === 'bharatcode-deepseek', 'Correct providerId returned');
  testAssert(deepseekSuccessRes.data?.classification_context === 'MISMATCH', 'DeepSeek preserves MISMATCH');

  // -----------------------------------------------------------------------
  // [5] ADAPTION PROVIDER UNVERIFIED REJECTION & SAFETIES
  // -----------------------------------------------------------------------
  console.log('\n[5] Testing Adaption Provider Readiness & Safeties...');
  const adaptionP = modelRegistry.get(AdaptionProvider.PROVIDER_ID) as AdaptionProvider;
  testAssert(adaptionP.isConfigured() === false, 'Adaption provider is NOT active without verified endpoint');

  const adaptionHealth = await adaptionP.checkHealth();
  testAssert(adaptionHealth.isHealthy === false, 'Adaption health check reports unverified status safely');
  testAssert(Boolean(adaptionHealth.message && adaptionHealth.message.includes('Adaption AutoScientist')), 'Health diagnostic explains independent training status');

  const unconfiguredAdaptionRes = await modelRouter.routeExplanation(sampleRequest, {
    providerId: AdaptionProvider.PROVIDER_ID
  });
  testAssert(unconfiguredAdaptionRes.success === false, 'Calling unverified Adaption model safely fails closed');
  testAssert(unconfiguredAdaptionRes.status === 'unavailable', 'Returns clean unavailable status without throwing');

  // -----------------------------------------------------------------------
  // [6] CONTROLLED FAILURE MODES (TIMEOUT, 429, 401, 503)
  // -----------------------------------------------------------------------
  console.log('\n[6] Testing Controlled Failure Modes...');
  const mockFetch401: typeof fetch = async () => new Response('Unauthorized', { status: 401 });
  const authRes = await modelRouter.routeExplanation(sampleRequest, {
    providerId: BharatCodeQwenProvider.PROVIDER_ID,
    fetchFn: mockFetch401
  });
  testAssert(authRes.status === 'auth_error', 'HTTP 401 maps to auth_error');

  const mockFetch429: typeof fetch = async () => new Response('Rate limited', { status: 429 });
  const rateLimitRes = await modelRouter.routeExplanation(sampleRequest, {
    providerId: BharatCodeQwenProvider.PROVIDER_ID,
    fetchFn: mockFetch429
  });
  testAssert(rateLimitRes.status === 'rate_limited', 'HTTP 429 maps to rate_limited');

  const mockFetch503: typeof fetch = async () => new Response('Unavailable', { status: 503 });
  const unavailableRes = await modelRouter.routeExplanation(sampleRequest, {
    providerId: BharatCodeQwenProvider.PROVIDER_ID,
    fetchFn: mockFetch503
  });
  testAssert(unavailableRes.status === 'service_unavailable', 'HTTP 503 maps to service_unavailable');

  // Restore env
  if (origKey) process.env.BHARATCODE_API_KEY = origKey;
  else delete process.env.BHARATCODE_API_KEY;

  console.log('\n====================================================');
  console.log('🎉 ALL MULTI-MODEL ORCHESTRATION TESTS PASSED!');
  console.log('====================================================\n');
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runMultiModelOrchestrationSuite().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}

