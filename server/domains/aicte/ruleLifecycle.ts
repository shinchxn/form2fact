import {
  appendFileSync,
  readFileSync,
  renameSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  loadAicteRuleConfiguration,
  validateRuleConfiguration,
  type RuleLifecycle,
  type AicteRuleConfiguration,
} from "./ruleConfiguration";

const CONFIG_PATH = fileURLToPath(
  new URL("./config/aicte-rules.json", import.meta.url)
);

const HISTORY_PATH = fileURLToPath(
  new URL("./config/rule-history.jsonl", import.meta.url)
);

const SNAPSHOT_DIR = fileURLToPath(
  new URL("./config/history/", import.meta.url)
);

export interface RuleLifecycleEvent {
  ruleId: string;
  ruleVersion: string;
  previousStatus: RuleLifecycle;
  newStatus: RuleLifecycle;
  changedAt: string;
}

const ALLOWED_TRANSITIONS: Record<RuleLifecycle, RuleLifecycle[]> = {
  DRAFT: ["UNDER_REVIEW", "DISABLED"],
  UNDER_REVIEW: ["ACTIVE", "DRAFT", "DISABLED"],
  ACTIVE: ["SUPERSEDED", "DISABLED"],
  SUPERSEDED: [],
  DISABLED: [],
};

export function saveRuleSnapshot(
  config: AicteRuleConfiguration
): string {
  mkdirSync(SNAPSHOT_DIR, { recursive: true });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const filename = `aicte-rules-${timestamp}.json`;
  const snapshotPath = path.join(SNAPSHOT_DIR, filename);

  writeFileSync(
    snapshotPath,
    JSON.stringify(config, null, 2) + "\n",
    { flag: "wx" }
  );

  return snapshotPath;
}

export function transitionAicteRule(
  ruleId: string,
  newStatus: RuleLifecycle
): RuleLifecycleEvent {
  const config = loadAicteRuleConfiguration();

  const rule = config.rules.find((item) => item.ruleId === ruleId);

  if (!rule) {
    throw new Error(`Rule not found: ${ruleId}`);
  }

  const previousStatus = rule.status;

  if (!ALLOWED_TRANSITIONS[previousStatus].includes(newStatus)) {
    throw new Error(
      `Invalid transition for ${ruleId}: ${previousStatus} to ${newStatus}`
    );
  }

  if (
    newStatus === "ACTIVE" &&
    config.activationPolicy.requireVerifiedSource &&
    rule.sourceVerification !== "VERIFIED"
  ) {
    throw new Error("Cannot activate a rule with an unverified source.");
  }

  if (
    newStatus === "ACTIVE" &&
    config.activationPolicy.requireReviewApproval &&
    rule.reviewApproval !== "APPROVED"
  ) {
    throw new Error("Cannot activate a rule without review approval.");
  }

  const event: RuleLifecycleEvent = {
    ruleId,
    ruleVersion: rule.version,
    previousStatus,
    newStatus,
    changedAt: new Date().toISOString(),
  };

  // Preserve the complete previous configuration first.
  saveRuleSnapshot(config);

  rule.status = newStatus;

  validateRuleConfiguration(config);

  const temporaryPath = `${CONFIG_PATH}.tmp`;

  writeFileSync(temporaryPath, JSON.stringify(config, null, 2) + "\n");
  renameSync(temporaryPath, CONFIG_PATH);

  mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  appendFileSync(HISTORY_PATH, JSON.stringify(event) + "\n");

  return event;
}

export function getAicteRuleHistory(): RuleLifecycleEvent[] {
  try {
    const content = readFileSync(HISTORY_PATH, "utf8").trim();

    if (!content) return [];

    return content.split("\n").map((line) => JSON.parse(line));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}

export function loadHistoricalRuleSnapshot(
  filename: string
) {
  if (
    filename.includes("/") ||
    filename.includes("\\") ||
    !filename.endsWith(".json") ||
    !filename.startsWith("aicte-rules-")
  ) {
    throw new Error("Invalid snapshot filename.");
  }

  const snapshotPath = path.join(SNAPSHOT_DIR, filename);

  const content = readFileSync(snapshotPath, "utf8");
  const snapshot = JSON.parse(content);

  validateRuleConfiguration(snapshot);

  return snapshot;
}
