import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  FileSearch,
  AlertTriangle,
  Scale,
  CheckSquare,
  FileSpreadsheet,
  History,
  Settings,
  ShieldCheck,
  BookOpen,
  LogOut
} from 'lucide-react';
import { User } from '../types/index.ts';

export type ViewType =
  | 'overview'
  | 'applications'
  | 'document-review'
  | 'verification'
  | 'annotations'
  | 'findings'
  | 'rules'
  | 'aicte-preview'
  | 'reports'
  | 'audit'
  | 'settings';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  currentUser: User;
  openFindingsCount: number;
  onSignOut?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  currentUser,
  openFindingsCount,
  onSignOut
}) => {
  const primaryNav = [
    { id: 'overview' as ViewType, label: 'Overview', icon: LayoutDashboard },
    { id: 'applications' as ViewType, label: 'Applications', icon: FolderOpen },
    { id: 'document-review' as ViewType, label: 'Evidence Viewer', icon: FileSearch },
    { id: 'verification' as ViewType, label: 'Pairwise Verification', icon: Scale },
    { id: 'annotations' as ViewType, label: 'Annotation Workbench', icon: CheckSquare },
    {
      id: 'findings' as ViewType,
      label: 'Findings',
      icon: AlertTriangle,
      badge: openFindingsCount > 0 ? openFindingsCount : undefined
    },
    { id: 'reports' as ViewType, label: 'Dossiers', icon: FileSpreadsheet },
  ];

  const governanceNav = [
    { id: 'aicte-preview' as ViewType, label: 'AICTE Preview', icon: ShieldCheck },
    { id: 'rules' as ViewType, label: 'Rules Engine', icon: BookOpen },
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
        className={`group relative w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-md transition-colors text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0D9488] ${
          isActive
            ? 'bg-[#F0FDFA] text-[#0A2540] font-semibold border-r-2 border-[#0D9488]'
            : 'text-[#475569] hover:text-[#0A2540] hover:bg-[#F8FAFC] font-medium'
        }`}
      >
        <div className="flex items-center gap-3 truncate">
          <Icon
            aria-hidden="true"
            className={`w-4 h-4 shrink-0 transition-colors ${
              isActive ? 'text-[#0D9488]' : 'text-[#64748B] group-hover:text-[#0A2540]'
            }`}
          />
          <span className="truncate">{item.label}</span>
        </div>
        {item.badge !== undefined && (
          <span
            aria-label={`${item.badge} open findings`}
            className="text-[11px] font-mono tabular-nums px-2 py-0.5 bg-[#FFF1F2] text-[#9F1239] border border-[#FECDD3] rounded font-semibold"
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
        {/* Authoritative Brand Header */}
        <div className="h-20 px-4 border-b border-[#E2E8F0] flex items-center gap-3 bg-[#FFFFFF]">
          <img
            src="/form2fact-logo.jpg"
            alt="Form2Fact Emblem"
            className="h-11 w-auto object-contain rounded shrink-0 shadow-2xs"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-[#0A2540] tracking-tight">
                Form<span className="text-[#0D9488]">2Fact</span>
              </span>
              <span className="text-[10px] font-mono font-semibold text-[#0D9488] bg-[#F0FDFA] px-1.5 py-0.5 rounded border border-[#99F6E4]">
                v2.0
              </span>
            </div>
            <span className="text-[11px] text-[#64748B] leading-tight truncate">
              Institutional Intelligence
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav aria-label="Primary navigation" className="p-4 space-y-6">
          <div className="space-y-1">
            <div className="px-3.5 pb-1.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Workspace
            </div>
            {primaryNav.map(renderNavItem)}
          </div>

          <div className="space-y-1">
            <div className="px-3.5 pb-1.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Governance & Rules
            </div>
            {governanceNav.map(renderNavItem)}
          </div>
        </nav>
      </div>

      {/* Pinned Session Footer with Persona & Sign-Out */}
      <div className="p-4 border-t border-[#E2E8F0] bg-[#FAFAFA] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#F0FDFA] text-[#0D9488] border border-[#99F6E4] flex items-center justify-center text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-[#0A2540] truncate" title={currentUser.displayName}>
              {currentUser.displayName}
            </div>
            <div className="text-[11px] text-[#64748B] truncate">
              {currentUser.role}
            </div>
          </div>
        </div>

        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            title="Sign out of scrutiny session"
            className="p-1.5 text-[#64748B] hover:text-[#9F1239] hover:bg-[#FFF1F2] rounded transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
