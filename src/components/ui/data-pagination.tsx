"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface DataPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** total number of records — enables the "Showing 1–10 of 42" label */
  total?: number;
  pageSize?: number;
  disabled?: boolean;
  /** render even when there is only one page */
  alwaysShow?: boolean;
  className?: string;
}

/** 1 … 4 [5] 6 … 20  — always keeps first/last page and the neighbours of the current one. */
export function getPageRange(page: number, totalPages: number, siblings = 1): (number | "ellipsis-left" | "ellipsis-right")[] {
  const maxVisible = siblings * 2 + 5;
  if (totalPages <= maxVisible) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const left = Math.max(page - siblings, 2);
  const right = Math.min(page + siblings, totalPages - 1);
  const items: (number | "ellipsis-left" | "ellipsis-right")[] = [1];

  if (left > 2) items.push("ellipsis-left");
  for (let p = left; p <= right; p++) items.push(p);
  if (right < totalPages - 1) items.push("ellipsis-right");
  items.push(totalPages);
  return items;
}

export function DataPagination({
  page,
  totalPages,
  onPageChange,
  total,
  pageSize,
  disabled = false,
  alwaysShow = false,
  className,
}: DataPaginationProps) {
  if (totalPages <= 1 && !alwaysShow) return null;

  const go = (target: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled || target < 1 || target > totalPages || target === page) return;
    onPageChange(target);
  };

  const from = total && pageSize ? (page - 1) * pageSize + 1 : null;
  const to = total && pageSize ? Math.min(page * pageSize, total) : null;

  return (
    <div className={cn("flex flex-col items-center justify-between gap-3 sm:flex-row", className)}>
      <p className="text-xs text-muted-foreground sm:text-sm">
        {from !== null && to !== null ? (
          <>
            Showing <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
            <span className="font-medium text-foreground">{total}</span>
          </>
        ) : (
          <>
            Page <span className="font-medium text-foreground">{page}</span> of{" "}
            <span className="font-medium text-foreground">{Math.max(totalPages, 1)}</span>
          </>
        )}
      </p>

      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" disabled={disabled || page <= 1} onClick={go(page - 1)} />
          </PaginationItem>

          {getPageRange(page, totalPages).map((item) =>
            typeof item === "number" ? (
              <PaginationItem key={item}>
                <PaginationLink href="#" isActive={item === page} disabled={disabled} onClick={go(item)}>
                  {item}
                </PaginationLink>
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationEllipsis />
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext href="#" disabled={disabled || page >= totalPages} onClick={go(page + 1)} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
