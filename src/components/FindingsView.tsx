import React, { useState } from 'react';
import {
  Search,
  ExternalLink,
  ArrowRight,
  Sparkles,
  RotateCw,
  AlertCircle,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { Finding, Application } from '../types/index.ts';
import { StatusBadge } from '../shared/components/StatusBadge.tsx';
import { EmptyState } from '../shared/components/EmptyState.tsx';
import { explainFinding, BharatCodeExplainResult } from '../services/api.ts';

interface FindingsViewProps {
  findings: Finding[];
  applications: Application[];
  onSelectApplication: (app: Application) => void;
  onOpenDocumentReview: (app: Application, docId?: string, page?: number) => void;
  onOpenReviewAction: (finding: Finding) => void;
}

export const FindingsView: React.FC<FindingsViewProps> = ({
  findings,
  applications,
  onSelectApplication,
  onOpenDocumentReview,
  onOpenReviewAction
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState<'bharatcode-qwen' | 'bharatcode-deepseek' | 'adaption-form2fact'>('bharatcode-qwen');
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'ta'>('en');
  const [explanations, setExplanations] = useState<Record<string, BharatCodeExplainResult>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<Record<string, boolean>>({});

  const handleExplain = async (findingId: string) => {
    setLoadingExplanation((prev) => ({ ...prev, [findingId]: true }));
    try {
      const res = await explainFinding(findingId, {
        providerId: selectedProvider,
        preferredLanguage: selectedLanguage
      });
      setExplanations((prev) => ({ ...prev, [findingId]: res }));
    } catch (err: any) {
      setExplanations((prev) => ({
        ...prev,
        [findingId]: {
          success: false,
          status: 'error',
          error: err.message || 'Failed to connect to AI explanation service'
        }
      }));
    } finally {
      setLoadingExplanation((prev) => ({ ...prev, [findingId]: false }));
    }
  };

  const domainPills = [
    { id: 'all', label: 'All Domains', count: findings.length },
    {
      id: 'Land & Tenancy',
      label: 'Land & Tenancy',
      count: findings.filter((f) => f.category === 'Land & Tenancy').length
    },
    {
      id: 'Safety & Compliance',
      label: 'Safety & Compliance',
      count: findings.filter((f) => f.category === 'Safety & Compliance').length
    },
    {
      id: 'Identity & Registration',
      label: 'Identity & Registration',
      count: findings.filter((f) => f.category === 'Identity & Registration').length
    },
    {
      id: 'Approvals & Capacity',
      label: 'Approvals & Capacity',
      count: findings.filter((f) => f.category === 'Approvals & Capacity').length
    }
  ];

  const filtered = findings.filter((f) => {
    const app = applications.find((a) => a.id === f.applicationId);
    const matchSearch =
      f.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.explanation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app?.institutionName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app?.referenceNumber || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'all' || f.status === statusFilter;
    const matchSeverity = severityFilter === 'all' || f.severity === severityFilter;
    const matchCategory = categoryFilter === 'all' || f.category === categoryFilter;

    return matchSearch && matchStatus && matchSeverity && matchCategory;
  });

  return (
    <div className="px-6 lg:px-8 py-8 pb-24 max-w-[1440px] mx-auto space-y-6 text-sm">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#0F172A] tracking-tight">
          Findings & Discrepancies
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Inspect cross-document mismatches, rule citations, and officer resolution notes topic by topic.
        </p>
      </div>

      {/* Sticky Domain Topic & Filter Bar */}
      <div className="sticky top-0 z-20 -mx-6 px-6 lg:-mx-8 lg:px-8 py-3.5 bg-[#F8FAFC]/95 backdrop-blur-md border-y border-[#E2E8F0] space-y-3">
        {/* Topic Domain Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {domainPills.map((pill) => {
            const isActive = categoryFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setCategoryFilter(pill.id)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#EEF2FF] text-[#4F46E5] border-[#4F46E5] font-semibold'
                    : 'bg-[#FFFFFF] text-[#64748B] hover:text-[#0F172A] border-[#E2E8F0]'
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded font-mono tabular-nums text-xs ${
                    isActive ? 'bg-[#4F46E5] text-white' : 'bg-[#F1F5F9] text-[#475569]'
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by reference, title, or institution..."
              className="w-full pl-10 pr-3.5 py-2 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] text-[#0F172A] text-sm placeholder:text-[#94A3B8] focus:outline-hidden focus:border-[#4F46E5]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <span className="text-xs font-mono tabular-nums text-[#64748B]">
              Showing {filtered.length} of {findings.length} findings
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] text-[#0F172A] font-medium focus:outline-hidden focus:border-[#4F46E5]"
              >
                <option value="all">All Statuses ({findings.length})</option>
                <option value="Open">Open</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Dismissed">Dismissed</option>
                <option value="Unable to Determine">Unable to Determine</option>
              </select>

              <select
                aria-label="Filter by severity"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3.5 py-2 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] text-[#0F172A] font-medium focus:outline-hidden focus:border-[#4F46E5]"
              >
                <option value="all">All Severities</option>
                <option value="Material Discrepancy">Material Discrepancy</option>
                <option value="Information Missing">Information Missing</option>
                <option value="Attention Required">Attention Required</option>
              </select>
            </div>
          </div>
        </div>

        {/* Multi-Model AI Orchestration Engine Selector */}
        <div className="pt-2 border-t border-[#E2E8F0]/70 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span className="font-semibold text-[#0F172A]">AI Explanation Provider:</span>
            <div className="inline-flex rounded-md p-0.5 bg-[#FFFFFF] border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setSelectedProvider('bharatcode-qwen')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  selectedProvider === 'bharatcode-qwen'
                    ? 'bg-[#EEF2FF] text-[#4F46E5] font-semibold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                BharatCode Qwen 3.8 27B
              </button>
              <button
                type="button"
                onClick={() => setSelectedProvider('bharatcode-deepseek')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  selectedProvider === 'bharatcode-deepseek'
                    ? 'bg-[#EEF2FF] text-[#4F46E5] font-semibold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                DeepSeek v4.1 Flash
              </button>
              <button
                type="button"
                onClick={() => setSelectedProvider('adaption-form2fact')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  selectedProvider === 'adaption-form2fact'
                    ? 'bg-[#EEF2FF] text-[#4F46E5] font-semibold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Adaption Model (Draft)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#64748B] text-xs">Language:</span>
            <div className="inline-flex rounded-md p-0.5 bg-[#FFFFFF] border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setSelectedLanguage('en')}
                className={`px-2 py-0.5 text-xs font-medium rounded cursor-pointer ${
                  selectedLanguage === 'en' ? 'bg-[#4F46E5] text-white font-semibold' : 'text-[#64748B]'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setSelectedLanguage('ta')}
                className={`px-2 py-0.5 text-xs font-medium rounded cursor-pointer ${
                  selectedLanguage === 'ta' ? 'bg-[#4F46E5] text-white font-semibold' : 'text-[#64748B]'
                }`}
              >
                தமிழ்
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <EmptyState
            title="No matching findings"
            description="No discrepancies match your search query, status, or domain filter. Adjust your filter criteria to inspect other items."
            action={
              searchTerm || statusFilter !== 'all' || severityFilter !== 'all' || categoryFilter !== 'all'
                ? {
                    label: 'Reset Filters',
                    onClick: () => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setSeverityFilter('all');
                      setCategoryFilter('all');
                    }
                  }
                : undefined
            }
          />
        ) : (
          filtered.map((finding) => {
            const app = applications.find((a) => a.id === finding.applicationId);
            return (
              <div
                key={finding.id}
                className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-6 space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 pb-3.5 border-b border-[#E2E8F0]">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[#64748B] mb-1">
                      <span className="font-semibold text-[#0F172A]">{finding.reference}</span>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => app && onSelectApplication(app)}
                        className="text-[#4F46E5] hover:underline font-semibold"
                      >
                        {app?.referenceNumber || 'Application'}
                      </button>
                      <span>·</span>
                      <span className="text-[#64748B]">
                        {finding.ruleKey} ({finding.ruleVersion})
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-[#0F172A]">{finding.title}</h3>
                    <div className="text-xs text-[#64748B] mt-0.5">{app?.institutionName}</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
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
                    <StatusBadge status={finding.status} size="sm" />
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
                      <span>Source Citation</span>
                      {app && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenDocumentReview(
                              app,
                              finding.evidenceList[0]?.documentId,
                              finding.evidenceList[0]?.pageNumber
                            )
                          }
                          className="text-[#4F46E5] hover:text-[#4338CA] font-semibold inline-flex items-center gap-1"
                        >
                          <span>Inspect Page {finding.evidenceList[0]?.pageNumber}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {finding.evidenceList.map((ev) => (
                      <div key={ev.id} className="text-[#0F172A] text-sm">
                        <span className="font-medium">{ev.documentName}</span> (p. {ev.pageNumber}):{' '}
                        <span className="italic text-[#64748B]">"{ev.evidenceText}"</span>
                      </div>
                    ))}
                  </div>
                )}

                {finding.reviewerDecisionReason && (
                  <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs">
                    <div className="font-medium text-[#64748B]">
                      Reviewer Note ({finding.assignedReviewer || 'Reviewer'}):
                    </div>
                    <div className="text-[#0F172A] mt-1 font-medium text-sm">
                      {finding.reviewerDecisionReason}
                    </div>
                  </div>
                )}

                {/* Multi-Model AI Explanation Card */}
                {explanations[finding.id] && (
                  <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#DCFCE7]">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#16A34A]" />
                        <span className="font-semibold text-[#166534] text-sm">
                          AI Evidence Explanation · {explanations[finding.id].providerId || selectedProvider} ({explanations[finding.id].modelUsed || 'AI Model'})
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] font-mono text-[10px]">
                          Advisory Reasoning
                        </span>
                      </div>
                      {explanations[finding.id].latencyMs && (
                        <span className="text-[#15803D] font-mono text-[11px]">
                          {explanations[finding.id].latencyMs}ms
                        </span>
                      )}
                    </div>

                    {explanations[finding.id].success && explanations[finding.id].data ? (
                      <div className="space-y-2 text-[#166534]">
                        <div className="font-semibold text-[#14532D] text-sm">
                          {explanations[finding.id].data?.summary}
                        </div>
                        <p className="text-xs text-[#166534] leading-relaxed">
                          {explanations[finding.id].data?.reasoning}
                        </p>

                        {/* Grounding Safeguard Alerts */}
                        {explanations[finding.id].groundingAlerts && explanations[finding.id].groundingAlerts!.length > 0 && (
                          <div className="pt-2 border-t border-[#DCFCE7] text-[11px] text-[#0369A1] bg-[#F0F9FF] p-2.5 rounded border border-[#BAE6FD] space-y-0.5">
                            <span className="font-semibold">Evidence Grounding Invariant Guards:</span>
                            {explanations[finding.id].groundingAlerts!.map((alert, i) => (
                              <div key={i}>• {alert}</div>
                            ))}
                          </div>
                        )}

                        {/* Verified Citations */}
                        {(explanations[finding.id].data?.evidence_references || []).length > 0 && (
                          <div className="pt-2 border-t border-[#DCFCE7] space-y-1">
                            <span className="font-medium text-[#14532D]">Grounded Source Citations:</span>
                            {explanations[finding.id].data?.evidence_references.map((ref, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[#15803D] pl-2 border-l-2 border-[#86EFAC]">
                                <span>{ref.documentName} (p. {ref.pageNumber})</span>
                                {app && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenDocumentReview(app, finding.evidenceList[0]?.documentId, ref.pageNumber)}
                                    className="text-[#16A34A] hover:underline font-semibold flex items-center gap-1"
                                  >
                                    <span>Verify Page</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Explicit Uncertainties */}
                        {(explanations[finding.id].data?.uncertainties || []).length > 0 && (
                          <div className="pt-2 border-t border-[#DCFCE7] text-[11px] text-[#854D0E] bg-[#FEF9C3] p-2.5 rounded border border-[#FEF08A] space-y-0.5">
                            <span className="font-semibold">Explicit Uncertainties / Discrepancies Noted:</span>
                            {explanations[finding.id].data?.uncertainties.map((u, i) => (
                              <div key={i}>• {u}</div>
                            ))}
                          </div>
                        )}

                        <div className="text-[10px] text-[#15803D]/80 pt-1 italic">
                          * Advisory AI explanation. Authoritative Form2Fact classification and human reviewer decisions remain strictly final.
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-xs text-[#991B1B] bg-[#FEF2F2] p-3 rounded border border-[#FECDD3]">
                        <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626] mt-0.5" />
                        <div>
                          <div className="font-semibold">
                            {explanations[finding.id].status === 'unavailable'
                              ? `${selectedProvider === 'bharatcode-deepseek' ? 'DeepSeek' : selectedProvider === 'adaption-form2fact' ? 'Adaption' : 'BharatCode'} API Ready (Credentials/Endpoint Not Configured)`
                              : explanations[finding.id].status === 'subscription_required'
                              ? `${selectedProvider === 'bharatcode-deepseek' ? 'DeepSeek' : 'BharatCode'} API Key Valid (Subscription Plan Required)`
                              : 'AI Explanation Unavailable'}
                          </div>
                          <div className="text-[11px] text-[#B91C1C] mt-0.5">
                            {explanations[finding.id].error || 'Service returned an error.'}
                          </div>
                          {explanations[finding.id].status === 'unavailable' && (
                            <div className="text-[11px] text-[#64748B] mt-1">
                              Configure <code className="bg-[#F1F5F9] px-1 py-0.5 rounded text-[#0F172A]">{selectedProvider === 'bharatcode-deepseek' ? 'BHARATCODE_DEEPSEEK_API_KEY' : selectedProvider === 'adaption-form2fact' ? 'ADAPTION_MODEL_ENDPOINT' : 'BHARATCODE_API_KEY'}</code> in project environment to generate live AI explanations.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-3.5 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                  <div className="text-[#64748B] font-mono tabular-nums">
                    Updated {new Date(finding.updatedAt).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-3">
                    {app && (
                      <button
                        type="button"
                        onClick={() => onSelectApplication(app)}
                        className="px-3.5 py-2 font-medium text-[#0F172A] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-md inline-flex items-center gap-1.5"
                      >
                        <span>Open Application</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={loadingExplanation[finding.id]}
                      onClick={() => handleExplain(finding.id)}
                      className="px-3.5 py-2 font-medium text-[#15803D] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] rounded-md inline-flex items-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      {loadingExplanation[finding.id] ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Consulting {selectedProvider === 'bharatcode-deepseek' ? 'DeepSeek' : selectedProvider === 'adaption-form2fact' ? 'Adaption' : 'Qwen'}...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Explain with {selectedProvider === 'bharatcode-deepseek' ? 'DeepSeek' : selectedProvider === 'adaption-form2fact' ? 'Adaption' : 'Qwen'}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenReviewAction(finding)}
                      className="px-4 py-2 font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-md transition-colors"
                    >
                      Record Decision
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
