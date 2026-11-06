import React from 'react';
import { Plus, RotateCcw, ChevronRight, Building2, Shield } from 'lucide-react';
import { ViewType } from './Sidebar.tsx';
import { Application, User } from '../types/index.ts';

interface HeaderProps {
  currentView: ViewType;
  selectedApplication?: Application | null;
  currentUser?: User;
  onNavigate: (view: ViewType) => void;
  onOpenIntake: () => void;
  onResetDemo: () => void;
  isResetting?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  selectedApplication,
  currentUser,
  onNavigate,
  onOpenIntake,
  onResetDemo,
  isResetting
}) => {
  const getBreadcrumbs = () => {
    switch (currentView) {
      case 'overview':
        return [
          { label: 'Scrutiny Workspace', action: () => onNavigate('overview') },
          { label: 'Executive Overview' }
        ];
      case 'applications':
        return [
          { label: 'Scrutiny Workspace', action: () => onNavigate('overview') },
          {
            label: 'Applications Docket',
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
          { label: 'Evidence Split Viewer' }
        ];
      case 'verification':
        return [
          { label: 'Scrutiny Workspace', action: () => onNavigate('overview') },
          { label: 'Pairwise Field Verification' }
        ];
      case 'findings':
        return [
          { label: 'Scrutiny Workspace', action: () => onNavigate('overview') },
          { label: 'Regulatory Findings Triage' }
        ];
      case 'rules':
        return [
          { label: 'Regulatory Governance', action: () => onNavigate('overview') },
          { label: 'AICTE Rules Catalog' }
        ];
      case 'reports':
        return [
          { label: 'Scrutiny Workspace', action: () => onNavigate('overview') },
          {
            label: selectedApplication ? `${selectedApplication.referenceNumber} Dossier` : 'Scrutiny Dossiers'
          }
        ];
      case 'aicte-preview':
        return [
          { label: 'Regulatory Governance', action: () => onNavigate('overview') },
          { label: 'AICTE Compliance Preview' }
        ];
      case 'audit':
        return [
          { label: 'Regulatory Governance', action: () => onNavigate('overview') },
          { label: 'Immutable Audit Ledger' }
        ];
      case 'settings':
        return [
          { label: 'System Administration', action: () => onNavigate('overview') },
          { label: 'System & Security Settings' }
        ];
      default:
        return [{ label: 'Workspace' }];
    }
  };

  const crumbs = getBreadcrumbs();
  const showIntakeAction = currentView === 'overview' || currentView === 'applications';
  const isAdmin = currentUser?.role === 'Administrator';

  return (
    <header className="h-16 bg-[#FFFFFF] border-b border-[#E2E8F0] px-6 lg:px-8 flex items-center justify-between gap-6 shrink-0 select-none">
      {/* Legible breadcrumb trail */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs text-[#64748B] whitespace-nowrap overflow-hidden"
      >
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <ChevronRight aria-hidden="true" className="w-3.5 h-3.5 text-[#CBD5E1] shrink-0" />
            )}
            {c.action ? (
              <button
                type="button"
                onClick={c.action}
                className="hover:text-[#0A2540] transition-colors font-medium truncate"
              >
                {c.label}
              </button>
            ) : (
              <span aria-current="page" className="font-semibold text-[#0A2540] truncate">
                {c.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Contextual Action Controls & Jurisdiction Indicator */}
      <div className="flex items-center gap-3 shrink-0">
        {currentUser?.department && (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-[11px] text-[#475569]">
            <Building2 className="w-3.5 h-3.5 text-[#0D9488]" />
            <span className="truncate max-w-[200px]">{currentUser.department}</span>
          </div>
        )}

        {showIntakeAction && (
          <>
            {isAdmin && (
              <button
                type="button"
                onClick={onResetDemo}
                disabled={isResetting}
                title="Reset sample applications to initial baseline (Admin only)"
                className="px-3 py-1.5 text-xs font-medium text-[#64748B] hover:text-[#0A2540] bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <RotateCcw aria-hidden="true" className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Reset Fixtures</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenIntake}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0A2540] hover:bg-[#071A2E] rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-2xs hover:shadow-xs active:scale-[0.99] border border-[#0A2540]"
            >
              <Plus aria-hidden="true" className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>New Application</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
