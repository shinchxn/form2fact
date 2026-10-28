import React, { useState } from 'react';
import { X, CheckCircle, Ban, HelpCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { Finding, FindingStatus, ReviewAction } from '../types/index.ts';
import { submitReviewAction } from '../services/api.ts';

interface ReviewActionModalProps {
  finding: Finding | null;
  initialAction?: 'confirm' | 'dismiss' | 'indeterminate' | 'reopen';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedFinding: Finding) => void;
}

export const ReviewActionModal: React.FC<ReviewActionModalProps> = ({
  finding,
  initialAction = 'confirm',
  isOpen,
  onClose,
  onSuccess
}) => {
  const [selectedActionType, setSelectedActionType] = useState<
    'confirm' | 'dismiss' | 'indeterminate' | 'reopen'
  >(initialAction);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !finding) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setError('A written rationale is required for audit accountability.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let actionLabel: ReviewAction['action'] = 'Confirm Finding';
    let newStatus: FindingStatus = 'Confirmed';

    if (selectedActionType === 'confirm') {
      actionLabel = 'Confirm Finding';
      newStatus = 'Confirmed';
    } else if (selectedActionType === 'dismiss') {
      actionLabel = 'Dismiss Finding';
      newStatus = 'Dismissed';
    } else if (selectedActionType === 'indeterminate') {
      actionLabel = 'Mark Unable to Determine';
      newStatus = 'Unable to Determine';
    } else {
      actionLabel = 'Reopen Finding';
      newStatus = 'Open';
    }

    try {
      const updated = await submitReviewAction(
        finding.id,
        actionLabel,
        newStatus,
        note.trim()
      );
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg max-w-lg w-full shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[#4F46E5]" />
            <h3 id="review-modal-title" className="text-lg font-semibold text-[#0F172A]">
              Record Decision: {finding.reference}
            </h3>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {error && (
            <div className="p-3 bg-[#FFF1F2] border border-[#FECDD3] rounded-md text-xs text-[#9F1239]">
              {error}
            </div>
          )}

          <div className="p-4 bg-[#F8FAFC] rounded-md border border-[#E2E8F0] space-y-1">
            <div className="text-xs font-mono text-[#64748B]">
              {finding.ruleKey} · {finding.category}
            </div>
            <div className="font-semibold text-base text-[#0F172A]">{finding.title}</div>
            <div className="text-[#64748B] text-xs leading-relaxed">
              {finding.explanation}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-2">
              Decision
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedActionType('confirm')}
                className={`p-3.5 rounded-lg text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  selectedActionType === 'confirm'
                    ? 'border-[1.5px] border-[#4F46E5] bg-[#EEF2FF]/30 text-[#0F172A] font-medium'
                    : 'border border-[#E2E8F0] bg-[#FFFFFF] text-[#0F172A] hover:border-[#CBD5E1]'
                }`}
              >
                <CheckCircle className="w-4 h-4 text-[#E11D48] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs">Confirm Finding</div>
                  <div className="text-xs text-[#64748B] mt-0.5">Discrepancy verified</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedActionType('dismiss')}
                className={`p-3.5 rounded-lg text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  selectedActionType === 'dismiss'
                    ? 'border-[1.5px] border-[#4F46E5] bg-[#EEF2FF]/30 text-[#0F172A] font-medium'
                    : 'border border-[#E2E8F0] bg-[#FFFFFF] text-[#0F172A] hover:border-[#CBD5E1]'
                }`}
              >
                <Ban className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs">Dismiss Finding</div>
                  <div className="text-xs text-[#64748B] mt-0.5">Exempted or resolved</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedActionType('indeterminate')}
                className={`p-3.5 rounded-lg text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  selectedActionType === 'indeterminate'
                    ? 'border-[1.5px] border-[#4F46E5] bg-[#EEF2FF]/30 text-[#0F172A] font-medium'
                    : 'border border-[#E2E8F0] bg-[#FFFFFF] text-[#0F172A] hover:border-[#CBD5E1]'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs">Unable to Determine</div>
                  <div className="text-xs text-[#64748B] mt-0.5">Escalate for inspection</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedActionType('reopen')}
                className={`p-3.5 rounded-lg text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  selectedActionType === 'reopen'
                    ? 'border-[1.5px] border-[#4F46E5] bg-[#EEF2FF]/30 text-[#0F172A] font-medium'
                    : 'border border-[#E2E8F0] bg-[#FFFFFF] text-[#0F172A] hover:border-[#CBD5E1]'
                }`}
              >
                <RotateCcw className="w-4 h-4 text-[#64748B] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs">Reopen</div>
                  <div className="text-xs text-[#64748B] mt-0.5">Reset to open state</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Rationale & Audit Note *
            </label>
            <textarea
              required
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Document the evidence or regulatory basis for this decision..."
              className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] text-[#0F172A] text-sm focus:outline-hidden focus:border-[#4F46E5]"
            />
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Decision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
