import React, { useState } from 'react';
import { Scale, ArrowRight, RotateCw, CheckCircle2 } from 'lucide-react';
import { StatusBadge, VerificationStatus } from '../../shared/components/StatusBadge.tsx';

interface PairwiseResult {
  label: VerificationStatus;
  confidence: number;
  explanation: string;
  isDeterministic: boolean;
}

export const PairwiseComparator: React.FC = () => {
  const [claimField, setClaimField] = useState('leaseExpiryDate');
  const [claimValue, setClaimValue] = useState('2054-03-31');
  const [evidenceValue, setEvidenceValue] = useState('2028-03-31');
  const [comparisonType, setComparisonType] = useState<'date' | 'numeric' | 'entity-name' | 'generic'>('date');
  const [result, setResult] = useState<PairwiseResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/verification/pairwise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimField: {
            fieldName: claimField,
            fieldLabel: claimField,
            rawValue: claimValue
          },
          evidenceField: evidenceValue ? {
            fieldName: claimField,
            fieldLabel: claimField,
            rawValue: evidenceValue,
            documentName: 'Uploaded_Supporting_Document.pdf',
            pageNumber: 1
          } : undefined,
          comparisonType
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setResult({
          label: json.data.label as VerificationStatus,
          confidence: json.data.confidence,
          explanation: json.data.explanation,
          isDeterministic: json.data.isDeterministic
        });
      }
    } catch (err) {
      console.error('Pairwise comparison request failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-[#4F46E5]" />
          <div>
            <h3 className="text-base font-semibold text-[#0F172A]">Pairwise Field Mismatch Classifier</h3>
            <p className="text-xs text-[#64748B]">Real-time pairwise field comparison using hybrid deterministic and semantic classification.</p>
          </div>
        </div>
        <span className="text-[11px] font-mono bg-[#EEF2FF] text-[#4F46E5] px-2.5 py-1 rounded">
          Model: form2fact-hybrid-pairwise-v1.2
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="block font-semibold text-[#0F172A] mb-1">Target Dimension</label>
          <select
            value={comparisonType}
            onChange={(e) => {
              const type = e.target.value as any;
              setComparisonType(type);
              if (type === 'date') {
                setClaimField('leaseExpiryDate');
                setClaimValue('2054-03-31');
                setEvidenceValue('2028-03-31');
              } else if (type === 'numeric') {
                setClaimField('landAreaAcres');
                setClaimValue('7.50');
                setEvidenceValue('5.20');
              } else if (type === 'entity-name') {
                setClaimField('trustName');
                setClaimValue('Pragati Educational Foundation');
                setEvidenceValue('Pragati Commercial Enterprises Ltd');
              }
            }}
            className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] font-medium"
          >
            <option value="date">Date Expiry / Tenure</option>
            <option value="numeric">Acreage & Numeric Claims</option>
            <option value="entity-name">Sponsoring Entity Concordance</option>
            <option value="generic">Generic Text Equivalence</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-[#0F172A] mb-1">Applicant Claimed Value</label>
          <input
            type="text"
            value={claimValue}
            onChange={(e) => setClaimValue(e.target.value)}
            className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md font-mono text-xs"
          />
        </div>

        <div>
          <label className="block font-semibold text-[#0F172A] mb-1">Document Evidence Value (Leave empty for MISSING)</label>
          <input
            type="text"
            value={evidenceValue}
            onChange={(e) => setEvidenceValue(e.target.value)}
            placeholder="Empty simulates omitted document"
            className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md font-mono text-xs"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleCompare}
          disabled={loading}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />}
          <span>Classify Field Pair</span>
        </button>

        {result && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#64748B]">
              Confidence: <strong className="font-mono text-[#0F172A]">{(result.confidence * 100).toFixed(0)}%</strong>
              {result.isDeterministic && ' · Deterministic'}
            </span>
            <StatusBadge status={result.label} size="lg" />
          </div>
        )}
      </div>

      {result && (
        <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs space-y-1">
          <div className="font-semibold text-[#0F172A]">Explanation & Decision Rationale:</div>
          <div className="text-[#475569] leading-relaxed">{result.explanation}</div>
        </div>
      )}
    </div>
  );
};

