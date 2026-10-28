import React from 'react';
import { Plus, RotateCcw, ChevronRight } from 'lucide-react';
import { ViewType } from './Sidebar.tsx';
import { Application } from '../types/index.ts';

interface HeaderProps {
  currentView: ViewType;
  selectedApplication?: Application | null;
  onNavigate: (view: ViewType) => void;
  onOpenIntake: () => void;
  onResetDemo: () => void;
  isResetting?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  selectedApplication,
  onNavigate,
  onOpenIntake,
  onResetDemo,
  isResetting
}) => {
  const getBreadcrumbs = () => {
    switch (currentView) {
      case 'overview':
        return [
          { label: 'Workspace', action: () => onNavigate('overview') },
          { label: 'Overview' }
        ];
      case 'applications':
        return [
          { label: 'Workspace', action: () => onNavigate('overview') },
          {
            label: 'Applications',
            action: selectedApplication ? () => onNavigate('applications') : undefined
          },
          ...(selectedApplication ? [{ label: selectedApplication.referenceNumber }] : [])
        ];
      case 'document-review':
        return [
          { label: 'Applications', action: () => onNavigate('applications') },
          {
            label: selectedApplication ? selectedApplication.referenceNumber : 'Docket'
          },
          { label: 'Evidence Viewer' }
        ];
      case 'findings':
        return [
          { label: 'Workspace', action: () => onNavigate('overview') },
          { label: 'Findings' }
        ];
      case 'rules':
        return [
          { label: 'Governance', action: () => onNavigate('overview') },
          { label: 'Rules Engine' }
        ];
      case 'reports':
        return [
          { label: 'Workspace', action: () => onNavigate('overview') },
          {
            label: selectedApplication ? `${selectedApplication.referenceNumber} Dossier` : 'Dossiers'
          }
        ];
      case 'audit':
        return [
          { label: 'Governance', action: () => onNavigate('overview') },
          { label: 'Audit Ledger' }
        ];
      case 'settings':
        return [
          { label: 'Governance', action: () => onNavigate('overview') },
          { label: 'System Settings' }
        ];
      default:
        return [{ label: 'Workspace' }];
    }
  };

  const crumbs = getBreadcrumbs();
  const showIntakeAction = currentView === 'overview' || currentView === 'applications';

  return (
    <header className="h-16 bg-[#FFFFFF] border-b border-[#E2E8F0] px-6 lg:px-8 flex items-center justify-between gap-6 shrink-0 select-none">
      {/* Simple, legible breadcrumb trail */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2.5 text-sm text-[#64748B] whitespace-nowrap overflow-hidden"
      >
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <ChevronRight aria-hidden="true" className="w-4 h-4 text-[#94A3B8] shrink-0" />
            )}
            {c.action ? (
              <button
                type="button"
                onClick={c.action}
                className="hover:text-[#0F172A] transition-colors font-medium truncate"
              >
                {c.label}
              </button>
            ) : (
              <span aria-current="page" className="font-semibold text-[#0F172A] truncate">
                {c.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Contextual Action Controls */}
      {showIntakeAction && (
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onResetDemo}
            disabled={isResetting}
            title="Reset sample applications to initial state"
            className="px-3.5 py-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-md transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <RotateCcw aria-hidden="true" className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Fixtures</span>
          </button>

          <button
            type="button"
            onClick={onOpenIntake}
            className="px-4 py-2 text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-md transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 shadow-2xs"
          >
            <Plus aria-hidden="true" className="w-4 h-4" />
            <span>New Application</span>
          </button>
        </div>
      )}
    </header>
  );
};
