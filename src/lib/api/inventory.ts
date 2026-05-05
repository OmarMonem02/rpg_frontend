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

// --- BRANDS ---
export type BrandRecord = {
  id: number;
  name: string;
  type: "spare_parts" | "products" | "bikes";
  created_at?: string;
};

export type CreateBrandPayload = {
  name: string;
  type: "spare_parts" | "products" | "bikes";
};

export function normalizeBrand(raw: unknown): BrandRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    type: toText(record.type) as "spare_parts" | "products" | "bikes",
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
  part_number?: string;
  stock_quantity: number;
  low_stock_alarm: number;
  spare_parts_category_id: number;
  brand_id: number;
  currency_pricing: "EGP" | "USD";
  cost_price: number;
  sale_price: number;
  max_discount_type: "fixed" | "percentage";
  max_discount_value: number;
  universal: boolean;
  notes?: string;
  bike_blueprint_ids?: number[];
  created_at?: string;
};

export type CreateSparePartPayload = {
  name: string;
  sku: string;
  image?: string;
  image_public_id?: string;
  part_number?: string;
  stock_quantity?: number;
  low_stock_alarm?: number;
  spare_parts_category_id: number;
  brand_id: number;
  currency_pricing: "EGP" | "USD";
  cost_price: number;
  sale_price: number;
  max_discount_type: "fixed" | "percentage";
  max_discount_value: number;
  universal?: boolean;
  notes?: string;
  bike_blueprint_ids?: number[];
};

export type UpdateSparePartPayload = {
  name: string;
  sku: string;
  image?: string;
  image_public_id?: string;
  part_number?: string;
  stock_quantity?: number;
  low_stock_alarm?: number;
  spare_parts_category_id: number;
  brand_id: number;
  currency_pricing: "EGP" | "USD";
  cost_price: number;
  sale_price: number;
  max_discount_type: "fixed" | "percentage";
  max_discount_value: number;
  universal?: boolean;
  notes?: string;
};

export function normalizeSparePart(raw: unknown): SparePartRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    sku: toText(record.sku),
    image: toText(record.image) || undefined,
    image_public_id: toText(record.image_public_id) || undefined,
    part_number: toText(record.part_number) || undefined,
    stock_quantity: toNumber(record.stock_quantity),
    low_stock_alarm: toNumber(record.low_stock_alarm),
    spare_parts_category_id: toNumber(record.spare_parts_category_id),
    brand_id: toNumber(record.brand_id),
    currency_pricing: toText(record.currency_pricing) as "EGP" | "USD",
    cost_price: toNumber(record.cost_price),
    sale_price: toNumber(record.sale_price),
    max_discount_type: toText(record.max_discount_type) as "fixed" | "percentage",
    max_discount_value: toNumber(record.max_discount_value),
    universal: record.universal === true || record.universal === "true",
    notes: toText(record.notes) || undefined,
    bike_blueprint_ids: Array.isArray(record.bike_blueprint_ids)
      ? record.bike_blueprint_ids
          .map((item) => toNumber(item))
          .filter((id) => id > 0)
      : undefined,
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
  },
): Promise<PaginatedResult<SparePartRecord>> {
  const query = buildQuery({
    page,
    search: filters?.search,
    category_id: filters?.category_id,
    brand_id: filters?.brand_id,
    price_range: filters?.price_range,
    currency: filters?.currency,
    low_stock: filters?.low_stock,
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
  part_number?: string;
  stock_quantity: number;
  low_stock_alarm: number;
  products_category_id: number;
  brand_id: number;
  currency_pricing: "EGP" | "USD";
  cost_price: number;
  sale_price: number;
  max_discount_type: "fixed" | "percentage";
  max_discount_value: number;
  universal: boolean;
  notes?: string;
  created_at?: string;
};

export type CreateProductPayload = {
  name: string;
  sku: string;
  image?: string;
  image_public_id?: string;
  part_number?: string;
  stock_quantity?: number;
  low_stock_alarm?: number;
  products_category_id: number;
  brand_id: number;
  currency_pricing: "EGP" | "USD";
  cost_price: number;
  sale_price: number;
  max_discount_type: "fixed" | "percentage";
  max_discount_value: number;
  universal?: boolean;
  notes?: string;
};

export type UpdateProductPayload = CreateProductPayload;

export function normalizeProduct(raw: unknown): ProductRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    sku: toText(record.sku),
    image: toText(record.image) || undefined,
    image_public_id: toText(record.image_public_id) || undefined,
    part_number: toText(record.part_number),
    stock_quantity: toNumber(record.stock_quantity),
    low_stock_alarm: toNumber(record.low_stock_alarm),
    products_category_id: toNumber(record.products_category_id),
    brand_id: toNumber(record.brand_id),
    currency_pricing: toText(record.currency_pricing) as "EGP" | "USD",
    cost_price: toNumber(record.cost_price),
    sale_price: toNumber(record.sale_price),
    max_discount_type: toText(record.max_discount_type) as "fixed" | "percentage",
    max_discount_value: toNumber(record.max_discount_value),
    universal: record.universal === true || record.universal === "true",
    notes: toText(record.notes) || undefined,
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
  },
): Promise<PaginatedResult<ProductRecord>> {
  const query = buildQuery({
    page,
    search: filters?.search,
    category_id: filters?.category_id,
    brand_id: filters?.brand_id,
    price_range: filters?.price_range,
    currency: filters?.currency,
    low_stock: filters?.low_stock,
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
