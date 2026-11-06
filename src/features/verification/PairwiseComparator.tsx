import React, { useState } from 'react';
import { Scale, RotateCw, AlertCircle, FileText, CheckCircle2, XCircle, AlertTriangle, HelpCircle, MinusCircle } from 'lucide-react';
import { StatusBadge, VerificationStatus } from '../../shared/components/StatusBadge.tsx';
import { runPairwiseComparison, PairwiseComparisonResult } from '../../services/api.ts';

interface PairwiseComparatorProps {
  initialClaimField?: string;
  initialClaimValue?: string;
  initialEvidenceValue?: string;
  initialComparisonType?: 'date' | 'numeric' | 'entity-name' | 'generic';
  onComparisonComplete?: (result: PairwiseComparisonResult) => void;
  className?: string;
}

export const PairwiseComparator: React.FC<PairwiseComparatorProps> = ({
  initialClaimField = 'leaseExpiryDate',
  initialClaimValue = '2054-03-31',
  initialEvidenceValue = '2028-03-31',
  initialComparisonType = 'date',
  onComparisonComplete,
  className = ''
}) => {
  const [claimField, setClaimField] = useState(initialClaimField);
  const [claimValue, setClaimValue] = useState(initialClaimValue);
  const [evidenceValue, setEvidenceValue] = useState(initialEvidenceValue);
  const [comparisonType, setComparisonType] = useState<'date' | 'numeric' | 'entity-name' | 'generic'>(initialComparisonType);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.85);
  const [result, setResult] = useState<PairwiseComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCompare = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await runPairwiseComparison({
        claimField: {
          fieldName: claimField,
          fieldLabel: claimField,
          rawValue: claimValue
        },
        evidenceField: evidenceValue.trim() ? {
          fieldName: claimField,
          fieldLabel: claimField,
          rawValue: evidenceValue,
          documentName: 'Uploaded_Supporting_Document.pdf',
          pageNumber: 1
        } : undefined,
        comparisonType,
        confidenceThreshold
      });

      setResult(data);
      if (onComparisonComplete) {
        onComparisonComplete(data);
      }
    } catch (err: any) {
      console.error('Pairwise comparison request failed:', err);
      setErrorMessage(err.message || 'Pairwise comparison request failed');
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (type: 'date-mismatch' | 'area-deficit' | 'name-concordance' | 'ocr-corrupted' | 'missing-doc') => {
    if (type === 'date-mismatch') {
      setComparisonType('date');
      setClaimField('leaseExpiryDate');
      setClaimValue('2054-03-31');
      setEvidenceValue('2028-03-31');
    } else if (type === 'area-deficit') {
      setComparisonType('numeric');
      setClaimField('landAreaAcres');
      setClaimValue('7.50');
      setEvidenceValue('5.20');
    } else if (type === 'name-concordance') {
      setComparisonType('entity-name');
      setClaimField('trustName');
      setClaimValue('Pragati Educational Trust');
      setEvidenceValue('Pragati Education Society');
    } else if (type === 'ocr-corrupted') {
      setComparisonType('generic');
      setClaimField('address');
      setClaimValue('Plot 12, Phase 3, Industrial Area');
      setEvidenceValue('Pl0t 1Z, Ph@se 3, lndustr1al Ar3a');
    } else if (type === 'missing-doc') {
      setComparisonType('generic');
      setClaimField('fireSafetyNoc');
      setClaimValue('NOC-FIRE-2026-99');
      setEvidenceValue('');
    }
    setResult(null);
  };

  return (
    <div className={`bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-6 space-y-5 shadow-2xs ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#EEF2FF] text-[#4F46E5] rounded-md">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#0F172A] tracking-tight">
              Pairwise Field Mismatch Classifier
            </h3>
            <p className="text-xs text-[#64748B]">
              Real-time pairwise field comparison using hybrid deterministic rules and UNCERTAIN abstention.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-mono bg-[#F1F5F9] text-[#475569] px-2.5 py-1 rounded border border-[#E2E8F0]">
            Taxonomy: 5 Classes
          </span>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-semibold text-[#64748B] mr-1">Regulatory Presets:</span>
        <button
          type="button"
          onClick={() => setPreset('date-mismatch')}
          className="px-2.5 py-1 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded text-[11px] font-medium text-[#0F172A] transition-colors"
        >
          Date Contradiction (MISMATCH)
        </button>
        <button
          type="button"
          onClick={() => setPreset('area-deficit')}
          className="px-2.5 py-1 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded text-[11px] font-medium text-[#0F172A] transition-colors"
        >
          Area Deficit (MISMATCH)
        </button>
        <button
          type="button"
          onClick={() => setPreset('name-concordance')}
          className="px-2.5 py-1 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded text-[11px] font-medium text-[#0F172A] transition-colors"
        >
          Trust Variant (MATCH)
        </button>
        <button
          type="button"
          onClick={() => setPreset('ocr-corrupted')}
          className="px-2.5 py-1 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded text-[11px] font-medium text-[#0F172A] transition-colors"
        >
          Degraded OCR (UNCERTAIN)
        </button>
        <button
          type="button"
          onClick={() => setPreset('missing-doc')}
          className="px-2.5 py-1 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded text-[11px] font-medium text-[#0F172A] transition-colors"
        >
          Omitted Evidence (MISSING)
        </button>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="block font-semibold text-[#0F172A] mb-1.5">Comparison Dimension</label>
          <select
            value={comparisonType}
            onChange={(e) => setComparisonType(e.target.value as any)}
            className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] font-medium focus:border-[#4F46E5] focus:outline-hidden"
          >
            <option value="date">Date Expiry / Statutory Tenure</option>
            <option value="numeric">Acreage & Numeric Claims</option>
            <option value="entity-name">Sponsoring Trust Concordance</option>
            <option value="generic">Generic Text Equivalence</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-[#0F172A] mb-1.5">Applicant Declared Claim</label>
          <input
            type="text"
            value={claimValue}
            onChange={(e) => setClaimValue(e.target.value)}
            placeholder="e.g. 2054-03-31"
            className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md font-mono text-xs focus:border-[#4F46E5] focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block font-semibold text-[#0F172A] mb-1.5">
            Supporting Evidence Value <span className="text-[#94A3B8] font-normal">(Empty = MISSING)</span>
          </label>
          <input
            type="text"
            value={evidenceValue}
            onChange={(e) => setEvidenceValue(e.target.value)}
            placeholder="e.g. 31st March 2028 (or leave empty)"
            className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md font-mono text-xs focus:border-[#4F46E5] focus:outline-hidden"
          />
        </div>
      </div>

      {/* Threshold & Submit Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3 text-xs text-[#64748B]">
          <span className="font-semibold text-[#0F172A]">Abstention Threshold:</span>
          <input
            type="range"
            min="0.50"
            max="0.95"
            step="0.05"
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
            className="w-24 accent-[#4F46E5]"
          />
          <span className="font-mono text-[#0F172A] font-semibold">{(confidenceThreshold * 100).toFixed(0)}%</span>
        </div>

        <button
          type="button"
          onClick={handleCompare}
          disabled={loading}
          className="px-5 py-2.5 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-2xs"
        >
          {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
          <span>Run Pairwise Classification</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-[#FFF1F2] border border-[#FECDD3] rounded-md text-xs text-[#9F1239] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[#64748B] font-medium">Classification Outcome:</span>
              <StatusBadge status={result.label} size="lg" />
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-[#64748B]">
                Confidence Rating: <strong className="font-mono text-[#0F172A]">{(result.confidence * 100).toFixed(0)}%</strong>
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#E2E8F0] text-[#334155]">
                {result.isDeterministic ? 'Deterministic Heuristic' : 'Semantic Inference'}
              </span>
              {result.requiresHumanReview ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
                  Human Review Required
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]">
                  Automated Clearance
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-[#0F172A]">Decision Rationale & Explanation:</div>
            <div className="text-[#334155] leading-relaxed font-sans">{result.explanation}</div>
          </div>

          <div className="pt-1 flex items-center justify-between text-[11px] text-[#94A3B8] font-mono">
            <span>Model: {result.modelVersion}</span>
            <span>Normalized: &quot;{result.normalizedClaimValue}&quot; vs &quot;{result.normalizedEvidenceValue || '[EMPTY]'}&quot;</span>
          </div>
        </div>
      )}
    </div>
  );
};
