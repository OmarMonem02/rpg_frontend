// === INVENTORY ===
import {
  asRecord,
  pickArray,
  toText,
  toNumber,
  parsePagination,
  authorizedFetch,
  buildQuery,
  type PaginatedResult,
} from "./core";
import type { CatalogPricingFields } from "@/lib/catalog-pricing";
import type { PricingCurrency } from "@/lib/currencies";
import { toPricingCurrency } from "@/lib/currencies";
import { getApiUrl } from "@/lib/config";
import { ApiError } from "@/lib/auth-api";
import type { StocktakeExportRow } from "@/lib/stocktake";

import type { BrandType } from "@/lib/brand-types";
import {
  normalizeInventoryImages,
  type InventoryImageRecord,
} from "@/lib/inventory-images";

export type { InventoryImageRecord };

// --- BRANDS ---
export type BrandRecord = {
  id: number;
  name: string;
  types: BrandType[];
  created_at?: string;
};

export type CreateBrandPayload = {
  name: string;
  types: BrandType[];
};

function normalizeBrandTypes(raw: unknown): BrandType[] {
  if (Array.isArray(raw)) {
    return raw
      .map((value) => toText(value))
      .filter((value): value is BrandType =>
        value === "spare_parts" || value === "products" || value === "bikes",
      );
  }

  const legacyType = toText(raw);
  if (
    legacyType === "spare_parts" ||
    legacyType === "products" ||
    legacyType === "bikes"
  ) {
    return [legacyType];
  }

  return [];
}

export function normalizeBrand(raw: unknown): BrandRecord {
  const record = asRecord(raw);
  const types = normalizeBrandTypes(record.types ?? record.type);

  return {
    id: toNumber(record.id),
    name: toText(record.name),
    types,
    created_at: toText(record.created_at) || undefined,
  };
}

export async function listBrands(
  token: string,
  page = 1,
  filters?: {
    type?: string;
    search?: string;
    currency?: string;
  },
): Promise<PaginatedResult<BrandRecord>> {
  const query = buildQuery({
    page,
    type: filters?.type,
    search: filters?.search,
    currency: filters?.currency !== "all" ? filters?.currency : undefined,
  });

  const payload = await authorizedFetch<unknown>(`/brands?${query}`, token);
  const rows = pickArray(payload, ["data", "brands"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeBrand).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function createBrand(
  token: string,
  payload: CreateBrandPayload,
): Promise<BrandRecord> {
  const data = await authorizedFetch<unknown>("/brands", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeBrand(record.brand ?? record.data ?? record);
}

export async function updateBrand(
  token: string,
  id: number,
  payload: CreateBrandPayload,
): Promise<BrandRecord> {
  const data = await authorizedFetch<unknown>(`/brands/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeBrand(record.brand ?? record.data ?? record);
}

export async function deleteBrand(token: string, id: number): Promise<void> {
  await authorizedFetch<void>(`/brands/${id}`, token, { method: "DELETE" });
}

// --- SPARE PART CATEGORIES ---
export type SparePartCategoryRecord = {
  id: number;
  name: string;
  created_at?: string;
};

export type CreateCategoryPayload = {
  name: string;
};

export function normalizeSparePartCategory(raw: unknown): SparePartCategoryRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    created_at: toText(record.created_at) || undefined,
  };
}

export async function listSparePartCategories(
  token: string,
  page = 1,
): Promise<PaginatedResult<SparePartCategoryRecord>> {
  const query = buildQuery({ page });
  const payload = await authorizedFetch<unknown>(
    `/spare_part_categories?${query}`,
    token,
  );
  const rows = pickArray(payload, ["data", "spare_part_categories"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeSparePartCategory).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function createSparePartCategory(
  token: string,
  payload: CreateCategoryPayload,
): Promise<SparePartCategoryRecord> {
  const data = await authorizedFetch<unknown>("/spare_part_categories", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeSparePartCategory(record.data ?? record);
}

export async function updateSparePartCategory(
  token: string,
  id: number,
  payload: CreateCategoryPayload,
): Promise<SparePartCategoryRecord> {
  const data = await authorizedFetch<unknown>(
    `/spare_part_categories/${id}`,
    token,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const record = asRecord(data);
  return normalizeSparePartCategory(record.data ?? record);
}

export async function deleteSparePartCategory(
  token: string,
  id: number,
): Promise<void> {
  await authorizedFetch<void>(`/spare_part_categories/${id}`, token, {
    method: "DELETE",
  });
}

// --- PRODUCT CATEGORIES ---
export type ProductCategoryRecord = {
  id: number;
  name: string;
  created_at?: string;
};

export function normalizeProductCategory(raw: unknown): ProductCategoryRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    created_at: toText(record.created_at) || undefined,
  };
}

export async function listProductCategories(
  token: string,
  page = 1,
): Promise<PaginatedResult<ProductCategoryRecord>> {
  const query = buildQuery({ page });
  const payload = await authorizedFetch<unknown>(
    `/product_categories?${query}`,
    token,
  );
  const rows = pickArray(payload, ["data", "product_categories"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeProductCategory).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function createProductCategory(
  token: string,
  payload: CreateCategoryPayload,
): Promise<ProductCategoryRecord> {
  const data = await authorizedFetch<unknown>("/product_categories", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeProductCategory(record.data ?? record);
}

export async function updateProductCategory(
  token: string,
  id: number,
  payload: CreateCategoryPayload,
): Promise<ProductCategoryRecord> {
  const data = await authorizedFetch<unknown>(
    `/product_categories/${id}`,
    token,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const record = asRecord(data);
  return normalizeProductCategory(record.data ?? record);
}

export async function deleteProductCategory(
  token: string,
  id: number,
): Promise<void> {
  await authorizedFetch<void>(`/product_categories/${id}`, token, {
    method: "DELETE",
  });
}

// --- SPARE PARTS ---
export type SparePartRecord = {
  id: number;
  name: string;
  sku: string;
  image?: string;
  image_public_id?: string;
  images?: InventoryImageRecord[];
  part_number?: string;
  stock_quantity: number;
  low_stock_alarm: number;
  spare_parts_category_id: number;
  brand_id: number;
  cost_currency: PricingCurrency;
  sale_currency: PricingCurrency;
  cost_price: number;
  sale_price: number;
  sale_price_mode: CatalogPricingFields["sale_price_mode"];
  sale_margin_type?: CatalogPricingFields["sale_margin_type"];
  sale_margin_value?: number;
  max_discount_type: "fixed" | "percentage";
  max_discount_value: number;
  universal: boolean;
  notes?: string;
  tags?: string[];
  bike_blueprint_ids?: number[];
  created_at?: string;
};

export type CreateSparePartPayload = {
  name: string;
  sku: string;
  image?: string;
  image_public_id?: string;
  images?: InventoryImageRecord[];
  part_number?: string;
  stock_quantity?: number;
  low_stock_alarm?: number;
  spare_parts_category_id: number;
  brand_id: number;
  cost_currency: PricingCurrency;
  sale_currency: PricingCurrency;
  cost_price: number;
  sale_price: number;
  sale_price_mode?: CatalogPricingFields["sale_price_mode"];
  sale_margin_type?: CatalogPricingFields["sale_margin_type"];
  sale_margin_value?: number;
  max_discount_type: "fixed" | "percentage";
  max_discount_value: number;
  universal?: boolean;
  notes?: string;
  tags?: string[];
  bike_blueprint_ids?: number[];
};

export type UpdateSparePartPayload = {
  name: string;
  sku: string;
  image?: string;
  image_public_id?: string;
  images?: InventoryImageRecord[];
  part_number?: string;
  stock_quantity?: number;
  low_stock_alarm?: number;
  spare_parts_category_id: number;
  brand_id: number;
  cost_currency: PricingCurrency;
  sale_currency: PricingCurrency;
  cost_price: number;
  sale_price: number;
  sale_price_mode?: CatalogPricingFields["sale_price_mode"];
  sale_margin_type?: CatalogPricingFields["sale_margin_type"];
  sale_margin_value?: number;
  max_discount_type: "fixed" | "percentage";
  max_discount_value: number;
  universal?: boolean;
  notes?: string;
  tags?: string[];
  /** When set, replaces pivot links (use [] when universal). Omit to leave links unchanged. */
  bike_blueprint_ids?: number[];
};

function coalesceTags(record: Record<string, unknown>): string[] | undefined {
  if (!Array.isArray(record.tags)) {
    return undefined;
  }

  const tags = record.tags
    .map((tag) => toText(tag).trim())
    .filter((tag) => tag.length > 0);

  return tags.length > 0 ? tags : undefined;
}

function coalesceBikeBlueprintIds(record: Record<string, unknown>): number[] | undefined {
  if (Array.isArray(record.bike_blueprint_ids)) {
    return record.bike_blueprint_ids
      .map((item) => toNumber(item))
      .filter((id) => id > 0);
  }
  if (Array.isArray(record.bike_blueprints)) {
    const fromNested = record.bike_blueprints
      .map((item) => toNumber(asRecord(item).id))
      .filter((id) => id > 0);
    return fromNested.length > 0 ? fromNested : undefined;
  }
  return undefined;
}

function normalizeCatalogPricingFields(record: Record<string, unknown>) {
  const saleCurrency = toPricingCurrency(record.sale_currency ?? "EGP");
  const costCurrency = toPricingCurrency(record.cost_currency ?? saleCurrency);

  return {
    cost_currency: costCurrency,
    sale_currency: saleCurrency,
    sale_price_mode:
      record.sale_price_mode === "margin" ? ("margin" as const) : ("manual" as const),
    sale_margin_type:
      record.sale_margin_type === "fixed"
        ? ("fixed" as const)
        : record.sale_margin_type === "percentage"
          ? ("percentage" as const)
          : undefined,
    sale_margin_value:
      record.sale_margin_value !== undefined && record.sale_margin_value !== null
        ? toNumber(record.sale_margin_value)
        : undefined,
  };
}

export function normalizeSparePart(raw: unknown): SparePartRecord {
  const record = asRecord(raw);
  const pricing = normalizeCatalogPricingFields(record);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    sku: toText(record.sku),
    image: toText(record.image) || undefined,
    image_public_id: toText(record.image_public_id) || undefined,
    images: normalizeInventoryImages(record.images),
    part_number: toText(record.part_number) || undefined,
    stock_quantity: toNumber(record.stock_quantity),
    low_stock_alarm: toNumber(record.low_stock_alarm),
    spare_parts_category_id: toNumber(record.spare_parts_category_id),
    brand_id: toNumber(record.brand_id),
    ...pricing,
    cost_price: toNumber(record.cost_price),
    sale_price: toNumber(record.sale_price),
    max_discount_type: toText(record.max_discount_type) as "fixed" | "percentage",
    max_discount_value: toNumber(record.max_discount_value),
    universal: record.universal === true || record.universal === "true",
    notes: toText(record.notes) || undefined,
    tags: coalesceTags(record),
    bike_blueprint_ids: coalesceBikeBlueprintIds(record),
    created_at: toText(record.created_at) || undefined,
  };
}

export async function listSpareParts(
  token: string,
  page = 1,
  filters?: {
    search?: string;
    category_id?: number;
    brand_id?: number;
    price_range?: string;
    currency?: string;
    low_stock?: boolean;
    bike_brand_id?: number;
    bike_model?: string;
    bike_year?: number;
    bike_year_from?: number;
    bike_year_to?: number;
    tags?: string[];
    per_page?: number;
  },
): Promise<PaginatedResult<SparePartRecord>> {
  const query = buildQuery({
    page,
    per_page: filters?.per_page,
    search: filters?.search,
    category_id: filters?.category_id,
    brand_id: filters?.brand_id,
    price_range: filters?.price_range,
    currency: filters?.currency,
    low_stock: filters?.low_stock,
    bike_brand_id: filters?.bike_brand_id,
    bike_model: filters?.bike_model,
    bike_year: filters?.bike_year,
    bike_year_from: filters?.bike_year_from,
    bike_year_to: filters?.bike_year_to,
    tags: filters?.tags?.length ? filters.tags.join(",") : undefined,
  });

  const payload = await authorizedFetch<unknown>(
    `/spare_parts?${query}`,
    token,
  );
  const rows = pickArray(payload, ["data", "spare_parts"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeSparePart).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function createSparePart(
  token: string,
  payload: CreateSparePartPayload,
): Promise<SparePartRecord> {
  const data = await authorizedFetch<unknown>("/spare_parts", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeSparePart(record.data ?? record);
}

export async function updateSparePart(
  token: string,
  id: number,
  payload: UpdateSparePartPayload,
): Promise<SparePartRecord> {
  const data = await authorizedFetch<unknown>(`/spare_parts/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeSparePart(record.data ?? record);
}

export async function deleteSparePart(
  token: string,
  id: number,
): Promise<void> {
  await authorizedFetch<void>(`/spare_parts/${id}`, token, {
    method: "DELETE",
  });
}

export async function getSparePart(
  token: string,
  id: number,
): Promise<SparePartRecord> {
  const data = await authorizedFetch<unknown>(`/spare_parts/${id}`, token);
  const record = asRecord(data);
  return normalizeSparePart(record.data ?? record.spare_part ?? record);
}

// --- PRODUCTS ---
export type ProductRecord = {
  id: number;
  name: string;
  sku: string;
  image?: string;
  image_public_id?: string;
  images?: InventoryImageRecord[];
  part_number?: string;
  stock_quantity: number;
  low_stock_alarm: number;
  products_category_id: number;
  brand_id: number;
  cost_currency: PricingCurrency;
  sale_currency: PricingCurrency;
  cost_price: number;
  sale_price: number;
  sale_price_mode: CatalogPricingFields["sale_price_mode"];
  sale_margin_type?: CatalogPricingFields["sale_margin_type"];
  sale_margin_value?: number;
  max_discount_type: "fixed" | "percentage";
  max_discount_value: number;
  universal: boolean;
  notes?: string;
  tags?: string[];
  bike_blueprint_ids?: number[];
  created_at?: string;
};

export type CreateProductPayload = {
  name: string;
  sku: string;
  image?: string;
  image_public_id?: string;
  images?: InventoryImageRecord[];
  part_number?: string;
  stock_quantity?: number;
  low_stock_alarm?: number;
  products_category_id: number;
  brand_id: number;
  cost_currency: PricingCurrency;
  sale_currency: PricingCurrency;
  cost_price: number;
  sale_price: number;
  sale_price_mode?: CatalogPricingFields["sale_price_mode"];
  sale_margin_type?: CatalogPricingFields["sale_margin_type"];
  sale_margin_value?: number;
  max_discount_type: "fixed" | "percentage";
  max_discount_value: number;
  universal?: boolean;
  notes?: string;
  tags?: string[];
  bike_blueprint_ids?: number[];
};

export type UpdateProductPayload = CreateProductPayload & {
  /** When set, replaces pivot links (use [] when universal). Omit to leave links unchanged. */
  bike_blueprint_ids?: number[];
};

export function normalizeProduct(raw: unknown): ProductRecord {
  const record = asRecord(raw);
  const pricing = normalizeCatalogPricingFields(record);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    sku: toText(record.sku),
    image: toText(record.image) || undefined,
    image_public_id: toText(record.image_public_id) || undefined,
    images: normalizeInventoryImages(record.images),
    part_number: toText(record.part_number),
    stock_quantity: toNumber(record.stock_quantity),
    low_stock_alarm: toNumber(record.low_stock_alarm),
    products_category_id: toNumber(record.products_category_id),
    brand_id: toNumber(record.brand_id),
    ...pricing,
    cost_price: toNumber(record.cost_price),
    sale_price: toNumber(record.sale_price),
    max_discount_type: toText(record.max_discount_type) as "fixed" | "percentage",
    max_discount_value: toNumber(record.max_discount_value),
    universal: record.universal === true || record.universal === "true",
    notes: toText(record.notes) || undefined,
    tags: coalesceTags(record),
    bike_blueprint_ids: coalesceBikeBlueprintIds(record),
    created_at: toText(record.created_at) || undefined,
  };
}

export async function listProducts(
  token: string,
  page = 1,
  filters?: {
    search?: string;
    category_id?: number;
    brand_id?: number;
    price_range?: string;
    currency?: string;
    low_stock?: boolean;
    bike_brand_id?: number;
    bike_model?: string;
    bike_year?: number;
    tags?: string[];
    per_page?: number;
  },
): Promise<PaginatedResult<ProductRecord>> {
  const query = buildQuery({
    page,
    per_page: filters?.per_page,
    search: filters?.search,
    category_id: filters?.category_id,
    brand_id: filters?.brand_id,
    price_range: filters?.price_range,
    currency: filters?.currency,
    low_stock: filters?.low_stock,
    bike_brand_id: filters?.bike_brand_id,
    bike_model: filters?.bike_model,
    bike_year: filters?.bike_year,
    tags: filters?.tags?.length ? filters.tags.join(",") : undefined,
  });

  const payload = await authorizedFetch<unknown>(`/products?${query}`, token);
  const rows = pickArray(payload, ["data", "products"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeProduct).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function createProduct(
  token: string,
  payload: CreateProductPayload,
): Promise<ProductRecord> {
  const data = await authorizedFetch<unknown>("/products", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeProduct(record.data ?? record);
}

export async function updateProduct(
  token: string,
  id: number,
  payload: UpdateProductPayload,
): Promise<ProductRecord> {
  const data = await authorizedFetch<unknown>(`/products/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeProduct(record.data ?? record);
}

export type ProductQuickEditFields = Partial<
  Pick<
    ProductRecord,
    | "name"
    | "stock_quantity"
    | "low_stock_alarm"
    | "cost_price"
    | "sale_price"
    | "sale_price_mode"
    | "sale_margin_type"
    | "sale_margin_value"
  >
>;

export async function patchProduct(
  token: string,
  id: number,
  payload: ProductQuickEditFields,
): Promise<ProductRecord> {
  const data = await authorizedFetch<unknown>(`/products/${id}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeProduct(record.data ?? record);
}

export type SparePartQuickEditFields = Partial<
  Pick<
    SparePartRecord,
    | "name"
    | "stock_quantity"
    | "low_stock_alarm"
    | "cost_price"
    | "sale_price"
    | "sale_price_mode"
    | "sale_margin_type"
    | "sale_margin_value"
  >
>;

export function buildSparePartQuickEditPayload(
  record: SparePartRecord,
  changes: SparePartQuickEditFields,
): UpdateSparePartPayload {
  return {
    cost_currency: record.cost_currency,
    sale_currency: record.sale_currency,
    name: changes.name ?? record.name,
    sku: record.sku,
    image: record.image,
    image_public_id: record.image_public_id,
    part_number: record.part_number,
    stock_quantity: changes.stock_quantity ?? record.stock_quantity,
    low_stock_alarm: changes.low_stock_alarm ?? record.low_stock_alarm,
    spare_parts_category_id: record.spare_parts_category_id,
    brand_id: record.brand_id,
    cost_price: changes.cost_price ?? record.cost_price,
    sale_price: changes.sale_price ?? record.sale_price,
    sale_price_mode: changes.sale_price_mode ?? record.sale_price_mode,
    sale_margin_type: changes.sale_margin_type ?? record.sale_margin_type,
    sale_margin_value: changes.sale_margin_value ?? record.sale_margin_value,
    max_discount_type: record.max_discount_type,
    max_discount_value: record.max_discount_value,
    universal: record.universal,
    notes: record.notes,
    tags: record.tags,
    bike_blueprint_ids: record.bike_blueprint_ids,
  };
}

export async function deleteProduct(token: string, id: number): Promise<void> {
  await authorizedFetch<void>(`/products/${id}`, token, { method: "DELETE" });
}

export async function getProduct(
  token: string,
  id: number,
): Promise<ProductRecord> {
  const data = await authorizedFetch<unknown>(`/products/${id}`, token);
  const record = asRecord(data);
  return normalizeProduct(record.data ?? record.product ?? record);
}

// --- BULK INVENTORY EDIT ---
export type BulkPriceChangeMode = "set" | "add" | "subtract" | "percent";

export type BulkStockChangeMode = "set" | "add" | "subtract";

export type BulkFieldChange =
  | { mode: BulkPriceChangeMode; value: number }
  | { mode: BulkStockChangeMode; value: number };

export type BulkInventoryChanges = {
  sale_price?: BulkFieldChange;
  cost_price?: BulkFieldChange;
  stock_quantity?: BulkFieldChange;
  low_stock_alarm?: BulkFieldChange;
};

export type BulkInventoryFilters = {
  search?: string;
  brand_id?: number;
  category_id?: number;
  currency?: string;
};

export type BulkInventoryEditPayload = {
  ids?: number[];
  filters?: BulkInventoryFilters;
  changes: BulkInventoryChanges;
};

export type BulkInventoryPreviewRow = {
  id: number;
  name: string;
  sku: string;
  before: Partial<Record<keyof BulkInventoryChanges, number>>;
  after: Partial<Record<keyof BulkInventoryChanges, number>>;
  changed_fields: (keyof BulkInventoryChanges)[];
};

export type BulkInventoryPreviewResult = {
  total: number;
  rows: BulkInventoryPreviewRow[];
};

export type BulkInventoryApplyResult = {
  updated: number;
  rows: BulkInventoryPreviewRow[];
};

function normalizeBulkPreviewRow(raw: unknown): BulkInventoryPreviewRow {
  const record = asRecord(raw);
  const before = asRecord(record.before);
  const after = asRecord(record.after);
  const changed = Array.isArray(record.changed_fields)
    ? (record.changed_fields as string[])
    : [];

  return {
    id: toNumber(record.id),
    name: toText(record.name),
    sku: toText(record.sku),
    sale_currency: toPricingCurrency(record.sale_currency),
    before: {
      sale_price: before.sale_price !== undefined ? toNumber(before.sale_price) : undefined,
      cost_price: before.cost_price !== undefined ? toNumber(before.cost_price) : undefined,
      stock_quantity:
        before.stock_quantity !== undefined ? toNumber(before.stock_quantity) : undefined,
      low_stock_alarm:
        before.low_stock_alarm !== undefined ? toNumber(before.low_stock_alarm) : undefined,
    },
    after: {
      sale_price: after.sale_price !== undefined ? toNumber(after.sale_price) : undefined,
      cost_price: after.cost_price !== undefined ? toNumber(after.cost_price) : undefined,
      stock_quantity:
        after.stock_quantity !== undefined ? toNumber(after.stock_quantity) : undefined,
      low_stock_alarm:
        after.low_stock_alarm !== undefined ? toNumber(after.low_stock_alarm) : undefined,
    },
    changed_fields: changed.filter((f): f is keyof BulkInventoryChanges =>
      ["sale_price", "cost_price", "stock_quantity", "low_stock_alarm"].includes(f),
    ),
  };
}

function normalizeBulkPreviewResult(raw: unknown): BulkInventoryPreviewResult {
  const record = asRecord(raw);
  const rows = Array.isArray(record.rows) ? record.rows : [];
  return {
    total: toNumber(record.total),
    rows: rows.map(normalizeBulkPreviewRow),
  };
}

function normalizeBulkApplyResult(raw: unknown): BulkInventoryApplyResult {
  const record = asRecord(raw);
  const rows = Array.isArray(record.rows) ? record.rows : [];
  return {
    updated: toNumber(record.updated),
    rows: rows.map(normalizeBulkPreviewRow),
  };
}

function cleanBulkPayload(payload: BulkInventoryEditPayload): BulkInventoryEditPayload {
  const filters = payload.filters
    ? Object.fromEntries(
        Object.entries(payload.filters).filter(
          ([, v]) => v !== undefined && v !== "" && v !== "all",
        ),
      )
    : undefined;

  return {
    ids: payload.ids?.length ? payload.ids : undefined,
    filters: filters && Object.keys(filters).length > 0 ? (filters as BulkInventoryFilters) : undefined,
    changes: payload.changes,
  };
}

export async function bulkPreviewProducts(
  token: string,
  payload: BulkInventoryEditPayload,
): Promise<BulkInventoryPreviewResult> {
  const data = await authorizedFetch<unknown>("/products/bulk/preview", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cleanBulkPayload(payload)),
  });
  return normalizeBulkPreviewResult(data);
}

export async function bulkApplyProducts(
  token: string,
  payload: BulkInventoryEditPayload,
): Promise<BulkInventoryApplyResult> {
  const data = await authorizedFetch<unknown>("/products/bulk/apply", token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cleanBulkPayload(payload)),
  });
  return normalizeBulkApplyResult(data);
}

export async function bulkPreviewSpareParts(
  token: string,
  payload: BulkInventoryEditPayload,
): Promise<BulkInventoryPreviewResult> {
  const data = await authorizedFetch<unknown>("/spare_parts/bulk/preview", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cleanBulkPayload(payload)),
  });
  return normalizeBulkPreviewResult(data);
}

export async function bulkApplySpareParts(
  token: string,
  payload: BulkInventoryEditPayload,
): Promise<BulkInventoryApplyResult> {
  const data = await authorizedFetch<unknown>("/spare_parts/bulk/apply", token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cleanBulkPayload(payload)),
  });
  return normalizeBulkApplyResult(data);
}

// --- STOCKTAKE (INVENTORY COUNT) ---

/**
 * Sends counted rows to the backend, which re-reads authoritative stock,
 * computes variance, and streams back a styled .xlsx of discrepant items.
 */
export async function exportStocktakeDiscrepancies(
  token: string,
  rows: StocktakeExportRow[],
): Promise<void> {
  const response = await fetch(getApiUrl("/stocktake/discrepancy-export"), {
    method: "POST",
    headers: {
      Accept: "application/octet-stream",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items: rows }),
  });

  if (!response.ok) {
    let message = "Failed to generate the discrepancy report.";
    try {
      const json = (await response.json()) as { message?: string };
      if (json.message) message = json.message;
    } catch {
      // Keep the fallback message.
    }
    throw new ApiError(message, response.status);
  }

  const blob = await response.blob();
  const filename = `inventory-count-discrepancies_${new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "")}.xlsx`;

  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(downloadUrl);
}
