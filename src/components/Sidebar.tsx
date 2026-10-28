import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  FileSearch,
  AlertTriangle,
  Scale,
  FileSpreadsheet,
  History,
  Settings,
  Layers
} from 'lucide-react';
import { User } from '../types/index.ts';

export type ViewType =
  | 'overview'
  | 'applications'
  | 'document-review'
  | 'findings'
  | 'rules'
  | 'reports'
  | 'audit'
  | 'settings';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  currentUser: User;
  openFindingsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  currentUser,
  openFindingsCount
}) => {
  const primaryNav = [
    { id: 'overview' as ViewType, label: 'Overview', icon: LayoutDashboard },
    { id: 'applications' as ViewType, label: 'Applications', icon: FolderOpen },
    { id: 'document-review' as ViewType, label: 'Evidence Viewer', icon: FileSearch },
    {
      id: 'findings' as ViewType,
      label: 'Findings',
      icon: AlertTriangle,
      badge: openFindingsCount > 0 ? openFindingsCount : undefined
    },
    { id: 'reports' as ViewType, label: 'Dossiers', icon: FileSpreadsheet },
  ];

  const governanceNav = [
    { id: 'rules' as ViewType, label: 'Rules Engine', icon: Scale },
    { id: 'audit' as ViewType, label: 'Audit Ledger', icon: History },
    { id: 'settings' as ViewType, label: 'System Settings', icon: Settings },
  ];

  const renderNavItem = (item: {
    id: ViewType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }) => {
    const Icon = item.icon;
    const isActive = currentView === item.id;
    return (
      <button
        key={item.id}
        type="button"
        aria-current={isActive ? 'page' : undefined}
        onClick={() => onNavigate(item.id)}
        className={`group relative w-full flex items-center justify-between px-3.5 py-2.5 text-sm rounded-md transition-colors text-left ${
          isActive
            ? 'bg-[#F8FAFC] text-[#0F172A] font-semibold'
            : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]/70 font-medium'
        }`}
      >
        {isActive && (
          <span
            aria-hidden="true"
            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#4F46E5] rounded-r"
          />
        )}
        <div className="flex items-center gap-3 truncate">
          <Icon
            aria-hidden="true"
            className={`w-4 h-4 shrink-0 transition-colors ${
              isActive ? 'text-[#4F46E5]' : 'text-[#64748B] group-hover:text-[#0F172A]'
            }`}
          />
          <span className="truncate">{item.label}</span>
        </div>
        {item.badge !== undefined && (
          <span
            aria-label={`${item.badge} open findings`}
            className="text-xs font-mono tabular-nums px-2 py-0.5 bg-[#FFF1F2] text-[#9F1239] border border-[#FECDD3] rounded font-semibold"
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const initials = currentUser.displayName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className="w-64 bg-[#FFFFFF] border-r border-[#E2E8F0] flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-[#E2E8F0] flex items-center gap-3">
          <div className="w-8 h-8 bg-[#4F46E5] text-white rounded-md flex items-center justify-center shadow-2xs">
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-[#0F172A] tracking-tight">
              Form2Fact
            </span>
            <span className="text-xs font-mono text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded">
              v1.2
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav aria-label="Primary navigation" className="p-4 space-y-6">
          <div className="space-y-1">
            <div className="px-3.5 pb-1.5 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Workspace
            </div>
            {primaryNav.map(renderNavItem)}
          </div>

          <div className="space-y-1">
            <div className="px-3.5 pb-1.5 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Governance
            </div>
            {governanceNav.map(renderNavItem)}
          </div>
        </nav>
      </div>

      {/* Pinned Session Footer */}
      <div className="px-5 py-4 border-t border-[#E2E8F0] flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] flex items-center justify-center text-xs font-semibold shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[#0F172A] truncate">
            {currentUser.displayName}
          </div>
          <div className="text-xs text-[#64748B] truncate">
            {currentUser.role}
          </div>
        </div>
      </div>
    </aside>
  );
};
