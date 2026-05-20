"use client";

import Link from "next/link";
import {
  ActionButton,
  InlineMessage,
  SurfaceCard,
} from "@/components/ops-ui";
import type { BulkInventoryPreviewRow } from "@/lib/crud-api";
import { BULK_EDIT_FIELDS } from "./types";

type BulkEditPreviewStepProps = {
  rows: BulkInventoryPreviewRow[];
  loading: boolean;
  applying: boolean;
  error: string | null;
  listHref: string;
  successUpdated?: number;
  onBack: () => void;
  onConfirm: () => void;
  onDone?: () => void;
};

function fieldLabel(key: string): string {
  return BULK_EDIT_FIELDS.find((f) => f.key === key)?.label ?? key;
}

function formatValue(key: string, value: number | undefined): string {
  if (value === undefined) return "—";
  if (key === "sale_price" || key === "cost_price") {
    return value.toFixed(2);
  }
  return String(value);
}

function changeTone(before: number | undefined, after: number | undefined): string {
  if (before === undefined || after === undefined) return "text-on-surface";
  if (after > before) return "text-primary";
  if (after < before) return "text-error";
  return "text-on-surface-variant";
}

export function BulkEditPreviewStep({
  rows,
  loading,
  applying,
  error,
  listHref,
  successUpdated,
  onBack,
  onConfirm,
}: BulkEditPreviewStepProps) {
  if (successUpdated !== undefined) {
    return (
      <SurfaceCard className="animate-scale-in p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary-container">
          <svg
            className="h-7 w-7 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display text-xl font-bold text-on-surface">
          Bulk edit applied
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Updated <span className="mono-data font-medium text-on-surface">{successUpdated}</span>{" "}
          items successfully.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={listHref}>
            <ActionButton tone="primary">Back to list</ActionButton>
          </Link>
        </div>
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <SurfaceCard className="p-4">
        <p className="text-sm text-on-surface-variant">
          Review <span className="mono-data font-medium text-on-surface">{rows.length}</span>{" "}
          items with changes before applying. Only modified fields are shown per row.
        </p>
      </SurfaceCard>

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

      <SurfaceCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  Item
                </th>
                <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  Field
                </th>
                <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  Before
                </th>
                <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  After
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-on-surface-variant">
                    Generating preview…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-on-surface-variant">
                    No changes would be applied with the current configuration.
                  </td>
                </tr>
              ) : (
                rows.flatMap((row) =>
                  row.changed_fields.map((field, idx) => {
                    const before = row.before[field];
                    const after = row.after[field];
                    return (
                      <tr key={`${row.id}-${field}`} className="data-row">
                        <td className="px-4 py-3">
                          {idx === 0 ? (
                            <div>
                              <div className="font-medium text-on-surface">{row.name}</div>
                              <div className="mono-data text-xs text-on-surface-variant">
                                {row.sku} · {row.currency_pricing}
                              </div>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant">{fieldLabel(field)}</td>
                        <td className="px-4 py-3 mono-data text-on-surface-variant">
                          {formatValue(field, before)}
                        </td>
                        <td
                          className={`px-4 py-3 mono-data font-medium ${changeTone(before, after)}`}
                        >
                          {formatValue(field, after)}
                        </td>
                      </tr>
                    );
                  }),
                )
              )}
            </tbody>
          </table>
        </div>
      </SurfaceCard>

      <div className="flex flex-wrap justify-between gap-3">
        <ActionButton variant="ghost" onClick={onBack} disabled={applying}>
          Back
        </ActionButton>
        <ActionButton
          tone="primary"
          onClick={onConfirm}
          disabled={loading || applying || rows.length === 0}
        >
          {applying ? "Applying…" : "Confirm and apply"}
        </ActionButton>
      </div>
    </div>
  );
}
