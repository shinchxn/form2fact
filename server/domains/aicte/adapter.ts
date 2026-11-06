import type { Application, DocumentRecord, ExtractedField } from "../../../src/types/index.ts";
import {
  evaluateAicteLeaseCompliance,
  type AicteLeaseContext,
  type AicteDocumentEvidence,
  type AicteRegulatoryFinding,
  type LeaseArrangement,
} from "./regulatoryRules.ts";
import {
  loadAicteRuleConfiguration,
  getEligibleAicteRules,
} from "./ruleConfiguration.ts";

function evaluateConfiguredLeasePreview(
  context: AicteLeaseContext,
): AicteRegulatoryFinding[] {
  const config = loadAicteRuleConfiguration();
  const eligibleIds = new Set(
    getEligibleAicteRules(config).map((rule) => rule.ruleId),
  );

  const configuredRules = new Map(
    config.rules.map((rule) => [rule.ruleId, rule]),
  );

  return evaluateAicteLeaseCompliance(context).map((finding) => {
    const rule = configuredRules.get(finding.ruleId);

    if (!rule) {
      return {
        ...finding,
        classification: "UNCERTAIN",
        explanation: "No matching rule exists in the approved configuration.",
      };
    }

    if (finding.classification === "NOT_COMPARABLE") {
      return finding;
    }

    if (eligibleIds.has(rule.ruleId)) {
      return finding;
    }

    if (
      rule.status === "UNDER_REVIEW" ||
      rule.status === "ACTIVE"
    ) {
      return {
        ...finding,
        classification: "UNCERTAIN",
        explanation: `Rule is not eligible because regulatory review or approval requirements are incomplete. ${finding.explanation}`,
      };
    }

    return {
      ...finding,
      classification: "NOT_COMPARABLE",
      explanation: `Rule status is ${rule.status}; it cannot produce a compliance conclusion.`,
    };
  });
}

function mapVerificationStatus(
  status: DocumentRecord["verificationStatus"],
): AicteDocumentEvidence["verificationStatus"] {
  if (status === "VERIFIED") return "VERIFIED";
  if (status === "REJECTED") return "REJECTED";
  return "UNVERIFIED";
}

function normalizeDate(value?: string): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === trimmed
      ? trimmed
      : undefined;
  }

  return undefined;
}

function getVerifiedLeaseExpiry(
  deed: DocumentRecord | undefined,
  fields: ExtractedField[],
): { date?: string; ambiguous: boolean } {
  if (!deed || deed.verificationStatus !== "VERIFIED") {
    return { ambiguous: false };
  }

  const candidates = fields.filter((field) => {
    const name = `${field.fieldName} ${field.fieldLabel}`.toLowerCase();

    return (
      field.documentId === deed.id &&
      /(lease|deed).*(expiry|expiration)|((expiry|expiration).*(date|lease|deed))/.test(name)
    );
  });

  const dates = new Set<string>();

  for (const field of candidates) {
    const value = field.isCorrected
      ? field.correctedValue
      : field.normalizedValue || field.rawValue;

    const date = normalizeDate(value);
    if (date) dates.add(date);
  }

  if (dates.size > 1) return { ambiguous: true };
  return { date: [...dates][0], ambiguous: false };
}

export function buildAicteLeasePreview(
  application: Application,
  documents: DocumentRecord[],
  fields: ExtractedField[],
): {
  mode: "PREVIEW_ONLY";
  findings: AicteRegulatoryFinding[];
  context: Omit<AicteLeaseContext, "documents">;
} {
  const details = application.declaredDetails;

  const leaseArrangement: LeaseArrangement =
    details.leaseArrangement || "UNKNOWN";

  const leaseDeed = documents.find(
    (doc) => doc.documentType === "Land Lease Deed",
  );

  const documentEvidence: AicteDocumentEvidence[] = documents.map((doc) => ({
    documentType: doc.documentType,
    verificationStatus: mapVerificationStatus(doc.verificationStatus),
    evidence: {
      documentId: doc.id,
      documentName: doc.originalFilename,
    },
  }));

  const leaseExpiry = getVerifiedLeaseExpiry(leaseDeed, fields);

  const context: AicteLeaseContext = {
    leaseArrangement,
    applicableHandbookVersion: details.applicableHandbookVersion,
    councilNotificationDate: normalizeDate(details.councilNotificationDate),
    leaseExpiryDate: leaseExpiry.date,
    leaseExpiryAmbiguous: leaseExpiry.ambiguous,
    lessorType: details.lessorType,
    isSubLease: details.isSubLease,
    // Declared answers alone are not treated as verified documentary evidence.
    subLeaseAssignmentRight: undefined,
    mortgageRegistered: undefined,
    documents: documentEvidence,
  };

  return {
    mode: "PREVIEW_ONLY",
    findings: evaluateConfiguredLeasePreview(context),
    context: {
      leaseArrangement: context.leaseArrangement,
      applicableHandbookVersion: context.applicableHandbookVersion,
      councilNotificationDate: context.councilNotificationDate,
      leaseExpiryDate: context.leaseExpiryDate,
      lessorType: context.lessorType,
      isSubLease: context.isSubLease,
      subLeaseAssignmentRight: context.subLeaseAssignmentRight,
      mortgageRegistered: context.mortgageRegistered,
    },
  };
}
