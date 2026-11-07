/**
 * Strict Production Configuration Validator
 * Validates that production deployments do not run with unsafe or contradictory configurations.
 */

export interface ProductionConfigOptions {
  nodeEnv?: string;
  jwtSecret?: string;
  allowFallback?: string;
  requireMl?: string;
  aiServiceUrl?: string;
  exitFn?: (code: number) => void;
}

export function validateProductionConfig(opts: ProductionConfigOptions = {}): { valid: boolean; errors: string[] } {
  const nodeEnv = opts.nodeEnv ?? process.env.NODE_ENV;
  if (nodeEnv !== 'production') {
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];
  const allowFallback = opts.allowFallback ?? process.env.ALLOW_DETERMINISTIC_FALLBACK;
  const requireMl = opts.requireMl ?? process.env.REQUIRE_ML_INFERENCE;
  const aiServiceUrl = opts.aiServiceUrl ?? (process.env.AI_SERVICE_URL || process.env.ML_SERVICE_URL);

  // 1. ALLOW_DETERMINISTIC_FALLBACK must NOT be enabled in strict production mode
  if (allowFallback === 'true') {
    errors.push("Contradictory configuration: ALLOW_DETERMINISTIC_FALLBACK cannot be 'true' in strict production mode. Set to 'false'.");
  }

  // 2. REQUIRE_ML_INFERENCE must be enabled in strict production mode
  if (requireMl !== 'true') {
    errors.push("Unsafe configuration: REQUIRE_ML_INFERENCE must be set to 'true' in strict production mode.");
  }

  // 3. AI_SERVICE_URL must be configured
  if (!aiServiceUrl || !aiServiceUrl.trim()) {
    errors.push("Missing configuration: AI_SERVICE_URL must be configured in strict production mode.");
  }

  if (errors.length > 0) {
    errors.forEach(err => console.error(`FATAL CONFIG ERROR: ${err}`));
    if (opts.exitFn) {
      opts.exitFn(1);
    }
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

