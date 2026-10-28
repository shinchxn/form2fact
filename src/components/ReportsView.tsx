import React, { useState, useEffect } from 'react';
import { CheckCircle, ArrowLeft, Printer, Download } from 'lucide-react';
import { Application, ScrutinyReportData } from '../types/index.ts';
import { fetchReport } from '../services/api.ts';

interface ReportsViewProps {
  applications: Application[];
  selectedApplication: Application | null;
  onSelectApplication: (app: Application) => void;
  onBack: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  applications,
  selectedApplication,
  onBack
}) => {
  const [currentAppId, setCurrentAppId] = useState<string>(
    selectedApplication?.id || applications[0]?.id || ''
  );
  const [report, setReport] = useState<ScrutinyReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedApplication) setCurrentAppId(selectedApplication.id);
  }, [selectedApplication]);

  useEffect(() => {
    if (!currentAppId) return;
    setLoading(true);
    fetchReport(currentAppId)
      .then((data) => setReport(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [currentAppId]);

  const handlePrint = () => window.print();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleExportJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Form2Fact_Dossier_${report.application.referenceNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!report) return;
    const headers = [
      'Finding Reference',
      'Rule ID',
      'Category',
      'Severity',
      'Status',
      'Declared Claim',
      'Document Evidence',
      'Reviewer Note'
    ];
    const rows = report.findings.map((f) => [
      `"${f.reference}"`,
      `"${f.ruleKey} ${f.ruleVersion}"`,
      `"${f.category}"`,
      `"${f.severity}"`,
      `"${f.status}"`,
      `"${(f.declaredValue || '').replace(/"/g, '""')}"`,
      `"${(f.evidenceValue || '').replace(/"/g, '""')}"`,
      `"${(f.reviewerDecisionReason || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Form2Fact_Findings_${report.application.referenceNumber}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-6 lg:px-8 py-8 pb-24 max-w-[1440px] mx-auto space-y-6 text-sm">
      {/* Sticky Dossier Control & Topic Jump Bar */}
      <div className="print:hidden sticky top-0 z-20 -mx-6 px-6 lg:-mx-8 lg:px-8 py-3.5 bg-[#F8FAFC]/95 backdrop-blur-md border-y border-[#E2E8F0] space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-[#CBD5E1]">|</span>
            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="dossier-app-select" className="text-[#64748B] font-semibold">
                Application:
              </label>
              <select
                id="dossier-app-select"
                value={currentAppId}
                onChange={(e) => setCurrentAppId(e.target.value)}
                className="px-3.5 py-2 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] text-[#0F172A] text-sm font-medium focus:outline-hidden focus:border-[#4F46E5]"
              >
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.referenceNumber} — {app.institutionName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-md transition-colors inline-flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-[#64748B]" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportJSON}
              className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-md transition-colors inline-flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-[#64748B]" />
              <span>Export JSON</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-md transition-colors shadow-2xs inline-flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Dossier</span>
            </button>
          </div>
        </div>

        {/* Topic Quick-Jump Links */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mr-1">
            Dossier Sections:
          </span>
          {[
            { id: 'dossier-params', label: '01 · Declared Parameters' },
            { id: 'dossier-docs', label: '02 · Document Inventory' },
            { id: 'dossier-findings', label: '03 · Rule Evaluations & Findings' },
            { id: 'dossier-signoff', label: '04 · Reviewer Sign-Off' },
          ].map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => scrollToSection(sec.id)}
              className="px-3 py-1.5 text-xs font-medium text-[#0F172A] bg-[#FFFFFF] hover:bg-[#EEF2FF] hover:text-[#4F46E5] hover:border-[#C7D2FE] border border-[#E2E8F0] rounded-md transition-colors cursor-pointer"
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !report ? (
        <div className="p-16 text-center text-[#64748B] text-sm">Loading verification dossier...</div>
      ) : (
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-8 lg:p-10 space-y-10 shadow-2xs text-sm print:border-none print:shadow-none print:p-0">
          {/* Dossier Header */}
          <div className="border-b border-[#E2E8F0] pb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-[#4F46E5] font-semibold">
                Verification Dossier
              </div>
              <h1 className="text-xl font-semibold text-[#0F172A] tracking-tight mt-1">
                {report.application.institutionName}
              </h1>
              <p className="text-sm text-[#64748B] mt-1">
                Cross-document claim verification and deterministic rule evaluation summary.
              </p>
            </div>
            <div className="md:text-right font-mono text-sm text-[#0F172A] shrink-0">
              <div className="font-semibold text-base">{report.application.referenceNumber}</div>
              <div className="text-xs text-[#64748B] mt-1 tabular-nums">
                Generated {new Date(report.generatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Section 1: Declared Institutional Parameters */}
          <section id="dossier-params" className="scroll-mt-28 space-y-4">
            <h2 className="text-lg font-semibold text-[#0F172A]">
              01 · Declared Institutional Parameters
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-medium text-[#64748B]">Institution Name</div>
                  <div className="font-semibold text-base text-[#0F172A] mt-0.5">
                    {report.application.institutionName}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[#64748B]">Sponsoring Trust / Society</div>
                  <div className="font-medium text-sm text-[#0F172A] mt-0.5">
                    {report.application.declaredDetails.societyOrTrustName}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[#64748B]">Campus Address</div>
                  <div className="font-medium text-sm text-[#0F172A] mt-0.5">
                    {report.application.declaredDetails.address} (PIN {report.application.declaredDetails.pinCode})
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 font-mono text-xs text-[#0F172A]">
                <div className="p-3.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-md">
                  <div className="text-[#64748B] font-sans font-medium">Category</div>
                  <div className="font-semibold text-sm mt-1">{report.application.applicationType}</div>
                </div>
                <div className="p-3.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-md text-right">
                  <div className="text-[#64748B] font-sans font-medium">Declared Land Area</div>
                  <div className="font-semibold text-sm mt-1 tabular-nums">
                    {report.application.declaredDetails.landAreaAcres} Acres
                  </div>
                </div>
                <div className="p-3.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-md">
                  <div className="text-[#64748B] font-sans font-medium">Declared Lease Expiry</div>
                  <div className="font-semibold text-sm mt-1 tabular-nums">
                    {report.application.declaredDetails.leaseExpiryDate}
                  </div>
                </div>
                <div className="p-3.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-md text-right">
                  <div className="text-[#64748B] font-sans font-medium">Sanctioned Intake</div>
                  <div className="font-semibold text-sm mt-1 tabular-nums">
                    {report.application.declaredDetails.sanctionedIntake} Seats
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Document Inventory */}
          <section id="dossier-docs" className="scroll-mt-28 space-y-4">
            <h2 className="text-lg font-semibold text-[#0F172A]">
              02 · Supporting Document Inventory ({report.documents.length})
            </h2>
            <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed min-w-[920px] text-left border-collapse">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs uppercase tracking-wider font-semibold text-[#64748B]">
                    <tr>
                      <th className="py-3.5 px-5 w-[24%]">Document Type</th>
                      <th className="py-3.5 px-5 w-[28%]">File Name</th>
                      <th className="py-3.5 px-5 w-[10%] text-right">Pages</th>
                      <th className="py-3.5 px-5 w-[16%]">Status</th>
                      <th className="py-3.5 px-5 w-[22%]">SHA-256 Checksum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-sm">
                    {report.documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-4 px-5 font-semibold text-[#0F172A] truncate">
                          {doc.documentType}
                        </td>
                        <td className="py-4 px-5 text-[#64748B] truncate">{doc.originalFilename}</td>
                        <td className="py-4 px-5 text-right font-mono tabular-nums font-medium text-[#0F172A]">
                          {doc.pageCount}
                        </td>
                        <td className="py-4 px-5">
                          <span
                            className={`px-2.5 py-0.5 rounded border text-xs font-medium ${
                              doc.processingStatus === 'Extracted'
                                ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                                : 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
                            }`}
                          >
                            {doc.processingStatus}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-mono text-xs text-[#64748B] truncate">
                          {doc.checksum.slice(0, 24)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 3: Rule Evaluations & Findings */}
          <section id="dossier-findings" className="scroll-mt-28 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-[#0F172A]">
                03 · Rule Evaluations & Findings
              </h2>
              <div className="font-mono text-xs text-[#64748B] tabular-nums">
                {report.validationSummary.rulesEvaluatedCount} rules evaluated ·{' '}
                {report.validationSummary.findingsRaisedCount} findings raised
              </div>
            </div>

            {report.findings.length === 0 ? (
              <div className="p-5 bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] rounded-lg text-sm font-medium flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span>All configured rules passed without discrepancy.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {report.findings.map((f) => (
                  <div
                    key={f.id}
                    className="p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-base text-[#0F172A]">
                        {f.reference}: {f.title}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded border text-xs font-medium ${
                          f.status === 'Confirmed'
                            ? 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3]'
                            : f.status === 'Dismissed'
                            ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                            : 'bg-[#FFFFFF] text-[#0F172A] border-[#E2E8F0]'
                        }`}
                      >
                        {f.status}
                      </span>
                    </div>
                    <p className="text-sm text-[#64748B] leading-relaxed">{f.explanation}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono text-[#0F172A]">
                      <div className="p-3 bg-[#FFFFFF] border border-[#E2E8F0] rounded">
                        <span className="text-[#64748B] font-sans font-medium">Declared Claim:</span>{' '}
                        <span className="font-semibold">{f.declaredValue || 'N/A'}</span>
                      </div>
                      <div className="p-3 bg-[#FFFFFF] border border-[#E2E8F0] rounded">
                        <span className="text-[#64748B] font-sans font-medium">Document Evidence:</span>{' '}
                        <span className="font-semibold text-[#E11D48]">{f.evidenceValue || 'Missing'}</span>
                      </div>
                    </div>
                    {f.reviewerDecisionReason && (
                      <div className="p-3.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded text-sm">
                        <span className="font-semibold text-[#0F172A]">Reviewer Note:</span>{' '}
                        {f.reviewerDecisionReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 4: Reviewer Sign-off */}
          <section id="dossier-signoff" className="scroll-mt-28 pt-6 border-t border-[#E2E8F0] grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div>
              <div className="font-semibold text-[#0F172A]">Reviewer Sign-Off</div>
              <div className="mt-8 pt-3 border-t border-[#E2E8F0] font-mono text-xs text-[#64748B]">
                {report.generatedBy}
              </div>
            </div>
            <div className="md:text-right">
              <div className="font-semibold text-[#0F172A]">Verification Stamp</div>
              <div className="mt-8 pt-3 border-t border-[#E2E8F0] font-mono text-xs text-[#64748B] tabular-nums">
                F2F-{report.application.id.slice(-4)}-{new Date().getFullYear()}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
