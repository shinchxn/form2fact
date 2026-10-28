import React, { useState } from 'react';
import {
  Search,
  Plus,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { Application } from '../types/index.ts';

interface ApplicationsViewProps {
  applications: Application[];
  onSelectApplication: (app: Application) => void;
  onOpenIntake: () => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
  onSelectApplication,
  onOpenIntake
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState<'createdAt' | 'openFindingsCount' | 'referenceNumber'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const statusTabs = [
    { id: 'all', label: 'All Applications', count: applications.length },
    {
      id: 'Pending Review',
      label: 'Pending Review',
      count: applications.filter((a) => a.reviewStatus === 'Pending Review').length
    },
    {
      id: 'Under Review',
      label: 'Under Review',
      count: applications.filter((a) => a.reviewStatus === 'Under Review').length
    },
    {
      id: 'Discrepancies Confirmed',
      label: 'Discrepancies Confirmed',
      count: applications.filter((a) => a.reviewStatus === 'Discrepancies Confirmed').length
    },
    {
      id: 'Review Completed',
      label: 'Review Completed',
      count: applications.filter((a) => a.reviewStatus === 'Review Completed').length
    }
  ];

  const filtered = applications.filter((app) => {
    const matchSearch =
      app.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.institutionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.declaredDetails.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.declaredDetails.societyOrTrustName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'all' || app.reviewStatus === statusFilter;
    const matchCategory = categoryFilter === 'all' || app.applicationType === categoryFilter;

    return matchSearch && matchStatus && matchCategory;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'createdAt') {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
    }
    if (sortField === 'openFindingsCount') {
      return sortDirection === 'asc'
        ? a.openFindingsCount - b.openFindingsCount
        : b.openFindingsCount - a.openFindingsCount;
    }
    return sortDirection === 'asc'
      ? a.referenceNumber.localeCompare(b.referenceNumber)
      : b.referenceNumber.localeCompare(a.referenceNumber);
  });

  const toggleSort = (field: 'createdAt' | 'openFindingsCount' | 'referenceNumber') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="px-6 lg:px-8 py-8 pb-24 max-w-[1440px] mx-auto space-y-6 text-sm">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#0F172A] tracking-tight">
            Applications Docket
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Browse all institutional application dockets by review stage, category, and finding count.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenIntake}
          className="px-4 py-2 text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-md transition-colors flex items-center gap-2 self-start md:self-auto shadow-2xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Application</span>
        </button>
      </div>

      {/* Sticky Topic Status & Search Filter Header */}
      <div className="sticky top-0 z-20 -mx-6 px-6 lg:-mx-8 lg:px-8 py-3.5 bg-[#F8FAFC]/95 backdrop-blur-md border-y border-[#E2E8F0] space-y-3">
        {/* Topic Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#EEF2FF] text-[#4F46E5] border-[#4F46E5] font-semibold'
                    : 'bg-[#FFFFFF] text-[#64748B] hover:text-[#0F172A] border-[#E2E8F0]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded font-mono tabular-nums text-xs ${
                    isActive ? 'bg-[#4F46E5] text-white' : 'bg-[#F1F5F9] text-[#475569]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Category Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by reference, institution, or city..."
              className="w-full pl-10 pr-3.5 py-2 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-hidden focus:border-[#4F46E5]"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <span className="text-xs font-mono tabular-nums text-[#64748B]">
              Showing {sorted.length} of {applications.length} dockets
            </span>
            <div className="flex items-center gap-2">
              <label htmlFor="app-category-select" className="text-xs font-medium text-[#64748B] shrink-0">
                Category:
              </label>
              <select
                id="app-category-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3.5 py-2 border border-[#E2E8F0] rounded-md bg-[#FFFFFF] text-[#0F172A] text-xs font-medium focus:outline-hidden focus:border-[#4F46E5]"
              >
                <option value="all">All Categories</option>
                <option value="Extension of Approval">Extension of Approval</option>
                <option value="New Technical Campus">New Technical Campus</option>
                <option value="Increase in Intake">Increase in Intake</option>
                <option value="Change of Site">Change of Site</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[1140px] text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs uppercase tracking-wider text-[#64748B] font-semibold select-none">
                <th
                  onClick={() => toggleSort('referenceNumber')}
                  className="py-3.5 px-5 w-[13%] cursor-pointer hover:text-[#0F172A]"
                >
                  <div className="flex items-center gap-1">
                    <span>Reference</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3.5 px-5 w-[22%]">Institution & Sponsoring Trust</th>
                <th className="py-3.5 px-5 w-[14%]">Category</th>
                <th className="py-3.5 px-5 w-[11%] text-right">Land / Lease</th>
                <th
                  onClick={() => toggleSort('createdAt')}
                  className="py-3.5 px-5 w-[10%] cursor-pointer hover:text-[#0F172A] text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Submitted</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3.5 px-5 w-[6%] text-right">Docs</th>
                <th
                  onClick={() => toggleSort('openFindingsCount')}
                  className="py-3.5 px-5 w-[9%] cursor-pointer hover:text-[#0F172A] text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Findings</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3.5 px-5 w-[8%]">Status</th>
                <th className="py-3.5 px-5 w-[7%] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#64748B]">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="font-semibold text-[#0F172A]">No matching applications</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('all');
                          setCategoryFilter('all');
                        }}
                        className="px-3.5 py-2 bg-[#F1F5F9] rounded-md hover:bg-[#E2E8F0] text-xs font-medium text-[#0F172A]"
                      >
                        Reset filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => onSelectApplication(app)}
                    className="hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-5 font-mono text-xs font-semibold text-[#0F172A] whitespace-nowrap truncate">
                      {app.referenceNumber}
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-semibold text-[#0F172A] truncate">
                        {app.institutionName}
                      </div>
                      <div className="text-xs text-[#64748B] truncate mt-0.5">
                        {app.declaredDetails.societyOrTrustName || app.declaredDetails.address}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-xs text-[#64748B] whitespace-nowrap truncate">
                      {app.applicationType}
                    </td>

                    <td className="py-4 px-5 text-right font-mono text-xs text-[#0F172A] whitespace-nowrap tabular-nums">
                      <div className="font-semibold">{app.declaredDetails.landAreaAcres} Acres</div>
                      <div className="text-[#64748B] mt-0.5">Exp: {app.declaredDetails.leaseExpiryDate}</div>
                    </td>

                    <td className="py-4 px-5 text-right text-xs text-[#64748B] whitespace-nowrap font-mono tabular-nums">
                      {new Date(app.createdAt).toLocaleDateString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>

                    <td className="py-4 px-5 text-right font-mono text-xs tabular-nums font-medium text-[#0F172A]">
                      {app.documentCount}
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      {app.openFindingsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums font-medium text-[#9F1239] bg-[#FFF1F2] border border-[#FECDD3] px-2.5 py-0.5 rounded text-xs">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{app.openFindingsCount} Open</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5 rounded text-xs">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>0</span>
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded border ${
                          app.reviewStatus === 'Review Completed'
                            ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                            : app.reviewStatus === 'Discrepancies Confirmed'
                            ? 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3]'
                            : 'bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]'
                        }`}
                      >
                        {app.reviewStatus}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectApplication(app);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] hover:bg-[#EEF2FF] rounded-md transition-colors inline-flex items-center gap-1"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
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
