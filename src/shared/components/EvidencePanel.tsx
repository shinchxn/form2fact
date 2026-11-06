import React from 'react';
import { FileText, ExternalLink, Edit3 } from 'lucide-react';
import { FindingEvidence, ExtractedField } from '../../types/index.ts';

interface EvidencePanelProps {
  evidenceList: FindingEvidence[];
  extractedFields?: ExtractedField[];
  onOpenDocument?: (docId: string, pageNumber: number) => void;
  onOpenCorrection?: (field: ExtractedField) => void;
  className?: string;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidenceList,
  extractedFields = [],
  onOpenDocument,
  onOpenCorrection,
  className = ''
}) => {
  if (evidenceList.length === 0) {
    return (
      <div className={`p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs text-[#64748B] text-center ${className}`}>
        No document evidence citations linked to this item.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {evidenceList.map((ev, idx) => {
        const matchingField = extractedFields.find((f) => f.id === ev.fieldId);
        return (
          <div
            key={ev.id || idx}
            className="p-3.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-xs space-y-2 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#F1F5F9] pb-2">
              <div className="flex items-center gap-1.5 font-medium text-[#0F172A] truncate">
                <FileText className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />
                <span className="truncate">{ev.documentName}</span>
                <span className="font-mono text-[#64748B] text-[11px] shrink-0">· Page {ev.pageNumber}</span>
              </div>

              {onOpenDocument && (
                <button
                  type="button"
                  onClick={() => onOpenDocument(ev.documentId, ev.pageNumber)}
                  className="text-[#4F46E5] hover:text-[#4338CA] font-semibold inline-flex items-center gap-1 shrink-0"
                >
                  <span>Inspect</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="p-2.5 bg-[#F8FAFC] rounded border border-[#E2E8F0] font-mono text-[11px] text-[#334155] leading-relaxed select-all">
              {ev.evidenceText}
            </div>

            {matchingField && onOpenCorrection && (
              <div className="pt-1 flex items-center justify-between text-[11px] text-[#64748B]">
                <span>Extraction: {matchingField.extractionMethod}</span>
                <button
                  type="button"
                  onClick={() => onOpenCorrection(matchingField)}
                  className="text-[#4F46E5] hover:underline font-semibold inline-flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Correct Extracted Value</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

