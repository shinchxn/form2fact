import assert from "node:assert/strict";
import type {
  Application,
  DocumentRecord,
  ExtractedField,
} from "../../../src/types/index.ts";
import { buildAicteLeasePreview } from "./adapter.ts";

function makeApplication(
  leaseArrangement: Application["declaredDetails"]["leaseArrangement"] = "PRIVATE_LAND",
): Application {
  return {
    id: "test-app",
    referenceNumber: "TEST-001",
    institutionName: "Test Institute",
    applicationType: "New Technical Campus",
    organizationId: "test-org",
    status: "Ready for Review",
    reviewStatus: "Pending Review",
    declaredDetails: {
      institutionName: "Test Institute",
      societyOrTrustName: "Test Trust",
      address: "Test Address",
      pinCode: "000000",
      state: "Test State",
      landAreaAcres: 2,
      leaseExpiryDate: "2056-04-01",
      sanctionedIntake: 100,
      previousApprovalRef: "",
      applicationYear: "2026",
      leaseArrangement,
      applicableHandbookVersion: "APH-2024-2027",
      councilNotificationDate: "2026-04-01",
      lessorType: "INDIVIDUAL",
      isSubLease: false,
    },
    documentCount: 0,
    openFindingsCount: 0,
    totalFindingsCount: 0,
    createdBy: "test-user",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeDocument(
  documentType: DocumentRecord["documentType"],
  verificationStatus: DocumentRecord["verificationStatus"] = "VERIFIED",
): DocumentRecord {
  return {
    id: `doc-${documentType}`,
    applicationId: "test-app",
    originalFilename: `${documentType}.pdf`,
    documentType,
    storageKey: "test-storage-key",
    mimeType: "application/pdf",
    sizeBytes: 100,
    checksum: "test-checksum",
    pageCount: 1,
    processingStatus: "Extracted",
    verificationStatus,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeExpiryField(
  value: string,
  corrected = false,
): ExtractedField {
  return {
    id: `field-${value}`,
    documentId: "doc-Land Lease Deed",
    applicationId: "test-app",
    fieldName: "leaseExpiryDate",
    fieldLabel: "Lease Expiry Date",
    rawValue: "2050-01-01",
    normalizedValue: value,
    pageNumber: 1,
    sourceText: value,
    confidence: 0.95,
    extractionMethod: corrected ? "Manual Correction" : "Document Parser",
    isCorrected: corrected,
    correctedValue: corrected ? value : undefined,
  };
}

function classification(
  preview: ReturnType<typeof buildAicteLeasePreview>,
  ruleId: string,
) {
  return preview.findings.find((finding) => finding.ruleId === ruleId)?.classification;
}

const deed = makeDocument("Land Lease Deed");
const supportingDocs = [
  deed,
  makeDocument("Land Conversion Certificate"),
  makeDocument("Lessor Title Document"),
  makeDocument("Encumbrance Certificate"),
];
const validExpiry = [makeExpiryField("2056-04-01")];

const valid = buildAicteLeasePreview(
  makeApplication(),
  supportingDocs,
  validExpiry,
);
assert.equal(valid.mode, "PREVIEW_ONLY");
assert.equal(classification(valid, "AICTE-APH-PL-001"), "MATCH");

const shortLease = buildAicteLeasePreview(
  makeApplication(),
  supportingDocs,
  [makeExpiryField("2055-12-31")],
);
assert.equal(classification(shortLease, "AICTE-APH-PL-001"), "MISMATCH");

const buildingLease = buildAicteLeasePreview(
  makeApplication("PRIVATE_BUILDING"),
  [makeDocument("Building Lease Deed")],
  [],
);
assert.equal(classification(buildingLease, "AICTE-APH-PL-001"), "NOT_COMPARABLE");
assert.equal(classification(buildingLease, "AICTE-APH-PB-004"), "MISSING");

const freehold = buildAicteLeasePreview(
  makeApplication("OWNED"),
  [makeDocument("Land Ownership Title Deed")],
  [],
);
assert.equal(classification(freehold, "AICTE-APH-PL-001"), "NOT_COMPARABLE");

const missingDeed = buildAicteLeasePreview(
  makeApplication(),
  supportingDocs.filter((doc) => doc.documentType !== "Land Lease Deed"),
  [],
);
assert.equal(classification(missingDeed, "AICTE-APH-PL-001"), "MISSING");

const unverifiedDeed = buildAicteLeasePreview(
  makeApplication(),
  [makeDocument("Land Lease Deed", "PENDING_REVIEW")],
  validExpiry,
);
assert.equal(classification(unverifiedDeed, "AICTE-APH-PL-001"), "UNCERTAIN");

const conflictingDates = buildAicteLeasePreview(
  makeApplication(),
  supportingDocs,
  [
    makeExpiryField("2056-04-01"),
    makeExpiryField("2057-04-01"),
  ],
);
assert.equal(classification(conflictingDates, "AICTE-APH-PL-001"), "UNCERTAIN");

const invalidDate = buildAicteLeasePreview(
  makeApplication(),
  supportingDocs,
  [makeExpiryField("2056-02-30")],
);
assert.equal(classification(invalidDate, "AICTE-APH-PL-001"), "MISSING");

const correctedDate = buildAicteLeasePreview(
  makeApplication(),
  supportingDocs,
  [makeExpiryField("2056-04-01", true)],
);
assert.equal(classification(correctedDate, "AICTE-APH-PL-001"), "MATCH");


// Public-authority lease regression: all findings require manual review.
const publicAuthorityLease = buildAicteLeasePreview(
  makeApplication("PUBLIC_AUTHORITY_LAND_LEASE"),
  supportingDocs,
  validExpiry,
);
assert.equal(publicAuthorityLease.mode, "PREVIEW_ONLY");
assert.equal(publicAuthorityLease.findings.length, 14);
assert.ok(publicAuthorityLease.findings.every(
  (finding) => finding.classification === "UNCERTAIN",
));
assert.ok(publicAuthorityLease.findings.every(
  (finding) => finding.explanation.toLowerCase().includes("public authority"),
));

// Private land: private-building rules must not apply.
assert.equal(valid.findings.length, 14);
assert.ok(valid.findings
  .filter((finding) => finding.ruleId.startsWith("AICTE-APH-PB-"))
  .every((finding) => finding.classification === "NOT_COMPARABLE"));

// Private building: all private-land rules must not apply.
assert.equal(buildingLease.findings.length, 14);
assert.ok(buildingLease.findings
  .filter((finding) => finding.ruleId.startsWith("AICTE-APH-PL-"))
  .every((finding) => finding.classification === "NOT_COMPARABLE"));

// Freehold: private-land tenure rule must not apply.
assert.equal(freehold.findings.length, 14);
assert.ok(freehold.findings
  .filter((finding) => finding.ruleId.startsWith("AICTE-APH-PL-"))
  .every((finding) => finding.classification === "NOT_COMPARABLE"));

// Unknown arrangement: applicability of every rule remains uncertain.
const unknownLease = buildAicteLeasePreview(
  makeApplication("UNKNOWN"),
  supportingDocs,
  validExpiry,
);
assert.equal(unknownLease.findings.length, 14);
assert.ok(unknownLease.findings.every(
  (finding) => finding.classification === "UNCERTAIN",
));

console.log("AICTE adapter tests passed.");
