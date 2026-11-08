// One-shot local config append (never committed; .env* is gitignored)
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
const lines = [
  '',
  '# -------------------------------------------------------------------------',
  '# 8. BHARATCODE MODEL API (evidence-grounded explanations & deep scrutiny)',
  '# -------------------------------------------------------------------------',
  '# Base URL of the OpenAI-compatible model gateway (verified 2026-11-08)',
  'BHARATCODE_API_URL=https://bharatcode.ai/api/model/v1',
  '# Active model (standard tier; verified live via GET /v1/models)',
  'BHARATCODE_MODEL=qwen-3.8-27b',
  '# Outbound request timeout in milliseconds (reasoning model needs headroom)',
  'BHARATCODE_TIMEOUT_MS=60000',
  '# API key (kept in local .env only; .env* is gitignored - never commit)'
];
const key = process.env.BHARATCODE_API_KEY || '';
if (!key) {
  console.error('BHARATCODE_API_KEY not present in environment; refusing to write placeholder');
  process.exit(1);
}
lines.push(`BHARATCODE_API_KEY=${key}`);
let current = fs.readFileSync(envPath, 'utf8');
if (current.includes('BHARATCODE_API_KEY=')) {
  console.log('BHARATCODE keys already present; no change.');
  process.exit(0);
}
fs.appendFileSync(envPath, lines.join('\n') + '\n');
console.log('Appended BHARATCODE_* configuration to local .env (key value not printed).');
