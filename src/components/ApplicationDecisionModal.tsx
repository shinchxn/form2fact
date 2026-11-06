import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, XCircle, Scale, ShieldAlert } from 'lucide-react';
import { Application } from '../types/index.ts';
import { recordApplicationDecision } from '../services/api.ts';

interface ApplicationDecisionModalProps {
  application: Application;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedApp: Application) => void;
}

export const ApplicationDecisionModal: React.FC<ApplicationDecisionModalProps> = ({
  application,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [decisionType, setDecisionType] = useState<'Approved' | 'Rejected' | 'Clarification Required'>('Approved');
  const [rationale, setRationale] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rationale.trim() || rationale.trim().length < 10) {
      setError('A written decision rationale of at least 10 characters is required for statutory sign-off.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await recordApplicationDecision(
        application.id,
        decisionType,
        rationale.trim()
      );
      onSuccess(result.application);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to persist statutory decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-modal-title"
      className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg max-w-lg w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-[#4F46E5]" />
            <div>
              <h3 id="decision-modal-title" className="text-base font-semibold text-[#0F172A]">
                Adjudicate Application Docket
              </h3>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                {application.referenceNumber} · {application.institutionName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-sm">
          {error && (
            <div role="alert" className="p-3 bg-[#FFF1F2] border border-[#FECDD3] rounded-md text-xs text-[#9F1239] flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-2">
              Select Statutory Determination
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setDecisionType('Approved')}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  decisionType === 'Approved'
                    ? 'bg-[#ECFDF5] border-[#10B981] text-[#065F46] ring-2 ring-[#10B981]/20'
                    : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">Approve</span>
                  <CheckCircle2 className={`w-4 h-4 ${decisionType === 'Approved' ? 'text-[#10B981]' : 'text-[#94A3B8]'}`} />
                </div>
                <span className="text-[11px] mt-1.5 opacity-80 leading-snug">All statutory norms satisfied</span>
              </button>

              <button
                type="button"
                onClick={() => setDecisionType('Clarification Required')}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  decisionType === 'Clarification Required'
                    ? 'bg-[#FFFBEB] border-[#F59E0B] text-[#92400E] ring-2 ring-[#F59E0B]/20'
                    : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">Clarify</span>
                  <AlertTriangle className={`w-4 h-4 ${decisionType === 'Clarification Required' ? 'text-[#F59E0B]' : 'text-[#94A3B8]'}`} />
                </div>
                <span className="text-[11px] mt-1.5 opacity-80 leading-snug">Deficiency notice required</span>
              </button>

              <button
                type="button"
                onClick={() => setDecisionType('Rejected')}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  decisionType === 'Rejected'
                    ? 'bg-[#FFF1F2] border-[#EF4444] text-[#9F1239] ring-2 ring-[#EF4444]/20'
                    : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">Reject</span>
                  <XCircle className={`w-4 h-4 ${decisionType === 'Rejected' ? 'text-[#EF4444]' : 'text-[#94A3B8]'}`} />
                </div>
                <span className="text-[11px] mt-1.5 opacity-80 leading-snug">Material statutory violation</span>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="decision-rationale" className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1.5">
              Statutory Rationale & Justification <span className="text-[#EF4444]">*</span>
            </label>
            <textarea
              id="decision-rationale"
              rows={4}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="State the formal statutory findings, reference clauses, and committee grounds for this determination..."
              className="w-full px-3 py-2 text-xs text-[#0F172A] bg-[#FFFFFF] border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent placeholder-[#94A3B8]"
              required
            />
            <p className="text-[11px] text-[#64748B] mt-1">
              This determination is permanently recorded to the scrutiny ledger with your authenticated officer signature.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-xs font-medium text-[#64748B] hover:text-[#0F172A] bg-transparent rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !rationale.trim()}
              className="px-4 py-2 text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting Determination...</span>
                </>
              ) : (
                <span>Confirm Statutory Determination</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
