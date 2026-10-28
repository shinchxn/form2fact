import React, { useState } from 'react';
import { X, Edit3, AlertCircle } from 'lucide-react';
import { ExtractedField } from '../types/index.ts';
import { correctField } from '../services/api.ts';

interface CorrectionModalProps {
  field: ExtractedField | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedField: ExtractedField) => void;
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({
  field,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [correctedValue, setCorrectedValue] = useState(
    field?.correctedValue || field?.rawValue || ''
  );
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !field) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctedValue.trim()) {
      setError('A corrected value is required.');
      return;
    }
    if (!note.trim()) {
      setError('A rationale note is required for audit compliance.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await correctField(field.id, correctedValue.trim(), note.trim());
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record field correction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="correction-modal-title"
      className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg max-w-lg w-full shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Edit3 className="w-4 h-4 text-[#4F46E5]" />
            <h3 id="correction-modal-title" className="text-lg font-semibold text-[#0F172A]">
              Correct Extracted Field
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
            <div className="p-3 bg-[#FFF1F2] border border-[#FECDD3] rounded-md text-xs text-[#9F1239] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-4 bg-[#F8FAFC] rounded-md border border-[#E2E8F0] space-y-1">
            <div className="font-semibold text-[#0F172A]">
              {field.fieldLabel}{' '}
              <span className="font-mono text-xs text-[#64748B]">({field.fieldName})</span>
            </div>
            <div className="text-xs text-[#64748B] font-mono tabular-nums">
              Page {field.pageNumber} · {field.extractionMethod}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#64748B] mb-1.5">
              Raw Extracted Value
            </label>
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[#0F172A] font-mono text-xs tabular-nums select-all">
              {field.rawValue}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Corrected Value *
            </label>
            <input
              type="text"
              required
              value={correctedValue}
              onChange={(e) => setCorrectedValue(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] text-[#0F172A] font-mono text-sm tabular-nums focus:outline-hidden focus:border-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Audit Note *
            </label>
            <textarea
              required
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain why this extracted value is being overridden..."
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
              {isSubmitting ? 'Saving...' : 'Save & Re-evaluate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
