/**
 * Form2Fact — AICTE regulatory rules (APH 2024–2027).
 *
 * Rules in this module are deterministic, source-linked and applicability-scoped.
 * The source is AICTE's Approval Process Handbook 2024–2027, p. 78.
 *
 * IMPORTANT:
 * - The 30-year requirement is scoped to PRIVATE LEASE OF LAND.
 * - The tenure is measured from the Council notification date, not the current
 *   application year.
 * - Private lease of a BUILDING has a separate documentary checklist and does
 *   not inherit the private-land 30-year test from this page.
 * - A missing applicability input must never be interpreted as a mismatch.
 */

export type RegulatoryClassification =
  | "MATCH"
  | "MISMATCH"
  | "MISSING"
  | "UNCERTAIN"
  | "NOT_COMPARABLE";

export type LeaseArrangement =
  | "PRIVATE_LAND"
  | "PRIVATE_BUILDING"
  | "OWNED"
  | "OTHER"
  | "PUBLIC_AUTHORITY_LAND_LEASE"
  | "UNKNOWN";

export type HandbookVersion = "APH-2024-2027";

export interface AicteEvidenceReference {
  documentId?: string;
  documentName: string;
  pageNumber?: number;
  fieldName?: string;
  excerpt?: string;
  rawValue?: string;
}

export interface AicteDocumentEvidence {
  documentType: string;
  verificationStatus: "VERIFIED" | "UNVERIFIED" | "REJECTED";
  evidence?: AicteEvidenceReference;
}

export interface AicteLeaseContext {
  leaseArrangement: LeaseArrangement;
  applicableHandbookVersion?: string;
  councilNotificationDate?: string;
  leaseExpiryDate?: string;
  lessorType?: "INDIVIDUAL" | "TRUST" | "SOCIETY" | "COMPANY" | "OTHER";
  isSubLease?: boolean;
  subLeaseAssignmentRight?: boolean;
  mortgageRegistered?: boolean;
  leaseExpiryAmbiguous?: boolean;
  documents: AicteDocumentEvidence[];
}

export interface AicteRuleSource {
  sourceId: string;
  title: string;
  version: HandbookVersion;
  officialUrl: string;
  page: number;
  verifiedOn: string;
}

export interface AicteRegulatoryRule {
  ruleId: string;
  title: string;
  requirement: string;
  appliesTo: LeaseArrangement[];
  source: AicteRuleSource;
  check:
    | "MINIMUM_TENURE_FROM_NOTIFICATION"
    | "REQUIRED_DOCUMENT"
    | "NO_MORTGAGE"
    | "SUBLEASE_ASSIGNMENT_RIGHT";
  requiredDocumentType?: string;
  conditionalOn?: "LESSOR_IS_ENTITY" | "IS_SUBLEASE";
  enabled: boolean;
}

export interface AicteRegulatoryFinding {
  ruleId: string;
  classification: RegulatoryClassification;
  title: string;
  explanation: string;
  actualValue?: string;
  expectedValue?: string;
  evidence?: AicteEvidenceReference;
  source: AicteRuleSource;
  applicability: string;
}

const APH_SOURCE: AicteRuleSource = {
  sourceId: "AICTE-APH-2024-2027-P78",
  title: "AICTE Approval Process Handbook 2024–2027",
  version: "APH-2024-2027",
  officialUrl:
    "https://aicte-qa.aicte-india.org/sites/default/files/APH%20Final.pdf",
  page: 78,
  // Update this field during each scheduled source review.
  verifiedOn: "2026-11-06",
};

const rule = (
  ruleId: string,
  title: string,
  requirement: string,
  appliesTo: LeaseArrangement[],
  check: AicteRegulatoryRule["check"],
  extra: Partial<AicteRegulatoryRule> = {},
): AicteRegulatoryRule => ({
  ruleId,
  title,
  requirement,
  appliesTo,
  source: APH_SOURCE,
  check,
  enabled: true,
  ...extra,
});

/**
 * Catalog entries below are limited to the requirements stated on APH p. 78.
 * They are not a complete representation of every AICTE requirement.
 */
export const AICTE_REGULATORY_RULES: readonly AicteRegulatoryRule[] = [
  rule(
    "AICTE-APH-PL-001",
    "Private land lease validity",
    "The registered private land lease must have at least 30 years of validity as of the date of the Council notification.",
    ["PRIVATE_LAND"],
    "MINIMUM_TENURE_FROM_NOTIFICATION",
  ),
  rule(
    "AICTE-APH-PL-002",
    "Registered private land lease deed",
    "A private land lease deed registered with the competent authority under the Registration Act must be produced.",
    ["PRIVATE_LAND"],
    "REQUIRED_DOCUMENT",
    { requiredDocumentType: "Land Lease Deed" },
  ),
  rule(
    "AICTE-APH-PL-003",
    "Land conversion certificate",
    "A land conversion certificate issued by the competent authority must be produced.",
    ["PRIVATE_LAND"],
    "REQUIRED_DOCUMENT",
    { requiredDocumentType: "Land Conversion Certificate" },
  ),
  rule(
    "AICTE-APH-PL-004",
    "Lessor title documents",
    "Title documents of the lessor evidencing acquisition of leasehold rights through a lawful transaction must be produced.",
    ["PRIVATE_LAND"],
    "REQUIRED_DOCUMENT",
    { requiredDocumentType: "Lessor Title Document" },
  ),
  rule(
    "AICTE-APH-PL-005",
    "Encumbrance certificate",
    "An encumbrance certificate relating to the property must be produced.",
    ["PRIVATE_LAND"],
    "REQUIRED_DOCUMENT",
    { requiredDocumentType: "Encumbrance Certificate" },
  ),
  rule(
    "AICTE-APH-PL-006",
    "Lessor entity resolution",
    "A resolution of the Trust, Society or Company must be produced when the lessor is one of those entities.",
    ["PRIVATE_LAND"],
    "REQUIRED_DOCUMENT",
    {
      requiredDocumentType: "Lessor Resolution",
      conditionalOn: "LESSOR_IS_ENTITY",
    },
  ),
  rule(
    "AICTE-APH-PL-007",
    "Sublease assignment right",
    "For a sublease, the lessor must have the right to assign the leasehold right, evidenced by a registered document.",
    ["PRIVATE_LAND"],
    "SUBLEASE_ASSIGNMENT_RIGHT",
    { conditionalOn: "IS_SUBLEASE" },
  ),
  rule(
    "AICTE-APH-PL-008",
    "Mortgage restriction",
    "Mortgage of land is not permissible under the cited private-land lease checklist.",
    ["PRIVATE_LAND"],
    "NO_MORTGAGE",
  ),
  rule(
    "AICTE-APH-PB-001",
    "Approved building plan",
    "The complete building plan approved by the competent authority must be produced for a private lease of a building.",
    ["PRIVATE_BUILDING"],
    "REQUIRED_DOCUMENT",
    { requiredDocumentType: "Approved Building Plan" },
  ),
  rule(
    "AICTE-APH-PB-002",
    "Occupancy or completion certificate",
    "An occupancy or completion certificate relating to the property or leased floors must be produced.",
    ["PRIVATE_BUILDING"],
    "REQUIRED_DOCUMENT",
    { requiredDocumentType: "Occupancy / Completion Certificate" },
  ),
  rule(
    "AICTE-APH-PB-003",
    "Registered private building lease deed",
    "The lease deed must be registered by the competent authority under the Registration Act.",
    ["PRIVATE_BUILDING"],
    "REQUIRED_DOCUMENT",
    { requiredDocumentType: "Building Lease Deed" },
  ),
  rule(
    "AICTE-APH-PB-004",
    "Valid fire safety certificate",
    "A valid Fire Safety Certificate issued by the competent authority must be produced.",
    ["PRIVATE_BUILDING"],
    "REQUIRED_DOCUMENT",
    { requiredDocumentType: "Fire Safety Certificate" },
  ),
  rule(
    "AICTE-APH-PB-005",
    "Educational land-use certificate",
    "A Land Use Certificate permitting educational use must be produced.",
    ["PRIVATE_BUILDING"],
    "REQUIRED_DOCUMENT",
    { requiredDocumentType: "Land Use Certificate" },
  ),
  rule(
    "AICTE-APH-PB-006",
    "Architect-certified floor plans",
    "Floor plans, sections and elevations for the relevant buildings must be provided with room-wise carpet area and architect certification.",
    ["PRIVATE_BUILDING"],
    "REQUIRED_DOCUMENT",
    { requiredDocumentType: "Architect Certified Floor Plans" },
  ),
] as const;

const ENTITY_LESSORS = new Set(["TRUST", "SOCIETY", "COMPANY"]);

function isIsoDate(value?: string): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function addUtcYears(dateIso: string, years: number): string {
  const [year, month, day] = dateIso.split("-").map(Number);
  const targetYear = year + years;
  const lastDay = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDay);
  return `${targetYear}-${String(month).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
}

function isConditionApplicable(
  ruleDef: AicteRegulatoryRule,
  context: AicteLeaseContext,
): boolean | "UNKNOWN" {
  if (!ruleDef.conditionalOn) return true;
  if (ruleDef.conditionalOn === "LESSOR_IS_ENTITY") {
    if (!context.lessorType) return "UNKNOWN";
    return ENTITY_LESSORS.has(context.lessorType);
  }
  if (ruleDef.conditionalOn === "IS_SUBLEASE") {
    if (context.isSubLease === undefined) return "UNKNOWN";
    return context.isSubLease;
  }
  return false;
}

function findDocument(
  context: AicteLeaseContext,
  requiredType: string,
): AicteDocumentEvidence | undefined {
  return context.documents.find(
    (doc) => doc.documentType.toLowerCase() === requiredType.toLowerCase(),
  );
}

function baseFinding(
  ruleDef: AicteRegulatoryRule,
  classification: RegulatoryClassification,
  explanation: string,
  applicability: string,
  extra: Partial<AicteRegulatoryFinding> = {},
): AicteRegulatoryFinding {
  return {
    ruleId: ruleDef.ruleId,
    classification,
    title: ruleDef.title,
    explanation,
    source: ruleDef.source,
    applicability,
    ...extra,
  };
}

function evaluateRule(
  ruleDef: AicteRegulatoryRule,
  context: AicteLeaseContext,
): AicteRegulatoryFinding {
  const applicability = ruleDef.appliesTo.join(" | ");

  if (!ruleDef.enabled) {
    return baseFinding(
      ruleDef,
      "NOT_COMPARABLE",
      "Rule is disabled and cannot produce a compliance conclusion.",
      applicability,
    );
  }

  if (context.leaseArrangement === "UNKNOWN") {
    return baseFinding(
      ruleDef,
      "UNCERTAIN",
      "Lease arrangement is not identified; applicability cannot be determined.",
      applicability,
    );
  }

  if (context.leaseArrangement === "PUBLIC_AUTHORITY_LAND_LEASE") {
    return baseFinding(
      ruleDef,
      "UNCERTAIN",
      "The land is leased from a public authority. The applicability of this private-land checklist to this arrangement requires manual AICTE regulatory review.",
      applicability,
    );
  }

  if (!ruleDef.appliesTo.includes(context.leaseArrangement)) {
    return baseFinding(
      ruleDef,
      "NOT_COMPARABLE",
      `Rule does not apply to lease arrangement ${context.leaseArrangement}.`,
      applicability,
    );
  }

  if (context.applicableHandbookVersion !== ruleDef.source.version) {
    return baseFinding(
      ruleDef,
      "UNCERTAIN",
      `Applicable handbook version is missing or differs from ${ruleDef.source.version}; obtain applicability confirmation before deciding.`,
      applicability,
    );
  }

  const condition = isConditionApplicable(ruleDef, context);
  if (condition === false) {
    return baseFinding(
      ruleDef,
      "NOT_COMPARABLE",
      "The rule's conditional applicability trigger is not met.",
      applicability,
    );
  }
  if (condition === "UNKNOWN") {
    return baseFinding(
      ruleDef,
      "UNCERTAIN",
      "A condition needed to determine whether this rule applies is missing.",
      applicability,
    );
  }

  if (ruleDef.check === "MINIMUM_TENURE_FROM_NOTIFICATION") {
    const leaseDeed = findDocument(context, "Land Lease Deed");

    if (!leaseDeed) {
      return baseFinding(
        ruleDef,
        "MISSING",
        "The registered Land Lease Deed is required before lease tenure can be evaluated.",
        applicability,
      );
    }

    if (leaseDeed.verificationStatus === "UNVERIFIED") {
      return baseFinding(
        ruleDef,
        "UNCERTAIN",
        "The Land Lease Deed has not been verified. Lease tenure cannot yet be evaluated.",
        applicability,
        { evidence: leaseDeed.evidence },
      );
    }

    if (leaseDeed.verificationStatus === "REJECTED") {
      return baseFinding(
        ruleDef,
        "MISMATCH",
        "The Land Lease Deed was rejected. Lease tenure cannot be accepted.",
        applicability,
        { evidence: leaseDeed.evidence },
      );
    }

    if (!isIsoDate(context.councilNotificationDate)) {
      return baseFinding(
        ruleDef,
        "UNCERTAIN",
        "A valid Council notification date is required; the application year is not a substitute.",
        applicability,
        { evidence: leaseDeed.evidence },
      );
    }

    if (context.leaseExpiryAmbiguous) {
      return baseFinding(
        ruleDef,
        "UNCERTAIN",
        "Conflicting expiry dates were found in the verified Land Lease Deed. Manual review is required.",
        applicability,
        { evidence: leaseDeed.evidence },
      );
    }

    if (!isIsoDate(context.leaseExpiryDate)) {
      return baseFinding(
        ruleDef,
        "MISSING",
        "The lease expiry date could not be established from the verified Land Lease Deed.",
        applicability,
        { evidence: leaseDeed.evidence },
      );
    }

    const requiredExpiry = addUtcYears(context.councilNotificationDate!, 30);
    const match = context.leaseExpiryDate! >= requiredExpiry;

    return baseFinding(
      ruleDef,
      match ? "MATCH" : "MISMATCH",
      match
        ? `Lease expiry ${context.leaseExpiryDate} meets the 30-year validity period measured from Council notification date ${context.councilNotificationDate}.`
        : `Lease expiry ${context.leaseExpiryDate} is earlier than the required date ${requiredExpiry}, calculated as 30 years from Council notification date ${context.councilNotificationDate}.`,
      applicability,
      {
        actualValue: context.leaseExpiryDate,
        expectedValue: `On or after ${requiredExpiry}`,
        evidence: leaseDeed.evidence || {
          documentName: "Registered Land Lease Deed",
          fieldName: "leaseExpiryDate",
          rawValue: context.leaseExpiryDate,
        },
      },
    );
  }

  if (ruleDef.check === "NO_MORTGAGE") {
    if (context.mortgageRegistered === undefined) {
      return baseFinding(
        ruleDef,
        "UNCERTAIN",
        "Mortgage status has not been established from verified land records.",
        applicability,
      );
    }
    return baseFinding(
      ruleDef,
      context.mortgageRegistered ? "MISMATCH" : "MATCH",
      context.mortgageRegistered
        ? "A mortgage is recorded; the cited handbook checklist states that mortgage of land is not permissible."
        : "No mortgage is recorded in the supplied verified evidence.",
      applicability,
    );
  }

  if (ruleDef.check === "SUBLEASE_ASSIGNMENT_RIGHT") {
    if (context.subLeaseAssignmentRight === undefined) {
      return baseFinding(
        ruleDef,
        "UNCERTAIN",
        "It is not yet known whether the lessor has the right to assign the leasehold right. Verify the registered evidence.",
        applicability,
      );
    }
    return baseFinding(
      ruleDef,
      context.subLeaseAssignmentRight ? "MATCH" : "MISMATCH",
      context.subLeaseAssignmentRight
        ? "The supplied registered document evidences the lessor's assignment right."
        : "The supplied evidence does not establish the lessor's right to assign the leasehold right.",
      applicability,
    );
  }

  const doc = findDocument(context, ruleDef.requiredDocumentType || "");
  if (!doc) {
    return baseFinding(
      ruleDef,
      "MISSING",
      `Required document '${ruleDef.requiredDocumentType}' was not supplied.`,
      applicability,
    );
  }
  if (doc.verificationStatus === "UNVERIFIED") {
    return baseFinding(
      ruleDef,
      "UNCERTAIN",
      `Document '${doc.documentType}' is present but has not been verified.`,
      applicability,
      { evidence: doc.evidence },
    );
  }
  if (doc.verificationStatus === "REJECTED") {
    return baseFinding(
      ruleDef,
      "MISMATCH",
      `Document '${doc.documentType}' was reviewed and rejected.`,
      applicability,
      { evidence: doc.evidence },
    );
  }
  return baseFinding(
    ruleDef,
    "MATCH",
    `Verified document '${doc.documentType}' satisfies the document-presence check.`,
    applicability,
    { evidence: doc.evidence },
  );
}

/**
 * Evaluate only the APH 2024–2027 private-lease requirements represented above.
 * Results always retain rule id, source version, page and evidence reference.
 */
export function evaluateAicteLeaseCompliance(
  context: AicteLeaseContext,
): AicteRegulatoryFinding[] {
  return AICTE_REGULATORY_RULES.map((ruleDef) => evaluateRule(ruleDef, context));
}
