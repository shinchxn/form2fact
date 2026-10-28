import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import { Application, DocumentType } from '../types/index.ts';
import { createApplication, uploadDocument } from '../services/api.ts';

interface NewApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newApp: Application) => void;
}

export const NewApplicationModal: React.FC<NewApplicationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [institutionName, setInstitutionName] = useState('');
  const [societyOrTrustName, setSocietyOrTrustName] = useState('');
  const [applicationType, setApplicationType] =
    useState<Application['applicationType']>('Extension of Approval');
  const [address, setAddress] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [landAreaAcres, setLandAreaAcres] = useState('7.50');
  const [leaseExpiryDate, setLeaseExpiryDate] = useState('2054-03-31');
  const [sanctionedIntake, setSanctionedIntake] = useState('420');
  const [previousApprovalRef, setPreviousApprovalRef] = useState(
    'F.No. Western/1-35128912/2025/EOA'
  );
  const [reviewerNotes, setReviewerNotes] = useState('');

  const [selectedFiles, setSelectedFiles] = useState<
    { file: File; documentType: DocumentType }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const validPdfs = files.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (validPdfs.length < files.length) {
      setError('Only PDF format is permitted for institutional documents.');
    } else {
      setError(null);
    }

    const newEntries = validPdfs.map((f) => {
      let docType: DocumentType = 'Land Lease Deed';
      const name = f.name.toLowerCase();
      if (name.includes('safety') || name.includes('structural'))
        docType = 'Building Safety Certificate';
      else if (name.includes('fire')) docType = 'Fire Safety NOC';
      else if (name.includes('trust') || name.includes('society'))
        docType = 'Society / Trust Registration Certificate';
      else if (name.includes('approval') || name.includes('aicte'))
        docType = 'AICTE Prior Approval Order';
      return { file: f, documentType: docType };
    });

    setSelectedFiles((prev) => [...prev, ...newEntries]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDocumentTypeChange = (index: number, newType: DocumentType) => {
    setSelectedFiles((prev) =>
      prev.map((item, i) => (i === index ? { ...item, documentType: newType } : item))
    );
  };

  const loadPreset = (preset: 'mismatch' | 'compliant' | 'missing') => {
    if (preset === 'mismatch') {
      setInstitutionName('Pragati Institute of Technology & Management');
      setSocietyOrTrustName('Pragati Educational & Welfare Foundation');
      setApplicationType('New Technical Campus');
      setAddress('Plot 88-92, Industrial Focal Point, Phase 4, Ahmedabad');
      setPinCode('382445');
      setState('Gujarat');
      setLandAreaAcres('7.50');
      setLeaseExpiryDate('2048-03-31');
      setSanctionedIntake('300');
      setPreviousApprovalRef('N/A (New Institution)');
      setReviewerNotes('Declared 7.50 Acres and 2048 lease expiry.');
    } else if (preset === 'compliant') {
      setInstitutionName('Kalyani Institute of Engineering & Technology');
      setSocietyOrTrustName('Kalyani Charitable Educational Trust');
      setApplicationType('Extension of Approval');
      setAddress('Sector 14, Knowledge Corridor, Pune');
      setPinCode('411028');
      setState('Maharashtra');
      setLandAreaAcres('7.50');
      setLeaseExpiryDate('2054-03-31');
      setSanctionedIntake('420');
      setPreviousApprovalRef('F.No. Western/1-35128912/2025/EOA');
      setReviewerNotes('Annual extension scrutiny.');
    } else {
      setInstitutionName('Vidyapeeth Academy of Pharmaceutical Sciences');
      setSocietyOrTrustName('Vidyapeeth Educational Trust');
      setApplicationType('Increase in Intake');
      setAddress('Bypass Road, Near District Stadium, Bhopal');
      setPinCode('462003');
      setState('Madhya Pradesh');
      setLandAreaAcres('5.00');
      setLeaseExpiryDate('2050-06-30');
      setSanctionedIntake('120');
      setPreviousApprovalRef('F.No. Central/1-2819024/2024/EOA');
      setReviewerNotes('Expansion of existing pharmacy program.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionName.trim()) {
      setError('Institution Name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const createdApp = await createApplication({
        institutionName,
        applicationType,
        reviewerNotes,
        declaredDetails: {
          institutionName,
          societyOrTrustName,
          address,
          pinCode,
          state,
          landAreaAcres: parseFloat(landAreaAcres) || 5.0,
          leaseExpiryDate,
          sanctionedIntake: parseInt(sanctionedIntake) || 300,
          previousApprovalRef,
          applicationYear: '2026-27'
        }
      });

      for (const item of selectedFiles) {
        await uploadDocument(createdApp.id, item.file, item.documentType);
      }

      onSuccess(createdApp);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="intake-modal-title"
      className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 id="intake-modal-title" className="text-lg font-semibold text-[#0F172A]">
              New Application
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Enter declared institutional details and attach supporting PDF files.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-[#64748B] hover:text-[#0F172A] p-1.5 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Preload Strip */}
        <div className="px-6 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#64748B]">Load sample preset:</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadPreset('mismatch')}
              className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-md text-[#9F1239] font-semibold transition-colors"
            >
              Lease Mismatch
            </button>
            <button
              type="button"
              onClick={() => loadPreset('compliant')}
              className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-md text-[#065F46] font-semibold transition-colors"
            >
              Compliant
            </button>
            <button
              type="button"
              onClick={() => loadPreset('missing')}
              className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-md text-[#334155] font-semibold transition-colors"
            >
              Missing Evidence
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-sm">
          {error && (
            <div className="p-3.5 bg-[#FFF1F2] border border-[#FECDD3] rounded-md text-xs text-[#9F1239] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Institution Legal Name *
              </label>
              <input
                type="text"
                required
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="e.g. Pragati Institute of Technology & Management"
                className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] text-[#0F172A] focus:outline-hidden focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Sponsoring Society / Trust
              </label>
              <input
                type="text"
                value={societyOrTrustName}
                onChange={(e) => setSocietyOrTrustName(e.target.value)}
                placeholder="e.g. Pragati Educational Foundation"
                className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] text-[#0F172A] focus:outline-hidden focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Application Category
              </label>
              <select
                value={applicationType}
                onChange={(e) => setApplicationType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] text-[#0F172A] focus:outline-hidden focus:border-[#4F46E5]"
              >
                <option value="Extension of Approval">Extension of Approval</option>
                <option value="New Technical Campus">New Technical Campus</option>
                <option value="Increase in Intake">Increase in Intake</option>
                <option value="Change of Site">Change of Site</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Campus Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Plot/Survey number, Street, City"
                className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] text-[#0F172A] focus:outline-hidden focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Declared Land Area (Acres)
              </label>
              <input
                type="number"
                step="0.01"
                value={landAreaAcres}
                onChange={(e) => setLandAreaAcres(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] text-[#0F172A] font-mono tabular-nums focus:outline-hidden focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Declared Lease Expiry Date
              </label>
              <input
                type="date"
                value={leaseExpiryDate}
                onChange={(e) => setLeaseExpiryDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] text-[#0F172A] font-mono tabular-nums focus:outline-hidden focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Sanctioned Intake Capacity
              </label>
              <input
                type="number"
                value={sanctionedIntake}
                onChange={(e) => setSanctionedIntake(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] text-[#0F172A] font-mono tabular-nums focus:outline-hidden focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Prior Approval Reference
              </label>
              <input
                type="text"
                value={previousApprovalRef}
                onChange={(e) => setPreviousApprovalRef(e.target.value)}
                placeholder="e.g. F.No. Western/1-35128912/2025/EOA"
                className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] text-[#0F172A] focus:outline-hidden focus:border-[#4F46E5]"
              />
            </div>
          </div>

          {/* Document Upload Zone */}
          <div className="pt-4 border-t border-[#E2E8F0]">
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Supporting PDF Documents
            </label>

            <label className="border border-dashed border-[#CBD5E1] hover:border-[#4F46E5] rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#F8FAFC]">
              <Upload className="w-5 h-5 text-[#64748B] mb-1.5" />
              <span className="font-semibold text-sm text-[#0F172A]">Select PDF files to attach</span>
              <span className="text-xs text-[#64748B] mt-0.5">Multi-page PDFs up to 15MB</span>
              <input
                type="file"
                multiple
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-2.5">
                {selectedFiles.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-[#4F46E5] shrink-0" />
                      <span className="font-medium text-sm text-[#0F172A] truncate">
                        {item.file.name}
                      </span>
                      <span className="text-[#64748B] text-xs tabular-nums font-mono shrink-0">
                        ({(item.file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={item.documentType}
                        onChange={(e) =>
                          handleDocumentTypeChange(idx, e.target.value as DocumentType)
                        }
                        className="px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-[#FFFFFF] text-[#0F172A] text-xs font-medium"
                      >
                        <option value="Land Lease Deed">Land Lease Deed</option>
                        <option value="Land Ownership Title Deed">Land Ownership Title Deed</option>
                        <option value="Building Safety Certificate">
                          Building Safety Certificate
                        </option>
                        <option value="Fire Safety NOC">Fire Safety NOC</option>
                        <option value="Society / Trust Registration Certificate">
                          Society / Trust Certificate
                        </option>
                        <option value="AICTE Prior Approval Order">Prior Approval Order</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-[#64748B] hover:text-[#E11D48] p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Reviewer Notes</label>
            <textarea
              rows={2}
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)}
              placeholder="Optional intake remarks..."
              className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] text-[#0F172A] focus:outline-hidden focus:border-[#4F46E5]"
            />
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
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
              className="px-4 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-md transition-colors shadow-2xs disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Create Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
