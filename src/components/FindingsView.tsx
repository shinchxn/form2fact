import React, { useState } from 'react';
import {
  Search,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { Finding, Application } from '../types/index.ts';

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
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-12 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-center text-[#64748B] space-y-2">
            <p className="font-semibold text-base text-[#0F172A]">No matching findings</p>
            <p className="text-sm">Adjust your search query or domain filter to view results.</p>
          </div>
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
