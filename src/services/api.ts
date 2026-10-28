import { Application, DocumentRecord, ExtractedField, Finding, ReviewAction, AuditEvent, Rule, User, ScrutinyReportData } from '../types/index.ts';

const API_BASE = '/api/v1';

export async function fetchApplications(params?: { search?: string; status?: string; category?: string }): Promise<Application[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.category) query.set('category', params.category);

  const res = await fetch(`${API_BASE}/applications?${query.toString()}`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchApplicationById(id: string): Promise<{
  application: Application;
  documents: DocumentRecord[];
  findings: Finding[];
  extractedFields: ExtractedField[];
}> {
  const res = await fetch(`${API_BASE}/applications/${id}`);
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
    headers: { 'Content-Type': 'application/json' },
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

  const res = await fetch(`${API_BASE}/applications/${applicationId}/documents`, {
    method: 'POST',
    body: formData
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to upload document');
  return json.data;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to delete document');
}

export async function correctField(fieldId: string, correctedValue: string, note: string): Promise<ExtractedField> {
  const res = await fetch(`${API_BASE}/fields/${fieldId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correctedValue, note })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to correct field');
  return json.data;
}

export async function runValidation(applicationId: string) {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/validate`, {
    method: 'POST'
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to validate application');
  return json.data;
}

export async function fetchFindings(params?: { status?: string; category?: string; severity?: string }): Promise<Finding[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.category) query.set('category', params.category);
  if (params?.severity) query.set('severity', params.severity);

  const res = await fetch(`${API_BASE}/findings?${query.toString()}`);
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, newStatus, note })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to record review action');
  return json.data;
}

export async function fetchReport(applicationId: string): Promise<ScrutinyReportData> {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/report`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch report');
  return json.data;
}

export async function fetchAuditEvents(): Promise<AuditEvent[]> {
  const res = await fetch(`${API_BASE}/audit`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchRules(): Promise<Rule[]> {
  const res = await fetch(`${API_BASE}/rules`);
  const json = await res.json();
  return json.data || [];
}

export async function updateRule(ruleId: string, updates: Partial<Rule>): Promise<Rule> {
  const res = await fetch(`${API_BASE}/rules/${ruleId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to update rule');
  return json.data;
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await fetch(`${API_BASE}/user`);
  const json = await res.json();
  return json.data;
}

export async function switchCurrentUser(user: User): Promise<User> {
  const res = await fetch(`${API_BASE}/user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  const json = await res.json();
  return json.data;
}

export async function resetDemoData(): Promise<void> {
  await fetch(`${API_BASE}/reset-demo`, { method: 'POST' });
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to execute deep scrutiny synthesis');
  return json.data;
}
