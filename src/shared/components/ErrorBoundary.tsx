import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught unhandled error in React component tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-[#FFFFFF] border border-[#FECDD3] rounded-lg shadow-sm space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-[#FFF1F2] text-[#E11D48] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#0F172A]">Workspace Component Error</h3>
            <p className="text-xs text-[#64748B] mt-1">
              {this.props.fallbackMessage || 'A problem occurred while rendering this interface module.'}
            </p>
          </div>
          {this.state.error && (
            <div className="p-3 bg-[#F8FAFC] rounded border border-[#E2E8F0] font-mono text-left text-xs text-[#9F1239] overflow-x-auto max-h-36">
              {this.state.error.message}
            </div>
          )}
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-md transition-colors inline-flex items-center gap-1.5"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Module</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

