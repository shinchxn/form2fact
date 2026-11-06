import { DomainPack } from '../types.ts';
import { INITIAL_RULES } from '../../rulesEngine.ts';

export const aicteDomainPack: DomainPack = {
  id: 'aicte',
  name: 'AICTE Institutional Approval & Compliance Scrutiny',
  version: '1.2.0',
  category: 'Higher Technical Education Regulatory Compliance',
  description: 'Statutory verification rules and document concordance checks based on the AICTE Approval Process Handbook (APH) and National Building Code standards.',
  documentTypes: [
    {
      type: 'Land Lease Deed',
      label: 'Registered Land Lease Deed',
      description: 'Registered indenture of lease establishing campus land rights and minimum 30-year unencumbered tenure.',
      isMandatory: false,
      requiredFields: ['leaseExpiryDate', 'landAreaAcres'],
      statutoryReference: 'Approval Process Handbook, Ch. 1, Sec. 4.2'
    },
    {
      type: 'Land Ownership Title Deed',
      label: 'Land Ownership Title Deed',
      description: 'Registered title deed proving freehold outright ownership of campus property.',
      isMandatory: false,
      requiredFields: ['landAreaAcres'],
      statutoryReference: 'Approval Process Handbook, Ch. 1, Sec. 4.1'
    },
    {
      type: 'Building Safety Certificate',
      label: 'Building Safety & Structural Stability Certificate',
      description: 'Certified inspection report from a chartered structural engineer confirming soundness for institutional occupancy.',
      isMandatory: true,
      requiredFields: [],
      statutoryReference: 'National Building Code 2016, Part IV'
    },
    {
      type: 'Fire Safety NOC',
      label: 'Fire Safety Clearance No-Objection Certificate',
      description: 'Clearance from competent Municipal or State Fire Service authority.',
      isMandatory: true,
      requiredFields: [],
      statutoryReference: 'Approval Process Handbook, Annexure 4'
    },
    {
      type: 'Society / Trust Registration Certificate',
      label: 'Society / Trust Registration Certificate',
      description: 'Certificate of registration under Societies Registration Act or Public Trusts Act.',
      isMandatory: true,
      requiredFields: ['trustName'],
      statutoryReference: 'Institutional Governance Norms, Sub-section 3.1'
    },
    {
      type: 'AICTE Prior Approval Order',
      label: 'AICTE Prior Approval Order',
      description: 'Previous academic year Extension of Approval order.',
      isMandatory: false,
      requiredFields: ['priorApprovalOrderRef'],
      statutoryReference: 'Approval Process Regulations, Intake Records Sec. 5.4'
    }
  ],
  fieldDefinitions: [
    {
      name: 'leaseExpiryDate',
      label: 'Lease Termination / Expiry Date',
      description: 'Calendar date when the institutional land lease tenure terminates.',
      expectedType: 'date',
      normalizationStrategy: 'date-iso',
      aliases: ['terminationDate', 'leasePeriodEnding', 'validUpTo'],
      confidenceHeuristic: 0.96
    },
    {
      name: 'landAreaAcres',
      label: 'Schedule Campus Land Area (Acres)',
      description: 'Total land area admeasuring in acres as scheduled in registered deed.',
      expectedType: 'number',
      normalizationStrategy: 'number-float',
      aliases: ['totalLandArea', 'campusExtent', 'parcelArea'],
      confidenceHeuristic: 0.94
    },
    {
      name: 'trustName',
      label: 'Registered Sponsoring Entity Legal Name',
      description: 'Full legal title of the society, trust, or section-8 non-profit company.',
      expectedType: 'string',
      normalizationStrategy: 'entity-name',
      aliases: ['societyName', 'foundationName', 'sansthaName'],
      confidenceHeuristic: 0.95
    },
    {
      name: 'priorApprovalOrderRef',
      label: 'AICTE Prior Approval Order Reference',
      description: 'Official file number format F.No. Regional/1-xxx/Year/EOA.',
      expectedType: 'string',
      normalizationStrategy: 'code-uppercase',
      aliases: ['fNoReference', 'previousApprovalRef'],
      confidenceHeuristic: 0.99
    }
  ],
  comparisonRelationships: [
    {
      id: 'rel-tenure-expiry',
      name: 'Lease Expiry & Statutory Tenure Period',
      sourceType: 'declaration',
      sourceField: 'leaseExpiryDate',
      targetDocumentType: 'Land Lease Deed',
      targetField: 'leaseExpiryDate',
      comparisonMethod: 'date-tenure',
      minTenureYears: 30,
      failureSeverity: 'Material Discrepancy',
      associatedRuleKey: 'RULE-TEN-01'
    },
    {
      id: 'rel-trust-identity',
      name: 'Sponsoring Entity Concordance',
      sourceType: 'declaration',
      sourceField: 'societyOrTrustName',
      targetDocumentType: 'Society / Trust Registration Certificate',
      targetField: 'trustName',
      comparisonMethod: 'entity-concordance',
      failureSeverity: 'Material Discrepancy',
      associatedRuleKey: 'RULE-NAME-02'
    },
    {
      id: 'rel-campus-acreage',
      name: 'Campus Acreage Accounting & Aggregation',
      sourceType: 'declaration',
      sourceField: 'landAreaAcres',
      targetDocumentType: 'Land Lease Deed',
      targetField: 'landAreaAcres',
      comparisonMethod: 'numeric-threshold',
      toleranceThreshold: 0.05,
      failureSeverity: 'Material Discrepancy',
      associatedRuleKey: 'RULE-AREA-03'
    },
    {
      id: 'rel-prior-order',
      name: 'Prior Year Approval Order Reference Match',
      sourceType: 'declaration',
      sourceField: 'previousApprovalRef',
      targetDocumentType: 'AICTE Prior Approval Order',
      targetField: 'priorApprovalOrderRef',
      comparisonMethod: 'exact',
      failureSeverity: 'Attention Required',
      associatedRuleKey: 'RULE-APPR-05'
    }
  ],
  rules: INITIAL_RULES
};

