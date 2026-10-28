export type ApplicationStatus = 'Uploaded' | 'Extracting' | 'Validating' | 'Ready for Review' | 'Processing Error';
export type ReviewStatus = 'Pending Review' | 'Under Review' | 'Review Completed' | 'Discrepancies Confirmed';
export type FindingSeverity = 'Attention Required' | 'Material Discrepancy' | 'Information Missing' | 'Administrative Advisory';
export type FindingStatus = 'Open' | 'Under Review' | 'Confirmed' | 'Dismissed' | 'Corrected' | 'Unable to Determine';
export type UserRole = 'Administrator' | 'Reviewer' | 'Read-only Viewer';

export interface User {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  department: string;
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
}

export interface Application {
  id: string;
  referenceNumber: string;
  institutionName: string;
  applicationType: 'Extension of Approval' | 'New Technical Campus' | 'Increase in Intake' | 'Change of Site';
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
  extractedTextByPage?: { page: number; text: string }[];
  isScannedOrTextPoor?: boolean;
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
  entityType: 'Application' | 'Document' | 'ExtractedField' | 'Finding' | 'Rule' | 'Report';
  entityReference: string;
  beforeValue?: string;
  afterValue?: string;
  note?: string;
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
