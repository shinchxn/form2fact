import React, { useState } from 'react';
import {
  ArrowLeft,
  RotateCw,
  FileSpreadsheet,
  FileSearch,
  Upload,
  Trash2,
  Edit3,
  CheckCircle,
  ExternalLink,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { Application, DocumentRecord, ExtractedField, Finding, AuditEvent } from '../types/index.ts';
import { runValidation, deleteDocument, uploadDocument, runDeepScrutiny, DeepScrutinyMemo } from '../services/api.ts';
import { ViewType } from './Sidebar.tsx';

interface ApplicationDetailViewProps {
  application: Application;
  documents: DocumentRecord[];
  findings: Finding[];
  extractedFields: ExtractedField[];
  auditEvents: AuditEvent[];
  onBack: () => void;
  onOpenDocumentReview: (docId?: string, page?: number) => void;
  onOpenReport: () => void;
  onOpenCorrection: (field: ExtractedField) => void;
  onOpenReviewAction: (finding: Finding) => void;
  onRefreshData: () => void;
  onNavigate?: (view: ViewType) => void;
}

export const ApplicationDetailView: React.FC<ApplicationDetailViewProps> = ({
  application,
  documents,
  findings,
  extractedFields,
  auditEvents,
  onBack,
  onOpenDocumentReview,
  onOpenReport,
  onOpenCorrection,
  onOpenReviewAction,
  onRefreshData,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'findings' | 'comparator' | 'documents' | 'audit'>('all');
  const [isValidating, setIsValidating] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deepScrutinyMemo, setDeepScrutinyMemo] = useState<DeepScrutinyMemo | null>(null);
  const [isRunningDeepScrutiny, setIsRunningDeepScrutiny] = useState(false);
  const [scrutinyQuery, setScrutinyQuery] = useState('');

  const handleRunValidation = async () => {
    setIsValidating(true);
    try {
      await runValidation(application.id);
      onRefreshData();
    } catch (err: any) {
      setUploadError(err.message || 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRunDeepScrutiny = async () => {
    setIsRunningDeepScrutiny(true);
    try {
      const memo = await runDeepScrutiny(application.id, scrutinyQuery);
      setDeepScrutinyMemo(memo);
      onRefreshData();
    } catch (err: any) {
      setUploadError(err.message || 'Deep scrutiny synthesis failed');
    } finally {
      setIsRunningDeepScrutiny(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF documents are supported.');
      return;
    }
    setUploadError(null);

    let docType = 'Land Lease Deed';
    const name = file.name.toLowerCase();
    if (name.includes('safety')) docType = 'Building Safety Certificate';
    else if (name.includes('fire')) docType = 'Fire Safety NOC';
    else if (name.includes('trust')) docType = 'Society / Trust Registration Certificate';

    try {
      await uploadDocument(application.id, file, docType);
      onRefreshData();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document');
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await deleteDocument(docId);
      onRefreshData();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to remove document');
    }
  };

  const scrollToSection = (id: string) => {
    setActiveTab('all');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const openFindings = findings.filter(
    (f) => f.status === 'Open' || f.status === 'Under Review' || f.status === 'Unable to Determine'
  );

  const showFindings = activeTab === 'all' || activeTab === 'findings';
  const showComparator = activeTab === 'all' || activeTab === 'comparator';
  const showDocuments = activeTab === 'all' || activeTab === 'documents';
  const showAudit = activeTab === 'all' || activeTab === 'audit';

  return (
    <div className="px-6 lg:px-8 py-8 pb-24 max-w-[1440px] mx-auto space-y-8 text-sm">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>View All Applications</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onOpenDocumentReview()}
            className="px-3.5 py-2 text-xs font-medium text-[#0F172A] bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <FileSearch className="w-4 h-4 text-[#4F46E5]" />
            <span>Open Evidence Viewer</span>
          </button>

          <button
            type="button"
            onClick={handleRunDeepScrutiny}
            disabled={isRunningDeepScrutiny}
            aria-busy={isRunningDeepScrutiny}
            className="px-3.5 py-2 text-xs font-medium text-[#0F172A] bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
          >
            <Cpu className={`w-4 h-4 text-[#4F46E5] ${isRunningDeepScrutiny ? 'animate-spin' : ''}`} />
            <span>{isRunningDeepScrutiny ? 'Synthesizing...' : 'Deep Scrutiny'}</span>
          </button>

          <button
            type="button"
            onClick={handleRunValidation}
            disabled={isValidating}
            aria-busy={isValidating}
            className="px-3.5 py-2 text-xs font-medium text-[#0F172A] bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 text-[#64748B] ${isValidating ? 'animate-spin' : ''}`} />
            <span>{isValidating ? 'Validating...' : 'Re-run Checks'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenReport}
            className="px-4 py-2 text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-md transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Dossier</span>
          </button>
        </div>
      </div>

      {/* Institutional Header & Key Declared Metrics */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg overflow-hidden">
        <div className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#E2E8F0]">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1.5 font-mono">
              <span className="font-semibold text-[#0F172A]">{application.referenceNumber}</span>
              <span>·</span>
              <span>{application.applicationType}</span>
              <span>·</span>
              <span>AY {application.declaredDetails.applicationYear}</span>
            </div>
            <h1 className="text-xl font-semibold text-[#0F172A] tracking-tight">
              {application.institutionName}
            </h1>
            <p className="text-sm text-[#64748B] mt-1">
              Sponsoring Entity:{' '}
              <span className="font-medium text-[#0F172A]">
                {application.declaredDetails.societyOrTrustName}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-3 py-1 text-xs font-medium rounded-md border ${
                application.reviewStatus === 'Review Completed'
                  ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                  : application.reviewStatus === 'Discrepancies Confirmed'
                  ? 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3]'
                  : 'bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]'
              }`}
            >
              {application.reviewStatus}
            </span>
          </div>
        </div>

        {/* Declared Parameters Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0] bg-[#F8FAFC]/60 text-sm">
          <div className="p-5">
            <div className="text-xs font-medium text-[#64748B]">Campus Location</div>
            <div className="font-semibold text-[#0F172A] truncate mt-1">
              {application.declaredDetails.address}
            </div>
            <div className="text-xs text-[#64748B] font-mono mt-0.5">
              PIN {application.declaredDetails.pinCode}
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-[#64748B]">Declared Lease Expiry</div>
            <div className="font-semibold text-[#0F172A] font-mono tabular-nums mt-1">
              {application.declaredDetails.leaseExpiryDate}
            </div>
            <div className="text-xs text-[#64748B] mt-0.5">Min 30-year requirement</div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-[#64748B]">Declared Land Area</div>
            <div className="font-semibold text-[#0F172A] font-mono tabular-nums mt-1">
              {application.declaredDetails.landAreaAcres} Acres
            </div>
            <div className="text-xs text-[#64748B] mt-0.5">Contiguous campus norm</div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-[#64748B]">Sanctioned Intake</div>
            <div className="font-semibold text-[#0F172A] font-mono tabular-nums mt-1">
              {application.declaredDetails.sanctionedIntake} Seats
            </div>
            <div className="text-xs text-[#64748B] truncate mt-0.5">
              {application.declaredDetails.previousApprovalRef || 'New Intake'}
            </div>
          </div>
        </div>
      </div>

      {/* Deep Scrutiny Synthesis Panel */}
      {deepScrutinyMemo && (
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-6 space-y-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
            <div>
              <div className="text-xs font-mono text-[#4F46E5] font-medium">
                {deepScrutinyMemo.modelUsed} · {deepScrutinyMemo.thinkingMode}
              </div>
              <h2 className="text-lg font-semibold text-[#0F172A] mt-0.5">
                Cross-Document Scrutiny Synthesis
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setDeepScrutinyMemo(null)}
              className="text-xs text-[#64748B] hover:text-[#0F172A] font-medium"
            >
              Dismiss
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="scrutiny-query-input" className="text-[#64748B] font-medium shrink-0">
              Focus query:
            </label>
            <input
              id="scrutiny-query-input"
              type="text"
              value={scrutinyQuery}
              onChange={(e) => setScrutinyQuery(e.target.value)}
              placeholder="Ask a specific cross-document verification question..."
              className="flex-1 px-3.5 py-2 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] text-[#0F172A] focus:bg-white focus:border-[#4F46E5] focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleRunDeepScrutiny}
              disabled={isRunningDeepScrutiny}
              className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-medium rounded-md whitespace-nowrap disabled:opacity-50"
            >
              Re-run
            </button>
          </div>

          <div className="text-[#0F172A] leading-relaxed whitespace-pre-line">
            {deepScrutinyMemo.summary}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-[#E2E8F0]">
            <div>
              <div className="font-semibold text-[#0F172A] mb-2">Observations</div>
              <ul className="list-disc pl-5 space-y-1.5 text-[#64748B] text-sm">
                {deepScrutinyMemo.crossDocumentObservations.map((obs, idx) => (
                  <li key={idx}>{obs}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-[#0F172A] mb-2">Recommended Actions</div>
              <ul className="list-disc pl-5 space-y-1.5 text-[#64748B] text-sm">
                {deepScrutinyMemo.recommendedOfficerActions.map((act, idx) => (
                  <li key={idx}>{act}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-xs text-[#64748B] pt-2 border-t border-[#F1F5F9]">
            {deepScrutinyMemo.uncertaintyNotice}
          </div>
        </div>
      )}

      {/* Sticky Topic Selector & Quick-Jump Bar */}
      <div className="sticky top-0 z-20 -mx-6 px-6 lg:-mx-8 lg:px-8 py-3 bg-[#F8FAFC]/95 backdrop-blur-md border-y border-[#E2E8F0] flex flex-wrap items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Application Scrutiny Sections"
          className="flex flex-wrap items-center gap-2 text-xs font-medium"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-md border transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#EEF2FF] text-[#4F46E5] border-[#4F46E5] font-semibold'
                : 'bg-[#FFFFFF] text-[#64748B] hover:text-[#0F172A] border-[#E2E8F0]'
            }`}
          >
            <span>All Topics (Scroll View)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'findings'}
            onClick={() => setActiveTab('findings')}
            className={`px-3.5 py-1.5 rounded-md border transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'findings'
                ? 'bg-[#EEF2FF] text-[#4F46E5] border-[#4F46E5] font-semibold'
                : 'bg-[#FFFFFF] text-[#64748B] hover:text-[#0F172A] border-[#E2E8F0]'
            }`}
          >
            <span>01 · Findings</span>
            <span
              className={`px-1.5 py-0.5 rounded font-mono tabular-nums text-xs ${
                openFindings.length > 0
                  ? 'bg-[#FFF1F2] text-[#9F1239] border border-[#FECDD3] font-semibold'
                  : 'bg-[#F1F5F9] text-[#475569]'
              }`}
            >
              {findings.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'comparator'}
            onClick={() => setActiveTab('comparator')}
            className={`px-3.5 py-1.5 rounded-md border transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'comparator'
                ? 'bg-[#EEF2FF] text-[#4F46E5] border-[#4F46E5] font-semibold'
                : 'bg-[#FFFFFF] text-[#64748B] hover:text-[#0F172A] border-[#E2E8F0]'
            }`}
          >
            <span>02 · Extracted Fields</span>
            <span className="px-1.5 py-0.5 rounded font-mono tabular-nums text-xs bg-[#F1F5F9] text-[#475569]">
              {extractedFields.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'documents'}
            onClick={() => setActiveTab('documents')}
            className={`px-3.5 py-1.5 rounded-md border transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-[#EEF2FF] text-[#4F46E5] border-[#4F46E5] font-semibold'
                : 'bg-[#FFFFFF] text-[#64748B] hover:text-[#0F172A] border-[#E2E8F0]'
            }`}
          >
            <span>03 · Documents</span>
            <span className="px-1.5 py-0.5 rounded font-mono tabular-nums text-xs bg-[#F1F5F9] text-[#475569]">
              {documents.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'audit'}
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-1.5 rounded-md border transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-[#EEF2FF] text-[#4F46E5] border-[#4F46E5] font-semibold'
                : 'bg-[#FFFFFF] text-[#64748B] hover:text-[#0F172A] border-[#E2E8F0]'
            }`}
          >
            <span>04 · Audit Trail</span>
          </button>
        </div>

        {activeTab === 'all' && (
          <div className="hidden xl:flex items-center gap-2 text-xs text-[#64748B]">
            <span>Jump:</span>
            <button
              type="button"
              onClick={() => scrollToSection('detail-findings')}
              className="hover:text-[#4F46E5] font-medium"
            >
              Findings
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => scrollToSection('detail-fields')}
              className="hover:text-[#4F46E5] font-medium"
            >
              Fields
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => scrollToSection('detail-docs')}
              className="hover:text-[#4F46E5] font-medium"
            >
              Documents
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => scrollToSection('detail-audit')}
              className="hover:text-[#4F46E5] font-medium"
            >
              Audit
            </button>
          </div>
        )}
      </div>

      {/* TOPIC 1: Findings */}
      {showFindings && (
        <section id="detail-findings" className="scroll-mt-20 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0F172A]">
                01 · Discrepancy Findings ({findings.length})
              </h2>
              <p className="text-sm text-[#64748B] mt-0.5">
                Rule comparison results between applicant claims and extracted document values.
              </p>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('findings')}
                className="px-3.5 py-2 text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-md transition-colors inline-flex items-center gap-1.5 shrink-0"
              >
                <span>View All Global Findings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {findings.length === 0 ? (
            <div className="p-10 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-center space-y-2">
              <CheckCircle className="w-7 h-7 text-[#10B981] mx-auto" />
              <h3 className="font-semibold text-base text-[#0F172A]">
                All validation checks passed
              </h3>
              <p className="text-sm text-[#64748B] max-w-md mx-auto">
                Declared institutional claims match the extracted evidence across all uploaded PDFs.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {findings.map((finding) => (
                <div
                  key={finding.id}
                  className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-6 space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-[#64748B] font-mono">
                        <span className="font-semibold text-[#0F172A]">{finding.reference}</span>
                        <span>·</span>
                        <span className="font-medium text-[#4F46E5]">
                          {finding.ruleKey} {finding.ruleVersion}
                        </span>
                        <span>·</span>
                        <span>{finding.category}</span>
                      </div>
                      <h3 className="text-base font-semibold text-[#0F172A] mt-1">
                        {finding.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 text-xs font-medium rounded border ${
                          finding.severity === 'Material Discrepancy'
                            ? 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3]'
                            : finding.severity === 'Information Missing'
                            ? 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
                            : 'bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]'
                        }`}
                      >
                        {finding.severity}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-medium rounded border ${
                          finding.status === 'Confirmed'
                            ? 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3]'
                            : finding.status === 'Dismissed'
                            ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                            : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A]'
                        }`}
                      >
                        {finding.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-[#0F172A] leading-relaxed">{finding.explanation}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm items-stretch">
                    <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md flex flex-col justify-between">
                      <div className="text-xs font-medium text-[#64748B] mb-1">
                        Declared Claim
                      </div>
                      <div className="font-semibold text-[#0F172A] font-mono">
                        {finding.declaredValue || 'N/A'}
                      </div>
                    </div>

                    <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md flex flex-col justify-between">
                      <div className="text-xs font-medium text-[#64748B] mb-1">
                        Document Evidence
                      </div>
                      <div className="font-semibold text-[#E11D48] font-mono">
                        {finding.evidenceValue || 'Missing'}
                      </div>
                    </div>
                  </div>

                  {finding.evidenceList.length > 0 && (
                    <div className="p-4 bg-[#F8FAFC] rounded-md border border-[#E2E8F0] text-xs space-y-2">
                      <div className="font-semibold text-[#64748B] flex items-center justify-between">
                        <span>Source Evidence</span>
                        <button
                          type="button"
                          onClick={() =>
                            onOpenDocumentReview(
                              finding.evidenceList[0]?.documentId,
                              finding.evidenceList[0]?.pageNumber
                            )
                          }
                          className="text-[#4F46E5] hover:text-[#4338CA] font-semibold inline-flex items-center gap-1"
                        >
                          <span>Open Page {finding.evidenceList[0]?.pageNumber} in Viewer</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {finding.evidenceList.map((ev) => (
                        <div key={ev.id} className="text-[#0F172A] text-sm">
                          <span className="font-medium">{ev.documentName}</span> (p.{' '}
                          {ev.pageNumber}):{' '}
                          <span className="italic text-[#64748B]">"{ev.evidenceText}"</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {finding.reviewerDecisionReason && (
                    <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs">
                      <div className="font-medium text-[#64748B]">
                        Reviewer Note ({finding.assignedReviewer}):
                      </div>
                      <div className="text-[#0F172A] mt-1 font-medium text-sm">
                        {finding.reviewerDecisionReason}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                    <button
                      type="button"
                      onClick={() => onOpenReviewAction(finding)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-md transition-colors"
                    >
                      Record Decision
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TOPIC 2: Extracted Fields */}
      {showComparator && (
        <section id="detail-fields" className="scroll-mt-20 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0F172A]">
                02 · Extracted Fields & Citations ({extractedFields.length})
              </h2>
              <p className="text-sm text-[#64748B] mt-0.5">
                Structured values parsed from supporting PDFs with exact page citations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenDocumentReview()}
              className="px-3.5 py-2 text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-md transition-colors inline-flex items-center gap-1.5 shrink-0"
            >
              <span>Inspect in Evidence Viewer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed min-w-[1040px] text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs uppercase tracking-wider text-[#64748B] font-semibold">
                    <th className="py-3.5 px-5 w-[18%]">Field</th>
                    <th className="py-3.5 px-5 w-[24%]">Raw Value</th>
                    <th className="py-3.5 px-5 w-[18%]">Normalized</th>
                    <th className="py-3.5 px-5 w-[21%]">Source Citation</th>
                    <th className="py-3.5 px-5 w-[11%] text-right">Confidence</th>
                    <th className="py-3.5 px-5 w-[8%] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {extractedFields.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#64748B]">
                        No extracted fields available.
                      </td>
                    </tr>
                  ) : (
                    extractedFields.map((field) => {
                      const doc = documents.find((d) => d.id === field.documentId);
                      return (
                        <tr key={field.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-4 px-5">
                            <div className="font-semibold text-[#0F172A] truncate">{field.fieldLabel}</div>
                            <div className="text-xs font-mono text-[#64748B] truncate mt-0.5">{field.fieldName}</div>
                          </td>

                          <td className="py-4 px-5 font-mono tabular-nums text-xs text-[#0F172A] truncate">
                            {field.rawValue}
                          </td>

                          <td className="py-4 px-5 font-mono tabular-nums text-xs font-semibold text-[#4F46E5] truncate">
                            {field.isCorrected ? (
                              <span className="text-[#D97706]">
                                {field.correctedValue} (Corrected)
                              </span>
                            ) : (
                              field.normalizedValue
                            )}
                          </td>

                          <td className="py-4 px-5 truncate">
                            <button
                              type="button"
                              onClick={() =>
                                onOpenDocumentReview(field.documentId, field.pageNumber)
                              }
                              className="text-[#4F46E5] hover:underline flex items-center gap-1.5 truncate text-left text-xs font-medium"
                            >
                              <span className="truncate">
                                {doc?.originalFilename || 'Document'}
                              </span>
                              <span className="font-mono tabular-nums font-semibold shrink-0">
                                (p. {field.pageNumber})
                              </span>
                            </button>
                          </td>

                          <td className="py-4 px-5 text-right text-xs text-[#64748B] whitespace-nowrap">
                            {field.confidence !== null ? (
                              <div className="font-mono tabular-nums font-semibold text-[#0F172A]">
                                {(field.confidence * 100).toFixed(0)}%
                              </div>
                            ) : (
                              <div className="font-mono text-[#64748B]">—</div>
                            )}
                            <div className="truncate text-[#64748B] mt-0.5">{field.extractionMethod}</div>
                          </td>

                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => onOpenCorrection(field)}
                              className="px-3 py-1.5 text-xs font-medium text-[#0F172A] hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-md transition-colors inline-flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#64748B]" />
                              <span>Correct</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TOPIC 3: Documents */}
      {showDocuments && (
        <section id="detail-docs" className="scroll-mt-20 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0F172A]">
                03 · Attached PDF Dockets ({documents.length})
              </h2>
              <p className="text-sm text-[#64748B] mt-0.5">
                Uploaded institutional evidence files and SHA-256 verification status.
              </p>
            </div>
            <label className="px-4 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload PDF</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {uploadError && (
            <div
              role="alert"
              className="p-3.5 bg-[#FFF1F2] border border-[#FECDD3] rounded-md text-xs text-[#9F1239]"
            >
              {uploadError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-5 flex flex-col justify-between gap-4 h-full"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="truncate">
                      <div className="font-semibold text-base text-[#0F172A] truncate">
                        {doc.originalFilename}
                      </div>
                      <div className="text-xs text-[#64748B] mt-0.5 font-mono tabular-nums">
                        {doc.documentType} · {doc.pageCount} pages ·{' '}
                        {(doc.sizeBytes / 1024).toFixed(0)} KB
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 text-xs font-medium rounded border shrink-0 ${
                        doc.processingStatus === 'Extracted'
                          ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                          : doc.processingStatus === 'Scanned Unreadable'
                          ? 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
                          : 'bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]'
                      }`}
                    >
                      {doc.processingStatus}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-[#64748B] truncate">
                    SHA-256: {doc.checksum}
                  </div>
                </div>

                <div className="pt-3.5 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => onOpenDocumentReview(doc.id)}
                    className="text-[#4F46E5] hover:text-[#4338CA] font-semibold flex items-center gap-1.5"
                  >
                    <FileSearch className="w-3.5 h-3.5" />
                    <span>Inspect Evidence</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteDoc(doc.id)}
                    aria-label={`Remove ${doc.originalFilename} from docket`}
                    className="text-[#64748B] hover:text-[#E11D48] px-2.5 py-1 rounded hover:bg-[#F8FAFC] transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TOPIC 4: Audit Trail */}
      {showAudit && (
        <section id="detail-audit" className="scroll-mt-20 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0F172A]">
                04 · Application Audit Trail ({auditEvents.length})
              </h2>
              <p className="text-sm text-[#64748B] mt-0.5">
                Chronological history of extractions, rule checks, and reviewer actions for this docket.
              </p>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('audit')}
                className="px-3.5 py-2 text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-md transition-colors inline-flex items-center gap-1.5 shrink-0"
              >
                <span>View Global Audit Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed min-w-[980px] text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs uppercase tracking-wider font-semibold text-[#64748B]">
                    <th className="py-3.5 px-5 w-[16%] font-mono">Timestamp</th>
                    <th className="py-3.5 px-5 w-[20%]">Action</th>
                    <th className="py-3.5 px-5 w-[15%]">Actor</th>
                    <th className="py-3.5 px-5 w-[15%]">Entity Ref</th>
                    <th className="py-3.5 px-5 w-[34%]">Mutation & Audit Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {auditEvents.map((e) => (
                    <tr key={e.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-4 px-5 font-mono tabular-nums text-xs text-[#64748B] whitespace-nowrap">
                        {new Date(e.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-4 px-5 font-semibold text-[#0F172A] truncate">
                        {e.action}
                      </td>
                      <td className="py-4 px-5 text-[#0F172A] truncate">
                        {e.actorName}
                      </td>
                      <td className="py-4 px-5 font-mono text-xs font-medium text-[#4F46E5] truncate">
                        {e.entityReference}
                      </td>
                      <td className="py-4 px-5 text-xs text-[#64748B] space-y-1">
                        {e.beforeValue && e.afterValue && (
                          <div className="text-[#0F172A]">
                            Changed from <span className="line-through text-[#64748B]">{e.beforeValue}</span>{' '}
                            to <span className="font-semibold text-[#4F46E5]">{e.afterValue}</span>
                          </div>
                        )}
                        {e.note && <div className="truncate">{e.note}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
