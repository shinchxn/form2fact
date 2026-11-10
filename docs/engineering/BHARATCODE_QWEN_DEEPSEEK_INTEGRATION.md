# Form2Fact — BharatCode Qwen & DeepSeek Integration Guide

**Integration Target:** BharatCode AI Model API  
**Base URL:** `https://bharatcode.ai/api/model/v1`  
**Supported Models:**
1. `qwen-3.8-27b` (Evidence Reasoning & Finding Explanations)
2. `deepseek-v4.1-flash` (Complex Long-Context Scrutiny & Analysis)

---

## 1. Provider Configurations & Environment Variables

| Variable | Default Value | Description | Required? |
| :--- | :--- | :--- | :---: |
| `BHARATCODE_API_KEY` | *(None)* | Primary bearer token for BharatCode API | Required for live AI |
| `BHARATCODE_API_URL` | `https://bharatcode.ai/api/model/v1` | Base endpoint URL | Optional |
| `BHARATCODE_QWEN_MODEL` | `qwen-3.8-27b` | Model identifier for Qwen provider | Optional |
| `BHARATCODE_TIMEOUT_MS` | `60000` (60s) | Timeout for Qwen reasoning | Optional |
| `BHARATCODE_DEEPSEEK_API_KEY` | *(Falls back to BHARATCODE_API_KEY)* | Dedicated key for DeepSeek | Optional |
| `BHARATCODE_DEEPSEEK_API_URL` | *(Falls back to BHARATCODE_API_URL)* | Dedicated URL for DeepSeek | Optional |
| `BHARATCODE_DEEPSEEK_MODEL` | `deepseek-v4.1-flash` | Model identifier for DeepSeek | Optional |
| `BHARATCODE_DEEPSEEK_TIMEOUT_MS` | `45000` (45s) | Timeout for DeepSeek calls | Optional |

> [!SECURITY]
> Credentials must **never** be hardcoded, printed in logs, or exposed to the client browser. All calls to BharatCode are routed exclusively through backend Express controllers with secret sanitization.

---

## 2. Model Specialization Matrix

### Provider A: BharatCode Qwen 3.8 27B
- **Adapter:** [`BharatCodeQwenProvider`](file:///d:/projects/form2fact/server/modules/ai/providers/bharatCodeQwenProvider.ts)
- **Model ID:** `qwen-3.8-27b`
- **Architecture Notes:** Qwen 3.8 27B is a reasoning model that emits internal chain-of-thought (`reasoning_content`) before emitting its final structured response.
- **Token Budget Handling:** If the model exhausts its completion budget during internal reasoning without emitting a final answer, the adapter detects `reasoning_content.length > 0 && !content` and reports a clean `validation_error` prompting for increased token headroom, rather than silently fabricating an explanation.
- **Primary Use Cases:**
  * Field-level discrepancy explanations (`findings/:id/explain`).
  * Bilingual English/Tamil summaries.
  * Human reviewer decision support notes.

### Provider B: BharatCode DeepSeek v4.1 Flash
- **Adapter:** [`BharatCodeDeepSeekProvider`](file:///d:/projects/form2fact/server/modules/ai/providers/bharatCodeDeepSeekProvider.ts)
- **Model ID:** `deepseek-v4.1-flash`
- **Architecture Notes:** High-throughput, low-latency reasoning architecture with a 64k+ token context window.
- **Primary Use Cases:**
  * Multi-document docket scrutiny memos (`applications/:id/scrutiny-memo`).
  * Multi-parcel land aggregation reconciliation.
  * Rapid, high-volume batch explanations.

---

## 3. Outbound Request & Response Schemas

### Request Payload (`POST /chat/completions`)
```json
{
  "model": "qwen-3.8-27b",
  "messages": [
    {
      "role": "system",
      "content": "You are an evidence-grounded institutional scrutiny reasoning assistant for Form2Fact..."
    },
    {
      "role": "user",
      "content": "Institutional Claim:\n- Field: Lease Expiry Date...\nSupporting Evidence:\n..."
    }
  ],
  "temperature": 0.1,
  "response_format": { "type": "json_object" }
}
```

### Validated Response Schema (Zod)
Every completion must strictly adhere to `ModelExplanationOutputSchema`:
```json
{
  "summary": "Short 1-2 sentence executive summary of the finding",
  "classification_context": "MISMATCH",
  "reasoning": "Detailed, evidence-grounded explanation linking claim to evidence",
  "evidence_references": [
    {
      "documentName": "Registered_Lease_Deed.pdf",
      "pageNumber": 4,
      "citedText": "lease period shall conclude on 31/03/2028"
    }
  ],
  "uncertainties": [
    "No supplementary extension registered deed attached to docket."
  ],
  "requires_human_review": true
}
```

---

## 4. Controlled Failure Mapping

| HTTP Status / Condition | Provider Status | System Behavior |
| :---: | :---: | :--- |
| **Missing API Key** | `unavailable` | Fails closed; preserves deterministic finding without error |
| **HTTP 401 / 403** | `auth_error` | Logs sanitized warning; alerts administrator |
| **HTTP 429** | `rate_limited` | Flags rate-limiting; suggests retry interval |
| **HTTP 502 / 503** | `service_unavailable` | Temporary failure; falls back gracefully |
| **Timeout (>60s)** | `timeout` | Aborts request cleanly; preserves deterministic finding |
| **Malformed JSON** | `validation_error` | Catches parse error; records diagnostic note |
| **Label Disagreement** | `success` | Overwrites proposed label with classifier's authoritative label |
| **Invalid Citation** | `success` | Strips hallucinated document; appends grounding alert |

---

## 5. Live Verification & Testing

Mocked integration tests for both Qwen and DeepSeek are part of the core test runner:
```bash
npx tsx server/tests/multiModelOrchestration.test.ts
```
Expected output:
```
✅ Passed: Qwen explanation succeeds with valid mock
✅ Passed: Hallucinated document was stripped
✅ Passed: Authoritative label strictly enforced against model override
✅ Passed: DeepSeek explanation succeeds with valid mock
✅ Passed: HTTP 401 maps to auth_error
✅ Passed: HTTP 429 maps to rate_limited
✅ Passed: HTTP 503 maps to service_unavailable
```

