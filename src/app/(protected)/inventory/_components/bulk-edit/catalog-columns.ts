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
