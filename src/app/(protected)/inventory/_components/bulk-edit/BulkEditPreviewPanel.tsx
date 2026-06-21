"use client";

import {
  InlineMessage,
  SurfaceCard,
} from "@/components/ops-ui";
import {
  InventoryListTable,
  InventoryListTableBody,
  InventoryListTableHead,
  InventoryListTableRow,
  InventoryListTableTd,
  InventoryListTableTh,
  InventoryListTableToolbar,
} from "@/components/inventory/list-table";
import type {
  BulkInventoryPreviewFieldKey,
  BulkInventoryPreviewRow,
  BulkInventoryPreviewValue,
} from "@/lib/crud-api";
import { itemStatusLabel } from "@/lib/inventory-item-attributes";
import {
  collectChangedPreviewColumnsFromRows,
  getCatalogColumnLabel,
  type BulkCatalogColumnId,
} from "./catalog-columns";
import { NUMERIC_BULK_EDIT_FIELDS } from "./types";

type BulkEditPreviewPanelProps = {
  rows: BulkInventoryPreviewRow[];
  loading: boolean;
  error: string | null;
};

function formatDiscount(
  type: string | undefined,
  value: number | undefined,
): string {
  if (type === undefined || value === undefined) return "—";
  if (type === "percentage") return `${value}%`;
  return value.toFixed(2);
}

function formatFieldValue(key: string, value: BulkInventoryPreviewValue | undefined): string {
  if (value === undefined) return "—";
  if (key === "sale_price" || key === "cost_price" || key === "max_discount_value") {
    return typeof value === "number" ? value.toFixed(2) : String(value);
  }
  if (key === "item_status" && typeof value === "string") {
    return itemStatusLabel(value);
  }
  if (key === "have_commission" && typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return String(value);
}

function changeTone(
  before: BulkInventoryPreviewValue | undefined,
  after: BulkInventoryPreviewValue | undefined,
): string {
  if (typeof before !== "number" || typeof after !== "number") {
    return "text-on-surface";
  }
  if (after > before) return "text-primary";
  if (after < before) return "text-error";
  return "text-on-surface";
}

function previewFieldsForColumn(
  column: BulkCatalogColumnId,
): BulkInventoryPreviewFieldKey[] {
  switch (column) {
    case "stock":
      return ["stock_quantity"];
    case "alarm":
      return ["low_stock_alarm"];
    case "cost_price":
      return ["cost_price"];
    case "sale_price":
      return ["sale_price"];
    case "status":
      return ["item_status"];
    case "commission":
      return ["have_commission"];
    case "max_discount":
      return ["max_discount_type", "max_discount_value"];
    default:
      return [];
  }
}

function beforeAfterForColumn(
  row: BulkInventoryPreviewRow,
  column: BulkCatalogColumnId,
): { before: string; after: string; tone: string } {
  if (column === "max_discount") {
    const before = formatDiscount(
      typeof row.before.max_discount_type === "string" ? row.before.max_discount_type : undefined,
      typeof row.before.max_discount_value === "number" ? row.before.max_discount_value : undefined,
    );
    const after = formatDiscount(
      typeof row.after.max_discount_type === "string" ? row.after.max_discount_type : undefined,
      typeof row.after.max_discount_value === "number" ? row.after.max_discount_value : undefined,
    );
    return { before, after, tone: "text-on-surface" };
  }

  const field = previewFieldsForColumn(column)[0];
  const before = formatFieldValue(field, row.before[field]);
  const after = formatFieldValue(field, row.after[field]);
  const numericKey = NUMERIC_BULK_EDIT_FIELDS.some((f) => f.key === field);
  return {
    before,
    after,
    tone: numericKey ? changeTone(row.before[field], row.after[field]) : "text-on-surface",
  };
}

function BeforeAfterCell({
  before,
  after,
  tone,
}: {
  before: string;
  after: string;
  tone: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="mono-data text-xs text-on-surface-variant line-through decoration-on-surface-variant/40">
        {before}
      </span>
      <span className={`mono-data text-sm font-medium ${tone}`}>{after}</span>
    </div>
  );
}

export function BulkEditPreviewPanel({
  rows,
  loading,
  error,
}: BulkEditPreviewPanelProps) {
  const changedColumns = collectChangedPreviewColumnsFromRows(rows);
  const colSpan = 2 + changedColumns.length;

  return (
    <div className="space-y-3">
      <SurfaceCard className="p-4">
        <h3 className="font-display text-sm font-semibold text-on-surface">Live preview</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          Catalog-style view showing only columns that will change. Each cell shows the old value
          above the new value.
        </p>
      </SurfaceCard>

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

      <InventoryListTable>
        <InventoryListTableToolbar label="Preview changes" count={rows.length} />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <InventoryListTableHead>
              <tr>
                <InventoryListTableTh>Name</InventoryListTableTh>
                <InventoryListTableTh>SKU</InventoryListTableTh>
                {changedColumns.map((column) => (
                  <InventoryListTableTh key={column}>
                    {getCatalogColumnLabel(column)}
                  </InventoryListTableTh>
                ))}
              </tr>
            </InventoryListTableHead>
            <InventoryListTableBody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-8 text-center text-on-surface-variant">
                    Generating preview…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-8 text-center text-on-surface-variant">
                    Enable at least one field with a valid value to see a preview.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <InventoryListTableRow key={row.id}>
                    <InventoryListTableTd variant="name">{row.name}</InventoryListTableTd>
                    <InventoryListTableTd variant="mono">
                      <div>{row.sku}</div>
                      <div className="text-xs text-on-surface-variant">{row.sale_currency}</div>
                    </InventoryListTableTd>
                    {changedColumns.map((column) => {
                      const { before, after, tone } = beforeAfterForColumn(row, column);
                      return (
                        <InventoryListTableTd key={`${row.id}-${column}`}>
                          <BeforeAfterCell before={before} after={after} tone={tone} />
                        </InventoryListTableTd>
                      );
                    })}
                  </InventoryListTableRow>
                ))
              )}
            </InventoryListTableBody>
          </table>
        </div>
      </InventoryListTable>
    </div>
  );
}
