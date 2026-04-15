import { getApiUrl } from "@/lib/config";
import { ApiError } from "@/lib/auth-api";

type ValidationErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

type PaginationMeta = {
  current_page?: number;
  last_page?: number;
};

type PaginatedResult<T> = {
  items: T[];
  currentPage: number;
  lastPage: number;
};

type UnknownRecord = Record<string, unknown>;

export type UserRecord = {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
};

export type SellerRecord = {
  id: number;
  name: string;
  phone?: string;
  commission_rate: number;
  created_at?: string;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  role: string;
  password: string;
  password_confirmation: string;
};

export type UpdateUserPayload = {
  name: string;
  email: string;
  role: string;
  password?: string;
  password_confirmation?: string;
};

export type UpsertSellerPayload = {
  name: string;
  commission_rate: number;
  phone?: string;
};

function asRecord(value: unknown): UnknownRecord {
  if (value && typeof value === "object") return value as UnknownRecord;
  return {};
}

function pickArray(payload: unknown, keys: string[]): unknown[] {
  const data = asRecord(payload);
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key] as unknown[];
  }
  if (Array.isArray(payload)) return payload;
  return [];
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeUser(raw: unknown): UserRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    email: toText(record.email),
    role: toText(record.role),
    created_at: toText(record.created_at) || undefined,
  };
}

function normalizeSeller(raw: unknown): SellerRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    phone: toText(record.phone) || undefined,
    commission_rate: toNumber(record.commission_rate),
    created_at: toText(record.created_at) || undefined,
  };
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    console.error(`[API Error ${response.status}] Response:`, text);
    
    // Try to parse as JSON
    try {
      const json = JSON.parse(text) as ValidationErrorResponse;
      if (json.errors) {
        const allErrors = Object.entries(json.errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
          .join("; ");
        if (allErrors) return allErrors;
      }
      if (json.message) return json.message;
    } catch {
      // Not valid JSON, will use text below
    }
    
    // If we got text but not JSON, return a snippet
    if (text) {
      return text.substring(0, 200);
    }
  } catch {
    // Intentionally ignored; fallback message is used below.
  }

  if (response.status === 401) return "Your session expired. Please log in again.";
  if (response.status === 422) return "Please review your form inputs and try again.";
  if (response.status === 500) return "Server error. Check browser console for details.";
  return "Request failed. Please try again.";
}

async function authorizedFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  let requestBody: unknown = null;
  try {
    if (init?.body) {
      requestBody = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    }
  } catch (e) {
    console.warn("[API] Failed to parse request body:", e);
  }
  
  console.log(`[API ${init?.method || "GET"}] ${path}`, requestBody);
  
  const response = await fetch(getApiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorMsg = await parseErrorMessage(response);
    console.error(`[API Error ${response.status}] ${path} - ${errorMsg}`, { requestBody });
    throw new ApiError(errorMsg, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function parsePagination(payload: unknown): PaginationMeta {
  const data = asRecord(payload);
  const meta = asRecord(data.meta);
  return {
    current_page: toNumber(meta.current_page) || 1,
    last_page: toNumber(meta.last_page) || 1,
  };
}

export async function listUsers(token: string, page = 1): Promise<PaginatedResult<UserRecord>> {
  const payload = await authorizedFetch<unknown>(`/users?page=${page}`, token);
  const rows = pickArray(payload, ["data", "users"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeUser).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function createUser(token: string, payload: CreateUserPayload): Promise<UserRecord> {
  const data = await authorizedFetch<unknown>("/users", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeUser(record.user ?? record.data ?? record);
}

export async function updateUser(token: string, id: number, payload: UpdateUserPayload): Promise<UserRecord> {
  const data = await authorizedFetch<unknown>(`/users/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeUser(record.user ?? record.data ?? record);
}

export async function deleteUser(token: string, id: number): Promise<void> {
  await authorizedFetch<void>(`/users/${id}`, token, { method: "DELETE" });
}

export async function listSellers(token: string, page = 1): Promise<PaginatedResult<SellerRecord>> {
  const payload = await authorizedFetch<unknown>(`/sellers?page=${page}`, token);
  const rows = pickArray(payload, ["data", "sellers"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeSeller).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function createSeller(token: string, payload: UpsertSellerPayload): Promise<SellerRecord> {
  const data = await authorizedFetch<unknown>("/sellers", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeSeller(record.seller ?? record.data ?? record);
}

export async function updateSeller(
  token: string,
  id: number,
  payload: UpsertSellerPayload,
): Promise<SellerRecord> {
  const data = await authorizedFetch<unknown>(`/sellers/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeSeller(record.seller ?? record.data ?? record);
}

export async function deleteSeller(token: string, id: number): Promise<void> {
  await authorizedFetch<void>(`/sellers/${id}`, token, { method: "DELETE" });
}

// ============================================================================
// BRANDS
// ============================================================================

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

function normalizeBrand(raw: unknown): BrandRecord {
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
  type?: "spare_parts" | "products" | "bikes",
): Promise<PaginatedResult<BrandRecord>> {
  const query = new URLSearchParams({ page: String(page) });
  if (type) query.append("type", type);
  const payload = await authorizedFetch<unknown>(`/brands?${query}`, token);
  const rows = pickArray(payload, ["data", "brands"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeBrand).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function createBrand(token: string, payload: CreateBrandPayload): Promise<BrandRecord> {
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

// ============================================================================
// SPARE PART CATEGORIES
// ============================================================================

export type SparePartCategoryRecord = {
  id: number;
  name: string;
  created_at?: string;
};

export type CreateCategoryPayload = {
  name: string;
};

function normalizeSparePartCategory(raw: unknown): SparePartCategoryRecord {
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
  const payload = await authorizedFetch<unknown>(`/spare_part_categories?page=${page}`, token);
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
  const data = await authorizedFetch<unknown>(`/spare_part_categories/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeSparePartCategory(record.data ?? record);
}

export async function deleteSparePartCategory(token: string, id: number): Promise<void> {
  await authorizedFetch<void>(`/spare_part_categories/${id}`, token, { method: "DELETE" });
}

// ============================================================================
// PRODUCT CATEGORIES
// ============================================================================

export type ProductCategoryRecord = {
  id: number;
  name: string;
  created_at?: string;
};

function normalizeProductCategory(raw: unknown): ProductCategoryRecord {
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
  const payload = await authorizedFetch<unknown>(`/product_categories?page=${page}`, token);
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
  const data = await authorizedFetch<unknown>(`/product_categories/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeProductCategory(record.data ?? record);
}

export async function deleteProductCategory(token: string, id: number): Promise<void> {
  await authorizedFetch<void>(`/product_categories/${id}`, token, { method: "DELETE" });
}

// ============================================================================
// SPARE PARTS
// ============================================================================

export type SparePartRecord = {
  id: number;
  name: string;
  sku: string;
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
  created_at?: string;
};

export type CreateSparePartPayload = {
  name: string;
  sku: string;
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

function normalizeSparcePart(raw: unknown): SparePartRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    sku: toText(record.sku),
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
    in_stock?: boolean;
    low_stock?: boolean;
    universal?: boolean;
  },
): Promise<PaginatedResult<SparePartRecord>> {
  const query = new URLSearchParams({ page: String(page) });
  if (filters?.search) query.append("search", filters.search);
  if (filters?.category_id) query.append("category_id", String(filters.category_id));
  if (filters?.brand_id) query.append("brand_id", String(filters.brand_id));
  if (filters?.in_stock) query.append("in_stock", "true");
  if (filters?.low_stock) query.append("low_stock", "true");
  if (filters?.universal) query.append("universal", "true");

  const payload = await authorizedFetch<unknown>(`/spare_parts?${query}`, token);
  const rows = pickArray(payload, ["data", "spare_parts"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeSparcePart).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function createSparePart(token: string, payload: CreateSparePartPayload): Promise<SparePartRecord> {
  const data = await authorizedFetch<unknown>("/spare_parts", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeSparcePart(record.data ?? record);
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
  return normalizeSparcePart(record.data ?? record);
}

export async function deleteSparePart(token: string, id: number): Promise<void> {
  await authorizedFetch<void>(`/spare_parts/${id}`, token, { method: "DELETE" });
}

export async function getSparePart(token: string, id: number): Promise<SparePartRecord> {
  const data = await authorizedFetch<unknown>(`/spare_parts/${id}`, token);
  const record = asRecord(data);
  return normalizeSparcePart(record.data ?? record.spare_part ?? record);
}

// ============================================================================
// PRODUCTS
// ============================================================================

export type ProductRecord = {
  id: number;
  name: string;
  sku: string;
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

function normalizeProduct(raw: unknown): ProductRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    sku: toText(record.sku),
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
    in_stock?: boolean;
    low_stock?: boolean;
    universal?: boolean;
  },
): Promise<PaginatedResult<ProductRecord>> {
  const query = new URLSearchParams({ page: String(page) });
  if (filters?.search) query.append("search", filters.search);
  if (filters?.category_id) query.append("category_id", String(filters.category_id));
  if (filters?.brand_id) query.append("brand_id", String(filters.brand_id));
  if (filters?.in_stock) query.append("in_stock", "true");
  if (filters?.low_stock) query.append("low_stock", "true");
  if (filters?.universal) query.append("universal", "true");

  const payload = await authorizedFetch<unknown>(`/products?${query}`, token);
  const rows = pickArray(payload, ["data", "products"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeProduct).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function createProduct(token: string, payload: CreateProductPayload): Promise<ProductRecord> {
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

export async function getProduct(token: string, id: number): Promise<ProductRecord> {
  const data = await authorizedFetch<unknown>(`/products/${id}`, token);
  const record = asRecord(data);
  return normalizeProduct(record.data ?? record.product ?? record);
}

// ============================================================================
// MAINTENANCE SERVICE SECTORS
// ============================================================================

export type MaintenanceServiceSectorRecord = {
  id: number;
  name: string;
  created_at?: string;
};

export type CreateMaintenanceServiceSectorPayload = {
  name: string;
};

function normalizeMaintenanceServiceSector(raw: unknown): MaintenanceServiceSectorRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    created_at: toText(record.created_at) || undefined,
  };
}

export async function listMaintenanceServiceSectors(
  token: string,
  page = 1,
): Promise<PaginatedResult<MaintenanceServiceSectorRecord>> {
  const payload = await authorizedFetch<unknown>(`/maintenance_service_sectors?page=${page}`, token);
  const rows = pickArray(payload, ["data", "maintenance_service_sectors"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeMaintenanceServiceSector).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function createMaintenanceServiceSector(
  token: string,
  payload: CreateMaintenanceServiceSectorPayload,
): Promise<MaintenanceServiceSectorRecord> {
  const data = await authorizedFetch<unknown>("/maintenance_service_sectors", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeMaintenanceServiceSector(record.data ?? record);
}

export async function updateMaintenanceServiceSector(
  token: string,
  id: number,
  payload: CreateMaintenanceServiceSectorPayload,
): Promise<MaintenanceServiceSectorRecord> {
  const data = await authorizedFetch<unknown>(`/maintenance_service_sectors/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeMaintenanceServiceSector(record.data ?? record);
}

export async function deleteMaintenanceServiceSector(token: string, id: number): Promise<void> {
  await authorizedFetch<void>(`/maintenance_service_sectors/${id}`, token, { method: "DELETE" });
}

// ============================================================================
// MAINTENANCE SERVICES
// ============================================================================

export type MaintenanceServiceRecord = {
  id: number;
  name: string;
  currency_pricing: "EGP" | "USD";
  service_price: number;
  max_discount_type: "fixed" | "percentage";
  max_discount_value: number;
  maintenance_service_sector_id: number;
  created_at?: string;
};

export type CreateMaintenanceServicePayload = {
  name: string;
  currency_pricing: "EGP" | "USD";
  service_price: number;
  max_discount_type: "fixed" | "percentage";
  max_discount_value: number;
  maintenance_service_sector_id: number;
};

export type UpdateMaintenanceServicePayload = CreateMaintenanceServicePayload;

function normalizeMaintenanceService(raw: unknown): MaintenanceServiceRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    currency_pricing: toText(record.currency_pricing) as "EGP" | "USD",
    service_price: toNumber(record.service_price),
    max_discount_type: toText(record.max_discount_type) as "fixed" | "percentage",
    max_discount_value: toNumber(record.max_discount_value),
    maintenance_service_sector_id: toNumber(record.maintenance_service_sector_id),
    created_at: toText(record.created_at) || undefined,
  };
}

export async function listMaintenanceServices(
  token: string,
  page = 1,
  filters?: {
    search?: string;
    maintenance_service_sector_id?: number;
  },
): Promise<PaginatedResult<MaintenanceServiceRecord>> {
  const query = new URLSearchParams({ page: String(page) });
  if (filters?.search) query.append("search", filters.search);
  if (filters?.maintenance_service_sector_id) {
    query.append("maintenance_service_sector_id", String(filters.maintenance_service_sector_id));
  }

  const payload = await authorizedFetch<unknown>(`/maintenance_services?${query}`, token);
  const rows = pickArray(payload, ["data", "maintenance_services"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeMaintenanceService).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function createMaintenanceService(
  token: string,
  payload: CreateMaintenanceServicePayload,
): Promise<MaintenanceServiceRecord> {
  const data = await authorizedFetch<unknown>("/maintenance_services", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeMaintenanceService(record.data ?? record);
}

export async function updateMaintenanceService(
  token: string,
  id: number,
  payload: UpdateMaintenanceServicePayload,
): Promise<MaintenanceServiceRecord> {
  const data = await authorizedFetch<unknown>(`/maintenance_services/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeMaintenanceService(record.data ?? record);
}

export async function deleteMaintenanceService(token: string, id: number): Promise<void> {
  await authorizedFetch<void>(`/maintenance_services/${id}`, token, { method: "DELETE" });
}

export async function getMaintenanceService(token: string, id: number): Promise<MaintenanceServiceRecord> {
  const data = await authorizedFetch<unknown>(`/maintenance_services/${id}`, token);
  const record = asRecord(data);
  return normalizeMaintenanceService(record.data ?? record.maintenance_service ?? record);
}

// ============================================================================
// BIKE BLUEPRINTS
// ============================================================================

export type BikeBlueprintRecord = {
  id: number;
  brand_id: number;
  model: string;
  year: number;
  created_at?: string;
};

export type BlueprintSparePartRowRecord = {
  id: number;
  bike_blueprint_id: number;
  spare_part_id: number;
  created_at?: string;
  spare_part?: {
    id: number;
    name: string;
    sku: string;
    stock_quantity: number;
    sale_price: number;
    currency_pricing?: string;
    category?: {
      id: number;
      name: string;
    };
    brand?: {
      id: number;
      name: string;
    };
  };
};

export type CreateBikeBlueprintPayload = {
  brand_id: number;
  model: string;
  year: number;
};

function normalizeBlueprint(raw: unknown): BikeBlueprintRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    brand_id: toNumber(record.brand_id),
    model: toText(record.model),
    year: toNumber(record.year),
    created_at: toText(record.created_at) || undefined,
  };
}

function normalizeBlueprintSparePartRow(raw: unknown): BlueprintSparePartRowRecord {
  const record = asRecord(raw);
  const sparePart = asRecord(record.spare_part);
  const category = asRecord(sparePart.category);
  const brand = asRecord(sparePart.brand);

  return {
    id: toNumber(record.id),
    bike_blueprint_id: toNumber(record.bike_blueprint_id),
    spare_part_id: toNumber(record.spare_part_id),
    created_at: toText(record.created_at) || undefined,
    spare_part: sparePart && Object.keys(sparePart).length > 0
      ? {
          id: toNumber(sparePart.id),
          name: toText(sparePart.name),
          sku: toText(sparePart.sku),
          stock_quantity: toNumber(sparePart.stock_quantity),
          sale_price: toNumber(sparePart.sale_price),
          currency_pricing: toText(sparePart.currency_pricing) || undefined,
          category: category && Object.keys(category).length > 0
            ? {
                id: toNumber(category.id),
                name: toText(category.name),
              }
            : undefined,
          brand: brand && Object.keys(brand).length > 0
            ? {
                id: toNumber(brand.id),
                name: toText(brand.name),
              }
            : undefined,
        }
      : undefined,
  };
}

export async function listBikeBlueprints(
  token: string,
  page = 1,
  filters?: {
    search?: string;
    brand_id?: number;
  },
): Promise<PaginatedResult<BikeBlueprintRecord>> {
  const query = new URLSearchParams({ page: String(page) });
  if (filters?.search) query.append("search", filters.search);
  if (filters?.brand_id) query.append("brand_id", String(filters.brand_id));

  const payload = await authorizedFetch<unknown>(`/bike_blueprints?${query}`, token);
  const rows = pickArray(payload, ["data", "bike_blueprints"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeBlueprint).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function getBikeBlueprint(token: string, id: number): Promise<BikeBlueprintRecord> {
  const data = await authorizedFetch<unknown>(`/bike_blueprints/${id}`, token);
  const record = asRecord(data);
  return normalizeBlueprint(record.data ?? record.bike_blueprint ?? record);
}

export async function createBikeBlueprint(
  token: string,
  payload: CreateBikeBlueprintPayload,
): Promise<BikeBlueprintRecord> {
  const data = await authorizedFetch<unknown>("/bike_blueprints", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeBlueprint(record.data ?? record);
}

export async function updateBikeBlueprint(
  token: string,
  id: number,
  payload: CreateBikeBlueprintPayload,
): Promise<BikeBlueprintRecord> {
  const data = await authorizedFetch<unknown>(`/bike_blueprints/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeBlueprint(record.data ?? record);
}

export async function deleteBikeBlueprint(token: string, id: number): Promise<void> {
  await authorizedFetch<void>(`/bike_blueprints/${id}`, token, { method: "DELETE" });
}

// ============================================================================
// PAYMENT METHODS
// ============================================================================

export type PaymentMethodRecord = {
  id: number;
  name: string;
  created_at?: string;
};

export type CreatePaymentMethodPayload = {
  name: string;
};

function normalizePaymentMethod(raw: unknown): PaymentMethodRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    created_at: toText(record.created_at) || undefined,
  };
}

export async function listPaymentMethods(token: string, page = 1): Promise<PaginatedResult<PaymentMethodRecord>> {
  const payload = await authorizedFetch<unknown>(`/payment_methods?page=${page}`, token);
  const rows = pickArray(payload, ["data", "payment_methods"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizePaymentMethod).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function createPaymentMethod(
  token: string,
  payload: CreatePaymentMethodPayload,
): Promise<PaymentMethodRecord> {
  const data = await authorizedFetch<unknown>("/payment_methods", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizePaymentMethod(record.data ?? record);
}

export async function updatePaymentMethod(
  token: string,
  id: number,
  payload: CreatePaymentMethodPayload,
): Promise<PaymentMethodRecord> {
  const data = await authorizedFetch<unknown>(`/payment_methods/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizePaymentMethod(record.data ?? record);
}

export async function deletePaymentMethod(token: string, id: number): Promise<void> {
  await authorizedFetch<void>(`/payment_methods/${id}`, token, { method: "DELETE" });
}

// ============================================================================
// BIKES FOR SALE
// ============================================================================

export type BikeRecord = {
  id: number;
  bike_blueprint_id: number;
  currency_pricing: string;
  cost_price: number;
  sale_price: number;
  status: string;
  max_discount_type: string;
  max_discount_value: number;
  vin: string;
  mileage: number;
  notes?: string;
  created_at?: string;
};

export type CreateBikePayload = {
  bike_blueprint_id: number;
  currency_pricing: string;
  cost_price: number;
  sale_price: number;
  status: string;
  max_discount_type: string;
  max_discount_value: number;
  vin: string;
  mileage?: number;
  notes?: string;
};

export type UpdateBikePayload = CreateBikePayload;

function normalizeBike(raw: unknown): BikeRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    bike_blueprint_id: toNumber(record.bike_blueprint_id),
    currency_pricing: toText(record.currency_pricing),
    cost_price: toNumber(record.cost_price),
    sale_price: toNumber(record.sale_price),
    status: toText(record.status),
    max_discount_type: toText(record.max_discount_type),
    max_discount_value: toNumber(record.max_discount_value),
    vin: toText(record.vin),
    mileage: toNumber(record.mileage),
    notes: toText(record.notes) || undefined,
    created_at: toText(record.created_at) || undefined,
  };
}

export async function listBikes(
  token: string,
  page = 1,
  filters?: {
    search?: string;
    bike_blueprint_id?: number;
    status?: string;
  },
): Promise<PaginatedResult<BikeRecord>> {
  const query = new URLSearchParams({ page: String(page) });
  if (filters?.search) query.append("search", filters.search);
  if (filters?.bike_blueprint_id) query.append("bike_blueprint_id", String(filters.bike_blueprint_id));
  if (filters?.status) query.append("status", filters.status);

  const payload = await authorizedFetch<unknown>(`/bike_for_sale?${query}`, token);
  const rows = pickArray(payload, ["data", "bike_for_sale"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeBike).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function createBike(token: string, payload: CreateBikePayload): Promise<BikeRecord> {
  const data = await authorizedFetch<unknown>("/bike_for_sale", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeBike(record.data ?? record);
}

export async function updateBike(token: string, id: number, payload: UpdateBikePayload): Promise<BikeRecord> {
  const data = await authorizedFetch<unknown>(`/bike_for_sale/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeBike(record.data ?? record);
}

export async function deleteBike(token: string, id: number): Promise<void> {
  await authorizedFetch<void>(`/bike_for_sale/${id}`, token, { method: "DELETE" });
}

export async function getBike(token: string, id: number): Promise<BikeRecord> {
  const data = await authorizedFetch<unknown>(`/bike_for_sale/${id}`, token);
  const record = asRecord(data);
  return normalizeBike(record.data ?? record.bike ?? record);
}

// ============================================================================
// BIKE BLUEPRINT SPARE PARTS (Relationship)
// ============================================================================

export async function listBikeBlueprintSpareParts(
  token: string,
  blueprintId: number,
  page = 1,
  filters?: {
    per_page?: number;
    category_id?: number;
    brand_id?: number;
    search?: string;
  },
): Promise<PaginatedResult<BlueprintSparePartRowRecord>> {
  const query = new URLSearchParams({ page: String(page) });
  if (filters?.per_page) query.append("per_page", String(filters.per_page));
  if (filters?.category_id) query.append("category_id", String(filters.category_id));
  if (filters?.brand_id) query.append("brand_id", String(filters.brand_id));
  if (filters?.search) query.append("search", filters.search);

  const payload = await authorizedFetch<unknown>(`/bike_blueprints/${blueprintId}/spare_parts?${query}`, token);
  const rows = pickArray(payload, ["data", "spare_parts"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeBlueprintSparePartRow).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function assignSparePartToBikeBlueprint(
  token: string,
  blueprintId: number,
  payload:
    | { spare_part_id: number }
    | { spare_part_ids: number[] }
    | { spare_part_data: CreateSparePartPayload },
): Promise<unknown> {
  return authorizedFetch<unknown>(`/bike_blueprints/${blueprintId}/spare_parts`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function removeSparePartFromBikeBlueprint(
  token: string,
  blueprintId: number,
  sparePartId: number,
): Promise<void> {
  await authorizedFetch<void>(`/bike_blueprints/${blueprintId}/spare_parts/${sparePartId}`, token, {
    method: "DELETE",
  });
}

export async function getSparePartBlueprints(
  token: string,
  sparePartId: number,
): Promise<number[]> {
  try {
    // Get all blueprints
    const blueprintsResult = await listBikeBlueprints(token, 1);
    const allBlueprints = blueprintsResult.items;

    // Query each blueprint to see if it has this spare part
    const linkedBlueprintIds: number[] = [];

    for (const blueprint of allBlueprints) {
      const sparePartsResult = await listBikeBlueprintSpareParts(token, blueprint.id, 1, {
        per_page: 1000,
      });

      // Check if this spare part is in the blueprint's spare parts
      if (sparePartsResult.items.some((item) => item.spare_part_id === sparePartId)) {
        linkedBlueprintIds.push(blueprint.id);
      }
    }

    return linkedBlueprintIds;
  } catch (err) {
    console.error("Failed to fetch spare part blueprints:", err);
    return [];
  }
}

export async function assignBlueprintsToSparePart(
  token: string,
  sparePartId: number,
  blueprintIds: number[],
): Promise<void> {
  // Link a spare part to multiple blueprints
  // For each blueprint, call the blueprint's spare parts endpoint
  for (const blueprintId of blueprintIds) {
    await assignSparePartToBikeBlueprint(token, blueprintId, {
      spare_part_id: sparePartId,
    });
  }
}

export async function removeBlueprintFromSparePart(
  token: string,
  sparePartId: number,
  blueprintId: number,
): Promise<void> {
  // Unlink a spare part from a blueprint
  await removeSparePartFromBikeBlueprint(token, blueprintId, sparePartId);
}
