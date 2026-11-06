import React from 'react';

export const MetricCardsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-pulse">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="p-5 bg-white border border-[#E2E8F0] rounded-lg space-y-3">
        <div className="h-3 w-24 bg-[#E2E8F0] rounded" />
        <div className="h-7 w-16 bg-[#CBD5E1] rounded" />
        <div className="pt-3 border-t border-[#F1F5F9] h-3 w-32 bg-[#E2E8F0] rounded" />
      </div>
    ))}
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden animate-pulse">
    <div className="h-11 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center px-4 gap-4">
      <div className="h-3 w-28 bg-[#CBD5E1] rounded" />
      <div className="h-3 w-40 bg-[#CBD5E1] rounded" />
      <div className="h-3 w-20 bg-[#CBD5E1] rounded ml-auto" />
    </div>
    <div className="divide-y divide-[#F1F5F9]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 flex items-center px-4 gap-4">
          <div className="h-3.5 w-32 bg-[#E2E8F0] rounded" />
          <div className="h-3.5 w-56 bg-[#E2E8F0] rounded" />
          <div className="h-3.5 w-24 bg-[#E2E8F0] rounded ml-auto" />
        </div>
      ))}
    </div>
  </div>
);

export const DetailViewSkeleton: React.FC = () => (
  <div className="space-y-6 max-w-[1440px] mx-auto p-6 animate-pulse">
    <div className="p-6 bg-white border border-[#E2E8F0] rounded-lg space-y-4">
      <div className="h-5 w-48 bg-[#CBD5E1] rounded" />
      <div className="h-3 w-72 bg-[#E2E8F0] rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[#F1F5F9]">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 w-20 bg-[#E2E8F0] rounded" />
            <div className="h-4 w-28 bg-[#CBD5E1] rounded" />
          </div>
        ))}
      </div>
    </div>
    <div className="h-10 bg-white border border-[#E2E8F0] rounded-lg flex items-center px-3 gap-3">
      <div className="h-4 w-24 bg-[#CBD5E1] rounded" />
      <div className="h-4 w-24 bg-[#E2E8F0] rounded" />
      <div className="h-4 w-24 bg-[#E2E8F0] rounded" />
    </div>
    <TableSkeleton rows={4} />
  </div>
);

export const DocumentReviewSkeleton: React.FC = () => (
  <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] animate-pulse">
    <div className="w-full lg:w-72 bg-white border-r border-[#E2E8F0] p-4 space-y-3">
      <div className="h-4 w-28 bg-[#CBD5E1] rounded mb-4" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 bg-[#F8FAFC] border border-[#E2E8F0] rounded p-2.5 space-y-2">
          <div className="h-3 w-20 bg-[#CBD5E1] rounded" />
          <div className="h-2.5 w-32 bg-[#E2E8F0] rounded" />
        </div>
      ))}
    </div>
    <div className="flex-1 bg-[#F1F5F9] p-8 flex justify-center">
      <div className="w-full max-w-[700px] h-[650px] bg-white border border-[#E2E8F0] rounded shadow-xs p-8 space-y-4">
        <div className="h-4 w-40 bg-[#CBD5E1] rounded" />
        <div className="h-2.5 w-full bg-[#E2E8F0] rounded" />
        <div className="h-2.5 w-5/6 bg-[#E2E8F0] rounded" />
        <div className="h-2.5 w-4/6 bg-[#E2E8F0] rounded" />
        <div className="h-48 bg-[#F8FAFC] rounded my-6 border border-dashed border-[#CBD5E1]" />
        <div className="h-2.5 w-full bg-[#E2E8F0] rounded" />
      </div>
    </div>
  </div>
);
