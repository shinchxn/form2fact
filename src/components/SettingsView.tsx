import React, { useState } from 'react';
import {
  RotateCcw,
  Check,
  ShieldCheck
} from 'lucide-react';
import { User } from '../types/index.ts';
import { switchCurrentUser } from '../services/api.ts';

interface SettingsViewProps {
  currentUser: User;
  onUserChanged: (user: User) => void;
  onResetDemo: () => void;
  isResetting?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onUserChanged,
  onResetDemo,
  isResetting
}) => {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const demoUsers: User[] = [
    {
      id: 'usr-001',
      displayName: 'Dr. Aruna Rao',
      email: 'aruna.rao@scrutiny.edu.in',
      role: 'Reviewer',
      department: 'Western Scrutiny Committee'
    },
    {
      id: 'usr-002',
      displayName: 'V. K. Sharma',
      email: 'vk.sharma@scrutiny.edu.in',
      role: 'Administrator',
      department: 'Quality Assurance Directorate'
    },
    {
      id: 'usr-003',
      displayName: 'S. Meenakshi',
      email: 'meenakshi.s@audit.gov.in',
      role: 'Read-only Viewer',
      department: 'Statutory Compliance Audit'
    }
  ];

  const pipelineModules = [
    {
      component: 'Deterministic Field Parser',
      scope: 'Regex & anchor extraction with page-level citation tracking',
      mode: 'Local',
      statusLabel: 'Operational',
      tone: 'emerald' as const
    },
    {
      component: 'Scanned & Bitmap Guardrail',
      scope: 'Flags low-density PDFs instead of inferring unverified text',
      mode: 'Strict Guardrail',
      statusLabel: 'Active Guardrail',
      tone: 'emerald' as const
    },
    {
      component: 'Statutory Rules Engine',
      scope: 'Versioned rule evaluation (RULE-TEN-01 through RULE-SAFETY-06)',
      mode: 'v1.2 Catalog',
      statusLabel: 'Operational',
      tone: 'emerald' as const
    },
    {
      component: 'Cross-Document Synthesis',
      scope: 'High-thinking advisory analysis with deterministic fallback',
      mode: 'Server Proxy',
      statusLabel: 'Operational',
      tone: 'emerald' as const
    }
  ];

  const scrollToTopic = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSwitchUser = async (user: User) => {
    setErrorMessage(null);
    try {
      const updated = await switchCurrentUser(user);
      onUserChanged(updated);
      setSaveMessage(`Switched active persona to ${user.displayName} (${user.role}).`);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to switch persona.');
    }
  };

  return (
    <div className="px-6 lg:px-8 py-8 pb-24 max-w-[1440px] mx-auto space-y-10 text-sm">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#0F172A] tracking-tight">
            System Settings
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Configure active reviewer permissions, inspect pipeline health, and manage workspace fixtures.
          </p>
        </div>

        {saveMessage && (
          <div
            role="status"
            className="px-4 py-2 bg-[#ECFDF5] border border-[#A7F3D0] rounded-md text-[#065F46] text-xs font-medium flex items-center gap-2 shrink-0"
          >
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>{saveMessage}</span>
          </div>
        )}
      </div>

      {/* Sticky Settings Topic Quick-Jump Bar */}
      <div className="sticky top-0 z-20 -mx-6 px-6 lg:-mx-8 lg:px-8 py-3 bg-[#F8FAFC]/95 backdrop-blur-md border-y border-[#E2E8F0] flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mr-1">
          Settings Topics:
        </span>
        {[
          { id: 'settings-persona', label: '01 · Active Persona' },
          { id: 'settings-pipeline', label: '02 · Pipeline Health & Engine Status' },
          { id: 'settings-governance', label: '03 · Decision Boundary & Demo Reset' }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => scrollToTopic(t.id)}
            className="px-3 py-1.5 text-xs font-medium text-[#0F172A] bg-[#FFFFFF] hover:bg-[#EEF2FF] hover:text-[#4F46E5] hover:border-[#C7D2FE] border border-[#E2E8F0] rounded-md transition-colors cursor-pointer"
          >
            {t.label}
          </button>
        ))}
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 bg-[#FFF1F2] border border-[#FECDD3] rounded-md text-[#9F1239] text-sm font-medium"
        >
          {errorMessage}
        </div>
      )}

      {/* Section 1: Active Persona */}
      <section id="settings-persona" aria-labelledby="persona-heading" className="scroll-mt-20 space-y-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[#4F46E5] font-semibold">
            Topic 01
          </span>
          <h2 id="persona-heading" className="text-lg font-semibold text-[#0F172A]">
            Active Persona
          </h2>
          <p className="text-sm text-[#64748B] mt-0.5">
            Select a reviewer profile to simulate role-based access and decision permissions.
          </p>
        </div>

        <div
          role="radiogroup"
          aria-labelledby="persona-heading"
          className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch"
        >
          {demoUsers.map((u) => {
            const isSelected = u.id === currentUser.id;
            return (
              <button
                key={u.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSwitchUser(u)}
                className={`p-5 rounded-lg bg-[#FFFFFF] text-left transition-all flex flex-col justify-between gap-4 cursor-pointer h-full ${
                  isSelected
                    ? 'border-[1.5px] border-[#4F46E5] shadow-2xs ring-2 ring-[#4F46E5]/10'
                    : 'border border-[#E2E8F0] hover:border-[#CBD5E1]'
                }`}
              >
                <div className="space-y-1.5 w-full">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-base text-[#0F172A]">
                      {u.displayName}
                    </span>
                    {isSelected ? (
                      <span className="w-5 h-5 rounded-full bg-[#4F46E5] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border border-[#CBD5E1] shrink-0" />
                    )}
                  </div>
                  <div className="text-xs font-mono text-[#64748B] truncate">
                    {u.email}
                  </div>
                </div>

                <div className="pt-3.5 border-t border-[#F1F5F9] flex items-center justify-between gap-2 w-full">
                  <span className="text-xs text-[#64748B] truncate">
                    {u.department}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded font-medium shrink-0 ${
                      isSelected
                        ? 'bg-[#EEF2FF] text-[#4F46E5]'
                        : 'bg-[#F1F5F9] text-[#475569]'
                    }`}
                  >
                    {u.role}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <hr className="border-[#E2E8F0]" />

      {/* Section 2: Pipeline Health & Engine Status */}
      <section id="settings-pipeline" aria-labelledby="pipeline-heading" className="scroll-mt-20 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[#4F46E5] font-semibold">
              Topic 02
            </span>
            <h2 id="pipeline-heading" className="text-lg font-semibold text-[#0F172A]">
              Pipeline Health & Engine Status
            </h2>
            <p className="text-sm text-[#64748B] mt-0.5">
              Operational status of document extraction, OCR guardrails, and rule verification services.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>All Systems Operational</span>
          </span>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed min-w-[900px] text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs uppercase tracking-wider font-semibold text-[#64748B]">
                  <th className="py-3.5 px-5 w-[24%]">Subsystem</th>
                  <th className="py-3.5 px-5 w-[44%]">Specification & Scope</th>
                  <th className="py-3.5 px-5 w-[16%]">Execution Mode</th>
                  <th className="py-3.5 px-5 w-[16%] text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {pipelineModules.map((mod) => (
                  <tr key={mod.component} className="hover:bg-[#F8FAFC]/60 transition-colors">
                    <td className="py-4 px-5 font-semibold text-[#0F172A] truncate">
                      {mod.component}
                    </td>
                    <td className="py-4 px-5 text-[#64748B] truncate">
                      {mod.scope}
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-[#F1F5F9] text-[#334155] rounded font-mono text-xs">
                        {mod.mode}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] text-xs font-medium">
                        <span aria-hidden="true" className="text-[#10B981] text-xs leading-none">
                          ●
                        </span>
                        <span>{mod.statusLabel}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <hr className="border-[#E2E8F0]" />

      {/* Section 3: Governance Boundary & Dataset Controls */}
      <section id="settings-governance" aria-labelledby="governance-heading" className="scroll-mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2 space-y-1.5">
          <span className="text-xs font-mono uppercase tracking-wider text-[#4F46E5] font-semibold">
            Topic 03
          </span>
          <div className="flex items-center gap-2 text-lg font-semibold text-[#0F172A]">
            <ShieldCheck className="w-5 h-5 text-[#4F46E5]" />
            <h2 id="governance-heading">Decision-Support Boundary & Demo Reset</h2>
          </div>
          <p className="text-sm text-[#64748B] leading-relaxed">
            Form2Fact is an evidence-first decision-support tool; all flagged discrepancies require human officer confirmation, and synthetic demo fixtures can be reset at any time.
          </p>
        </div>

        <div className="flex md:justify-end">
          <button
            type="button"
            onClick={onResetDemo}
            disabled={isResetting}
            className="px-4 py-2.5 text-sm font-medium text-[#0F172A] bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-md transition-colors flex items-center gap-2 shadow-2xs disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 text-[#64748B] ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo Fixtures</span>
          </button>
        </div>
      </section>
    </div>
  );
};
