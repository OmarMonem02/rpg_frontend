"use client";

import { EmptyState, SurfaceCard } from "@/components/ops-ui";
import {
  formatRelativeTime,
  formatTimestamp,
} from "@/components/history/history-utils";
import type { SaleChangeRow } from "@/lib/sale-change-rows";

type SaleChangesTableProps = {
  rows: SaleChangeRow[];
};

export function SaleChangesTable({ rows }: SaleChangesTableProps) {
  return (
    <SurfaceCard className="overflow-hidden p-0 shadow-ambient">
      <div className="border-b border-outline-variant/10 p-5">
        <h2 className="text-xl font-semibold text-on-surface">
          Returns &amp; Exchanges
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Record of return and exchange actions on this sale.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="p-5">
          <EmptyState
            title="No returns or exchanges yet"
            description="When items are returned or exchanged on this sale, they will appear here."
          />
        </div>
      ) : (
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
      )}
    </SurfaceCard>
  );
}
