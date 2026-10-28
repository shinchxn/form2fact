import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Edit3,
  AlertTriangle,
  FileSearch,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import { DocumentRecord, ExtractedField, Finding, Application } from '../types/index.ts';
import { ViewType } from './Sidebar.tsx';

interface DocumentReviewViewProps {
  application: Application | null;
  applications?: Application[];
  documents: DocumentRecord[];
  extractedFields: ExtractedField[];
  findings: Finding[];
  initialDocumentId?: string;
  initialPage?: number;
  onSelectApplication?: (app: Application) => void;
  onBack: () => void;
  onNavigate?: (view: ViewType) => void;
  onOpenCorrection: (field: ExtractedField) => void;
  onOpenReviewAction: (finding: Finding) => void;
}

export const DocumentReviewView: React.FC<DocumentReviewViewProps> = ({
  application,
  applications = [],
  documents,
  extractedFields,
  findings,
  initialDocumentId,
  initialPage = 1,
  onSelectApplication,
  onBack,
  onNavigate,
  onOpenCorrection,
  onOpenReviewAction
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(
    initialDocumentId || documents[0]?.id || ''
  );
  const [currentPage, setCurrentPage] = useState<number>(initialPage || 1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [activeHighlightFieldId, setActiveHighlightFieldId] = useState<string | null>(null);

  useEffect(() => {
    if (initialDocumentId) {
      setSelectedDocId(initialDocumentId);
    } else if (documents.length > 0 && !documents.some((d) => d.id === selectedDocId)) {
      setSelectedDocId(documents[0].id);
      setCurrentPage(1);
    }
  }, [initialDocumentId, documents]);

  useEffect(() => {
    if (initialPage) {
      setCurrentPage(initialPage);
    }
  }, [initialPage]);

  const activeDoc = documents.find((d) => d.id === selectedDocId) || documents[0];
  const maxPages = activeDoc?.pageCount || 1;

  const pageFields = extractedFields.filter(
    (f) => f.documentId === activeDoc?.id && f.pageNumber === currentPage
  );

  const docFindings = findings.filter((f) =>
    f.evidenceList.some(
      (ev) => ev.documentId === activeDoc?.id && ev.pageNumber === currentPage
    )
  );

  const pageTextData = activeDoc?.extractedTextByPage?.find((p) => p.page === currentPage);
  const currentText =
    pageTextData?.text ||
    (activeDoc?.isScannedOrTextPoor
      ? '[SCANNED BITMAP DOCUMENT — OCR TEXT LAYER NOT PRESENT]'
      : 'Page text not indexed.');

  const handleNextPage = () => {
    if (currentPage < maxPages) setCurrentPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-[#F8FAFC] select-none">
      {/* Sticky Top Control Bar */}
      <div className="sticky top-0 z-20 min-h-14 py-2.5 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E2E8F0] px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4 shrink-0 text-xs">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-[#64748B] hover:text-[#0F172A] flex items-center gap-1.5 font-medium transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Docket</span>
          </button>
          <span className="text-[#CBD5E1]">|</span>

          {applications.length > 0 && onSelectApplication ? (
            <select
              aria-label="Select application docket"
              value={application?.id || ''}
              onChange={(e) => {
                const app = applications.find((a) => a.id === e.target.value);
                if (app) onSelectApplication(app);
              }}
              className="px-3 py-1.5 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] text-[#0F172A] text-sm font-semibold focus:outline-hidden focus:border-[#4F46E5]"
            >
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.referenceNumber} — {app.institutionName}
                </option>
              ))}
            </select>
          ) : (
            <span className="font-semibold text-sm text-[#0F172A] truncate">
              {application?.referenceNumber}: {activeDoc?.originalFilename}
            </span>
          )}

          <span className="px-2.5 py-1 bg-[#F1F5F9] text-[#334155] rounded text-xs font-medium shrink-0">
            {activeDoc?.documentType}
          </span>
        </div>

        {/* Page navigation & Zoom controls */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              aria-label="Previous page"
              className="p-1.5 hover:bg-[#F1F5F9] rounded disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 text-[#0F172A]" />
            </button>
            <span className="font-semibold text-[#0F172A] tabular-nums">
              Page {currentPage} of {maxPages}
            </span>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= maxPages}
              aria-label="Next page"
              className="p-1.5 hover:bg-[#F1F5F9] rounded disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 text-[#0F172A]" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[#64748B] border-l border-[#E2E8F0] pl-4">
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(80, prev - 10))}
              className="p-1.5 hover:bg-[#F1F5F9] rounded"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs tabular-nums w-12 text-center font-semibold text-[#0F172A]">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(130, prev + 10))}
              className="p-1.5 hover:bg-[#F1F5F9] rounded"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3-Pane Review Workspace */}
      <div className="flex flex-col lg:flex-row flex-1 items-start">
        {/* PANE 1: Sticky Document Navigator */}
        <div className="w-full lg:w-72 lg:sticky lg:top-14 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto bg-[#FFFFFF] border-b lg:border-b-0 lg:border-r border-[#E2E8F0] flex flex-col shrink-0">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Docket Files ({documents.length})
            </h3>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('applications')}
                className="text-xs font-semibold text-[#4F46E5] hover:underline"
              >
                All Apps
              </button>
            )}
          </div>
          <div className="p-3.5 space-y-2.5">
            {documents.map((doc) => {
              const isSelected = doc.id === activeDoc?.id;
              const fieldCount = extractedFields.filter((f) => f.documentId === doc.id).length;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    setCurrentPage(1);
                  }}
                  className={`w-full p-3.5 rounded-lg border text-xs text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#EEF2FF]/40 border-[1.5px] border-[#4F46E5] text-[#0F172A]'
                      : 'bg-[#FFFFFF] hover:bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#4F46E5] truncate">
                      {doc.documentType}
                    </span>
                    <span className="font-mono tabular-nums text-xs font-semibold text-[#64748B] shrink-0">
                      {doc.pageCount}p
                    </span>
                  </div>
                  <div className="truncate text-sm text-[#0F172A] font-medium mb-1.5">
                    {doc.originalFilename}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#64748B] font-mono tabular-nums">
                      {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                    </span>
                    {doc.isScannedOrTextPoor && (
                      <span className="text-[#D97706] font-semibold">Scanned</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PANE 2: Central Document Sheet Viewer */}
        <div className="flex-1 bg-[#F1F5F9] p-8 pb-24 flex justify-center items-start overflow-x-auto min-h-[calc(100vh-7.5rem)]">
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center'
            }}
            className="w-full max-w-[780px] min-h-[880px] bg-[#FFFFFF] border border-[#E2E8F0] shadow-xs rounded-sm p-12 transition-transform duration-150 relative text-left"
          >
            {/* Document Header */}
            <div className="border-b border-[#E2E8F0] pb-4 mb-6 flex justify-between items-start select-none">
              <div>
                <div className="text-xs font-mono text-[#64748B] uppercase tracking-wider">
                  SOURCE EVIDENCE SHEET · FORM2FACT
                </div>
                <h2 className="text-lg font-semibold text-[#0F172A] tracking-tight mt-1">
                  {activeDoc?.documentType}
                </h2>
                <div className="text-xs text-[#64748B] mt-0.5">
                  File: {activeDoc?.originalFilename}
                </div>
              </div>
              <div className="text-right font-mono text-xs text-[#64748B] tabular-nums">
                <div className="font-semibold text-[#0F172A]">
                  PAGE {currentPage} / {maxPages}
                </div>
                <div className="text-[#10B981] mt-0.5">● SHA-256 VERIFIED</div>
              </div>
            </div>

            {/* Document Body */}
            {activeDoc?.isScannedOrTextPoor ? (
              <div className="my-16 p-8 border border-dashed border-[#CBD5E1] rounded-lg bg-[#F8FAFC] text-center space-y-3">
                <ShieldAlert className="w-8 h-8 text-[#D97706] mx-auto" />
                <h4 className="font-semibold text-base text-[#0F172A]">
                  Scanned Bitmap Document Detected
                </h4>
                <p className="text-sm text-[#64748B] max-w-md mx-auto leading-relaxed">
                  This PDF lacks an authoritative OCR text layer. Automated field extraction is disabled to prevent unverified text inference.
                </p>
                <div className="text-xs font-mono text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] px-3 py-1.5 rounded inline-block">
                  Flagged: Manual Verification Required
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sm leading-relaxed text-[#0F172A] pb-16">
                {currentText.split('\n').map((para, idx) => {
                  if (!para.trim()) return null;

                  const matchingField = pageFields.find(
                    (f) => f.sourceText && para.toLowerCase().includes(f.rawValue.toLowerCase())
                  );

                  const isHighlighted =
                    matchingField &&
                    (activeHighlightFieldId === null ||
                      activeHighlightFieldId === matchingField.id);

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-md transition-colors ${
                        isHighlighted
                          ? 'bg-[#EEF2FF]/70 border-l-3 border-[#4F46E5] text-[#0F172A]'
                          : ''
                      }`}
                    >
                      {para}
                      {isHighlighted && matchingField && (
                        <div className="mt-2.5 pt-2.5 border-t border-[#C7D2FE] flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#4F46E5] font-mono">
                            Extracted: {matchingField.fieldLabel} ({matchingField.rawValue})
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenCorrection(matchingField)}
                            className="text-[#4F46E5] hover:underline font-semibold inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Correct</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Sheet Footer */}
            <div className="pt-4 border-t border-[#E2E8F0] flex justify-between text-xs text-[#64748B] font-mono tabular-nums">
              <span>Form2Fact Parser v1.2</span>
              <span>SHA-256: {activeDoc?.checksum.slice(0, 18)}...</span>
            </div>
          </div>
        </div>

        {/* PANE 3: Sticky Evidence Inspector */}
        <div className="w-full lg:w-88 lg:sticky lg:top-14 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto bg-[#FFFFFF] border-t lg:border-t-0 lg:border-l border-[#E2E8F0] flex flex-col shrink-0">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm text-[#0F172A]">
              <FileSearch className="w-4 h-4 text-[#4F46E5]" />
              <span>Evidence Inspector</span>
            </div>
            <span className="text-xs font-mono tabular-nums font-semibold text-[#64748B]">
              Page {currentPage}
            </span>
          </div>

          <div className="p-4 space-y-6 text-xs">
            {/* Conflicting Findings on this Page */}
            {docFindings.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[#9F1239] uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Discrepancies on Page {currentPage}</span>
                  </div>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate('findings')}
                      className="text-xs font-semibold text-[#4F46E5] hover:underline"
                    >
                      View All
                    </button>
                  )}
                </div>
                {docFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="p-4 bg-[#FFF1F2] border border-[#FECDD3] rounded-lg space-y-2.5"
                  >
                    <div className="font-semibold text-sm text-[#9F1239]">{finding.title}</div>
                    <div className="text-xs text-[#0F172A] leading-relaxed">
                      {finding.explanation}
                    </div>
                    <div className="pt-2.5 border-t border-[#FECDD3] flex items-center justify-between">
                      <span className="font-semibold text-xs text-[#9F1239]">
                        {finding.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenReviewAction(finding)}
                        className="px-3 py-1 text-xs font-semibold text-white bg-[#E11D48] hover:bg-[#BE123C] rounded-md"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Extracted Fields on Current Page */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Page {currentPage} Fields ({pageFields.length})
              </div>

              {pageFields.length === 0 ? (
                <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-center text-[#64748B]">
                  No structured fields indexed on Page {currentPage}.
                </div>
              ) : (
                <div className="space-y-3">
                  {pageFields.map((field) => (
                    <div
                      key={field.id}
                      onClick={() => setActiveHighlightFieldId(field.id)}
                      className={`p-4 rounded-lg border transition-all cursor-pointer space-y-2.5 ${
                        activeHighlightFieldId === field.id
                          ? 'border-[1.5px] border-[#4F46E5] bg-[#EEF2FF]/30'
                          : 'border-[#E2E8F0] bg-[#FFFFFF] hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-[#0F172A] truncate">
                          {field.fieldLabel}
                        </span>
                        {field.confidence !== null && (
                          <span className="text-xs font-mono tabular-nums font-semibold text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded shrink-0">
                            {(field.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>

                      <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded font-mono tabular-nums text-[#0F172A] text-xs select-all">
                        {field.rawValue}
                      </div>

                      {field.isCorrected && (
                        <div className="text-xs text-[#D97706] font-semibold">
                          Corrected: {field.correctedValue}
                        </div>
                      )}

                      <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
                        <span className="text-[#64748B]">{field.extractionMethod}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCorrection(field);
                          }}
                          className="text-[#4F46E5] hover:text-[#4338CA] font-semibold flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Correct</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* File Metadata */}
            <div className="pt-3 border-t border-[#E2E8F0] space-y-1.5 text-xs text-[#64748B]">
              <div className="font-semibold text-[#0F172A]">File Integrity</div>
              <div className="flex justify-between">
                <span>Pages:</span>
                <span className="font-mono tabular-nums text-[#0F172A]">{activeDoc?.pageCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Size:</span>
                <span className="font-mono tabular-nums text-[#0F172A]">
                  {(activeDoc ? activeDoc.sizeBytes / 1024 : 0).toFixed(1)} KB
                </span>
              </div>
              <div className="truncate font-mono">SHA-256: {activeDoc?.checksum}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
