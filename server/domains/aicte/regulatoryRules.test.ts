import assert from "node:assert/strict";
import {
  evaluateAicteLeaseCompliance,
  type AicteLeaseContext,
} from "./regulatoryRules";

const base: AicteLeaseContext = {
  leaseArrangement: "PRIVATE_LAND",
  applicableHandbookVersion: "APH-2024-2027",
  councilNotificationDate: "2026-04-01",
  leaseExpiryDate: "2056-04-01",
  lessorType: "INDIVIDUAL",
  isSubLease: false,
  mortgageRegistered: false,
  documents: [
    { documentType: "Land Lease Deed", verificationStatus: "VERIFIED" },
    { documentType: "Land Conversion Certificate", verificationStatus: "VERIFIED" },
    { documentType: "Lessor Title Document", verificationStatus: "VERIFIED" },
    { documentType: "Encumbrance Certificate", verificationStatus: "VERIFIED" },
  ],
};

const evaluate = (overrides: Partial<AicteLeaseContext> = {}) =>
  evaluateAicteLeaseCompliance({ ...base, ...overrides });

const result = evaluate();
assert.equal(result.find((x) => x.ruleId === "AICTE-APH-PL-001")?.classification, "MATCH");

const tooShort = evaluate({ leaseExpiryDate: "2055-12-31" });
assert.equal(tooShort.find((x) => x.ruleId === "AICTE-APH-PL-001")?.classification, "MISMATCH");

const missingDeed = evaluate({
  documents: base.documents.filter((x) => x.documentType !== "Land Lease Deed"),
});
assert.equal(missingDeed.find((x) => x.ruleId === "AICTE-APH-PL-002")?.classification, "MISSING");

const unverifiedDeed = evaluate({
  documents: base.documents.map((x) =>
    x.documentType === "Land Lease Deed"
      ? { ...x, verificationStatus: "UNVERIFIED" as const }
      : x,
  ),
});
assert.equal(unverifiedDeed.find((x) => x.ruleId === "AICTE-APH-PL-002")?.classification, "UNCERTAIN");

assert.equal(unverifiedDeed.find((x) => x.ruleId === "AICTE-APH-PL-001")?.classification, "UNCERTAIN");

const rejectedDeed = evaluate({
  documents: base.documents.map((x) =>
    x.documentType === "Land Lease Deed"
      ? { ...x, verificationStatus: "REJECTED" as const }
      : x,
  ),
});
assert.equal(rejectedDeed.find((x) => x.ruleId === "AICTE-APH-PL-001")?.classification, "MISMATCH");

const missingDeedForTenure = evaluate({
  documents: base.documents.filter((x) => x.documentType !== "Land Lease Deed"),
});
assert.equal(missingDeedForTenure.find((x) => x.ruleId === "AICTE-APH-PL-001")?.classification, "MISSING");

const unknownSubleaseRight = evaluate({
  isSubLease: true,
  subLeaseAssignmentRight: undefined,
});
assert.equal(unknownSubleaseRight.find((x) => x.ruleId === "AICTE-APH-PL-007")?.classification, "UNCERTAIN");


const freehold = evaluate({ leaseArrangement: "OWNED" });
assert.equal(freehold.find((x) => x.ruleId === "AICTE-APH-PL-001")?.classification, "NOT_COMPARABLE");

const noNotificationDate = evaluate({ councilNotificationDate: undefined });
assert.equal(noNotificationDate.find((x) => x.ruleId === "AICTE-APH-PL-001")?.classification, "UNCERTAIN");

const wrongVersion = evaluate({ applicableHandbookVersion: "UNKNOWN" });
assert.equal(wrongVersion.find((x) => x.ruleId === "AICTE-APH-PL-001")?.classification, "UNCERTAIN");

const buildingLease = evaluate({ leaseArrangement: "PRIVATE_BUILDING" });
assert.equal(buildingLease.find((x) => x.ruleId === "AICTE-APH-PL-001")?.classification, "NOT_COMPARABLE");
assert.equal(buildingLease.find((x) => x.ruleId === "AICTE-APH-PB-004")?.classification, "MISSING");

console.log("AICTE regulatory rules tests passed.");
