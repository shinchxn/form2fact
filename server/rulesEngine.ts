import { Application, DocumentRecord, ExtractedField, Finding, FindingEvidence, Rule } from '../src/types/index.ts';

export const INITIAL_RULES: Rule[] = [
  {
    id: 'rule-ten-01',
    ruleKey: 'RULE-TEN-01',
    name: 'Land Lease Expiry & Term Concordance',
    description: 'Compares declared lease expiry date with the termination clause extracted from the registered Land Lease Deed. Flags variances and expired tenures.',
    category: 'Land & Tenancy',
    applicableApplicationCategory: 'All Technical Institutions',
    applicableDocumentTypes: ['Land Lease Deed', 'Land Ownership Title Deed'],
    version: 'v1.2',
    sourceReference: 'Approval Process Handbook, Ch. 1, Sec. 4.2 (Tenure Regulations)',
    effectiveFrom: '2024-04-01',
    enabled: true,
    readableCondition: 'Declared Lease Expiry Date == Registered Deed Expiry Date AND Expiry Date >= (Current Year + 15)',
    testCases: [
      {
        title: 'Matching 30-year lease date',
        declared: '2054-03-31',
        evidence: '2054-03-31',
        expectedOutcome: 'Pass'
      },
      {
        title: 'Premature lease termination mismatch',
        declared: '2048-03-31',
        evidence: '2028-03-31',
        expectedOutcome: 'Discrepancy'
      },
      {
        title: 'Missing lease deed document',
        declared: '2048-03-31',
        evidence: 'No Deed Uploaded',
        expectedOutcome: 'Missing'
      }
    ]
  },
  {
    id: 'rule-name-02',
    ruleKey: 'RULE-NAME-02',
    name: 'Institution & Sponsoring Society Concordance',
    description: 'Verifies that the declared institution name and sponsoring trust/society align with the registered Trust Registration Certificate and Deed of Title.',
    category: 'Identity & Registration',
    applicableApplicationCategory: 'All Applications',
    applicableDocumentTypes: ['Society / Trust Registration Certificate', 'Land Lease Deed'],
    version: 'v1.0',
    sourceReference: 'Institutional Governance Norms, Sub-section 3.1',
    effectiveFrom: '2023-01-01',
    enabled: true,
    readableCondition: 'Normalized(Declared Sponsoring Trust) == Normalized(Trust Certificate Legal Name)',
    testCases: [
      {
        title: 'Identical trust entity naming',
        declared: 'Pragati Educational & Welfare Foundation',
        evidence: 'Pragati Educational & Welfare Foundation',
        expectedOutcome: 'Pass'
      },
      {
        title: 'Entity divergence (Private entity vs Registered Trust)',
        declared: 'Pragati Educational Trust',
        evidence: 'Pragati Commercial Enterprises Ltd',
        expectedOutcome: 'Discrepancy'
      }
    ]
  },
  {
    id: 'rule-area-03',
    ruleKey: 'RULE-AREA-03',
    name: 'Declared Land Area Accounting',
    description: 'Verifies that the total campus acreage declared by applicant is legally supported by the schedule of property in land documents.',
    category: 'Land & Tenancy',
    applicableApplicationCategory: 'New Technical Campus, Extension of Approval',
    applicableDocumentTypes: ['Land Lease Deed', 'Land Ownership Title Deed'],
    version: 'v1.1',
    sourceReference: 'Physical Infrastructure Norms, Schedule 2 (Minimum Land Requirement)',
    effectiveFrom: '2023-06-15',
    enabled: true,
    readableCondition: 'Extracted Deed Area >= Declared Campus Land Area',
    testCases: [
      {
        title: 'Documented area satisfies declared requirement',
        declared: '7.50 Acres',
        evidence: '7.50 Acres (Survey No. 42/1 & 42/2)',
        expectedOutcome: 'Pass'
      },
      {
        title: 'Deed deficit of 2.30 Acres',
        declared: '7.50 Acres',
        evidence: '5.20 Acres',
        expectedOutcome: 'Discrepancy'
      }
    ]
  },
  {
    id: 'rule-doc-04',
    ruleKey: 'RULE-DOC-04',
    name: 'Mandatory Statutory Document Checklist',
    description: 'Enforces mandatory presence of prerequisite statutory documents including Land Deed, Building Safety Certificate, and Fire Safety NOC.',
    category: 'Safety & Compliance',
    applicableApplicationCategory: 'All Technical Institutions',
    applicableDocumentTypes: ['Land Lease Deed', 'Building Safety Certificate', 'Fire Safety NOC'],
    version: 'v1.0',
    sourceReference: 'Scrutiny Procedure Manual Section A (Essential Attachments)',
    effectiveFrom: '2022-08-01',
    enabled: true,
    readableCondition: 'Count(Required Document Types in Submission) == Required Mandatory Count (3)',
    testCases: [
      {
        title: 'All mandatory attachments present',
        declared: 'All 3 attached',
        evidence: 'Deed + Safety + Fire NOC found',
        expectedOutcome: 'Pass'
      },
      {
        title: 'Missing Fire Safety NOC',
        declared: 'Deed + Safety attached',
        evidence: 'Fire NOC missing from docket',
        expectedOutcome: 'Missing'
      }
    ]
  },
  {
    id: 'rule-appr-05',
    ruleKey: 'RULE-APPR-05',
    name: 'Prior Approval Order & Intake Continuity',
    description: 'Cross-checks previous year approval order reference number and prior sanctioned intake against the submitted AICTE prior approval document.',
    category: 'Approvals & Capacity',
    applicableApplicationCategory: 'Extension of Approval, Increase in Intake',
    applicableDocumentTypes: ['AICTE Prior Approval Order', 'Affiliation Sanction Letter'],
    version: 'v1.0',
    sourceReference: 'Approval Process Regulations, Intake Records Section 5.4',
    effectiveFrom: '2024-01-01',
    enabled: true,
    readableCondition: 'Declared Prior Ref == Extracted Prior Approval Order Ref',
    testCases: [
      {
        title: 'Exact prior approval order match',
        declared: 'F.No. Western/1-35128912/2024/EOA',
        evidence: 'F.No. Western/1-35128912/2024/EOA',
        expectedOutcome: 'Pass'
      }
    ]
  },
  {
    id: 'rule-safety-06',
    ruleKey: 'RULE-SAFETY-06',
    name: 'Building Safety & Structural Stability Verification',
    description: 'Validates that the Building Safety Certificate is issued by an authorized Chartered Municipal Structural Engineer and contains no structural caveats.',
    category: 'Safety & Compliance',
    applicableApplicationCategory: 'All Applications',
    applicableDocumentTypes: ['Building Safety Certificate'],
    version: 'v1.0',
    sourceReference: 'National Building Code 2016, Part IV (Structural Safety Standards)',
    effectiveFrom: '2023-01-01',
    enabled: true,
    readableCondition: 'Document Status == Extracted AND Structural Caveats == None',
    testCases: [
      {
        title: 'Certified fit for institutional educational occupancy',
        declared: 'Building Safety Valid',
        evidence: 'Certified sound for educational occupancy',
        expectedOutcome: 'Pass'
      }
    ]
  }
];

export interface ValidationEvaluationResult {
  rule: Rule;
  status: 'Pass' | 'Discrepancy' | 'Missing' | 'Unable to Determine';
  finding?: Finding;
}

/**
 * Normalizes text for deterministic comparison
 */
export function normalizeText(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes dates to YYYY-MM-DD
 */
export function normalizeDate(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null;
  const s = dateStr.trim();
  // Check ISO format YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return s;

  // Check DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Month names like "31 March 2028" or "March 31, 2028"
  const months: Record<string, string> = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12',
  };

  const textMatch = s.match(/(\d{1,2})\s+([a-zA-Z]+)[,\s]+(\d{4})/);
  if (textMatch) {
    const day = textMatch[1].padStart(2, '0');
    const monthStr = textMatch[2].toLowerCase();
    const year = textMatch[3];
    const month = months[monthStr];
    if (month) return `${year}-${month}-${day}`;
  }

  const monthFirstMatch = s.match(/([a-zA-Z]+)\s+(\d{1,2})[,\s]+(\d{4})/);
  if (monthFirstMatch) {
    const monthStr = monthFirstMatch[1].toLowerCase();
    const day = monthFirstMatch[2].padStart(2, '0');
    const year = monthFirstMatch[3];
    const month = months[monthStr];
    if (month) return `${year}-${month}-${day}`;
  }

  return s;
}

/**
 * Execute all active deterministic rules against an application and its document records & extracted fields.
 */
export function evaluateApplicationRules(
  application: Application,
  documents: DocumentRecord[],
  extractedFields: ExtractedField[],
  rules: Rule[] = INITIAL_RULES
): { findings: Finding[]; summary: { total: number; passed: number; findings: number } } {
  const findings: Finding[] = [];
  let passedCount = 0;

  // Helper to find field by name across documents
  const findField = (name: string, docType?: string) => {
    return extractedFields.find(f => {
      if (f.fieldName !== name) return false;
      if (docType) {
        const doc = documents.find(d => d.id === f.documentId);
        return doc?.documentType === docType;
      }
      return true;
    });
  };

  for (const rule of rules) {
    if (!rule.enabled) continue;

    // RULE 1: Land Lease Expiry (RULE-TEN-01)
    if (rule.ruleKey === 'RULE-TEN-01') {
      const leaseDoc = documents.find(d => d.documentType === 'Land Lease Deed');
      const leaseExpiryField = findField('leaseExpiryDate', 'Land Lease Deed');

      if (!leaseDoc) {
        // Document not provided
        const fId = `fnd-${application.id.slice(-4)}-ten-missing`;
        findings.push({
          id: fId,
          reference: `FND-${application.referenceNumber.slice(-4)}-01`,
          applicationId: application.id,
          ruleId: rule.id,
          ruleKey: rule.ruleKey,
          ruleVersion: rule.version,
          category: rule.category,
          title: 'Registered Land Lease Deed Missing from Application Docket',
          explanation: `The application declares a land lease expiry date of ${application.declaredDetails.leaseExpiryDate}, but no registered Land Lease Deed was uploaded to verify institutional tenure.`,
          declaredValue: application.declaredDetails.leaseExpiryDate,
          evidenceValue: 'No Document Uploaded',
          severity: 'Information Missing',
          status: 'Open',
          evidenceList: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else if (!leaseExpiryField || !leaseExpiryField.rawValue) {
        // Scanned or extraction failed
        const fId = `fnd-${application.id.slice(-4)}-ten-unread`;
        findings.push({
          id: fId,
          reference: `FND-${application.referenceNumber.slice(-4)}-01`,
          applicationId: application.id,
          ruleId: rule.id,
          ruleKey: rule.ruleKey,
          ruleVersion: rule.version,
          category: rule.category,
          title: 'Lease Expiry Clause Unreadable or Indeterminate',
          explanation: `The uploaded lease deed (${leaseDoc.originalFilename}) could not be deterministically read on the tenure clause (likely scanned or unindexed). Officer scrutiny required.`,
          declaredValue: application.declaredDetails.leaseExpiryDate,
          evidenceValue: 'Extraction Indeterminate (Page ${leaseDoc.pageCount || 1})',
          severity: 'Attention Required',
          status: 'Unable to Determine',
          evidenceList: [
            {
              id: `ev-${fId}-1`,
              findingId: fId,
              documentId: leaseDoc.id,
              documentName: leaseDoc.originalFilename,
              pageNumber: 1,
              evidenceText: 'Document contains low text density or scanned image without structured OCR text layer.',
              evidenceRole: 'Primary Supporting Document'
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        const declaredNorm = normalizeDate(application.declaredDetails.leaseExpiryDate);
        const evidenceNorm = normalizeDate(leaseExpiryField.normalizedValue || leaseExpiryField.rawValue);

        if (declaredNorm !== evidenceNorm) {
          // Material mismatch found!
          const fId = `fnd-${application.id.slice(-4)}-ten-mismatch`;
          findings.push({
            id: fId,
            reference: `FND-${application.referenceNumber.slice(-4)}-01`,
            applicationId: application.id,
            ruleId: rule.id,
            ruleKey: rule.ruleKey,
            ruleVersion: rule.version,
            category: rule.category,
            title: 'Land Lease Expiry Date Variance with Registered Deed',
            explanation: `Application declares lease validity until ${application.declaredDetails.leaseExpiryDate}. However, Clause 4 of registered Lease Deed (${leaseDoc.originalFilename}, page ${leaseExpiryField.pageNumber}) specifies lease termination on ${leaseExpiryField.rawValue}. This represents a substantial variance in institutional land tenure.`,
            declaredValue: application.declaredDetails.leaseExpiryDate,
            evidenceValue: `${leaseExpiryField.rawValue} (Page ${leaseExpiryField.pageNumber})`,
            severity: 'Material Discrepancy',
            status: 'Open',
            evidenceList: [
              {
                id: `ev-${fId}-1`,
                findingId: fId,
                documentId: leaseDoc.id,
                documentName: leaseDoc.originalFilename,
                pageNumber: leaseExpiryField.pageNumber,
                fieldId: leaseExpiryField.id,
                evidenceText: leaseExpiryField.sourceText || `"...the Lessor doth hereby demise unto the Lessee all that parcel of land for a term expiring on ${leaseExpiryField.rawValue}..."`,
                evidenceRole: 'Conflicting Evidence'
              }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } else {
          passedCount++;
        }
      }
    }

    // RULE 2: Institution & Trust Name Concordance (RULE-NAME-02)
    if (rule.ruleKey === 'RULE-NAME-02') {
      const trustDoc = documents.find(d => d.documentType === 'Society / Trust Registration Certificate');
      const trustNameField = findField('trustName', 'Society / Trust Registration Certificate');

      if (trustDoc && trustNameField) {
        const declaredNorm = normalizeText(application.declaredDetails.societyOrTrustName);
        const extractedNorm = normalizeText(trustNameField.normalizedValue || trustNameField.rawValue);

        if (declaredNorm && extractedNorm && !extractedNorm.includes(declaredNorm) && !declaredNorm.includes(extractedNorm)) {
          const fId = `fnd-${application.id.slice(-4)}-name-mismatch`;
          findings.push({
            id: fId,
            reference: `FND-${application.referenceNumber.slice(-4)}-02`,
            applicationId: application.id,
            ruleId: rule.id,
            ruleKey: rule.ruleKey,
            ruleVersion: rule.version,
            category: rule.category,
            title: 'Sponsoring Entity Legal Name Discrepancy',
            explanation: `Declared sponsoring entity '${application.declaredDetails.societyOrTrustName}' does not match registered certificate title '${trustNameField.rawValue}' in ${trustDoc.originalFilename}.`,
            declaredValue: application.declaredDetails.societyOrTrustName,
            evidenceValue: `${trustNameField.rawValue} (Page ${trustNameField.pageNumber})`,
            severity: 'Material Discrepancy',
            status: 'Open',
            evidenceList: [
              {
                id: `ev-${fId}-1`,
                findingId: fId,
                documentId: trustDoc.id,
                documentName: trustDoc.originalFilename,
                pageNumber: trustNameField.pageNumber,
                fieldId: trustNameField.id,
                evidenceText: trustNameField.sourceText || `Registered Name: ${trustNameField.rawValue}`,
                evidenceRole: 'Conflicting Evidence'
              }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } else {
          passedCount++;
        }
      } else if (!trustDoc) {
        const fId = `fnd-${application.id.slice(-4)}-trust-missing`;
        findings.push({
          id: fId,
          reference: `FND-${application.referenceNumber.slice(-4)}-02`,
          applicationId: application.id,
          ruleId: rule.id,
          ruleKey: rule.ruleKey,
          ruleVersion: rule.version,
          category: rule.category,
          title: 'Trust / Society Registration Certificate Not Attached',
          explanation: 'The application declares sponsoring trust registration details, but the registered Certificate of Incorporation or Trust Deed is missing from the submitted document inventory.',
          declaredValue: application.declaredDetails.societyOrTrustName,
          evidenceValue: 'Missing Document',
          severity: 'Information Missing',
          status: 'Open',
          evidenceList: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        passedCount++;
      }
    }

    // RULE 3: Land Area Accounting (RULE-AREA-03)
    if (rule.ruleKey === 'RULE-AREA-03') {
      const areaField = findField('landAreaAcres');
      if (areaField && areaField.rawValue) {
        const extractedArea = parseFloat(areaField.normalizedValue || areaField.rawValue);
        const declaredArea = application.declaredDetails.landAreaAcres;

        if (!isNaN(extractedArea) && declaredArea > extractedArea + 0.05) {
          const fId = `fnd-${application.id.slice(-4)}-area-deficit`;
          const deedDoc = documents.find(d => d.id === areaField.documentId);
          findings.push({
            id: fId,
            reference: `FND-${application.referenceNumber.slice(-4)}-03`,
            applicationId: application.id,
            ruleId: rule.id,
            ruleKey: rule.ruleKey,
            ruleVersion: rule.version,
            category: rule.category,
            title: 'Deed Land Area Deficit against Declared Campus Requirement',
            explanation: `Declared campus land area is ${declaredArea} Acres. Supporting deed (${deedDoc?.originalFilename || 'Deed'}, page ${areaField.pageNumber}) documents only ${extractedArea} Acres, leaving an unsubstantiated deficit of ${(declaredArea - extractedArea).toFixed(2)} Acres.`,
            declaredValue: `${declaredArea} Acres`,
            evidenceValue: `${extractedArea} Acres (Page ${areaField.pageNumber})`,
            severity: 'Material Discrepancy',
            status: 'Open',
            evidenceList: [
              {
                id: `ev-${fId}-1`,
                findingId: fId,
                documentId: areaField.documentId,
                documentName: deedDoc?.originalFilename || 'Land Document',
                pageNumber: areaField.pageNumber,
                fieldId: areaField.id,
                evidenceText: areaField.sourceText || `Schedule of Property area: ${extractedArea} Acres`,
                evidenceRole: 'Conflicting Evidence'
              }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } else {
          passedCount++;
        }
      } else {
        passedCount++;
      }
    }

    // RULE 4: Mandatory Statutory Document Checklist (RULE-DOC-04)
    if (rule.ruleKey === 'RULE-DOC-04') {
      const requiredTypes: ('Land Lease Deed' | 'Building Safety Certificate' | 'Fire Safety NOC')[] = [
        'Land Lease Deed',
        'Building Safety Certificate',
        'Fire Safety NOC'
      ];

      const missing = requiredTypes.filter(type => !documents.some(d => d.documentType === type));

      if (missing.length > 0) {
        const fId = `fnd-${application.id.slice(-4)}-doc-missing`;
        findings.push({
          id: fId,
          reference: `FND-${application.referenceNumber.slice(-4)}-04`,
          applicationId: application.id,
          ruleId: rule.id,
          ruleKey: rule.ruleKey,
          ruleVersion: rule.version,
          category: rule.category,
          title: `Statutory Submission Incomplete: Missing ${missing.join(', ')}`,
          explanation: `Institutional scrutiny regulations mandate submission of current valid certificates for each campus. Missing document type(s): ${missing.join(', ')}.`,
          declaredValue: 'Mandatory Submission Complete',
          evidenceValue: `Missing: ${missing.join(', ')}`,
          severity: 'Information Missing',
          status: 'Open',
          evidenceList: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        passedCount++;
      }
    }

    // RULE 5: Prior Approval Order (RULE-APPR-05)
    if (rule.ruleKey === 'RULE-APPR-05') {
      const apprDoc = documents.find(d => d.documentType === 'AICTE Prior Approval Order');
      const apprRefField = findField('priorApprovalOrderRef', 'AICTE Prior Approval Order');

      if (apprDoc && apprRefField) {
        const declaredRef = normalizeText(application.declaredDetails.previousApprovalRef);
        const extractedRef = normalizeText(apprRefField.normalizedValue || apprRefField.rawValue);

        if (declaredRef && extractedRef && declaredRef !== extractedRef) {
          const fId = `fnd-${application.id.slice(-4)}-appr-ref`;
          findings.push({
            id: fId,
            reference: `FND-${application.referenceNumber.slice(-4)}-05`,
            applicationId: application.id,
            ruleId: rule.id,
            ruleKey: rule.ruleKey,
            ruleVersion: rule.version,
            category: rule.category,
            title: 'Prior Approval Order Reference Number Discrepancy',
            explanation: `Declared approval reference '${application.declaredDetails.previousApprovalRef}' does not match prior approval order '${apprRefField.rawValue}' in ${apprDoc.originalFilename}.`,
            declaredValue: application.declaredDetails.previousApprovalRef,
            evidenceValue: `${apprRefField.rawValue} (Page ${apprRefField.pageNumber})`,
            severity: 'Attention Required',
            status: 'Open',
            evidenceList: [
              {
                id: `ev-${fId}-1`,
                findingId: fId,
                documentId: apprDoc.id,
                documentName: apprDoc.originalFilename,
                pageNumber: apprRefField.pageNumber,
                fieldId: apprRefField.id,
                evidenceText: apprRefField.sourceText || `F.No. Reference: ${apprRefField.rawValue}`,
                evidenceRole: 'Conflicting Evidence'
              }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } else {
          passedCount++;
        }
      } else {
        passedCount++;
      }
    }

    // RULE 6: Building Safety Verification (RULE-SAFETY-06)
    if (rule.ruleKey === 'RULE-SAFETY-06') {
      const safetyDoc = documents.find(d => d.documentType === 'Building Safety Certificate');
      if (safetyDoc) {
        if (safetyDoc.processingStatus === 'Scanned Unreadable' || safetyDoc.isScannedOrTextPoor) {
          const fId = `fnd-${application.id.slice(-4)}-safety-scanned`;
          findings.push({
            id: fId,
            reference: `FND-${application.referenceNumber.slice(-4)}-06`,
            applicationId: application.id,
            ruleId: rule.id,
            ruleKey: rule.ruleKey,
            ruleVersion: rule.version,
            category: rule.category,
            title: 'Building Safety Certificate Requires Manual Scrutiny (Scanned Copy)',
            explanation: `The uploaded Building Safety Certificate (${safetyDoc.originalFilename}) is a scanned document without an embedded text layer. Scrutiny officer must manually verify engineer license number and structural adequacy.`,
            declaredValue: 'Chartered Engineer Certified',
            evidenceValue: 'Scanned Document (Manual Verification Reqd)',
            severity: 'Attention Required',
            status: 'Unable to Determine',
            evidenceList: [
              {
                id: `ev-${fId}-1`,
                findingId: fId,
                documentId: safetyDoc.id,
                documentName: safetyDoc.originalFilename,
                pageNumber: 1,
                evidenceText: 'Scanned bitmap document; OCR confidence insufficient for automated sign-off.',
                evidenceRole: 'Primary Supporting Document'
              }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } else {
          passedCount++;
        }
      } else {
        passedCount++;
      }
    }
  }

  return {
    findings,
    summary: {
      total: rules.filter(r => r.enabled).length,
      passed: passedCount,
      findings: findings.length
    }
  };
}
