import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type RuleLifecycle =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "ACTIVE"
  | "SUPERSEDED"
  | "DISABLED";

export type SourceVerification = "VERIFIED" | "UNVERIFIED";

export type ReviewApproval = "APPROVED" | "PENDING" | "REJECTED";

export interface ConfiguredAicteRule {
  ruleId: string;
  title: string;
  requirement: string;
  appliesTo: string[];
  check: string;
  requiredDocumentType?: string;
  conditionalOn?: string;
  version: string;
  status: RuleLifecycle;
  sourceVerification: SourceVerification;
  reviewApproval: ReviewApproval;
  sourcePage: number;
  effectivePeriod: {
    handbookVersion: string;
    effectiveFrom: string | null;
    effectiveTo: string | null;
  };
  exceptions: string[];
}

export interface AicteRuleConfiguration {
  catalogId: string;
  catalogVersion: string;
  handbook: {
    name: string;
    version: string;
    officialUrl: string;
    verifiedOn: string;
  };
  lifecycleStates: RuleLifecycle[];
  activationPolicy: {
    requireVerifiedSource: boolean;
    requireReviewApproval: boolean;
    unverifiedRulesCanProduceMandatoryFindings: boolean;
    preserveHistoricalVersions: boolean;
  };
  rules: ConfiguredAicteRule[];
}

const CONFIG_PATH = fileURLToPath(
  new URL("./config/aicte-rules.json", import.meta.url)
);

export function validateRuleConfiguration(
  config: AicteRuleConfiguration
): void {
  if (!config.catalogId || !config.catalogVersion) {
    throw new Error("Missing catalog identification.");
  }

  if (!Array.isArray(config.rules)) {
    throw new Error("Rules must be an array.");
  }

  const ruleIds = new Set<string>();

  for (const rule of config.rules) {
    if (!rule.ruleId || !rule.title || !rule.requirement) {
      throw new Error("A rule is missing required information.");
    }

    if (ruleIds.has(rule.ruleId)) {
      throw new Error(`Duplicate rule ID: ${rule.ruleId}`);
    }

    ruleIds.add(rule.ruleId);
    if (
      !rule.effectivePeriod ||
      !rule.effectivePeriod.handbookVersion ||
      !Array.isArray(rule.exceptions)
    ) {
      throw new Error(`Invalid applicability metadata: ${rule.ruleId}`);
    }

    const { effectiveFrom, effectiveTo } = rule.effectivePeriod;

    if (
      (effectiveFrom && Number.isNaN(Date.parse(effectiveFrom))) ||
      (effectiveTo && Number.isNaN(Date.parse(effectiveTo)))
    ) {
      throw new Error(`Invalid effective date: ${rule.ruleId}`);
    }

    if (
      effectiveFrom &&
      effectiveTo &&
      Date.parse(effectiveFrom) > Date.parse(effectiveTo)
    ) {
      throw new Error(`Effective period is reversed: ${rule.ruleId}`);
    }

    if (!config.lifecycleStates.includes(rule.status)) {
      throw new Error(`Invalid lifecycle state: ${rule.ruleId}`);
    }

    if (
      rule.status === "ACTIVE" &&
      config.activationPolicy.requireVerifiedSource &&
      rule.sourceVerification !== "VERIFIED"
    ) {
      throw new Error(`Unverified rule cannot be activated: ${rule.ruleId}`);
    }

    if (
      rule.status === "ACTIVE" &&
      config.activationPolicy.requireReviewApproval &&
      rule.reviewApproval !== "APPROVED"
    ) {
      throw new Error(`Rule requires review approval: ${rule.ruleId}`);
    }
  }
}

export function loadAicteRuleConfiguration(): AicteRuleConfiguration {
  const content = readFileSync(CONFIG_PATH, "utf8");
  const config = JSON.parse(content) as AicteRuleConfiguration;

  validateRuleConfiguration(config);

  return config;
}

export function getEligibleAicteRules(
  config: AicteRuleConfiguration
): ConfiguredAicteRule[] {
  return config.rules.filter((rule) => {
    if (rule.status !== "ACTIVE") return false;

    if (
      config.activationPolicy.requireVerifiedSource &&
      rule.sourceVerification !== "VERIFIED"
    ) {
      return false;
    }

    if (
      config.activationPolicy.requireReviewApproval &&
      rule.reviewApproval !== "APPROVED"
    ) {
      return false;
    }

    return true;
  });
}
