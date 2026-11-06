import React from 'react';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div className={`p-12 text-center rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] space-y-3 ${className}`}>
      <div className="w-10 h-10 mx-auto rounded-full bg-[#E2E8F0] flex items-center justify-center text-[#64748B]">
        {icon || <FolderOpen className="w-5 h-5" />}
      </div>
      <h4 className="text-base font-semibold text-[#0F172A]">{title}</h4>
      <p className="text-sm text-[#64748B] max-w-md mx-auto leading-relaxed">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-md transition-colors shadow-2xs cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

