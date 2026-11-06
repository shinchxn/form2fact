import { Application, DocumentRecord, ExtractedField, Finding, ReviewAction, AuditEvent, Rule, User, ScrutinyReportData } from '../types/index.ts';

const API_BASE = '/api/v1';

let authToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('f2f_token') : null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem('f2f_token', token);
    else localStorage.removeItem('f2f_token');
  }
}

export function getAuthToken(): string | null {
  return authToken || (typeof window !== 'undefined' ? localStorage.getItem('f2f_token') : null);
}

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const json = await res.json();
  if (!json.success || !json.token) {
    throw new Error(json.error || 'Authentication failed. Please verify institutional credentials.');
  }
  setAuthToken(json.token);
  return { token: json.token, user: json.user };
}

export function logout(): void {
  setAuthToken(null);
}

export async function ensureAuthToken(): Promise<string> {
  const current = getAuthToken();
  if (current) {
    authToken = current;
    return current;
  }
  return '';
}

export function getHeaders(contentType: string = 'application/json'): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = contentType;
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function fetchApplications(params?: { search?: string; status?: string; category?: string }): Promise<Application[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.category) query.set('category', params.category);

  const res = await fetch(`${API_BASE}/applications?${query.toString()}`, {
    headers: getHeaders()
  });
  const json = await res.json();
  return json.data || [];
}

export async function fetchApplicationById(id: string): Promise<{
  application: Application;
  documents: DocumentRecord[];
  findings: Finding[];
  extractedFields: ExtractedField[];
}> {
  const res = await fetch(`${API_BASE}/applications/${id}`, {
    headers: getHeaders()
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch application');
  return {
    application: json.data,
    documents: json.data.documents || [],
    findings: json.data.findings || [],
    extractedFields: json.data.extractedFields || []
  };
}

export async function createApplication(data: Partial<Application>): Promise<Application> {
  const res = await fetch(`${API_BASE}/applications`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to create application');
  return json.data;
}

export async function uploadDocument(applicationId: string, file: File, documentType: string): Promise<DocumentRecord> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);

  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/applications/${applicationId}/documents`, {
    method: 'POST',
    headers,
    body: formData
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to upload document');
  return json.data;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to delete document');
}

export async function downloadDocument(applicationId: string, docId: string, originalFilename: string): Promise<void> {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/documents/${docId}/file`, {
    headers: getHeaders('')
  });
  if (!res.ok) throw new Error(`Failed to stream document (${res.status} ${res.statusText})`);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = originalFilename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function correctField(fieldId: string, correctedValue: string, note: string): Promise<ExtractedField> {
  const res = await fetch(`${API_BASE}/fields/${fieldId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ correctedValue, note })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to correct field');
  return json.data;
}

export async function runValidation(applicationId: string) {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/validate`, {
    method: 'POST',
    headers: getHeaders()
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to validate application');
  return json.data;
}


export type AicteClassification =
  | 'MATCH'
  | 'MISMATCH'
  | 'MISSING'
  | 'UNCERTAIN'
  | 'NOT_COMPARABLE';

export interface AicteRegulatoryFinding {
  ruleId: string;
  classification: AicteClassification;
  title: string;
  explanation: string;
  actualValue?: string;
  expectedValue?: string;
  applicability: string;
  evidence?: {
    documentId?: string;
    documentName: string;
    pageNumber?: number;
    fieldName?: string;
    excerpt?: string;
    rawValue?: string;
  };
  source: {
    sourceId: string;
    title: string;
    version: string;
    officialUrl: string;
    page: number;
    verifiedOn: string;
  };
}

export interface AicteLeasePreview {
  mode: 'PREVIEW_ONLY';
  findings: AicteRegulatoryFinding[];
  context: Record<string, unknown>;
}

export async function fetchAicteLeasePreview(
  applicationId: string
): Promise<AicteLeasePreview> {
  const res = await fetch(
    `${API_BASE}/applications/${applicationId}/aicte-preview`,
    { headers: getHeaders() }
  );

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to fetch AICTE preview');
  }

  return json.data as AicteLeasePreview;
}

export async function fetchFindings(params?: { status?: string; category?: string; severity?: string }): Promise<Finding[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.category) query.set('category', params.category);
  if (params?.severity) query.set('severity', params.severity);

  const res = await fetch(`${API_BASE}/findings?${query.toString()}`, {
    headers: getHeaders()
  });
  const json = await res.json();
  return json.data || [];
}

export async function submitReviewAction(
  findingId: string,
  action: ReviewAction['action'],
  newStatus: Finding['status'],
  note: string
): Promise<Finding> {
  const res = await fetch(`${API_BASE}/findings/${findingId}/review`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ action, newStatus, note })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to record review action');
  return json.data;
}

export async function recordApplicationDecision(
  applicationId: string,
  decisionType: 'Approved' | 'Rejected' | 'Clarification Required',
  rationale: string
): Promise<{ decisionId: string; application: Application }> {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/decision`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ decisionType, rationale })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to record application decision');
  return json.data;
}

export async function fetchReport(applicationId: string): Promise<ScrutinyReportData> {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/report`, {
    headers: getHeaders()
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch report');
  return json.data;
}

export async function fetchAuditEvents(): Promise<AuditEvent[]> {
  const res = await fetch(`${API_BASE}/audit`, {
    headers: getHeaders()
  });
  const json = await res.json();
  return json.data || [];
}

export async function fetchRules(): Promise<Rule[]> {
  const res = await fetch(`${API_BASE}/rules`, {
    headers: getHeaders()
  });
  const json = await res.json();
  return json.data || [];
}

export async function updateRule(ruleId: string, updates: Partial<Rule>): Promise<Rule> {
  const res = await fetch(`${API_BASE}/rules/${ruleId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to update rule');
  return json.data;
}

export async function testRuleSandbox(
  ruleKeyOrId: string,
  testInputs: {
    declaredValue?: string;
    evidenceValue?: string;
    documentType?: string;
    applicationCategory?: string;
    evaluationYear?: number;
    parcels?: { documentName: string; areaAcres: number }[];
  }
): Promise<{ status: 'Pass' | 'Discrepancy' | 'Missing' | 'Unable to Determine'; explanation: string }> {
  const res = await fetch(`${API_BASE}/rules/${ruleKeyOrId}/test`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(testInputs)
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to execute rule sandbox test');
  return json.data;
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getHeaders()
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Authentication required');
  }
  return json.user || json.data;
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`, {
    headers: getHeaders()
  });
  const json = await res.json();
  return json.data || [];
}

export async function switchCurrentUser(user: User): Promise<User> {
  const res = await fetch(`${API_BASE}/user`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(user)
  });
  const json = await res.json();
  if (json.token) {
    setAuthToken(json.token);
  }
  return json.data;
}

export async function resetDemoData(): Promise<void> {
  const res = await fetch(`${API_BASE}/reset-demo`, {
    method: 'POST',
    headers: getHeaders()
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to reset demo data');
}

export interface DeepScrutinyMemo {
  generatedAt: string;
  modelUsed: string;
  thinkingMode: string;
  isAiGenerated: boolean;
  summary: string;
  crossDocumentObservations: string[];
  recommendedOfficerActions: string[];
  uncertaintyNotice: string;
}

export async function runDeepScrutiny(applicationId: string, query?: string): Promise<DeepScrutinyMemo> {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/deep-scrutiny`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to execute deep scrutiny synthesis');
  return json.data;
}

// =========================================================================
// PAIRWISE VERIFICATION & CLASSIFICATION API
// =========================================================================

export interface PairwiseComparisonRequest {
  domainId?: string;
  relationshipId?: string;
  claimField: {
    fieldName: string;
    fieldLabel: string;
    rawValue: string;
    normalizedValue?: string;
  };
  evidenceField?: {
    fieldName: string;
    fieldLabel: string;
    rawValue: string;
    normalizedValue?: string;
    documentId?: string;
    documentName?: string;
    pageNumber?: number;
  };
  comparisonType?: 'date' | 'numeric' | 'entity-name' | 'code' | 'address' | 'generic';
  toleranceThreshold?: number;
  confidenceThreshold?: number;
}

export interface PairwiseComparisonResult {
  label: 'MATCH' | 'MISMATCH' | 'MISSING' | 'UNCERTAIN' | 'NOT_COMPARABLE';
  confidence: number;
  isDeterministic: boolean;
  explanation: string;
  normalizedClaimValue: string;
  normalizedEvidenceValue?: string;
  evidenceList: any[];
  requiresHumanReview: boolean;
  modelVersion: string;
}

export async function runPairwiseComparison(data: PairwiseComparisonRequest): Promise<PairwiseComparisonResult> {
  const res = await fetch(`${API_BASE}/verification/pairwise`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Pairwise comparison request failed');
  return json.data;
}
