import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, FileText, ShieldCheck } from 'lucide-react';
import {
  fetchAicteLeasePreview,
  type AicteClassification,
  type AicteLeasePreview,
  type AicteRegulatoryFinding
} from '../services/api.ts';
import type { Application } from '../types/index.ts';

interface AictePreviewViewProps {
  applications: Application[];
  selectedApplication: Application | null;
  onSelectApplication: (application: Application) => void;
}

const classificationStyles: Record<AicteClassification, string> = {
  MATCH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MISMATCH: 'bg-rose-50 text-rose-700 border-rose-200',
  MISSING: 'bg-amber-50 text-amber-700 border-amber-200',
  UNCERTAIN: 'bg-orange-50 text-orange-700 border-orange-200',
  NOT_COMPARABLE: 'bg-slate-100 text-slate-600 border-slate-200'
};

function ClassificationBadge({ value }: { value: AicteClassification }) {
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-semibold ${classificationStyles[value] || classificationStyles.UNCERTAIN}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}

function FindingCard({ finding }: { finding: AicteRegulatoryFinding }) {
  return (
    <article className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-mono text-slate-500">{finding.ruleId}</p>
          <h3 className="mt-1 text-base font-semibold text-slate-900">{finding.title}</h3>
        </div>
        <ClassificationBadge value={finding.classification} />
      </div>

      <p className="text-sm leading-6 text-slate-700">{finding.explanation}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {finding.actualValue && (
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actual value</p>
            <p className="mt-1 text-sm text-slate-800 break-words">{finding.actualValue}</p>
          </div>
        )}
        {finding.expectedValue && (
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expected value</p>
            <p className="mt-1 text-sm text-slate-800 break-words">{finding.expectedValue}</p>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Applicability</p>
        <p className="mt-1 text-sm text-slate-700">{finding.applicability}</p>
      </div>

      {finding.evidence && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-800">
            <FileText className="w-4 h-4" />
            Evidence reference
          </div>
          <p className="mt-2 text-sm text-slate-800">{finding.evidence.documentName}</p>
          {finding.evidence.pageNumber !== undefined && (
            <p className="mt-1 text-xs text-slate-600">Page: {finding.evidence.pageNumber}</p>
          )}
          {finding.evidence.fieldName && (
            <p className="mt-1 text-xs text-slate-600">Field: {finding.evidence.fieldName}</p>
          )}
          {finding.evidence.rawValue && (
            <p className="mt-1 text-xs text-slate-600">Extracted value: {finding.evidence.rawValue}</p>
          )}
          {finding.evidence.excerpt && (
            <p className="mt-2 text-sm italic text-slate-600">“{finding.evidence.excerpt}”</p>
          )}
        </div>
      )}

      <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">{finding.source.title}</p>
        <p>Handbook: {finding.source.version} · Page {finding.source.page}</p>
        <p>Source verified: {finding.source.verifiedOn}</p>
        <a
          href={finding.source.officialUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-indigo-600 hover:text-indigo-800 underline break-all"
        >
          Open official source
        </a>
      </div>
    </article>
  );
}

export const AictePreviewView: React.FC<AictePreviewViewProps> = ({
  applications,
  selectedApplication,
  onSelectApplication
}) => {
  const [preview, setPreview] = useState<AicteLeasePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    if (!selectedApplication) {
      setPreview(null);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setPreview(null);

    fetchAicteLeasePreview(selectedApplication.id)
      .then((data) => {
        if (active) setPreview(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load AICTE preview.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedApplication?.id]);

  const counts = (preview?.findings || []).reduce<Record<string, number>>((result, item) => {
    result[item.classification] = (result[item.classification] || 0) + 1;
    return result;
  }, {});

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">AICTE Regulatory Preview</h1>
            <p className="text-sm text-slate-500">Lease-related regulatory checks against the selected AICTE handbook.</p>
          </div>
        </div>
      </div>

      <div className="border border-amber-300 bg-amber-50 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900 text-sm">PREVIEW ONLY — NOT PRODUCTION VALIDATION</p>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              These AICTE findings are advisory. They do not update legacy findings,
              change formal validation results, or make approval decisions.
              Applicability and uncertain evidence require manual review and subject-matter expert confirmation.
            </p>
          </div>
        </div>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <label htmlFor="aicte-application" className="block text-sm font-semibold text-slate-700 mb-2">
          Select application
        </label>
        <select
          id="aicte-application"
          value={selectedApplication?.id || ''}
          onChange={(event) => {
            const app = applications.find((item) => item.id === event.target.value);
            if (app) onSelectApplication(app);
          }}
          className="w-full md:max-w-xl border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-800"
        >
          <option value="">Choose an application</option>
          {applications.map((app) => (
            <option key={app.id} value={app.id}>
              {app.referenceNumber} — {app.institutionName}
            </option>
          ))}
        </select>
        {selectedApplication && (
          <p className="mt-2 text-xs text-slate-500">
            Current application: {selectedApplication.referenceNumber} · {selectedApplication.institutionName}
          </p>
        )}
      </section>

      {!selectedApplication && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          Select an application to generate its AICTE regulatory preview.
        </div>
      )}

      {loading && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          <Clock3 className="w-5 h-5 mx-auto mb-2 animate-pulse" />
          Loading regulatory preview...
        </div>
      )}

      {error && (
        <div role="alert" className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-800">
          <strong>Unable to load preview:</strong> {error}
        </div>
      )}

      {preview && !loading && (
        <>
          <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(['MATCH', 'MISMATCH', 'MISSING', 'UNCERTAIN', 'NOT_COMPARABLE'] as AicteClassification[]).map((status) => (
              <div key={status} className="bg-white border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500">{status.replace(/_/g, ' ')}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{counts[status] || 0}</p>
              </div>
            ))}
          </section>

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Regulatory findings</h2>
            <span className="text-xs text-slate-500">{preview.findings.length} rules evaluated</span>
          </div>

          {preview.findings.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
              No AICTE findings were returned for this application.
            </div>
          ) : (
            <div className="space-y-4">
              {preview.findings.map((finding) => (
                <FindingCard key={finding.ruleId} finding={finding} />
              ))}
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-slate-400" />
            <p>
              Preview mode is read-only. Results must be reviewed by an authorized reviewer
              and confirmed against the applicable regulatory requirements.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
