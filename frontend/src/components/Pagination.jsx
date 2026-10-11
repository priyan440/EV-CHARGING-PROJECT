import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

/**
 * Universal Server-Side Pagination Component
 * Used across EV User, Station Owner, Admin, and Field Technician portals.
 */
export default function Pagination({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  limit = 10,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 20, 50, 100],
  className = "",
  showPageSize = true,
  showSummary = true,
}) {
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const total = Math.max(1, parseInt(totalPages, 10) || 1);
  const safeTotalItems = Math.max(0, parseInt(totalItems, 10) || 0);

  // If there are no items and only 1 empty page, we can still render cleanly or hide
  const startItem = safeTotalItems === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, safeTotalItems);

  // Generate page numbers with intelligent windowing
  const getPageNumbers = () => {
    const pages = [];
    const maxButtons = 5;

    if (total <= maxButtons + 2) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(total - 1, currentPage + 1);

      if (currentPage <= 3) {
        start = 2;
        end = 4;
      } else if (currentPage >= total - 2) {
        start = total - 3;
        end = total - 1;
      }

      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < total - 1) pages.push("...");
      pages.push(total);
    }
    return pages;
  };

  const handlePageClick = (p) => {
    if (typeof p === "number" && p >= 1 && p <= total && p !== currentPage) {
      if (onPageChange) onPageChange(p);
    }
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)] font-sans ${className}`}
    >
      {/* Left: Summary and Page Size */}
      <div className="flex flex-wrap items-center gap-3">
        {showSummary && (
          <span className="font-medium">
            Showing <strong className="text-[var(--text-primary)] font-mono">{startItem}</strong> to{" "}
            <strong className="text-[var(--text-primary)] font-mono">{endItem}</strong> of{" "}
            <strong className="text-[var(--text-primary)] font-mono">{safeTotalItems}</strong> records
          </span>
        )}

        {showPageSize && onLimitChange && (
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-[11px]">Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                const newLimit = parseInt(e.target.value, 10);
                if (onLimitChange) onLimitChange(newLimit);
              }}
              className="bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Buttons */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          onClick={() => handlePageClick(1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          title="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`dots-${idx}`} className="px-1.5 py-1 text-[var(--text-muted)] font-mono select-none">
                  ...
                </span>
              );
            }

            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => handlePageClick(p)}
                className={`min-w-[28px] h-7 px-2 rounded-lg font-mono text-xs font-bold transition cursor-pointer border ${
                  isCurrent
                    ? "bg-[var(--accent-primary)] text-white border-blue-500 shadow-sm"
                    : "bg-[var(--bg-surface-raised)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage >= total}
          className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          title="Next Page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => handlePageClick(total)}
          disabled={currentPage >= total}
          className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
