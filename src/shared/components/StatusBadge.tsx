import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, MinusCircle } from 'lucide-react';

export type VerificationStatus = 
  | 'MATCH' 
  | 'MISMATCH' 
  | 'MISSING' 
  | 'UNCERTAIN' 
  | 'NOT_COMPARABLE'
  // Legacy / finding statuses:
  | 'Open'
  | 'Confirmed'
  | 'Dismissed'
  | 'Unable to Determine'
  | 'Review Completed'
  | 'Under Review'
  | 'Pending Review'
  | 'Discrepancies Confirmed';

interface StatusBadgeProps {
  status: VerificationStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  const normalized = status.toUpperCase().replace(/\s+/g, '_');

  let style = 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]';
  let IconComponent = MinusCircle;
  let label = status;

  if (normalized === 'MATCH' || normalized === 'REVIEW_COMPLETED' || normalized === 'CLEARED' || normalized === 'PASS') {
    style = 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]';
    IconComponent = CheckCircle2;
    label = normalized === 'MATCH' ? 'MATCH' : (status === 'PASS' ? 'Pass' : 'Review Completed');
  } else if (normalized === 'MISMATCH' || normalized === 'DISCREPANCY' || normalized === 'CONFIRMED' || normalized === 'DISCREPANCIES_CONFIRMED' || normalized === 'REJECTED') {
    style = 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3]';
    IconComponent = XCircle;
    label = normalized === 'MISMATCH' ? 'MISMATCH' : (status === 'Confirmed' ? 'Confirmed' : (normalized === 'DISCREPANCY' ? 'Discrepancy' : status));
  } else if (normalized === 'MISSING' || normalized === 'INFORMATION_MISSING') {
    style = 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]';
    IconComponent = AlertTriangle;
    label = normalized === 'MISSING' ? 'MISSING' : status;
  } else if (normalized === 'UNCERTAIN' || normalized === 'UNABLE_TO_DETERMINE' || normalized === 'UNDER_REVIEW' || normalized === 'CLARIFICATION_REQUIRED') {
    style = 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]';
    IconComponent = HelpCircle;
    label = normalized === 'UNCERTAIN' ? 'UNCERTAIN' : status;
  } else if (normalized === 'NOT_COMPARABLE' || normalized === 'DISMISSED') {
    style = 'bg-[#F8FAFC] text-[#64748B] border-[#CBD5E1]';
    IconComponent = MinusCircle;
    label = normalized === 'NOT_COMPARABLE' ? 'NOT COMPARABLE' : status;
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm gap-2'
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border tracking-tight shrink-0 select-none ${style} ${sizeClasses} ${className}`}
    >
      {showIcon && <IconComponent className={`${iconSizes} shrink-0`} />}
      <span>{label}</span>
    </span>
  );
};

