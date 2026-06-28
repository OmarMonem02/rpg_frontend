"use client";

import {
  EmptyState,
  InlineMessage,
  StatusBadge,
  SurfaceCard,
} from "@/components/ops-ui";
import {
  formatRelativeTime,
  formatTimestamp,
} from "@/components/history/history-utils";
import type { SaleChangeRow } from "@/lib/sale-change-rows";

type SaleChangesTableProps = {
  rows: SaleChangeRow[];
  loading?: boolean;
  error?: string | null;
  isAdmin?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
};

function sourceTone(source: SaleChangeRow["source"]): "primary" | "default" {
  return source === "audit" ? "default" : "primary";
}

function sourceLabel(source: SaleChangeRow["source"]): string {
  return source === "audit" ? "Audit" : "Activity";
}

export function SaleChangesTable({
  rows,
  loading = false,
  error = null,
  isAdmin = false,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
}: SaleChangesTableProps) {
  return (
    <SurfaceCard className="overflow-hidden p-0 shadow-ambient">
      <div className="border-b border-outline-variant/10 p-5">
        <h2 className="text-xl font-semibold text-on-surface">Changes</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Who changed what on this sale, and the before/after values.
        </p>
      </div>

      {error ? (
        <div className="px-5 pt-4">
          <InlineMessage tone="danger">{error}</InlineMessage>
        </div>
      ) : null}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <div className="p-5">
          <EmptyState
            title="No changes recorded yet"
            description="Updates, returns, exchanges, and other edits will appear here."
          />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full text-sm table-fixed">
              <thead>
                <tr className="border-b border-outline-variant/15 bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
                  <th className="px-6 py-4 text-left font-bold w-[140px]">
                    Who
                  </th>
                  <th className="px-6 py-4 text-left font-bold w-[160px]">
                    When
                  </th>
                  {isAdmin ? (
                    <th className="px-6 py-4 text-left font-bold w-[100px]">
                      Source
                    </th>
                  ) : null}
                  <th className="px-6 py-4 text-left font-bold w-[220px]">
                    What
                  </th>
                  <th className="px-6 py-4 text-left font-bold">From</th>
                  <th className="px-6 py-4 text-left font-bold">To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-surface-container-lowest transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-on-surface">
                      {row.who}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-on-surface-variant"
                      title={formatTimestamp(row.when)}
                    >
                      {formatRelativeTime(row.when)}
                    </td>
                    {isAdmin ? (
                      <td className="px-6 py-4">
                        <StatusBadge tone={sourceTone(row.source)}>
                          {sourceLabel(row.source)}
                        </StatusBadge>
                      </td>
                    ) : null}
                    <td className="px-6 py-4 font-medium text-on-surface">
                      {row.what}
                    </td>
                    <td
                      className="px-6 py-4 max-w-xs break-words text-on-surface-variant"
                      title={row.from}
                    >
                      {row.from}
                    </td>
                    <td
                      className="px-6 py-4 max-w-xs break-words text-on-surface"
                      title={row.to}
                    >
                      {row.to}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && onLoadMore ? (
            <div className="border-t border-outline-variant/10 p-5">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="rounded-xl border border-outline-variant/20 bg-surface px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more audit entries"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </SurfaceCard>
  );
}
