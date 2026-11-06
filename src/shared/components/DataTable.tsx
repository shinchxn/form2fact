import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  sortField,
  sortDirection,
  onSort,
  emptyMessage = 'No records found.',
  className = ''
}: DataTableProps<T>) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] ${className}`}>
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            {columns.map((col) => {
              const isSorted = sortField === col.key;
              const alignClass = col.align === 'right' ? 'text-right' : (col.align === 'center' ? 'text-center' : 'text-left');
              return (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={`py-3.5 px-4 ${alignClass}`}
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className="inline-flex items-center gap-1.5 hover:text-[#0F172A] transition-colors cursor-pointer select-none"
                    >
                      <span>{col.header}</span>
                      {isSorted ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#4F46E5]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#4F46E5]" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                      )}
                    </button>
                  ) : (
                    <span>{col.header}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-[#64748B] text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const isClickable = Boolean(onRowClick);
              return (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors ${
                    isClickable ? 'hover:bg-[#F8FAFC] cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col) => {
                    const alignClass = col.align === 'right' ? 'text-right font-mono tabular-nums' : (col.align === 'center' ? 'text-center' : 'text-left');
                    return (
                      <td key={col.key} className={`py-3.5 px-4 text-[#0F172A] ${alignClass}`}>
                        {col.render(row, index)}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

