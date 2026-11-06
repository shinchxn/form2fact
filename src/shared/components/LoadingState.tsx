import React from 'react';
import { RotateCw } from 'lucide-react';
import { MetricCardsSkeleton, TableSkeleton, DetailViewSkeleton, DocumentReviewSkeleton } from './LoadingSkeleton.tsx';

interface LoadingStateProps {
  message?: string;
  variant?: 'spinner' | 'metrics' | 'table' | 'detail' | 'document';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading scrutiny workspace data...',
  variant = 'spinner',
  className = ''
}) => {
  if (variant === 'metrics') {
    return <MetricCardsSkeleton />;
  }
  if (variant === 'table') {
    return <TableSkeleton />;
  }
  if (variant === 'detail') {
    return <DetailViewSkeleton />;
  }
  if (variant === 'document') {
    return <DocumentReviewSkeleton />;
  }

  return (
    <div className={`p-16 flex flex-col items-center justify-center gap-3 text-[#64748B] ${className}`}>
      <RotateCw className="w-6 h-6 animate-spin text-[#0D9488]" />
      <span className="text-xs font-semibold text-[#0A2540]">{message}</span>
      <span className="text-[11px] text-[#64748B]">Verifying statutory cryptographic signatures and index</span>
    </div>
  );
};
