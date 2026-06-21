import type {
  BrandRecord,
  BulkInventoryApplyResult,
  BulkInventoryChanges,
  BulkInventoryEditPayload,
  BulkInventoryFilters,
  BulkInventoryPreviewResult,
  ItemStatus,
  ProductCategoryRecord,
  ProductRecord,
  SparePartCategoryRecord,
  SparePartRecord,
  MaintenancePartCategoryRecord,
  MaintenancePartRecord,
} from "@/lib/crud-api";
import type { PaginatedResult } from "@/lib/api/core";

export type { BulkInventoryFilters };

export type BulkEditEntity = "products" | "spare_parts" | "maintenance_parts";

export type BulkInventoryListItem =
  | ProductRecord
  | SparePartRecord
  | MaintenancePartRecord;

export type BulkEditEntityConfig = {
  entity: BulkEditEntity;
  eyebrow: string;
  title: string;
  subtitle: string;
  listHref: string;
  brandType: "products" | "spare_parts" | "maintenance_parts";
  listItems: (
    token: string,
    page: number,
    filters: BulkInventoryFilters,
  ) => Promise<PaginatedResult<BulkInventoryListItem>>;
  listCategories: (
    token: string,
    page: number,
  ) => Promise<
    PaginatedResult<
      ProductCategoryRecord | SparePartCategoryRecord | MaintenancePartCategoryRecord
    >
  >;
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

export const NUMERIC_BULK_EDIT_FIELDS = [
  { key: "sale_price" as const, label: "Sale price", price: true },
  { key: "cost_price" as const, label: "Cost price", price: true },
  { key: "stock_quantity" as const, label: "Stock", price: false },
  { key: "low_stock_alarm" as const, label: "Low stock alarm", price: false },
];

export type NumericBulkFieldKey = (typeof NUMERIC_BULK_EDIT_FIELDS)[number]["key"];

export type NumericFieldDraft = {
  enabled: boolean;
  mode: string;
  value: string;
};

export type ItemStatusDraft = {
  enabled: boolean;
  value: ItemStatus;
};

export type ToggleFieldDraft = {
  enabled: boolean;
  value: boolean;
};

export type DiscountFieldDraft = {
  enabled: boolean;
  type: "fixed" | "percentage";
  value: string;
};

export type CompatibilityFieldDraft = {
  enabled: boolean;
  universal: boolean;
  blueprintIds: number[];
};

export type BulkEditDraft = {
  sale_price: NumericFieldDraft;
  cost_price: NumericFieldDraft;
  stock_quantity: NumericFieldDraft;
  low_stock_alarm: NumericFieldDraft;
  item_status: ItemStatusDraft;
  have_commission: ToggleFieldDraft;
  discount: DiscountFieldDraft;
  compatibility: CompatibilityFieldDraft;
};

/** @deprecated Use NUMERIC_BULK_EDIT_FIELDS */
export const BULK_EDIT_FIELDS = NUMERIC_BULK_EDIT_FIELDS;

export type BulkEditStep = 1 | 2 | 3 | 4;

export function emptyBulkEditDraft(): BulkEditDraft {
  return {
    sale_price: { enabled: false, mode: "set", value: "" },
    cost_price: { enabled: false, mode: "set", value: "" },
    stock_quantity: { enabled: false, mode: "set", value: "" },
    low_stock_alarm: { enabled: false, mode: "set", value: "" },
    item_status: { enabled: false, value: "new" },
    have_commission: { enabled: false, value: true },
    discount: { enabled: false, type: "percentage", value: "" },
    compatibility: { enabled: false, universal: true, blueprintIds: [] },
  };
}

export function draftHasEnabledFields(draft: BulkEditDraft): boolean {
  if (NUMERIC_BULK_EDIT_FIELDS.some((field) => draft[field.key].enabled)) {
    return true;
  }
  if (draft.item_status.enabled) return true;
  if (draft.have_commission.enabled) return true;
  if (draft.discount.enabled) return true;
  if (draft.compatibility.enabled) return true;
  return false;
}

export function draftToChanges(draft: BulkEditDraft): BulkInventoryChanges | null {
  const changes: BulkInventoryChanges = {};

  for (const field of NUMERIC_BULK_EDIT_FIELDS) {
    const d = draft[field.key];
    if (!d.enabled || d.value === "") continue;
    const num = Number(d.value);
    if (!Number.isFinite(num)) continue;
    changes[field.key] = {
      mode: d.mode as "set" | "add" | "subtract" | "percent",
      value: num,
    };
  }

  if (draft.item_status.enabled) {
    changes.item_status = { mode: "set", value: draft.item_status.value };
  }

  if (draft.have_commission.enabled) {
    changes.have_commission = { mode: "set", value: draft.have_commission.value };
  }

  if (draft.discount.enabled && draft.discount.value !== "") {
    const discountValue = Number(draft.discount.value);
    if (!Number.isFinite(discountValue)) {
      return null;
    }
    changes.max_discount_type = { mode: "set", value: draft.discount.type };
    changes.max_discount_value = { mode: "set", value: discountValue };
  }

  if (draft.compatibility.enabled) {
    changes.universal = { mode: "set", value: draft.compatibility.universal };
    if (!draft.compatibility.universal) {
      if (draft.compatibility.blueprintIds.length === 0) {
        return null;
      }
      changes.bike_blueprint_ids = {
        mode: "set",
        value: draft.compatibility.blueprintIds,
      };
    }
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
