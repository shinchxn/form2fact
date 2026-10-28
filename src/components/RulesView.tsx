import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Rule } from '../types/index.ts';
import { updateRule } from '../services/api.ts';

interface RulesViewProps {
  rules: Rule[];
  onRefreshRules: () => void;
}

export const RulesView: React.FC<RulesViewProps> = ({ rules, onRefreshRules }) => {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const domainPills = [
    { id: 'all', label: 'All Domains', count: rules.length },
    {
      id: 'Land & Tenancy',
      label: 'Land & Tenancy',
      count: rules.filter((r) => r.category === 'Land & Tenancy').length
    },
    {
      id: 'Identity & Registration',
      label: 'Identity & Registration',
      count: rules.filter((r) => r.category === 'Identity & Registration').length
    },
    {
      id: 'Safety & Compliance',
      label: 'Safety & Compliance',
      count: rules.filter((r) => r.category === 'Safety & Compliance').length
    },
    {
      id: 'Approvals & Capacity',
      label: 'Approvals & Capacity',
      count: rules.filter((r) => r.category === 'Approvals & Capacity').length
    }
  ];

  const handleToggle = async (rule: Rule) => {
    setUpdatingId(rule.id);
    setErrorMsg(null);
    try {
      await updateRule(rule.id, { enabled: !rule.enabled });
      onRefreshRules();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update rule state.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered =
    categoryFilter === 'all' ? rules : rules.filter((r) => r.category === categoryFilter);

  return (
    <div className="px-6 lg:px-8 py-8 pb-24 max-w-[1440px] mx-auto space-y-6 text-sm">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#0F172A] tracking-tight">
          Verification Rules
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Configure deterministic validation rules topic by topic and inspect unit test assertions.
        </p>
      </div>

      {/* Sticky Domain Topic Pills Bar */}
      <div className="sticky top-0 z-20 -mx-6 px-6 lg:-mx-8 lg:px-8 py-3.5 bg-[#F8FAFC]/95 backdrop-blur-md border-y border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {domainPills.map((pill) => {
            const isActive = categoryFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setCategoryFilter(pill.id)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#EEF2FF] text-[#4F46E5] border-[#4F46E5] font-semibold'
                    : 'bg-[#FFFFFF] text-[#64748B] hover:text-[#0F172A] border-[#E2E8F0]'
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded font-mono tabular-nums text-xs ${
                    isActive ? 'bg-[#4F46E5] text-white' : 'bg-[#F1F5F9] text-[#475569]'
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        <span className="text-xs font-mono tabular-nums text-[#64748B]">
          {rules.filter((r) => r.enabled).length} of {rules.length} rules active
        </span>
      </div>

      {errorMsg && (
        <div role="alert" className="p-3.5 bg-[#FFF1F2] border border-[#FECDD3] rounded-md text-xs text-[#9F1239]">
          {errorMsg}
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-5">
        {filtered.map((rule) => (
          <div
            key={rule.id}
            className={`bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg overflow-hidden transition-opacity ${
              rule.enabled ? '' : 'opacity-65'
            }`}
          >
            {/* Rule Top Section */}
            <div className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#E2E8F0]">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#64748B] mb-1">
                  <span className="font-semibold text-[#0F172A]">{rule.ruleKey}</span>
                  <span>·</span>
                  <span className="font-semibold text-[#4F46E5]">{rule.version}</span>
                  <span>·</span>
                  <span>{rule.category}</span>
                </div>
                <h2 className="text-lg font-semibold text-[#0F172A]">{rule.name}</h2>
                <p className="text-sm text-[#64748B] mt-1 max-w-3xl leading-relaxed">
                  {rule.description}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium border ${
                    rule.enabled
                      ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                      : 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      rule.enabled ? 'bg-[#10B981]' : 'bg-[#94A3B8]'
                    }`}
                  />
                  <span>{rule.enabled ? 'Active' : 'Disabled'}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={rule.enabled}
                  aria-label={`Toggle ${rule.name}`}
                  onClick={() => handleToggle(rule)}
                  disabled={updatingId === rule.id}
                  className={`w-11 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                    rule.enabled ? 'bg-[#4F46E5]' : 'bg-[#CBD5E1]'
                  }`}
                >
                  <div
                    className={`bg-white w-5 h-5 rounded-full shadow-2xs transform transition-transform ${
                      rule.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Key-Value Metadata Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0] bg-[#F8FAFC]/60 text-sm">
              <div className="p-5">
                <div className="text-xs font-medium text-[#64748B]">Statutory Source</div>
                <div className="font-semibold text-[#0F172A] mt-1">{rule.sourceReference}</div>
                <div className="text-xs text-[#64748B] mt-0.5 font-mono tabular-nums">
                  Effective {rule.effectiveFrom}
                </div>
              </div>

              <div className="p-5">
                <div className="text-xs font-medium text-[#64748B]">Target Documents</div>
                <div className="font-semibold text-[#0F172A] mt-1 truncate">
                  {rule.applicableDocumentTypes.join(', ')}
                </div>
                <div className="text-xs text-[#64748B] mt-0.5">
                  Scope: {rule.applicableApplicationCategory}
                </div>
              </div>

              <div className="p-5">
                <div className="text-xs font-medium text-[#64748B]">Assertion Expression</div>
                <div className="font-mono text-xs text-[#0F172A] mt-1 break-words">
                  {rule.readableCondition}
                </div>
              </div>
            </div>

            {/* Unit Test Cases */}
            {rule.testCases && rule.testCases.length > 0 && (
              <div className="p-6 border-t border-[#E2E8F0] space-y-3 text-xs">
                <div className="font-semibold text-[#64748B] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#4F46E5]" />
                  <span>Unit Test Assertions ({rule.testCases.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                  {rule.testCases.map((tc, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md flex flex-col justify-between gap-2 h-full"
                    >
                      <div className="flex items-center justify-between gap-2 font-semibold text-[#0F172A]">
                        <span className="truncate">{tc.title}</span>
                        <span
                          className={`text-xs font-mono px-2.5 py-0.5 rounded font-medium border shrink-0 ${
                            tc.expectedOutcome === 'Pass'
                              ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                              : tc.expectedOutcome === 'Discrepancy'
                              ? 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3]'
                              : 'bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]'
                          }`}
                        >
                          {tc.expectedOutcome}
                        </span>
                      </div>
                      <div className="text-xs text-[#64748B] font-mono space-y-1">
                        <div>Declared: {tc.declared}</div>
                        <div>Evidence: {tc.evidence}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
