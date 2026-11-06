import React from 'react';
import { RotateCw } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading workspace data...',
  className = ''
}) => {
  return (
    <div className={`p-16 flex flex-col items-center justify-center gap-3 text-[#64748B] ${className}`}>
      <RotateCw className="w-6 h-6 animate-spin text-[#4F46E5]" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

