"use client";

import { Loader2 } from "lucide-react";
import { Checkbox } from "./checkbox";
import { DataPagination } from "./data-pagination";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  /** optional — shows "Showing 1–15 of 120" under the table */
  total?: number;
  pageSize?: number;
  selectedIds?: string[];
  onToggleRow?: (id: string) => void;
  onToggleAll?: () => void;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  page,
  totalPages,
  onPageChange,
  isLoading = false,
  total,
  pageSize,
  selectedIds = [],
  onToggleRow,
  onToggleAll,
  emptyMessage = "No data found",
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && data.every((row) => selectedIds.includes(row._id));
  const colSpan = columns.length + (onToggleAll ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
              {onToggleAll && (
                <th className="w-12 px-4 py-3 text-left">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={onToggleAll}
                    className="border-zinc-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-zinc-950 dark:border-zinc-700"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Fetching secure records...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-zinc-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => {
                const isSelected = selectedIds.includes(row._id);
                return (
                  <tr
                    key={row._id || i}
                    className={`border-b border-zinc-200/70 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-transparent ${
                      isSelected ? "bg-emerald-500/5 dark:bg-zinc-800/20" : ""
                    }`}
                  >
                    {onToggleRow && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleRow(row._id)}
                          className="border-zinc-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-zinc-950 dark:border-zinc-700"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
          <DataPagination
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            total={total}
            pageSize={pageSize}
            disabled={isLoading}
          />
        </div>
      )}
    </div>
  );
}
