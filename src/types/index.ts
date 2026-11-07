export type ApplicationStatus = 'Uploaded' | 'Extracting' | 'Validating' | 'Ready for Review' | 'Processing Error';
export type ReviewStatus = 'Pending Review' | 'Under Review' | 'Review Completed' | 'Discrepancies Confirmed';
export type FindingSeverity = 'Attention Required' | 'Material Discrepancy' | 'Information Missing' | 'Administrative Advisory';
export type FindingStatus = 'Open' | 'Under Review' | 'Confirmed' | 'Dismissed' | 'Corrected' | 'Unable to Determine';
export type UserRole =
  | 'Administrator'
  | 'Reviewer'
  | 'Read-only Viewer'
  | 'Data Collector'
  | 'Annotator'
  | 'Adjudicator';

export interface User {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  department: string;
  organizationId?: string;
  createdAt?: string;
}

export interface DeclaredDetails {
  institutionName: string;
  societyOrTrustName: string;
  address: string;
  pinCode: string;
  state: string;
  landAreaAcres: number;
  leaseExpiryDate: string; // ISO format YYYY-MM-DD
  sanctionedIntake: number;
  previousApprovalRef: string;
  applicationYear: string;

  // Optional AICTE lease context
  leaseArrangement?: 'PRIVATE_LAND' | 'PRIVATE_BUILDING' | 'OWNED' | 'OTHER' | 'PUBLIC_AUTHORITY_LAND_LEASE' | 'UNKNOWN';
  applicableHandbookVersion?: string;
  councilNotificationDate?: string;
  lessorType?: 'INDIVIDUAL' | 'TRUST' | 'SOCIETY' | 'COMPANY' | 'OTHER';
  isSubLease?: boolean;
  subLeaseAssignmentRight?: boolean;
  mortgageRegistered?: boolean;
}

export interface Application {
  id: string;
  referenceNumber: string;
  institutionName: string;
  applicationType: 'Extension of Approval' | 'New Technical Campus' | 'Increase in Intake' | 'Change of Site';
  organizationId?: string;
  status: ApplicationStatus;
  reviewStatus: ReviewStatus;
  declaredDetails: DeclaredDetails;
  documentCount: number;
  openFindingsCount: number;
  totalFindingsCount: number;
  reviewerNotes?: string;
  assignedReviewer?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType =
  | 'Land Lease Deed'
  | 'Land Ownership Title Deed'
  | 'Building Lease Deed'
  | 'Land Conversion Certificate'
  | 'Lessor Title Document'
  | 'Encumbrance Certificate'
  | 'Lessor Resolution'
  | 'Approved Building Plan'
  | 'Occupancy / Completion Certificate'
  | 'Fire Safety Certificate'
  | 'Land Use Certificate'
  | 'Architect Certified Floor Plans'
  | 'Building Safety Certificate'
  | 'Society / Trust Registration Certificate'
  | 'AICTE Prior Approval Order'
  | 'Affiliation Sanction Letter'
  | 'Fire Safety NOC'
  | 'Site Plan & Layout Drawing';

export interface DocumentRecord {
  id: string;
  applicationId: string;
  originalFilename: string;
  documentType: DocumentType;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  pageCount: number;
  processingStatus: 'Pending' | 'Extracted' | 'Failed' | 'Scanned Unreadable';

  extractedTextByPage?: {
    page: number;
    text: string;
    extractionMethod?: 'text_layer' | 'ocr';
    ocrConfidence?: number | null;
    characterCount?: number;
    status?: 'extracted' | 'unreadable';
  }[];

  isScannedOrTextPoor?: boolean;
  verificationStatus?: 'VERIFIED' | 'REJECTED' | 'UNVERIFIED' | string;
  createdAt: string;
}
export interface ExtractedField {
  id: string;
  documentId: string;
  applicationId: string;
  fieldName: string;
  fieldLabel: string;
  rawValue: string;
  normalizedValue: string;
  pageNumber: number;
  sourceText: string;
  confidence: number | null; // null if unavailable, avoiding fake percentages
  extractionMethod: 'Deterministic Text Regex' | 'Document Parser' | 'Assisted Extraction' | 'Manual Correction';
  isCorrected?: boolean;
  correctedValue?: string;
  correctedBy?: string;
  correctedAt?: string;
  correctionNote?: string;
}

export interface RuleTestCase {
  title: string;
  declared: string;
  evidence: string;
  expectedOutcome: 'Pass' | 'Discrepancy' | 'Missing';
}

export interface Rule {
  id: string;
  ruleKey: string;
  name: string;
  description: string;
  category: 'Identity & Registration' | 'Land & Tenancy' | 'Approvals & Capacity' | 'Safety & Compliance';
  applicableApplicationCategory: string;
  applicableDocumentTypes: DocumentType[];
  version: string;
  sourceReference: string;
  effectiveFrom: string;
  enabled: boolean;
  readableCondition: string;
  testCases: RuleTestCase[];
}

export interface FindingEvidence {
  id: string;
  findingId: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  fieldId?: string;
  evidenceText: string;
  evidenceRole: 'Primary Supporting Document' | 'Conflicting Evidence' | 'Missing Requirement Reference';
}

export interface Finding {
  id: string;
  reference: string;
  applicationId: string;
  ruleId: string;
  ruleKey: string;
  ruleVersion: string;
  category: 'Identity & Registration' | 'Land & Tenancy' | 'Approvals & Capacity' | 'Safety & Compliance';
  title: string;
  explanation: string;
  declaredValue?: string;
  evidenceValue?: string;
  severity: FindingSeverity;
  status: FindingStatus;
  evidenceList: FindingEvidence[];
  assignedReviewer?: string;
  reviewerDecisionReason?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewAction {
  id: string;
  findingId: string;
  applicationId: string;
  reviewerId: string;
  reviewerName: string;
  action: 'Confirm Finding' | 'Dismiss Finding' | 'Correct Extracted Value' | 'Mark Unable to Determine' | 'Reopen Finding' | 'Add Note';
  previousStatus: FindingStatus;
  newStatus: FindingStatus;
  note: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: 'Application' | 'Document' | 'ExtractedField' | 'Finding' | 'Rule' | 'Report' | 'User' | 'AnnotationRecord' | 'UserAnnotation';
  entityReference: string;
  beforeValue?: string;
  afterValue?: string;
  note?: string;
}

export type FiveClassLabel = 'MATCH' | 'MISMATCH' | 'MISSING' | 'UNCERTAIN' | 'NOT_COMPARABLE';

export type AnnotationRecordStatus = 'pending' | 'in_review' | 'agreed' | 'disputed' | 'adjudicated';

export interface UserAnnotation {
  id: string;
  recordId: string;
  annotatorId: string;
  annotatorName: string;
  annotatorRole: string;
  label: FiveClassLabel;
  rationale: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationRecord {
  id: string;
  recordId: string;
  institutionId: string;
  institutionName: string;
  applicationId?: string;
  claimFieldName: string;
  claimText: string;
  claimDocumentId?: string;
  claimDocumentName?: string;
  claimPage?: number;
  evidenceText: string;
  evidenceDocumentId?: string;
  evidenceDocumentName?: string;
  evidencePage?: number;
  evidenceLocation?: string;
  normalizedClaimValue?: string;
  normalizedEvidenceValue?: string;
  fieldCategory?: string;
  sourceProvenance: string;
  licence?: string;
  originalSourceLabel?: string;
  status: AnnotationRecordStatus;
  finalLabel?: FiveClassLabel;
  adjudicatorId?: string;
  adjudicatorName?: string;
  adjudicationRationale?: string;
  adjudicatedAt?: string;
  organizationId: string;
  userAnnotations?: UserAnnotation[];
  myAnnotation?: UserAnnotation;
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationMetrics {
  totalRecords: number;
  completedRecords: number;
  pendingRecords: number;
  inReviewRecords: number;
  agreedRecords: number;
  disputedRecords: number;
  adjudicatedRecords: number;
  labelDistribution: Record<FiveClassLabel, number>;
  rawAgreementRate: number;
  cohensKappa: number;
  cohensKappaInterpretation: string;
  adjudicationRate: number;
  missingEvidenceRate: number;
  invalidRecordRate: number;
  institutionDistribution: Record<string, number>;
}

export interface ValidationSummary {
  validationRunId: string;
  applicationId: string;
  status: 'Completed' | 'Errors Detected';
  rulesEvaluatedCount: number;
  passedChecksCount: number;
  findingsRaisedCount: number;
  timestamp: string;
}

export interface ScrutinyReportData {
  application: Application;
  documents: DocumentRecord[];
  extractedFields: ExtractedField[];
  findings: Finding[];
  reviewActions: ReviewAction[];
  validationSummary: ValidationSummary;
  generatedAt: string;
  generatedBy: string;
}
