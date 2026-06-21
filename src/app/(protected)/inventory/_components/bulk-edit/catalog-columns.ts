import type { BulkInventoryPreviewFieldKey } from "@/lib/crud-api";
import type { TableColumnDef } from "@/hooks/useTableColumns";
import type { BulkEditEntity } from "./types";

export type BulkCatalogColumnId =
  | "select"
  | "image"
  | "sku"
  | "name"
  | "stock"
  | "alarm"
  | "cost_price"
  | "sale_price"
  | "profit_amount"
  | "profit_percent"
  | "max_discount"
  | "category"
  | "brand"
  | "size"
  | "color"
  | "status"
  | "tags"
  | "universal"
  | "commission";

const BASE_CATALOG_COLUMNS: readonly TableColumnDef<BulkCatalogColumnId>[] = [
  { id: "select", label: "Select", required: true },
  { id: "image", label: "Image" },
  { id: "sku", label: "SKU / Part No." },
  { id: "name", label: "Name" },
  { id: "stock", label: "Stock" },
  { id: "alarm", label: "Alarm on" },
  { id: "cost_price", label: "Cost Price" },
  { id: "sale_price", label: "Sale Price" },
  { id: "profit_amount", label: "Profit" },
  { id: "profit_percent", label: "Profit %" },
  { id: "max_discount", label: "Max Discount" },
  { id: "category", label: "Category" },
  { id: "brand", label: "Brand" },
  { id: "size", label: "Size" },
  { id: "color", label: "Color" },
  { id: "status", label: "Status" },
  { id: "tags", label: "Tags" },
  { id: "universal", label: "Universal" },
  { id: "commission", label: "Commission" },
];

export function getBulkCatalogColumns(_entity: BulkEditEntity): readonly TableColumnDef<BulkCatalogColumnId>[] {
  return BASE_CATALOG_COLUMNS;
}

export function getBulkCatalogColumnStorageKey(entity: BulkEditEntity): string {
  return `bulk-edit-${entity.replace(/_/g, "-")}-columns`;
}

/** Catalog column display order for preview changed-columns table */
export const PREVIEW_CHANGED_COLUMN_ORDER: BulkCatalogColumnId[] = [
  "stock",
  "alarm",
  "cost_price",
  "sale_price",
  "status",
  "commission",
  "max_discount",
];

const PREVIEW_FIELD_TO_COLUMN: Partial<Record<BulkInventoryPreviewFieldKey, BulkCatalogColumnId>> = {
  stock_quantity: "stock",
  low_stock_alarm: "alarm",
  sale_price: "sale_price",
  cost_price: "cost_price",
  item_status: "status",
  have_commission: "commission",
  max_discount_type: "max_discount",
  max_discount_value: "max_discount",
};

export function previewFieldToCatalogColumn(
  field: BulkInventoryPreviewFieldKey,
): BulkCatalogColumnId | null {
  return PREVIEW_FIELD_TO_COLUMN[field] ?? null;
}

export function getCatalogColumnLabel(columnId: BulkCatalogColumnId): string {
  const match = BASE_CATALOG_COLUMNS.find((col) => col.id === columnId);
  return match?.label ?? columnId;
}

export function collectChangedPreviewColumns(
  changedFields: BulkInventoryPreviewFieldKey[],
): BulkCatalogColumnId[] {
  const seen = new Set<BulkCatalogColumnId>();
  for (const field of changedFields) {
    const column = previewFieldToCatalogColumn(field);
    if (column) {
      seen.add(column);
    }
  }
  return PREVIEW_CHANGED_COLUMN_ORDER.filter((column) => seen.has(column));
}

export function collectChangedPreviewColumnsFromRows(
  rows: { changed_fields: BulkInventoryPreviewFieldKey[] }[],
): BulkCatalogColumnId[] {
  const seen = new Set<BulkCatalogColumnId>();
  for (const row of rows) {
    for (const field of row.changed_fields) {
      const column = previewFieldToCatalogColumn(field);
      if (column) {
        seen.add(column);
      }
    }
  }
  return PREVIEW_CHANGED_COLUMN_ORDER.filter((column) => seen.has(column));
}
