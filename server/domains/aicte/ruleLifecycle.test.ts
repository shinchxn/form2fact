import assert from "node:assert/strict";
import {
  transitionAicteRule,
  getAicteRuleHistory,
} from "./ruleLifecycle";
import { loadAicteRuleConfiguration } from "./ruleConfiguration";
import { readdirSync } from "node:fs";
import {
  saveRuleSnapshot,
  loadHistoricalRuleSnapshot,
} from "./ruleLifecycle";

const config = loadAicteRuleConfiguration();
const ruleId = "AICTE-APH-PL-001";

// Test 1: Current rules remain under review
assert.equal(
  config.rules.find((r) => r.ruleId === ruleId)?.status,
  "UNDER_REVIEW"
);
console.log("PASS: Existing rule remains under review");

// Test 2: Activation without approval is rejected
assert.throws(
  () => transitionAicteRule(ruleId, "ACTIVE"),
  /review approval/
);
console.log("PASS: Unapproved activation rejected");

// Test 3: Invalid transition is rejected
assert.throws(
  () => transitionAicteRule(ruleId, "SUPERSEDED"),
  /Invalid transition/
);
console.log("PASS: Invalid lifecycle transition rejected");

// Test 4: Unknown rule is rejected
assert.throws(
  () => transitionAicteRule("UNKNOWN-RULE", "DISABLED"),
  /Rule not found/
);
console.log("PASS: Unknown rule rejected");

// Test 5: History reader works
assert.deepEqual(getAicteRuleHistory(), []);
console.log("PASS: Empty lifecycle history handled");

// Test 6: All rules remain under review
const finalConfig = loadAicteRuleConfiguration();

assert.equal(
  finalConfig.rules.filter((r) => r.status === "UNDER_REVIEW").length,
  14
);

console.log("PASS: All 14 rules remain under review");
console.log("\nAll lifecycle tests passed.");
// Test 7: Save a historical snapshot
const snapshotPath = saveRuleSnapshot(finalConfig);

assert.ok(snapshotPath.endsWith(".json"));
console.log("PASS: Historical snapshot saved");

// Test 8: Retrieve historical snapshot
const snapshotFiles = readdirSync(
  "server/domains/aicte/config/history"
).filter((file) => file.endsWith(".json"));

const latestSnapshot = snapshotFiles[snapshotFiles.length - 1];
const historicalConfig = loadHistoricalRuleSnapshot(latestSnapshot);

assert.equal(historicalConfig.rules.length, 14);
assert.deepEqual(historicalConfig.rules, finalConfig.rules);
console.log("PASS: Historical snapshot retrieved");

// Test 9: Reject invalid snapshot filename
assert.throws(
  () => loadHistoricalRuleSnapshot("../aicte-rules.json"),
  /Invalid snapshot filename/
);
console.log("PASS: Invalid snapshot filename rejected");

// Test 10: Current configuration remains unchanged
const unchangedConfig = loadAicteRuleConfiguration();

assert.equal(unchangedConfig.rules.length, 14);
assert.ok(
  unchangedConfig.rules.every((rule) => rule.status === "UNDER_REVIEW")
);
console.log("PASS: Current configuration remains unchanged");

console.log("\nAll lifecycle and snapshot tests passed.");
