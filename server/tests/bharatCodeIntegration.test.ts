/**
 * FORM2FACT — BHARATCODE MODEL API INTEGRATION TEST SUITE
 * 
 * Verifies all 12 required test dimensions:
 * 1. Redaction behavior (Aadhaar, PAN, Phone, Email, Bank Account)
 * 2. Missing API key handling (Graceful fallback)
 * 3. Successful API response parsing
 * 4. Invalid response structure / Schema violation handling
 * 5. Malformed JSON handling
 * 6. Authentication failure (HTTP 401/403)
 * 7. Rate limit handling (HTTP 429)
 * 8. Service unavailability (HTTP 503)
 * 9. Timeout handling (AbortSignal)
 * 10. Evidence reference validation (Hallucination removal)
 * 11. LLM disagreement with existing classifier (Override protection)
 * 12. No secret leakage behavior
 * + Optional live test runner when configured
 */

import {
  BharatCodeService,
  redactPii,
  truncateExcerpt,
  ExplanationRequestInput
} from '../modules/explanation/bharatCodeService.ts';

function testAssert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ Passed: ${message}`);
}

async function runTestSuite() {
  console.log('\n================================================================');
  console.log('   FORM2FACT — BHARATCODE MODEL API INTEGRATION SUITE');
  console.log('   Target Model: qwen-3.8-27b | Base URL: https://bharatcode.ai/api/model/v1');
  console.log('================================================================\n');

  // Sample valid test input
  const sampleInput: ExplanationRequestInput = {
    claim: {
      fieldName: 'lease_validity_years',
      fieldLabel: 'Land Lease Tenure',
      rawValue: '30 Years',
      normalizedValue: '30',
      sourceText: 'Application Form Part 2: Applicant declares registered lease deed valid for 30 years from 2020.'
    },
    evidence: {
      fieldName: 'deed_tenure',
      fieldLabel: 'Registered Lease Deed Period',
      rawValue: '15 Years',
      normalizedValue: '15',
      documentName: 'Registered_Lease_Deed_Apex.pdf',
      documentId: 'doc-lease-001',
      pageNumber: 3,
      sourceText: 'Clause 4: The lease shall remain in force for a period of fifteen (15) years commencing from 1st April 2020.'
    },
    classifierResult: {
      label: 'MISMATCH',
      confidence: 0.98,
      explanation: 'Declared 30 Years contradicts supporting document evidence 15 Years.'
    },
    ruleContext: {
      ruleKey: 'RULE-TEN-01',
      ruleTitle: 'Land Lease Tenure Verification',
      requirement: 'Institutional land lease must provide minimum 30 years unexpired tenure.'
    }
  };

  // -------------------------------------------------------------------------
  // TEST 1: Redaction Behavior
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Redaction Behavior & Privacy Safeguards ---');
  const sensitiveText = 'Chairman Aadhaar: 1234 5678 9012, PAN: ABCDE1234F, Contact: +91 9876543210, Email: chair@apex.edu.in, Account: 12345678901234.';
  const redacted = redactPii(sensitiveText);
  testAssert(!redacted.includes('1234 5678 9012'), 'Aadhaar number is redacted');
  testAssert(redacted.includes('[REDACTED_AADHAAR]'), 'Aadhaar replaced with tag');
  testAssert(!redacted.includes('ABCDE1234F'), 'PAN number is redacted');
  testAssert(redacted.includes('[REDACTED_PAN]'), 'PAN replaced with tag');
  testAssert(!redacted.includes('9876543210'), 'Phone number is redacted');
  testAssert(redacted.includes('[REDACTED_PHONE]'), 'Phone replaced with tag');
  testAssert(!redacted.includes('chair@apex.edu.in'), 'Email is redacted');
  testAssert(redacted.includes('[REDACTED_EMAIL]'), 'Email replaced with tag');
  testAssert(!redacted.includes('12345678901234'), 'Bank account is redacted');
  testAssert(redacted.includes('[REDACTED_BANK_ACCOUNT]'), 'Bank account replaced with tag');

  // Truncation test
  const longText = 'A'.repeat(600);
  const truncated = truncateExcerpt(longText, 100);
  testAssert(truncated.length <= 130, 'Long excerpts are truncated safely');
  testAssert(truncated.includes('[truncated]'), 'Truncation notice added');

  // -------------------------------------------------------------------------
  // TEST 2: Missing API Key Handling
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Missing API Key Handling (Fail Safe to Deterministic) ---');
  const origKey = process.env.BHARATCODE_API_KEY;
  delete process.env.BHARATCODE_API_KEY;

  const missingKeyRes = await BharatCodeService.generateExplanation(sampleInput);
  testAssert(!missingKeyRes.success, 'Returns success: false when API key missing');
  testAssert(missingKeyRes.status === 'unavailable', 'Status is unavailable');
  testAssert(Boolean(missingKeyRes.error && missingKeyRes.error.includes('BHARATCODE_API_KEY')), 'Explains missing configuration');

  // Set mock test key
  process.env.BHARATCODE_API_KEY = 'bc_test_mock_secret_key_1234567890';

  // -------------------------------------------------------------------------
  // TEST 3: Successful API Response
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Successful API Response Parsing ---');
  const mockFetchSuccess: typeof fetch = async () => {
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            summary: 'Declared 30-year lease tenure contradicts registered deed which specifies 15 years.',
            classification_context: 'MISMATCH',
            reasoning: 'The application declares a 30-year tenure, but Clause 4 of the registered lease deed explicitly establishes a 15-year period. This creates a 15-year deficit against the declared tenure.',
            evidence_references: [{
              documentName: 'Registered_Lease_Deed_Apex.pdf',
              pageNumber: 3,
              citedText: 'Clause 4: The lease shall remain in force for a period of fifteen (15) years'
            }],
            uncertainties: [],
            requires_human_review: true
          })
        }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const successRes = await BharatCodeService.generateExplanation(sampleInput, { fetchFn: mockFetchSuccess });
  testAssert(successRes.success, 'Successful explanation returned');
  testAssert(successRes.status === 'success', 'Status is success');
  testAssert(successRes.data?.classification_context === 'MISMATCH', 'Classification context preserved');
  testAssert(successRes.data?.evidence_references.length === 1, 'Valid citation parsed');
  testAssert(successRes.data?.requires_human_review === true, 'Human review required');

  // -------------------------------------------------------------------------
  // TEST 4: Invalid Response Structure / Schema Violation
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Invalid Response Structure Handling ---');
  const mockFetchInvalidSchema: typeof fetch = async () => {
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            // Missing summary, classification_context, and reasoning
            foo: 'bar'
          })
        }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const invalidSchemaRes = await BharatCodeService.generateExplanation(sampleInput, { fetchFn: mockFetchInvalidSchema });
  testAssert(!invalidSchemaRes.success, 'Rejects invalid schema structure');
  testAssert(invalidSchemaRes.status === 'validation_error', 'Status indicates validation_error');

  // -------------------------------------------------------------------------
  // TEST 5: Malformed JSON Handling
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Malformed JSON Handling ---');
  const mockFetchMalformed: typeof fetch = async () => {
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: 'Here is your explanation: { summary: unclosed json...'
        }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const malformedRes = await BharatCodeService.generateExplanation(sampleInput, { fetchFn: mockFetchMalformed });
  testAssert(!malformedRes.success, 'Rejects unparseable JSON content');
  testAssert(malformedRes.status === 'validation_error', 'Status indicates validation_error');

  // -------------------------------------------------------------------------
  // TEST 6: Authentication Failure (HTTP 401)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Authentication Failure (HTTP 401) ---');
  const mockFetchAuthError: typeof fetch = async () => {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid API key' }), {
      status: 401,
      statusText: 'Unauthorized'
    });
  };

  const authErrorRes = await BharatCodeService.generateExplanation(sampleInput, { fetchFn: mockFetchAuthError });
  testAssert(!authErrorRes.success, 'Rejects 401 unauthorized');
  testAssert(authErrorRes.status === 'auth_error', 'Status indicates auth_error');

  // -------------------------------------------------------------------------
  // TEST 7: Rate-Limit Handling (HTTP 429)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Rate-Limit Handling (HTTP 429) ---');
  const mockFetch429: typeof fetch = async () => {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      statusText: 'Too Many Requests'
    });
  };

  const rateLimitRes = await BharatCodeService.generateExplanation(sampleInput, { fetchFn: mockFetch429 });
  testAssert(!rateLimitRes.success, 'Handles 429 rate limit');
  testAssert(rateLimitRes.status === 'rate_limited', 'Status indicates rate_limited');

  // -------------------------------------------------------------------------
  // TEST 8: Service Unavailability (HTTP 503)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8: Service Unavailability (HTTP 503) ---');
  const mockFetch503: typeof fetch = async () => {
    return new Response(JSON.stringify({ error: 'Service Unavailable' }), {
      status: 503,
      statusText: 'Service Unavailable'
    });
  };

  const unavailableRes = await BharatCodeService.generateExplanation(sampleInput, { fetchFn: mockFetch503 });
  testAssert(!unavailableRes.success, 'Handles 503 service unavailable');
  testAssert(unavailableRes.status === 'service_unavailable', 'Status indicates service_unavailable');

  // -------------------------------------------------------------------------
  // TEST 9: Timeout Handling
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 9: Timeout Handling (Abort Controller) ---');
  const mockFetchTimeout: typeof fetch = async () => {
    const error = new Error('The operation was aborted due to timeout');
    error.name = 'TimeoutError';
    throw error;
  };

  const timeoutRes = await BharatCodeService.generateExplanation(sampleInput, { fetchFn: mockFetchTimeout });
  testAssert(!timeoutRes.success, 'Handles timeout failure cleanly');
  testAssert(timeoutRes.status === 'timeout', 'Status indicates timeout');

  // -------------------------------------------------------------------------
  // TEST 10: Evidence Reference Validation (Hallucination Guard)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 10: Evidence Reference Hallucination Removal ---');
  const mockFetchHallucinatedRef: typeof fetch = async () => {
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            summary: 'Lease tenure discrepancy identified.',
            classification_context: 'MISMATCH',
            reasoning: 'Discrepancy verified between claim and lease deed.',
            evidence_references: [
              {
                // Genuine citation
                documentName: 'Registered_Lease_Deed_Apex.pdf',
                pageNumber: 3,
                citedText: '15 years tenure'
              },
              {
                // Hallucinated citation not in input!
                documentName: 'Imaginary_Municipal_Clearance.pdf',
                pageNumber: 42,
                citedText: 'Hallucinated text'
              }
            ],
            uncertainties: [],
            requires_human_review: true
          })
        }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const hallucinationRes = await BharatCodeService.generateExplanation(sampleInput, { fetchFn: mockFetchHallucinatedRef });
  testAssert(hallucinationRes.success, 'Explanation handled');
  testAssert(hallucinationRes.data?.evidence_references.length === 1, 'Hallucinated citation was stripped');
  testAssert(hallucinationRes.data?.evidence_references[0].documentName === 'Registered_Lease_Deed_Apex.pdf', 'Genuine citation preserved');
  testAssert(
    Boolean(hallucinationRes.data?.uncertainties.some((u) => u.includes('unverified document citations were removed'))),
    'Notice added to uncertainties'
  );

  // -------------------------------------------------------------------------
  // TEST 11: LLM Disagreement with Authoritative Classifier (Override Prevention)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 11: LLM Disagreement Override Prevention ---');
  const mockFetchDisagreement: typeof fetch = async () => {
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            summary: 'Model argues claim is acceptable.',
            // Diverges: model returns MATCH when authoritative classifier said MISMATCH
            classification_context: 'MATCH',
            reasoning: 'Model thinks 15 years is sufficient.',
            evidence_references: [{
              documentName: 'Registered_Lease_Deed_Apex.pdf',
              pageNumber: 3
            }],
            uncertainties: [],
            requires_human_review: false
          })
        }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const disagreementRes = await BharatCodeService.generateExplanation(sampleInput, { fetchFn: mockFetchDisagreement });
  testAssert(disagreementRes.success, 'Response parsed');
  testAssert(disagreementRes.data?.classification_context === 'MISMATCH', 'Authoritative classifier label strictly maintained');
  testAssert(disagreementRes.data?.requires_human_review === true, 'Human review forced on disagreement');
  testAssert(
    Boolean(disagreementRes.data?.uncertainties.some((u) => u.includes('authoritative Form2Fact classifier strictly maintained'))),
    'Disagreement explicitly flagged in uncertainties'
  );

  // -------------------------------------------------------------------------
  // TEST 12: No Secret Leak Behavior
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 12: No Secret Leak Behavior ---');
  const secretKey = 'bc_test_super_secret_token_never_expose!';
  process.env.BHARATCODE_API_KEY = secretKey;

  const mockFetchLeakyServer: typeof fetch = async () => {
    throw new Error(`Connection reset while transmitting Authorization: Bearer ${secretKey}`);
  };

  const leakRes = await BharatCodeService.generateExplanation(sampleInput, { fetchFn: mockFetchLeakyServer });
  const serialized = JSON.stringify(leakRes);
  testAssert(!serialized.includes(secretKey), 'API secret is NEVER included in client-facing result payload');

  // Restore env
  if (origKey) {
    process.env.BHARATCODE_API_KEY = origKey;
  } else {
    delete process.env.BHARATCODE_API_KEY;
  }

  console.log('\n================================================================');
  console.log('   BHARATCODE API INTEGRATION: 12/12 TESTS PASSED');
  console.log('================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});

