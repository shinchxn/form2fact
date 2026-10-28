import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { AuditEvent } from '../types/index.ts';

interface AuditLogViewProps {
  auditEvents: AuditEvent[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ auditEvents }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  const entityPills = [
    { id: 'all', label: 'All Events', count: auditEvents.length },
    {
      id: 'Application',
      label: 'Application',
      count: auditEvents.filter((e) => e.entityType === 'Application').length
    },
    {
      id: 'Document',
      label: 'Document',
      count: auditEvents.filter((e) => e.entityType === 'Document').length
    },
    {
      id: 'ExtractedField',
      label: 'Extracted Field',
      count: auditEvents.filter((e) => e.entityType === 'ExtractedField').length
    },
    {
      id: 'Finding',
      label: 'Finding',
      count: auditEvents.filter((e) => e.entityType === 'Finding').length
    },
    {
      id: 'Rule',
      label: 'Rule',
      count: auditEvents.filter((e) => e.entityType === 'Rule').length
    }
  ];

  const filtered = auditEvents.filter((e) => {
    const matchSearch =
      e.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.entityReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.note || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchEntity = entityFilter === 'all' || e.entityType === entityFilter;

    return matchSearch && matchEntity;
  });

  return (
    <div className="px-6 lg:px-8 py-8 pb-24 max-w-[1440px] mx-auto space-y-6 text-sm">
      <div>
        <h1 className="text-xl font-semibold text-[#0F172A] tracking-tight">
          Audit Ledger
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Append-only record of application intake, field extractions, rule evaluations, and reviewer decisions.
        </p>
      </div>

      {/* Sticky Topic Entity Pills & Search Bar */}
      <div className="sticky top-0 z-20 -mx-6 px-6 lg:-mx-8 lg:px-8 py-3.5 bg-[#F8FAFC]/95 backdrop-blur-md border-y border-[#E2E8F0] space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {entityPills.map((pill) => {
            const isActive = entityFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setEntityFilter(pill.id)}
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

        {/* Filter Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by actor, action, or reference..."
              className="w-full pl-10 pr-3.5 py-2 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] text-[#0F172A] text-sm placeholder:text-[#94A3B8] focus:outline-hidden focus:border-[#4F46E5]"
            />
          </div>
          <span className="text-xs font-mono tabular-nums text-[#64748B] self-end md:self-auto">
            Showing {filtered.length} of {auditEvents.length} events
          </span>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[1040px] text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs uppercase tracking-wider text-[#64748B] font-semibold">
                <th className="py-3.5 px-5 w-[16%] font-mono">Timestamp</th>
                <th className="py-3.5 px-5 w-[17%]">Action</th>
                <th className="py-3.5 px-5 w-[14%]">Actor</th>
                <th className="py-3.5 px-5 w-[12%]">Entity</th>
                <th className="py-3.5 px-5 w-[14%]">Reference</th>
                <th className="py-3.5 px-5 w-[27%]">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#64748B]">
                    No matching audit records.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-4 px-5 font-mono tabular-nums text-xs text-[#64748B] whitespace-nowrap">
                      {new Date(e.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>

                    <td className="py-4 px-5 font-semibold text-[#0F172A] truncate">
                      {e.action}
                    </td>

                    <td className="py-4 px-5 text-[#0F172A] truncate">
                      {e.actorName}
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 bg-[#F1F5F9] rounded text-xs font-medium text-[#334155]">
                        {e.entityType}
                      </span>
                    </td>

                    <td className="py-4 px-5 font-mono text-xs font-medium text-[#4F46E5] truncate">
                      {e.entityReference}
                    </td>

                    <td className="py-4 px-5 text-xs text-[#0F172A]">
                      {e.beforeValue && e.afterValue && (
                        <div className="text-[#64748B] mb-0.5 truncate">
                          <span className="line-through">{e.beforeValue}</span> →{' '}
                          <span className="font-semibold text-[#4F46E5]">{e.afterValue}</span>
                        </div>
                      )}
                      {e.note && <span className="text-[#64748B] block truncate">{e.note}</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
