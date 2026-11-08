# Form2Fact — Available AI Models & Resource Audit

- **Date:** 2026-11-08
- **Method:** Live API probing (unauthenticated model catalog requires the workspace key, which is present in the environment as `BHARATCODE_API_KEY`), inspection of `opencode.json`, and controlled inference tests. **No API secrets are reproduced in this document.**

---

## 1. Provider Configuration (verified)

Source: `opencode.json` (workspace) + live API responses.

| Item | Value | Verified |
|---|---|---|
| Provider name | BharatCode | ✅ |
| API base URL | `https://bharatcode.ai/api/model/v1` | ✅ (HTTP 200) |
| Authentication | `Authorization: Bearer ${BHARATCODE_API_KEY}` | ✅ |
| Wire protocol | OpenAI-compatible **chat completions** (`POST /v1/chat/completions`) | ✅ |
| `/v1/responses` endpoint | **Not advertised** by the model catalog — the supported interface is `/chat/completions` | ✅ |
| Model catalog endpoint | `GET /v1/models` | ✅ |

The earlier configuration values (`https://bharatcode.ai/api/model/v1`, model `qwen-3.8-27b`) **remain valid** and were confirmed against the live API on 2026-11-08.

## 2. Model Catalog (live `GET /v1/models` response, 2026-11-08)

### 2.1 `qwen-3.8-27b` — **primary application model**
| Property | Value |
|---|---|
| Display name | Qwen 3.8 27B |
| Modality | `vision_chat` (text + image in, text out) |
| Endpoint | `/v1/chat/completions` (protocol `openai_chat_completions`) |
| Status | `live` |
| Context window | **262,144 tokens** |
| Max output tokens | **32,000** |
| Access tier | `standard` |
| Tool calling | ✅ |
| Reasoning | ✅ (**reasoning model** — see §4) |

### 2.2 `deepseek-v4.1-flash` — secondary / experimental
| Property | Value |
|---|---|
| Display name | BharatCode DeepSeek V4.1 Flash |
| Modality | `vision_chat` |
| Context window | **1,000,000 tokens** |
| Max output tokens | 32,000 |
| Max input size | 8 MB |
| Access tier | **`heavy`** |
| Tool calling / reasoning | ✅ / ✅ |

**Decision:** `qwen-3.8-27b` is used for application inference (standard tier, predictable latency). `deepseek-v4.1-flash` is **not** used in the application; it is available for larger-context offline tasks. It must not be silently substituted for `qwen-3.8-27b` (no-silent-replacement rule).

## 3. Quota & Allocation (observed)

- The workspace key is a **BharatCode free student account** with a **daily token allowance of ~10,000,000 tokens, resetting at midnight IST**.
- This limit is **shared** between development assistance (OpenCode agent sessions/subagents) **and** application inference calls made with the same key.
- **Empirical observation (2026-11-07/08):** four parallel agent tasks exhausted the daily allowance mid-run and were rejected with the provider's quota-exhaustion message; after the midnight IST reset, inference succeeded again (verified by a live completion returning `usage.prompt_tokens=57, completion_tokens=16`).
- **Operational consequence:** this is *not* an unlimited or per-model pool. Application E2E runs that call the LLM are budgeted (small, truncated, redacted payloads — typically a few hundred tokens per explanation), and heavy model usage is avoided during the release window.

## 4. Behavioral Characteristics (observed, must shape integration)

1. **Reasoning model:** responses may contain `choices[0].message.reasoning_content` while `content` is `null` if the token budget is consumed by reasoning before the final answer. Clients must handle `content: null` explicitly.
2. **Latency:** a full structured explanation takes materially longer than 5 s; Form2Fact's explanation timeout is configurable via `BHARATCODE_TIMEOUT_MS` (default raised to 60 s).
3. **JSON output:** `response_format: {type: "json_object"}` is supported; Form2Fact additionally strips markdown fences and validates with Zod (defense in depth).
4. **Usage accounting:** every completion returns `usage.{prompt_tokens, completion_tokens, total_tokens}` — the service logs totals for quota observability (secrets never logged).

## 5. Intended Usage Classification

The resource is usable for **both** development assistance **and** application inference:
- **Development assistance:** OpenCode sessions (this workspace's default model is `bharatcode/qwen-3.8-27b`).
- **Application inference:** Form2Fact's `BharatCodeService` (evidence-grounded explanations) and the new Deep-Scrutiny advisory path, both fail-closed to deterministic behavior when the key is absent or the API is unavailable.

## 6. Error Handling & Retry Requirements (implemented)

| Condition | Service behavior |
|---|---|
| 401/403 | `status: auth_error` — surface configuration problem; no retry |
| 429 | `status: rate_limited` — deterministic finding preserved |
| 502/503 | `status: service_unavailable` |
| Timeout (AbortSignal) | `status: timeout` |
| Empty/`null` content | `status: validation_error` with explicit reason (reasoning-token exhaustion) |
| Malformed JSON / schema failure | `status: validation_error` — model output never accepted unvalidated |
| Any failure | **Deterministic finding is preserved**; no fabricated AI output, ever |

No blind automatic retry loop is used for auth/quota errors (would burn quota); transient 5xx/timeout are surfaced so the client may retry deliberately.

## 7. Data-Sharing & Privacy Posture

- **Minimum necessary:** only the single claim value + one evidence value + short source excerpts are transmitted, each truncated to ≤400 characters (`truncateExcerpt`).
- **Redaction:** Aadhaar, PAN, phone, email, and bank-account patterns are redacted before transmission (`redactPii`).
- **No full documents** are ever sent to the provider.
- **Grounding guards:** hallucinated citations are filtered; classifier-label override attempts are forced back to the authoritative label and flagged for human review.

## 8. Integration Decisions

| Decision | Rationale |
|---|---|
| Use `qwen-3.8-27b` for finding explanations | Live-verified, standard tier, reasoning + JSON mode |
| Use it (documented chain) for Deep-Scrutiny advisory memo when `GEMINI_API_KEY` is absent | Uses the *provided* resource for genuine advisory value; Gemini remains primary when its key exists; deterministic fallback remains last resort. This is a documented provider chain, not a silent model substitution |
| Do **not** call the LLM for classification, approval, or rejection | Core identity: hybrid pairwise classification + human review stays authoritative |
| Do **not** use `deepseek-v4.1-flash` in the product | `heavy` tier, unverified quota behavior; reserved for future large-context tasks |
| Key supplied via `.env` (gitignored) and `.env.example` placeholder only | No secrets in the repository |
