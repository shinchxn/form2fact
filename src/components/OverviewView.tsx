import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowUp,
  Plus,
  FolderOpen,
  AlertTriangle,
  FileSearch,
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { Application, Finding, AuditEvent, Rule } from '../types/index.ts';
import { ViewType } from './Sidebar.tsx';

interface OverviewViewProps {
  applications: Application[];
  findings: Finding[];
  rules: Rule[];
  auditEvents: AuditEvent[];
  onSelectApplication: (app: Application) => void;
  onNavigate: (view: ViewType) => void;
  onOpenIntake: () => void;
  onOpenReviewAction: (finding: Finding) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  applications,
  findings,
  rules,
  auditEvents,
  onSelectApplication,
  onNavigate,
  onOpenIntake,
  onOpenReviewAction
}) => {
  const [activeTopic, setActiveTopic] = useState<string>('topic-kpis');

  const totalApps = applications.length;
  const awaitingReview = applications.filter(
    (a) => a.reviewStatus === 'Pending Review' || a.reviewStatus === 'Under Review'
  ).length;
  const openFindingsList = findings.filter(
    (f) => f.status === 'Open' || f.status === 'Under Review' || f.status === 'Unable to Determine'
  );
  const openFindingsCount = openFindingsList.length;
  const totalDocuments = applications.reduce((sum, a) => sum + (a.documentCount || 0), 0);
  const activeRulesCount = rules.filter((r) => r.enabled).length;

  const categories = [
    { name: 'Land & Tenancy', count: findings.filter((f) => f.category === 'Land & Tenancy').length },
    { name: 'Identity & Registration', count: findings.filter((f) => f.category === 'Identity & Registration').length },
    { name: 'Safety & Compliance', count: findings.filter((f) => f.category === 'Safety & Compliance').length },
    { name: 'Approvals & Capacity', count: findings.filter((f) => f.category === 'Approvals & Capacity').length },
  ];

  const topics = [
    { id: 'topic-kpis', label: '01 · Summary Metrics' },
    { id: 'topic-scenarios', label: '02 · Verification Scenarios' },
    { id: 'topic-applications', label: `03 · Applications (${totalApps})` },
    { id: 'topic-findings', label: `04 · Findings (${findings.length})` },
    { id: 'topic-rules', label: `05 · Active Rules (${activeRulesCount})` },
    { id: 'topic-audit', label: '06 · Audit Activity' },
  ];

  const scrollToTopic = (id: string) => {
    setActiveTopic(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div id="overview-top" className="px-6 lg:px-8 py-8 pb-24 max-w-[1440px] mx-auto space-y-10 text-sm">
      {/* Page Title & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#0F172A] tracking-tight">
            Verification Overview
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Complete topic-by-topic summary of institutional dockets, discrepancy findings, validation rules, and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="px-4 py-2 text-sm font-medium text-[#0F172A] bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-md transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#4F46E5]" />
            <span>View Dossiers</span>
          </button>
          <button
            type="button"
            onClick={onOpenIntake}
            className="px-4 py-2 text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-md transition-colors flex items-center gap-2 shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Application</span>
          </button>
        </div>
      </div>

      {/* Sticky Quick-Jump Topic Bar */}
      <div className="sticky top-0 z-20 -mx-6 px-6 lg:-mx-8 lg:px-8 py-3 bg-[#F8FAFC]/95 backdrop-blur-md border-y border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mr-1">
            Jump to Topic:
          </span>
          {topics.map((topic) => {
            const isSelected = activeTopic === topic.id;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => scrollToTopic(topic.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#EEF2FF] text-[#4F46E5] border-[#4F46E5] font-semibold'
                    : 'bg-[#FFFFFF] text-[#0F172A] hover:bg-[#EEF2FF] hover:text-[#4F46E5] hover:border-[#C7D2FE] border-[#E2E8F0]'
                }`}
              >
                {topic.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollToTopic('overview-top')}
          className="px-2.5 py-1.5 text-xs font-medium text-[#64748B] hover:text-[#0F172A] bg-[#FFFFFF] border border-[#E2E8F0] rounded-md transition-colors inline-flex items-center gap-1 shrink-0"
        >
          <ArrowUp className="w-3.5 h-3.5" />
          <span>Top</span>
        </button>
      </div>

      {/* TOPIC 01: Executive Summary Metrics */}
      <section id="topic-kpis" className="scroll-mt-20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[#4F46E5] font-semibold">
              Topic 01
            </span>
            <h2 className="text-lg font-semibold text-[#0F172A]">
              Executive Summary & Queue Metrics
            </h2>
          </div>
          <span className="text-xs text-[#64748B]">Click any metric card to open its workspace</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <button
            type="button"
            onClick={() => onNavigate('applications')}
            className="p-5 bg-[#FFFFFF] hover:border-[#4F46E5] border border-[#E2E8F0] rounded-lg text-left transition-all flex flex-col justify-between group cursor-pointer h-full"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Active Applications
              </span>
              <FolderOpen className="w-4 h-4 text-[#64748B] group-hover:text-[#4F46E5]" />
            </div>
            <div className="text-2xl font-semibold text-[#0F172A] my-3 font-mono tabular-nums">
              {totalApps}
            </div>
            <div className="flex items-center justify-between text-xs text-[#4F46E5] font-semibold pt-3 border-t border-[#F1F5F9] w-full">
              <span>View All Applications</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('applications')}
            className="p-5 bg-[#FFFFFF] hover:border-[#4F46E5] border border-[#E2E8F0] rounded-lg text-left transition-all flex flex-col justify-between group cursor-pointer h-full"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Pending Officer Review
              </span>
              <CheckCircle2 className="w-4 h-4 text-[#64748B] group-hover:text-[#4F46E5]" />
            </div>
            <div className="text-2xl font-semibold text-[#0F172A] my-3 font-mono tabular-nums">
              {awaitingReview}
            </div>
            <div className="flex items-center justify-between text-xs text-[#4F46E5] font-semibold pt-3 border-t border-[#F1F5F9] w-full">
              <span>Open Review Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('findings')}
            className="p-5 bg-[#FFFFFF] hover:border-[#4F46E5] border border-[#E2E8F0] rounded-lg text-left transition-all flex flex-col justify-between group cursor-pointer h-full"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Open Findings
              </span>
              <AlertTriangle className="w-4 h-4 text-[#E11D48]" />
            </div>
            <div className="text-2xl font-semibold text-[#E11D48] my-3 font-mono tabular-nums">
              {openFindingsCount}
            </div>
            <div className="flex items-center justify-between text-xs text-[#4F46E5] font-semibold pt-3 border-t border-[#F1F5F9] w-full">
              <span>View All Findings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('document-review')}
            className="p-5 bg-[#FFFFFF] hover:border-[#4F46E5] border border-[#E2E8F0] rounded-lg text-left transition-all flex flex-col justify-between group cursor-pointer h-full"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Indexed PDF Dockets
              </span>
              <FileSearch className="w-4 h-4 text-[#64748B] group-hover:text-[#4F46E5]" />
            </div>
            <div className="text-2xl font-semibold text-[#0F172A] my-3 font-mono tabular-nums">
              {totalDocuments}
            </div>
            <div className="flex items-center justify-between text-xs text-[#4F46E5] font-semibold pt-3 border-t border-[#F1F5F9] w-full">
              <span>Open Evidence Viewer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </section>

      <hr className="border-[#E2E8F0]" />

      {/* TOPIC 02: Benchmark Verification Scenarios */}
      <section id="topic-scenarios" className="scroll-mt-20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[#4F46E5] font-semibold">
              Topic 02
            </span>
            <h2 className="text-lg font-semibold text-[#0F172A]">
              Verification Scenarios
            </h2>
            <p className="text-sm text-[#64748B] mt-0.5">
              Three pre-configured institutional dockets demonstrating compliant, mismatched, and missing-evidence workflows.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('applications')}
            className="px-3.5 py-2 text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-md transition-colors inline-flex items-center gap-1.5 shrink-0"
          >
            <span>View All Applications</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {/* Scenario 1 */}
          <div className="p-5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg flex flex-col justify-between gap-5 h-full">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[#64748B]">
                  APP-2026-EOA-1104
                </span>
                <span className="px-2.5 py-0.5 bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] rounded text-xs font-medium">
                  Compliant
                </span>
              </div>
              <h3 className="font-semibold text-base text-[#0F172A]">
                Kalyani Institute of Engineering
              </h3>
              <p className="text-[#64748B] text-sm leading-relaxed">
                30-year registered lease deed aligns with declared 2054 expiry date and 7.50 Acres across all 4 statutory documents.
              </p>
            </div>

            <div className="pt-3.5 border-t border-[#E2E8F0] flex items-center justify-between">
              <span className="text-xs font-mono tabular-nums text-[#065F46] font-semibold">
                0 Open Findings
              </span>
              <button
                type="button"
                onClick={() => {
                  const app = applications.find((a) => a.referenceNumber.includes('1104'));
                  if (app) onSelectApplication(app);
                }}
                className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] inline-flex items-center gap-1"
              >
                <span>Inspect Docket</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Scenario 2 */}
          <div className="p-5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg flex flex-col justify-between gap-5 h-full">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[#64748B]">
                  APP-2026-NTC-0842
                </span>
                <span className="px-2.5 py-0.5 bg-[#FFF1F2] text-[#9F1239] border border-[#FECDD3] rounded text-xs font-medium">
                  2 Discrepancies
                </span>
              </div>
              <h3 className="font-semibold text-base text-[#0F172A]">
                Pragati Institute of Technology
              </h3>
              <p className="text-[#64748B] text-sm leading-relaxed">
                Declared 2048 lease expiry conflicts with 2028 deed termination clause (page 3); campus land short by 2.30 Acres (page 4).
              </p>
            </div>

            <div className="pt-3.5 border-t border-[#E2E8F0] flex items-center justify-between">
              <span className="text-xs font-mono tabular-nums text-[#E11D48] font-semibold">
                2 Open Findings
              </span>
              <button
                type="button"
                onClick={() => {
                  const app = applications.find((a) => a.referenceNumber.includes('0842'));
                  if (app) onSelectApplication(app);
                }}
                className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] inline-flex items-center gap-1"
              >
                <span>Inspect Discrepancies</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Scenario 3 */}
          <div className="p-5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg flex flex-col justify-between gap-5 h-full">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[#64748B]">
                  APP-2026-EOA-0915
                </span>
                <span className="px-2.5 py-0.5 bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] rounded text-xs font-medium">
                  Manual Review
                </span>
              </div>
              <h3 className="font-semibold text-base text-[#0F172A]">
                Vidyapeeth Academy of Pharmacy
              </h3>
              <p className="text-[#64748B] text-sm leading-relaxed">
                Fire Safety NOC missing from submission; Building Safety Certificate is an unindexed bitmap scan requiring officer review.
              </p>
            </div>

            <div className="pt-3.5 border-t border-[#E2E8F0] flex items-center justify-between">
              <span className="text-xs font-mono tabular-nums text-[#D97706] font-semibold">
                2 Flagged Items
              </span>
              <button
                type="button"
                onClick={() => {
                  const app = applications.find((a) => a.referenceNumber.includes('0915'));
                  if (app) onSelectApplication(app);
                }}
                className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] inline-flex items-center gap-1"
              >
                <span>Inspect Docket</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <hr className="border-[#E2E8F0]" />

      {/* TOPIC 03: Institutional Applications Docket */}
      <section id="topic-applications" className="scroll-mt-20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[#4F46E5] font-semibold">
              Topic 03
            </span>
            <h2 className="text-lg font-semibold text-[#0F172A]">
              Applications Docket
            </h2>
            <p className="text-sm text-[#64748B] mt-0.5">
              Submitted institutional applications with declared land, lease expiry, document count, and review status.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('applications')}
            className="px-3.5 py-2 text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-md transition-colors inline-flex items-center gap-1.5 shrink-0"
          >
            <span>View All Applications ({applications.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed min-w-[1040px] text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs uppercase tracking-wider font-semibold text-[#64748B]">
                  <th className="py-3.5 px-5 w-[14%]">Reference</th>
                  <th className="py-3.5 px-5 w-[25%]">Institution & Location</th>
                  <th className="py-3.5 px-5 w-[15%]">Category</th>
                  <th className="py-3.5 px-5 w-[12%] text-right">Land Area</th>
                  <th className="py-3.5 px-5 w-[7%] text-right">PDFs</th>
                  <th className="py-3.5 px-5 w-[9%] text-right">Findings</th>
                  <th className="py-3.5 px-5 w-[11%]">Status</th>
                  <th className="py-3.5 px-5 w-[7%] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {applications.slice(0, 5).map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => onSelectApplication(app)}
                    className="hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-5 font-mono text-xs font-semibold text-[#0F172A] whitespace-nowrap truncate">
                      {app.referenceNumber}
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-semibold text-[#0F172A] truncate">
                        {app.institutionName}
                      </div>
                      <div className="text-xs text-[#64748B] truncate mt-0.5">
                        {app.declaredDetails.address}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-xs text-[#64748B] whitespace-nowrap truncate">
                      {app.applicationType}
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-xs text-[#0F172A] whitespace-nowrap tabular-nums">
                      <div className="font-semibold">{app.declaredDetails.landAreaAcres} Acres</div>
                      <div className="text-[#64748B] mt-0.5">Exp: {app.declaredDetails.leaseExpiryDate}</div>
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-xs tabular-nums font-medium text-[#0F172A]">
                      {app.documentCount}
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      {app.openFindingsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums font-medium text-[#9F1239] bg-[#FFF1F2] border border-[#FECDD3] px-2.5 py-0.5 rounded text-xs">
                          {app.openFindingsCount} Open
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5 rounded text-xs">
                          0
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded border ${
                          app.reviewStatus === 'Review Completed'
                            ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                            : app.reviewStatus === 'Discrepancies Confirmed'
                            ? 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3]'
                            : 'bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]'
                        }`}
                      >
                        {app.reviewStatus}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectApplication(app);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-[#4F46E5] hover:bg-[#EEF2FF] rounded-md transition-colors inline-flex items-center gap-1"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <hr className="border-[#E2E8F0]" />

      {/* TOPIC 04: Discrepancy Findings & Domain Breakdown */}
      <section id="topic-findings" className="scroll-mt-20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[#4F46E5] font-semibold">
              Topic 04
            </span>
            <h2 className="text-lg font-semibold text-[#0F172A]">
              Discrepancy Findings & Rule Alerts
            </h2>
            <p className="text-sm text-[#64748B] mt-0.5">
              Side-by-side comparison of applicant declared claims versus extracted supporting document evidence.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('findings')}
            className="px-3.5 py-2 text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-md transition-colors inline-flex items-center gap-1.5 shrink-0"
          >
            <span>View All Findings ({findings.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Domain Count Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => onNavigate('findings')}
              className="px-4 py-3.5 bg-[#FFFFFF] hover:border-[#4F46E5] border border-[#E2E8F0] rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer"
            >
              <span className="text-xs font-semibold text-[#0F172A] truncate">{c.name}</span>
              <span className="font-mono tabular-nums px-2.5 py-0.5 bg-[#F1F5F9] text-[#334155] rounded text-xs font-semibold shrink-0">
                {c.count}
              </span>
            </button>
          ))}
        </div>

        {/* Top Findings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {findings.slice(0, 4).map((finding) => {
            const app = applications.find((a) => a.id === finding.applicationId);
            return (
              <div
                key={finding.id}
                className="p-5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg flex flex-col justify-between gap-4 h-full"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono text-[#64748B]">
                        <span className="font-semibold text-[#0F172A]">{finding.reference}</span>
                        <span>·</span>
                        <span className="text-[#4F46E5] font-medium">
                          {finding.ruleKey} {finding.ruleVersion}
                        </span>
                      </div>
                      <h3 className="font-semibold text-base text-[#0F172A] mt-1">
                        {finding.title}
                      </h3>
                      <div className="text-xs text-[#64748B] mt-0.5">
                        {app?.institutionName} ({app?.referenceNumber})
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-medium rounded border shrink-0 ${
                        finding.severity === 'Material Discrepancy'
                          ? 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3]'
                          : 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
                      }`}
                    >
                      {finding.severity}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs items-stretch">
                    <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex flex-col justify-between">
                      <div className="text-[#64748B] font-medium">Declared Claim</div>
                      <div className="font-mono font-semibold text-[#0F172A] mt-1 truncate">
                        {finding.declaredValue || 'N/A'}
                      </div>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex flex-col justify-between">
                      <div className="text-[#64748B] font-medium">Document Evidence</div>
                      <div className="font-mono font-semibold text-[#E11D48] mt-1 truncate">
                        {finding.evidenceValue || 'Missing'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                  <span className="font-medium text-[#64748B]">Status: {finding.status}</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenReviewAction(finding)}
                      className="font-semibold text-[#4F46E5] hover:text-[#4338CA]"
                    >
                      Record Decision
                    </button>
                    {app && (
                      <button
                        type="button"
                        onClick={() => onSelectApplication(app)}
                        className="font-medium text-[#64748B] hover:text-[#0F172A] inline-flex items-center gap-1"
                      >
                        <span>Open Docket</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <hr className="border-[#E2E8F0]" />

      {/* TOPIC 05: Active Verification Rules Summary */}
      <section id="topic-rules" className="scroll-mt-20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[#4F46E5] font-semibold">
              Topic 05
            </span>
            <h2 className="text-lg font-semibold text-[#0F172A]">
              Configured Verification Rules
            </h2>
            <p className="text-sm text-[#64748B] mt-0.5">
              Deterministic statutory checks applied automatically to every application docket.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('rules')}
            className="px-3.5 py-2 text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-md transition-colors inline-flex items-center gap-1.5 shrink-0"
          >
            <span>View All Rules ({rules.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {rules.slice(0, 6).map((rule) => (
            <div
              key={rule.id}
              onClick={() => onNavigate('rules')}
              className="p-5 bg-[#FFFFFF] hover:border-[#4F46E5] border border-[#E2E8F0] rounded-lg flex flex-col justify-between gap-4 cursor-pointer transition-colors h-full"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-[#4F46E5]">
                    {rule.ruleKey} · {rule.version}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-medium border ${
                      rule.enabled
                        ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                        : 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
                    }`}
                  >
                    {rule.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="font-semibold text-base text-[#0F172A]">{rule.name}</div>
                <div className="text-sm text-[#64748B] line-clamp-2 leading-relaxed">
                  {rule.description}
                </div>
              </div>
              <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B]">
                <span className="font-medium">{rule.category}</span>
                <span className="text-[#4F46E5] font-semibold">Configure →</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr className="border-[#E2E8F0]" />

      {/* TOPIC 06: Recent Audit & Traceability Activity */}
      <section id="topic-audit" className="scroll-mt-20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[#4F46E5] font-semibold">
              Topic 06
            </span>
            <h2 className="text-lg font-semibold text-[#0F172A]">
              Recent Audit Ledger Activity
            </h2>
            <p className="text-sm text-[#64748B] mt-0.5">
              Immutable chain-of-custody events across document parsing, rule checks, and officer decisions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('audit')}
            className="px-3.5 py-2 text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-md transition-colors inline-flex items-center gap-1.5 shrink-0"
          >
            <span>View Full Audit Ledger ({auditEvents.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed min-w-[980px] text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs uppercase tracking-wider font-semibold text-[#64748B]">
                  <th className="py-3.5 px-5 w-[16%] font-mono">Timestamp</th>
                  <th className="py-3.5 px-5 w-[20%]">Action</th>
                  <th className="py-3.5 px-5 w-[16%]">Actor</th>
                  <th className="py-3.5 px-5 w-[16%]">Entity Reference</th>
                  <th className="py-3.5 px-5 w-[32%]">Audit Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {auditEvents.slice(0, 5).map((e) => (
                  <tr key={e.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-4 px-5 font-mono tabular-nums text-xs text-[#64748B] whitespace-nowrap">
                      {new Date(e.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-4 px-5 font-semibold text-[#0F172A] whitespace-nowrap truncate">
                      {e.action}
                    </td>
                    <td className="py-4 px-5 text-[#0F172A] whitespace-nowrap truncate">
                      {e.actorName}
                    </td>
                    <td className="py-4 px-5 font-mono text-xs font-medium text-[#4F46E5] whitespace-nowrap truncate">
                      {e.entityReference}
                    </td>
                    <td className="py-4 px-5 text-xs text-[#64748B] truncate">
                      {e.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
