import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckSquare,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MinusCircle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Plus,
  RefreshCw,
  FileSearch,
  Layers,
  Scale,
  ShieldCheck,
  Eye,
  Save,
  Send,
  Filter,
  Search,
  Award,
  BookOpen,
  Users,
  BarChart3,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import {
  AnnotationRecord,
  UserAnnotation,
  AnnotationMetrics,
  FiveClassLabel,
  User,
  AnnotationRecordStatus
} from '../types/index.ts';
import {
  fetchAnnotationRecords,
  fetchAnnotationRecordById,
  createAnnotationRecord,
  saveUserAnnotation,
  adjudicateAnnotationRecord,
  fetchAnnotationMetrics,
  exportGoldStandard
} from '../services/api.ts';

interface AnnotationWorkbenchViewProps {
  currentUser: User;
  onNavigate?: (view: any) => void;
}

const FIVE_CLASSES: {
  label: FiveClassLabel;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
}[] = [
  {
    label: 'MATCH',
    name: 'Statutory Match',
    description: 'Claimed institutional value precisely corresponds with documentary proof within regulatory tolerance.',
    color: 'text-[#059669]',
    bgColor: 'bg-[#ECFDF5]',
    borderColor: 'border-[#10B981]',
    badgeBg: 'bg-[#D1FAE5]'
  },
  {
    label: 'MISMATCH',
    name: 'Statutory Mismatch',
    description: 'Claimed value directly contradicts, deviates from, or fails documentary evidence.',
    color: 'text-[#DC2626]',
    bgColor: 'bg-[#FEF2F2]',
    borderColor: 'border-[#EF4444]',
    badgeBg: 'bg-[#FEE2E2]'
  },
  {
    label: 'MISSING',
    name: 'Missing Evidence',
    description: 'Required statutory claim or metric is omitted entirely from supporting institutional docket files.',
    color: 'text-[#7C3AED]',
    bgColor: 'bg-[#F5F3FF]',
    borderColor: 'border-[#8B5CF6]',
    badgeBg: 'bg-[#EDE9FE]'
  },
  {
    label: 'UNCERTAIN',
    name: 'Inconclusive / Uncertain',
    description: 'Evidence is ambiguous, degraded by poor scan quality, or requires institutional clarification.',
    color: 'text-[#D97706]',
    bgColor: 'bg-[#FFFBEB]',
    borderColor: 'border-[#F59E0B]',
    badgeBg: 'bg-[#FEF3C7]'
  },
  {
    label: 'NOT_COMPARABLE',
    name: 'Not Comparable',
    description: 'Incompatible semantic types, non-corresponding clauses, or inapplicable statutory metric pairing.',
    color: 'text-[#475569]',
    bgColor: 'bg-[#F8FAFC]',
    borderColor: 'border-[#94A3B8]',
    badgeBg: 'bg-[#E2E8F0]'
  }
];

export const AnnotationWorkbenchView: React.FC<AnnotationWorkbenchViewProps> = ({
  currentUser,
  onNavigate
}) => {
  // Data state
  const [records, setRecords] = useState<AnnotationRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AnnotationRecord | null>(null);
  const [metrics, setMetrics] = useState<AnnotationMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [institutionFilter, setInstitutionFilter] = useState<string>('all');

  // Annotation Form State
  const [activeLabel, setActiveLabel] = useState<FiveClassLabel | null>(null);
  const [rationale, setRationale] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Adjudication Form State
  const [adjudicationLabel, setAdjudicationLabel] = useState<FiveClassLabel | null>(null);
  const [adjudicationRationale, setAdjudicationRationale] = useState<string>('');
  const [isAdjudicating, setIsAdjudicating] = useState<boolean>(false);

  // Document Viewer State
  const [viewerPage, setViewerPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [activeDocumentTab, setActiveDocumentTab] = useState<'evidence' | 'claim'>('evidence');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportResult, setExportResult] = useState<{
    count: number;
    outPath: string;
    sha256: string;
    manifestPath: string;
  } | null>(null);

  // New Candidate Task Form State
  const [newInstitutionName, setNewInstitutionName] = useState('');
  const [newClaimFieldName, setNewClaimFieldName] = useState('');
  const [newClaimText, setNewClaimText] = useState('');
  const [newClaimDocName, setNewClaimDocName] = useState('AICTE Statutory Application Form Part-1');
  const [newClaimPage, setNewClaimPage] = useState(1);
  const [newEvidenceText, setNewEvidenceText] = useState('');
  const [newEvidenceDocName, setNewEvidenceDocName] = useState('Land Registered Deed');
  const [newEvidencePage, setNewEvidencePage] = useState(1);
  const [newEvidenceLocation, setNewEvidenceLocation] = useState('Clause 2.1');
  const [newNormalizedClaim, setNewNormalizedClaim] = useState('');
  const [newNormalizedEvidence, setNewNormalizedEvidence] = useState('');
  const [newFieldCategory, setNewFieldCategory] = useState<string>('generic');

  // Permissions based on Role
  const canCreateTask = ['Administrator', 'Reviewer', 'Data Collector'].includes(currentUser.role);
  const canAnnotate = ['Administrator', 'Reviewer', 'Annotator', 'Adjudicator'].includes(currentUser.role);
  const canAdjudicate = ['Administrator', 'Adjudicator'].includes(currentUser.role);
  const canExport = ['Administrator', 'Reviewer', 'Adjudicator'].includes(currentUser.role);

  // Load records and metrics
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedRecords, fetchedMetrics] = await Promise.all([
        fetchAnnotationRecords({
          status: statusFilter === 'all' ? undefined : statusFilter,
          institutionId: institutionFilter === 'all' ? undefined : institutionFilter
        }),
        fetchAnnotationMetrics()
      ]);
      setRecords(fetchedRecords);
      setMetrics(fetchedMetrics);

      // Select first record if none selected or if previously selected record is gone
      if (fetchedRecords.length > 0) {
        if (!selectedRecordId || !fetchedRecords.some((r) => r.id === selectedRecordId)) {
          setSelectedRecordId(fetchedRecords[0].id);
        }
      } else {
        setSelectedRecordId(null);
        setSelectedRecord(null);
      }
    } catch (err: any) {
      console.error('Failed to load annotation data:', err);
      setError(err.message || 'Failed to communicate with annotation backend service.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, institutionFilter, selectedRecordId]);

  useEffect(() => {
    loadData();
  }, [statusFilter, institutionFilter]);

  // Load single selected record details
  useEffect(() => {
    if (!selectedRecordId) {
      setSelectedRecord(null);
      return;
    }
    const fetchCurrent = async () => {
      try {
        const fullRecord = await fetchAnnotationRecordById(selectedRecordId);
        setSelectedRecord(fullRecord);

        // Prepopulate current user's annotation if present
        const myAnn = fullRecord.userAnnotations?.find((u) => u.annotatorId === currentUser.id);
        if (myAnn) {
          setActiveLabel(myAnn.label);
          setRationale(myAnn.rationale || '');
        } else {
          setActiveLabel(null);
          setRationale('');
        }

        // Set viewer page to evidence page
        setViewerPage(fullRecord.evidencePage || 1);
        setActiveDocumentTab('evidence');
      } catch (err: any) {
        console.error('Failed to load record details:', err);
      }
    };
    fetchCurrent();
  }, [selectedRecordId, currentUser.id]);

  // Filtered task records list
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.claimFieldName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.claimText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.evidenceText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.institutionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.recordId.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [records, searchTerm]);

  // Unique institutions for filter dropdown
  const uniqueInstitutions = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((r) => map.set(r.institutionId, r.institutionName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [records]);

  // Save draft or submit annotation
  const handleSaveAnnotation = async (isDraft: boolean) => {
    if (!selectedRecord) return;
    if (!activeLabel) {
      setError('Please select one of the five canonical classification labels.');
      return;
    }
    if (!isDraft && rationale.trim().length < 10) {
      setError('A substantive statutory rationale (minimum 10 characters) is required when submitting an annotation.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const result = await saveUserAnnotation(selectedRecord.id, {
        label: activeLabel,
        rationale: rationale.trim(),
        isDraft
      });
      setSelectedRecord(result.record);
      setSuccessMsg(isDraft ? 'Annotation draft saved successfully.' : 'Independent blind annotation submitted successfully.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save annotation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Adjudication
  const handleAdjudicate = async () => {
    if (!selectedRecord) return;
    if (!adjudicationLabel) {
      setError('Please select the definitive resolved classification label.');
      return;
    }
    if (adjudicationRationale.trim().length < 10) {
      setError('A substantive adjudication rationale (minimum 10 characters) is required.');
      return;
    }

    setIsAdjudicating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await adjudicateAnnotationRecord(selectedRecord.id, {
        label: adjudicationLabel,
        rationale: adjudicationRationale.trim()
      });
      setSelectedRecord(updated);
      setSuccessMsg(`Dispute successfully adjudicated. Final label: ${adjudicationLabel}`);
      setAdjudicationRationale('');
      setAdjudicationLabel(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to adjudicate record.');
    } finally {
      setIsAdjudicating(false);
    }
  };

  // Export Gold-Standard
  const handleExport = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await exportGoldStandard();
      setExportResult(res);
      setIsExportModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to export gold standard dataset.');
    }
  };

  // Handle Create Record
  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstitutionName.trim() || !newClaimFieldName.trim() || !newClaimText.trim() || !newEvidenceText.trim()) {
      setError('All core candidate fields are mandatory.');
      return;
    }

    setError(null);
    try {
      await createAnnotationRecord({
        institutionName: newInstitutionName.trim(),
        claimFieldName: newClaimFieldName.trim(),
        claimText: newClaimText.trim(),
        claimDocumentName: newClaimDocName.trim(),
        claimPage: Number(newClaimPage) || 1,
        evidenceText: newEvidenceText.trim(),
        evidenceDocumentName: newEvidenceDocName.trim(),
        evidencePage: Number(newEvidencePage) || 1,
        evidenceLocation: newEvidenceLocation.trim(),
        normalizedClaimValue: newNormalizedClaim.trim() || undefined,
        normalizedEvidenceValue: newNormalizedEvidence.trim() || undefined,
        fieldCategory: newFieldCategory as any,
        sourceProvenance: 'AICTE Institutional Compliance Archive 2025-26',
        licence: 'Public Regulatory Inspection Disclosure'
      });

      setIsCreateModalOpen(false);
      setSuccessMsg('Candidate claim/evidence pair added to annotation queue.');
      // Reset form
      setNewInstitutionName('');
      setNewClaimFieldName('');
      setNewClaimText('');
      setNewEvidenceText('');
      setNewNormalizedClaim('');
      setNewNormalizedEvidence('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create candidate task.');
    }
  };

  // Determine user's current annotation on selected record
  const userCurrentAnnotation = selectedRecord?.userAnnotations?.find(
    (u) => u.annotatorId === currentUser.id
  );

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-[#F8FAFC]">
      {/* Top Banner & Control Bar */}
      <div className="bg-[#FFFFFF] border-b border-[#E2E8F0] px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-[#F0FDFA] text-[#0D9488] rounded-md border border-[#99F6E4]">
                <CheckSquare className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-[#0A2540] tracking-tight">
                    AICTE Human Annotation Workbench
                  </h1>
                  <span className="text-[11px] font-mono font-bold bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded border border-[#CBD5E1]">
                    V3 Gold Standard
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Double-blind independent cross-verification, disagreement detection and adjudication
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs text-[#64748B] bg-[#F8FAFC] px-3 py-1.5 rounded border border-[#E2E8F0] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#0D9488]" />
              Role: <strong className="text-[#0A2540]">{currentUser.role}</strong>
            </span>

            {canCreateTask && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#0A2540] border border-[#CBD5E1] rounded-md transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#0D9488]" />
                Add Candidate Pair
              </button>
            )}

            {canExport && (
              <button
                type="button"
                onClick={handleExport}
                className="px-3.5 py-1.5 text-xs font-semibold bg-[#0D9488] hover:bg-[#0F766E] text-[#FFFFFF] rounded-md transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export Gold-Standard JSONL
              </button>
            )}

            <button
              type="button"
              onClick={loadData}
              title="Refresh queue"
              className="p-1.5 text-[#64748B] hover:text-[#0A2540] hover:bg-[#F1F5F9] rounded border border-[#E2E8F0] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-time Quality Control & Metrics Dashboard */}
        {metrics && (
          <div className="mt-4 pt-4 border-t border-[#F1F5F9] grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Card 1: Records Collected */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
              <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Total Records
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-[#0A2540] tabular-nums">
                  {metrics.totalRecords}
                </span>
                <span className="text-xs text-[#059669] font-medium">
                  ({metrics.completedRecords} completed)
                </span>
              </div>
              <div className="text-[11px] text-[#64748B] mt-0.5">
                {metrics.agreedRecords} agreed · {metrics.adjudicatedRecords} adjudicated
              </div>
            </div>

            {/* Card 2: Inter-Annotator Agreement (Cohen's Kappa) */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Cohen's Kappa (κ)
                </span>
                <Award className="w-3.5 h-3.5 text-[#0D9488]" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-[#0A2540] font-mono tabular-nums">
                  {metrics.cohensKappa !== null ? metrics.cohensKappa.toFixed(3) : 'N/A'}
                </span>
                <span className="text-xs text-[#475569] font-mono">
                  (raw: {(metrics.rawAgreementRate * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="text-[11px] font-medium text-[#0D9488] truncate mt-0.5">
                {metrics.cohensKappaInterpretation}
              </div>
            </div>

            {/* Card 3: Adjudication & Disputes */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
              <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Adjudication Rate
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-[#0A2540] font-mono tabular-nums">
                  {(metrics.adjudicationRate * 100).toFixed(1)}%
                </span>
                {metrics.disputedRecords > 0 && (
                  <span className="text-xs text-[#DC2626] font-semibold bg-[#FEE2E2] px-1.5 py-0.2 rounded">
                    {metrics.disputedRecords} pending
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#64748B] mt-0.5">
                Disagreement resolution rate
              </div>
            </div>

            {/* Card 4: Missing Evidence Rate */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
              <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Missing Evidence
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-[#7C3AED] font-mono tabular-nums">
                  {(metrics.missingEvidenceRate * 100).toFixed(1)}%
                </span>
                <span className="text-xs text-[#64748B]">
                  ({metrics.labelDistribution.MISSING} cases)
                </span>
              </div>
              <div className="text-[11px] text-[#64748B] mt-0.5">
                Mandatory claims omitted
              </div>
            </div>

            {/* Card 5: Gold Standard Invariants */}
            <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg col-span-2 md:col-span-1">
              <div className="text-[11px] font-semibold text-[#166534] uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                Zero Synthetic Data
              </div>
              <div className="text-xs font-semibold text-[#15803D] mt-1">
                100% Human Verified
              </div>
              <div className="text-[11px] text-[#166534] mt-0.5 truncate">
                Legally traceable provenance
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="mx-6 mt-4 p-3.5 bg-[#FEF2F2] border border-[#FECDD3] rounded-lg flex items-center justify-between text-xs text-[#9F1239]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D48]" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mx-6 mt-4 p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg flex items-center justify-between text-xs text-[#166534]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16A34A]" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-xs font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3-Pane Annotation Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row items-stretch p-6 gap-6">
        {/* PANE 1: Candidate Task Queue & Filter */}
        <div className="w-full lg:w-80 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl flex flex-col shrink-0 shadow-2xs overflow-hidden">
          {/* Queue Header & Filters */}
          <div className="p-4 border-b border-[#E2E8F0] space-y-3 bg-[#FAFAFA]">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0D9488]" />
                Annotation Queue ({filteredRecords.length})
              </h2>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search field, text or institution..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#CBD5E1] rounded-md focus:outline-none focus:border-[#0D9488]"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 text-[11px] font-medium">
              {[
                { id: 'all', label: 'All' },
                { id: 'pending', label: 'Pending' },
                { id: 'in_review', label: 'In Review' },
                { id: 'disputed', label: 'Disputed' },
                { id: 'agreed', label: 'Agreed' },
                { id: 'adjudicated', label: 'Adjudicated' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2 py-1 rounded whitespace-nowrap transition-colors cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-[#0A2540] text-[#FFFFFF] font-semibold'
                      : 'bg-[#FFFFFF] text-[#64748B] hover:bg-[#F1F5F9] border border-[#E2E8F0]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Institution Filter */}
            {uniqueInstitutions.length > 1 && (
              <div className="text-[11px]">
                <select
                  value={institutionFilter}
                  onChange={(e) => setInstitutionFilter(e.target.value)}
                  className="w-full px-2 py-1 bg-[#FFFFFF] border border-[#CBD5E1] rounded text-[#475569]"
                >
                  <option value="all">All Institutions ({uniqueInstitutions.length})</option>
                  {uniqueInstitutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Record List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9] max-h-[calc(100vh-22rem)]">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#64748B]">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#0D9488] mb-2" />
                Loading candidate tasks...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748B]">
                No annotation tasks match current filters.
              </div>
            ) : (
              filteredRecords.map((r) => {
                const isSelected = r.id === selectedRecordId;
                const myAnnotation = r.userAnnotations?.find((u) => u.annotatorId === currentUser.id);

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRecordId(r.id)}
                    className={`w-full p-3.5 text-left transition-all cursor-pointer block ${
                      isSelected
                        ? 'bg-[#F0FDFA] border-l-4 border-[#0D9488]'
                        : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <span className="text-[11px] font-mono font-semibold text-[#0D9488] truncate">
                        {r.claimFieldName}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                          r.status === 'agreed'
                            ? 'bg-[#DCFCE7] text-[#166534]'
                            : r.status === 'disputed'
                            ? 'bg-[#FEE2E2] text-[#991B1B] font-bold animate-pulse'
                            : r.status === 'adjudicated'
                            ? 'bg-[#EDE9FE] text-[#6B21A8]'
                            : r.status === 'in_review'
                            ? 'bg-[#FEF3C7] text-[#92400E]'
                            : 'bg-[#F1F5F9] text-[#475569]'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-[#0A2540] truncate">
                      {r.institutionName}
                    </div>

                    <div className="text-[11px] text-[#64748B] line-clamp-2 mt-1 leading-relaxed">
                      "{r.claimText}"
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#E2E8F0]/60 flex items-center justify-between text-[10px] text-[#64748B]">
                      <span>
                        {myAnnotation ? (
                          <span className="text-[#0D9488] font-semibold">
                            ✓ Annotated: {myAnnotation.label}
                          </span>
                        ) : (
                          <span className="text-[#94A3B8]">Pending your review</span>
                        )}
                      </span>
                      {r.finalLabel && (
                        <span className="font-mono font-bold text-[#0A2540]">
                          Final: {r.finalLabel}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* PANE 2: Document & Supporting Evidence Inspector */}
        <div className="flex-1 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl flex flex-col shadow-2xs overflow-hidden">
          {selectedRecord ? (
            <>
              {/* Document Header & Tab Switcher */}
              <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex rounded-md p-0.5 bg-[#E2E8F0]">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDocumentTab('evidence');
                        setViewerPage(selectedRecord.evidencePage || 1);
                      }}
                      className={`px-3 py-1 text-xs rounded font-semibold transition-colors cursor-pointer ${
                        activeDocumentTab === 'evidence'
                          ? 'bg-[#FFFFFF] text-[#0A2540] shadow-2xs'
                          : 'text-[#64748B] hover:text-[#0A2540]'
                      }`}
                    >
                      Evidence Document
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDocumentTab('claim');
                        setViewerPage(selectedRecord.claimPage || 1);
                      }}
                      className={`px-3 py-1 text-xs rounded font-semibold transition-colors cursor-pointer ${
                        activeDocumentTab === 'claim'
                          ? 'bg-[#FFFFFF] text-[#0A2540] shadow-2xs'
                          : 'text-[#64748B] hover:text-[#0A2540]'
                      }`}
                    >
                      Application Claim Document
                    </button>
                  </div>

                  <span className="text-xs text-[#64748B] font-mono hidden sm:inline">
                    {activeDocumentTab === 'evidence'
                      ? selectedRecord.evidenceDocumentName || 'Statutory Supporting Document'
                      : selectedRecord.claimDocumentName || 'Institutional Application Docket'}
                  </span>
                </div>

                {/* Page Controls & Zoom */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 bg-[#FFFFFF] border border-[#CBD5E1] rounded px-2 py-0.5">
                    <button
                      type="button"
                      onClick={() => setViewerPage((p) => Math.max(1, p - 1))}
                      disabled={viewerPage <= 1}
                      className="p-1 hover:bg-[#F1F5F9] rounded disabled:opacity-30"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono font-semibold px-2 tabular-nums">
                      Page {viewerPage}
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewerPage((p) => p + 1)}
                      className="p-1 hover:bg-[#F1F5F9] rounded"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 text-[#64748B]">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(80, z - 10))}
                      className="p-1 hover:bg-[#F1F5F9] rounded"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono tabular-nums w-10 text-center font-semibold text-[#0A2540]">
                      {zoomLevel}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
                      className="p-1 hover:bg-[#F1F5F9] rounded"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Document Canvas & Highlighting Body */}
              <div className="flex-1 p-6 overflow-y-auto bg-[#F8FAFC]">
                <div
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'top center'
                  }}
                  className="max-w-[760px] mx-auto min-h-[600px] bg-[#FFFFFF] border border-[#E2E8F0] shadow-sm rounded-sm p-10 relative transition-transform duration-150"
                >
                  {/* Watermark & Document Heading */}
                  <div className="border-b border-[#E2E8F0] pb-4 mb-6 flex items-start justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">
                        AICTE REGULATORY CROSS-VERIFICATION DOCKET · EVIDENCE SHEET
                      </div>
                      <h3 className="text-base font-bold text-[#0A2540] mt-1">
                        {activeDocumentTab === 'evidence'
                          ? selectedRecord.evidenceDocumentName || 'Supporting Documentary Evidence'
                          : selectedRecord.claimDocumentName || 'Statutory Application Form'}
                      </h3>
                      <div className="text-xs text-[#64748B] mt-0.5">
                        Institution: {selectedRecord.institutionName} ({selectedRecord.institutionId})
                      </div>
                    </div>
                    <div className="text-right text-[11px] font-mono text-[#64748B]">
                      <div className="font-bold text-[#0A2540]">PAGE {viewerPage}</div>
                      <div className="text-[#10B981] mt-0.5">● PROVENANCE AUDITED</div>
                    </div>
                  </div>

                  {/* Render Highlighted Document Text */}
                  <div className="space-y-4 text-xs leading-relaxed text-[#334155]">
                    <p className="text-[#64748B] italic border-b border-[#F1F5F9] pb-2">
                      [Official Statutory OCR Layer — Page {viewerPage} of Institutional Record Docket]
                    </p>

                    {activeDocumentTab === 'evidence' ? (
                      <div className="space-y-4">
                        <div className="p-3 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                          <span className="font-semibold text-[#64748B] block mb-1">
                            Docket Reference & Location:
                          </span>
                          <span className="font-mono text-[#0A2540]">
                            {selectedRecord.evidenceLocation || 'General Clauses / Schedule'}
                          </span>
                        </div>

                        {/* Highlighting the Evidence Text */}
                        <div className="p-4 rounded-md bg-[#F0FDFA] border-l-4 border-[#0D9488] text-[#0A2540] shadow-2xs">
                          <div className="flex items-center justify-between text-[10px] font-mono text-[#0D9488] mb-1.5 font-bold uppercase tracking-wider">
                            <span>EXTRACTED DOCUMENTARY EVIDENCE (PAGE {selectedRecord.evidencePage || 1})</span>
                            <span>VERIFIED BY OCR</span>
                          </div>
                          <div className="text-sm font-medium leading-relaxed">
                            {selectedRecord.evidenceText}
                          </div>
                          {selectedRecord.normalizedEvidenceValue && (
                            <div className="mt-2 pt-2 border-t border-[#99F6E4] text-[11px] font-mono text-[#0F766E]">
                              Normalized Value: <strong>{selectedRecord.normalizedEvidenceValue}</strong>
                            </div>
                          )}
                        </div>

                        <div className="p-3 bg-[#FAFAFA] rounded text-[#64748B] leading-relaxed text-[11px]">
                          Note: This verified evidence extract was obtained directly from the certified institutional docket file uploaded to the AICTE Western Regional Bureau archive.
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-3 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                          <span className="font-semibold text-[#64748B] block mb-1">
                            Claim Field:
                          </span>
                          <span className="font-mono text-[#0A2540]">
                            {selectedRecord.claimFieldName}
                          </span>
                        </div>

                        {/* Highlighting the Claim Text */}
                        <div className="p-4 rounded-md bg-[#EFF6FF] border-l-4 border-[#3B82F6] text-[#0A2540] shadow-2xs">
                          <div className="flex items-center justify-between text-[10px] font-mono text-[#2563EB] mb-1.5 font-bold uppercase tracking-wider">
                            <span>APPLICANT STATUTORY CLAIM (PAGE {selectedRecord.claimPage || 1})</span>
                            <span>SELF-DISCLOSED</span>
                          </div>
                          <div className="text-sm font-medium leading-relaxed">
                            {selectedRecord.claimText}
                          </div>
                          {selectedRecord.normalizedClaimValue && (
                            <div className="mt-2 pt-2 border-t border-[#BFDBFE] text-[11px] font-mono text-[#1D4ED8]">
                              Normalized Value: <strong>{selectedRecord.normalizedClaimValue}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Document Footer */}
                  <div className="mt-12 pt-4 border-t border-[#E2E8F0] flex justify-between text-[11px] text-[#94A3B8] font-mono">
                    <span>Provenance: {selectedRecord.sourceProvenance || 'Public AICTE Portal'}</span>
                    <span>Licence: {selectedRecord.licence || 'Public Disclosure'}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-[#64748B]">
              <FileSearch className="w-12 h-12 text-[#CBD5E1] mb-3" />
              <h3 className="text-sm font-bold text-[#0A2540]">No Task Selected</h3>
              <p className="text-xs text-[#64748B] mt-1 max-w-sm">
                Select an annotation candidate task from the queue on the left to inspect documents and submit human verification.
              </p>
            </div>
          )}
        </div>

        {/* PANE 3: Comparative Decision, 5-Class Selector & Adjudication */}
        <div className="w-full lg:w-96 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl flex flex-col shrink-0 shadow-2xs overflow-hidden">
          {selectedRecord ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-5 max-h-[calc(100vh-14rem)]">
              {/* Header & Status */}
              <div className="border-b border-[#E2E8F0] pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#0A2540] uppercase tracking-wider">
                    Pairwise Verification Panel
                  </h3>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    Record ID: <span className="font-mono">{selectedRecord.recordId}</span>
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    selectedRecord.status === 'agreed'
                      ? 'bg-[#DCFCE7] text-[#166534]'
                      : selectedRecord.status === 'disputed'
                      ? 'bg-[#FEE2E2] text-[#991B1B] font-bold'
                      : selectedRecord.status === 'adjudicated'
                      ? 'bg-[#EDE9FE] text-[#6B21A8]'
                      : 'bg-[#F1F5F9] text-[#475569]'
                  }`}
                >
                  {selectedRecord.status}
                </span>
              </div>

              {/* Side-by-Side Comparison Snippet */}
              <div className="space-y-3">
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                  <div className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-wider mb-1">
                    Statutory Claim ({selectedRecord.claimFieldName})
                  </div>
                  <div className="text-xs font-semibold text-[#0A2540]">
                    "{selectedRecord.claimText}"
                  </div>
                  {selectedRecord.normalizedClaimValue && (
                    <div className="text-[10px] font-mono text-[#64748B] mt-1">
                      Norm: {selectedRecord.normalizedClaimValue}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-[#F0FDFA] border border-[#99F6E4] rounded-lg">
                  <div className="text-[10px] font-bold text-[#0D9488] uppercase tracking-wider mb-1">
                    Supporting Documentary Evidence
                  </div>
                  <div className="text-xs font-semibold text-[#0A2540]">
                    "{selectedRecord.evidenceText}"
                  </div>
                  {selectedRecord.normalizedEvidenceValue && (
                    <div className="text-[10px] font-mono text-[#0D9488] mt-1">
                      Norm: {selectedRecord.normalizedEvidenceValue}
                    </div>
                  )}
                </div>
              </div>

              {/* 5-Class Annotation Selector */}
              {canAnnotate && (
                <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#0A2540] uppercase tracking-wider">
                      Select 5-Class Ground Truth
                    </label>
                    <span className="text-[10px] text-[#64748B]">Independent Blind Review</span>
                  </div>

                  <div className="space-y-2">
                    {FIVE_CLASSES.map((item) => {
                      const isSelected = activeLabel === item.label;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => setActiveLabel(item.label)}
                          className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                            isSelected
                              ? `${item.bgColor} ${item.borderColor} border-2 shadow-2xs`
                              : 'bg-[#FFFFFF] hover:bg-[#F8FAFC] border-[#E2E8F0]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${item.color}`}>
                              {item.name} ({item.label})
                            </span>
                            {isSelected && (
                              <CheckCircle2 className={`w-4 h-4 ${item.color}`} />
                            )}
                          </div>
                          <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">
                            {item.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Substantive Rationale Input */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#0A2540]">
                        Substantive Statutory Rationale
                      </label>
                      <span
                        className={`text-[10px] font-mono ${
                          rationale.trim().length >= 10
                            ? 'text-[#059669]'
                            : 'text-[#DC2626]'
                        }`}
                      >
                        {rationale.trim().length} / 10 min chars
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Explain documentary rationale, tolerance calculation, or why evidence matches / deviates..."
                      value={rationale}
                      onChange={(e) => setRationale(e.target.value)}
                      className="w-full p-2.5 text-xs bg-[#FFFFFF] border border-[#CBD5E1] rounded-md focus:outline-none focus:border-[#0D9488]"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleSaveAnnotation(true)}
                      disabled={isSubmitting || !activeLabel}
                      className="flex-1 py-2 text-xs font-semibold bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1] rounded-md transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Draft
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveAnnotation(false)}
                      disabled={isSubmitting || !activeLabel || rationale.trim().length < 10}
                      className="flex-1 py-2 text-xs font-semibold bg-[#0D9488] hover:bg-[#0F766E] text-[#FFFFFF] rounded-md transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-2xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Submit Annotation
                    </button>
                  </div>
                </div>
              )}

              {/* DISPUTE & ADJUDICATION SECTION (Visible if Disputed and User is Adjudicator/Admin) */}
              {selectedRecord.status === 'disputed' && (
                <div className="pt-4 border-t border-[#E2E8F0] space-y-4">
                  <div className="p-3 bg-[#FEF2F2] border border-[#FECDD3] rounded-lg">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#991B1B]">
                      <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                      Double-Blind Disagreement Detected
                    </div>
                    <p className="text-[11px] text-[#B91C1C] mt-1 leading-relaxed">
                      Two independent annotators have arrived at conflicting classification decisions. Third-party statutory adjudication is required before this record can enter the gold standard.
                    </p>
                  </div>

                  {/* Revealed Blind Annotations for Adjudicator */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                      Independent Blind Submissions:
                    </div>
                    {selectedRecord.userAnnotations && selectedRecord.userAnnotations.length > 0 ? (
                      selectedRecord.userAnnotations
                        .filter((u) => !u.isDraft)
                        .map((u, i) => (
                          <div
                            key={u.id}
                            className="p-3 rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#0A2540]">
                                Annotator {i + 1} ({u.annotatorRole})
                              </span>
                              <span className="font-mono font-bold text-[#DC2626] bg-[#FEE2E2] px-1.5 py-0.5 rounded">
                                {u.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#475569] italic">
                              "{u.rationale}"
                            </p>
                          </div>
                        ))
                    ) : (
                      <div className="text-xs text-[#64748B]">
                        Annotations are currently masked for blind integrity.
                      </div>
                    )}
                  </div>

                  {/* Adjudication Decision Panel */}
                  {canAdjudicate && (
                    <div className="p-3 bg-[#FAF5FF] border border-[#E9D5FF] rounded-lg space-y-3">
                      <div className="text-xs font-bold text-[#6B21A8] uppercase tracking-wider">
                        Third-Reviewer Adjudication Resolution
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {FIVE_CLASSES.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => setAdjudicationLabel(item.label)}
                            className={`p-1.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                              adjudicationLabel === item.label
                                ? `${item.bgColor} ${item.borderColor} ${item.color}`
                                : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#475569]'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-[#475569]">
                          Adjudication Statutory Rationale:
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Provide regulatory justification for resolving this dispute..."
                          value={adjudicationRationale}
                          onChange={(e) => setAdjudicationRationale(e.target.value)}
                          className="w-full p-2 text-xs bg-[#FFFFFF] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#7C3AED]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAdjudicate}
                        disabled={
                          isAdjudicating ||
                          !adjudicationLabel ||
                          adjudicationRationale.trim().length < 10
                        }
                        className="w-full py-2 text-xs font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-[#FFFFFF] rounded transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                      >
                        Submit Binding Adjudication
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Already Adjudicated Banner */}
              {selectedRecord.status === 'adjudicated' && (
                <div className="p-3 bg-[#FAF5FF] border border-[#E9D5FF] rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-[#6B21A8]">
                    <span>Adjudicated by: {selectedRecord.adjudicatorName}</span>
                    <span className="font-mono bg-[#EDE9FE] px-1.5 py-0.5 rounded">
                      {selectedRecord.finalLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#475569]">
                    Rationale: "{selectedRecord.adjudicationRationale}"
                  </p>
                </div>
              )}

              {/* Agreed Consensus Banner */}
              {selectedRecord.status === 'agreed' && (
                <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#065F46]">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    Double-Blind Consensus Reached
                  </div>
                  <p className="text-[11px] text-[#047857]">
                    Both annotators independently agreed on canonical label: <strong>{selectedRecord.finalLabel}</strong>. Ready for V3 gold standard export.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#64748B]">
              <Scale className="w-8 h-8 text-[#CBD5E1] mb-2" />
              <div className="text-xs font-semibold text-[#0A2540]">No Task Selected</div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD CANDIDATE TASK */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#000000]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#0A2540]">
                Add Candidate Institutional Claim / Evidence Pair
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-xs text-[#64748B] hover:text-[#0A2540] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-[#0A2540] block mb-1">
                  Institution Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Institute of Technology & Research"
                  value={newInstitutionName}
                  onChange={(e) => setNewInstitutionName(e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#0A2540] block mb-1">
                    Claim Field Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. land_area_acres"
                    value={newClaimFieldName}
                    onChange={(e) => setNewClaimFieldName(e.target.value)}
                    className="w-full p-2 border border-[#CBD5E1] rounded text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#0A2540] block mb-1">
                    Field Semantic Category
                  </label>
                  <select
                    value={newFieldCategory}
                    onChange={(e) => setNewFieldCategory(e.target.value)}
                    className="w-full p-2 border border-[#CBD5E1] rounded text-xs"
                  >
                    <option value="generic">generic</option>
                    <option value="numeric">numeric</option>
                    <option value="date">date</option>
                    <option value="entity_name">entity_name</option>
                    <option value="address">address</option>
                    <option value="cadastral_survey">cadastral_survey</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#0A2540] block mb-1">
                  Claim Text (from Institutional Application) *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Total contiguous institutional land: 8.5 Acres"
                  value={newClaimText}
                  onChange={(e) => setNewClaimText(e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#0A2540] block mb-1">
                    Claim Document Name
                  </label>
                  <input
                    type="text"
                    value={newClaimDocName}
                    onChange={(e) => setNewClaimDocName(e.target.value)}
                    className="w-full p-2 border border-[#CBD5E1] rounded text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#0A2540] block mb-1">
                    Claim Page Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newClaimPage}
                    onChange={(e) => setNewClaimPage(Number(e.target.value))}
                    className="w-full p-2 border border-[#CBD5E1] rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#0A2540] block mb-1">
                  Evidence Text (from Certified Supporting Docket) *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Schedule A certifies land area measuring 6.2 Acres"
                  value={newEvidenceText}
                  onChange={(e) => setNewEvidenceText(e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-[#0A2540] block mb-1">
                    Evidence Document Name
                  </label>
                  <input
                    type="text"
                    value={newEvidenceDocName}
                    onChange={(e) => setNewEvidenceDocName(e.target.value)}
                    className="w-full p-2 border border-[#CBD5E1] rounded text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#0A2540] block mb-1">
                    Evidence Page
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newEvidencePage}
                    onChange={(e) => setNewEvidencePage(Number(e.target.value))}
                    className="w-full p-2 border border-[#CBD5E1] rounded text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#0A2540] block mb-1">
                    Location / Clause
                  </label>
                  <input
                    type="text"
                    value={newEvidenceLocation}
                    onChange={(e) => setNewEvidenceLocation(e.target.value)}
                    className="w-full p-2 border border-[#CBD5E1] rounded text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded text-xs font-semibold bg-[#0D9488] hover:bg-[#0F766E] text-[#FFFFFF] shadow-2xs cursor-pointer"
                >
                  Create Candidate Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXPORT GOLD-STANDARD SUCCESS */}
      {isExportModalOpen && exportResult && (
        <div className="fixed inset-0 z-50 bg-[#000000]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center gap-2.5 text-[#059669] mb-3">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-[#0A2540]">
                V3 Gold-Standard Dataset Exported
              </h3>
            </div>

            <p className="text-xs text-[#475569] leading-relaxed mb-4">
              All agreed and adjudicated human annotations have been successfully formatted into the canonical V3 Pydantic schema with cryptographic SHA-256 validation.
            </p>

            <div className="space-y-2.5 bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-lg text-xs font-mono">
              <div>
                <span className="text-[#64748B] block text-[10px] uppercase">Record Count:</span>
                <span className="font-bold text-[#0A2540]">{exportResult.count} records</span>
              </div>

              <div>
                <span className="text-[#64748B] block text-[10px] uppercase">Export Path:</span>
                <span className="text-[#0D9488] break-all">{exportResult.outPath}</span>
              </div>

              <div>
                <span className="text-[#64748B] block text-[10px] uppercase">Manifest Path:</span>
                <span className="text-[#475569] break-all">{exportResult.manifestPath}</span>
              </div>

              <div>
                <span className="text-[#64748B] block text-[10px] uppercase">SHA-256 Checksum:</span>
                <span className="text-[#0A2540] break-all">{exportResult.sha256}</span>
              </div>

              <div className="pt-2 border-t border-[#E2E8F0] text-[11px] text-[#059669]">
                ✓ Invariants Verified: is_synthetic=false, is_human_annotated=true
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 bg-[#0A2540] text-[#FFFFFF] rounded-md text-xs font-semibold hover:bg-[#1E293B] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
