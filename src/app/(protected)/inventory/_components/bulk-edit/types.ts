import type {
  BrandRecord,
  BulkInventoryApplyResult,
  BulkInventoryChanges,
  BulkInventoryEditPayload,
  BulkInventoryFilters,
  BulkInventoryPreviewResult,
  ProductCategoryRecord,
  ProductRecord,
  SparePartCategoryRecord,
  SparePartRecord,
} from "@/lib/crud-api";
import type { PaginatedResult } from "@/lib/api/core";

export type { BulkInventoryFilters };

export type BulkEditEntity = "products" | "spare_parts";

export type BulkInventoryListItem = ProductRecord | SparePartRecord;

export type BulkEditEntityConfig = {
  entity: BulkEditEntity;
  eyebrow: string;
  title: string;
  subtitle: string;
  listHref: string;
  brandType: "products" | "spare_parts";
  listItems: (
    token: string,
    page: number,
    filters: BulkInventoryFilters,
  ) => Promise<PaginatedResult<BulkInventoryListItem>>;
  listCategories: (
    token: string,
    page: number,
  ) => Promise<PaginatedResult<ProductCategoryRecord | SparePartCategoryRecord>>;
  listBrands: (token: string, page: number) => Promise<PaginatedResult<BrandRecord>>;
  preview: (
    token: string,
    payload: BulkInventoryEditPayload,
  ) => Promise<BulkInventoryPreviewResult>;
  apply: (
    token: string,
    payload: BulkInventoryEditPayload,
  ) => Promise<BulkInventoryApplyResult>;
};

export const BULK_EDIT_FIELDS = [
  { key: "sale_price" as const, label: "Sale price", price: true },
  { key: "cost_price" as const, label: "Cost price", price: true },
  { key: "stock_quantity" as const, label: "Stock", price: false },
  { key: "low_stock_alarm" as const, label: "Low stock alarm", price: false },
];

export type BulkEditStep = 1 | 2 | 3 | 4;

export type FieldDraft = {
  enabled: boolean;
  mode: string;
  value: string;
};

export type BulkEditDraft = Record<
  keyof BulkInventoryChanges,
  FieldDraft
>;

export function emptyBulkEditDraft(): BulkEditDraft {
  return {
    sale_price: { enabled: false, mode: "set", value: "" },
    cost_price: { enabled: false, mode: "set", value: "" },
    stock_quantity: { enabled: false, mode: "set", value: "" },
    low_stock_alarm: { enabled: false, mode: "set", value: "" },
  };
}

export function draftToChanges(draft: BulkEditDraft): BulkInventoryChanges | null {
  const changes: BulkInventoryChanges = {};
  for (const field of BULK_EDIT_FIELDS) {
    const d = draft[field.key];
    if (!d.enabled || d.value === "") continue;
    const num = Number(d.value);
    if (!Number.isFinite(num)) continue;
    changes[field.key] = {
      mode: d.mode as "set" | "add" | "subtract" | "percent",
      value: num,
    };
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

export function buildListFilters(state: {
  search: string;
  brandId: string;
  categoryId: string;
  currency: string;
}): BulkInventoryFilters {
  const filters: BulkInventoryFilters = {};
  if (state.search.trim()) filters.search = state.search.trim();
  if (state.brandId) filters.brand_id = Number(state.brandId);
  if (state.categoryId) filters.category_id = Number(state.categoryId);
  if (state.currency && state.currency !== "all") filters.currency = state.currency;
  return filters;
}
