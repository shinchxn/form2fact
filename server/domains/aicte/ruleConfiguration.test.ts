import assert from "node:assert/strict";
import {
  loadAicteRuleConfiguration,
  getEligibleAicteRules,
  validateRuleConfiguration,
} from "./ruleConfiguration";

const config = loadAicteRuleConfiguration();

// Test 1: Load all 14 rules
assert.equal(config.rules.length, 14);
console.log("PASS: All 14 rules loaded");

// Test 2: Under-review rules cannot become active
assert.equal(getEligibleAicteRules(config).length, 0);
console.log("PASS: Under-review rules are not activated");

// Test 3: Unverified rules cannot be activated
const unverifiedConfig = structuredClone(config);
unverifiedConfig.rules[0].status = "ACTIVE";
unverifiedConfig.rules[0].sourceVerification = "UNVERIFIED";
unverifiedConfig.rules[0].reviewApproval = "APPROVED";

assert.throws(
  () => validateRuleConfiguration(unverifiedConfig),
  /Unverified rule cannot be activated/
);
console.log("PASS: Unverified rules are rejected");

// Test 4: Pending review cannot be activated
const pendingConfig = structuredClone(config);
pendingConfig.rules[0].status = "ACTIVE";
pendingConfig.rules[0].sourceVerification = "VERIFIED";
pendingConfig.rules[0].reviewApproval = "PENDING";

assert.throws(
  () => validateRuleConfiguration(pendingConfig),
  /Rule requires review approval/
);
console.log("PASS: Rules without approval are rejected");

// Test 5: Duplicate rule IDs are rejected
const duplicateConfig = structuredClone(config);
duplicateConfig.rules[1].ruleId = duplicateConfig.rules[0].ruleId;

assert.throws(
  () => validateRuleConfiguration(duplicateConfig),
  /Duplicate rule ID/
);
console.log("PASS: Duplicate rule IDs are rejected");

// Test 6: Approved and verified rules can become eligible
const approvedConfig = structuredClone(config);
approvedConfig.rules[0].status = "ACTIVE";
approvedConfig.rules[0].sourceVerification = "VERIFIED";
approvedConfig.rules[0].reviewApproval = "APPROVED";

validateRuleConfiguration(approvedConfig);

assert.equal(getEligibleAicteRules(approvedConfig).length, 1);
console.log("PASS: Approved and verified rules become eligible");

console.log("\nAll AICTE configuration tests passed.");

// Test 7: Effective-period metadata exists
assert.ok(
  config.rules.every(
    (rule) =>
      rule.effectivePeriod.handbookVersion === "APH-2024-2027"
  )
);
console.log("PASS: Effective handbook version exists");

// Test 8: Unverified calendar dates remain unspecified
assert.ok(
  config.rules.every(
    (rule) =>
      rule.effectivePeriod.effectiveFrom === null &&
      rule.effectivePeriod.effectiveTo === null
  )
);
console.log("PASS: Unverified calendar dates remain unspecified");

// Test 9: Exceptions are explicitly represented
assert.ok(
  config.rules.every((rule) => Array.isArray(rule.exceptions))
);
console.log("PASS: Exception metadata exists");

// Test 10: Invalid effective period is rejected
const invalidConfig = structuredClone(config);
invalidConfig.rules[0].effectivePeriod.effectiveFrom = "invalid-date";

assert.throws(
  () => validateRuleConfiguration(invalidConfig),
  /Invalid effective date/
);
console.log("PASS: Invalid effective dates are rejected");

