// === BIKES & BLUEPRINTS ===
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
import type { CreateSparePartPayload } from "./inventory";

// --- BIKE BLUEPRINTS ---
export type BikeBlueprintRecord = {
  id: number;
  brand_id: number;
  model: string;
  year: number;
  created_at?: string;
  brand?: {
    id: number;
    name: string;
  };
};

export type CreateBikeBlueprintPayload = {
  brand_id: number;
  model: string;
  year: number;
};

export type UpdateBikeBlueprintPayload = CreateBikeBlueprintPayload;

export function normalizeBikeBlueprint(raw: unknown): BikeBlueprintRecord {
  const record = asRecord(raw);
  const brand = asRecord(record.brand);
  const brandId = toNumber(brand.id);
  return {
    id: toNumber(record.id),
    brand_id: toNumber(record.brand_id),
    model: toText(record.model),
    year: toNumber(record.year),
    created_at: toText(record.created_at) || undefined,
    brand:
      brandId > 0
        ? { id: brandId, name: toText(brand.name) }
        : undefined,
  };
}

export async function listBikeBlueprints(
  token: string,
  page = 1,
  filters?: {
    search?: string;
    brand?: string;
    model?: string;
    year?: number;
    brand_id?: number;
    price_range?: string;
    currency?: string;
  },
): Promise<PaginatedResult<BikeBlueprintRecord>> {
  const query = buildQuery({
    page,
    search: filters?.search,
    brand: filters?.brand,
    model: filters?.model,
    year: filters?.year,
    brand_id: filters?.brand_id,
    price_range: filters?.price_range,
    currency: filters?.currency,
  });

  const payload = await authorizedFetch<unknown>(
    `/bike_blueprints?${query}`,
    token,
  );
  const rows = pickArray(payload, ["data", "bike_blueprints"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeBikeBlueprint).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function getBikeBlueprint(
  token: string,
  id: number,
): Promise<BikeBlueprintRecord> {
  const data = await authorizedFetch<unknown>(`/bike_blueprints/${id}`, token);
  const record = asRecord(data);
  return normalizeBikeBlueprint(record.data ?? record.bike_blueprint ?? record);
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
  return normalizeBikeBlueprint(record.data ?? record);
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
  return normalizeBikeBlueprint(record.data ?? record);
}

export async function deleteBikeBlueprint(
  token: string,
  id: number,
): Promise<void> {
  await authorizedFetch<void>(`/bike_blueprints/${id}`, token, {
    method: "DELETE",
  });
}

/** Options for cascading spare-part compatibility filters (matches Laravel JSON shape). */
export type BikeBlueprintFilterModelOption = {
  value: string;
  label: string;
};

export type BikeBlueprintFilterYearOption = {
  value: number;
  label: string;
};

/**
 * GET /api/bike_blueprints/filter/models — distinct blueprint models for a bike brand.
 */
export async function listBikeBlueprintFilterModels(
  token: string,
  brandId: number,
): Promise<BikeBlueprintFilterModelOption[]> {
  const query = buildQuery({ brand_id: brandId });
  const data = await authorizedFetch<unknown>(
    `/bike_blueprints/filter/models?${query}`,
    token,
  );
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    const r = asRecord(row);
    const value = toText(r.value) || toText(r.label);
    const label = toText(r.label) || value;
    return { value, label };
  });
}

/**
 * GET /api/bike_blueprints/filter/years — distinct years for brand + exact model.
 */
export async function listBikeBlueprintFilterYears(
  token: string,
  brandId: number,
  model: string,
): Promise<BikeBlueprintFilterYearOption[]> {
  const query = buildQuery({ brand_id: brandId, model });
  const data = await authorizedFetch<unknown>(
    `/bike_blueprints/filter/years?${query}`,
    token,
  );
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    const r = asRecord(row);
    return {
      value: toNumber(r.value),
      label: toText(r.label) || String(toNumber(r.value)),
    };
  });
}

// --- BIKES FOR SALE ---
export type BikeRecord = {
  id: number;
  bike_blueprint_id: number;
  image?: string;
  image_public_id?: string;
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
  image?: string;
  image_public_id?: string;
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

export function normalizeBike(raw: unknown): BikeRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    bike_blueprint_id: toNumber(record.bike_blueprint_id),
    image: toText(record.image) || undefined,
    image_public_id: toText(record.image_public_id) || undefined,
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
    blueprint_id?: number;
    brand_id?: number;
    status?: string;
    price_range?: string;
    currency?: string;
  },
): Promise<PaginatedResult<BikeRecord>> {
  const query = buildQuery({
    page,
    search: filters?.search,
    blueprint_id: filters?.blueprint_id,
    brand_id: filters?.brand_id,
    status: filters?.status,
    price_range: filters?.price_range,
    currency: filters?.currency,
  });

  const payload = await authorizedFetch<unknown>(
    `/bike_for_sale?${query}`,
    token,
  );
  const rows = pickArray(payload, ["data", "bike_for_sale"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeBike).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function createBike(
  token: string,
  payload: CreateBikePayload,
): Promise<BikeRecord> {
  const data = await authorizedFetch<unknown>("/bike_for_sale", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeBike(record.data ?? record);
}

export async function updateBike(
  token: string,
  id: number,
  payload: UpdateBikePayload,
): Promise<BikeRecord> {
  const data = await authorizedFetch<unknown>(`/bike_for_sale/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeBike(record.data ?? record);
}

export type BikeQuickEditFields = Partial<
  Pick<BikeRecord, "cost_price" | "sale_price" | "mileage">
>;

export async function patchBike(
  token: string,
  id: number,
  payload: BikeQuickEditFields,
): Promise<BikeRecord> {
  const data = await authorizedFetch<unknown>(`/bike_for_sale/${id}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeBike(record.data ?? record);
}

export async function deleteBike(token: string, id: number): Promise<void> {
  await authorizedFetch<void>(`/bike_for_sale/${id}`, token, {
    method: "DELETE",
  });
}

export async function getBike(token: string, id: number): Promise<BikeRecord> {
  const data = await authorizedFetch<unknown>(`/bike_for_sale/${id}`, token);
  const record = asRecord(data);
  return normalizeBike(record.data ?? record.bike ?? record);
}

export async function listBikeForSale(
  token: string,
  page = 1,
  filters?: {
    search?: string;
    brand_id?: number;
    blueprint_id?: number;
    status?: string;
    price_range?: string;
    currency?: string;
  },
): Promise<PaginatedResult<BikeRecord>> {
  return listBikes(token, page, filters);
}

// --- BIKE BLUEPRINT SPARE PARTS (Relationship) ---
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

export function normalizeBlueprintSparePartRow(
  raw: unknown,
): BlueprintSparePartRowRecord {
  const record = asRecord(raw);
  const sparePart = asRecord(record.spare_part);
  const category = asRecord(sparePart.category);
  const brand = asRecord(sparePart.brand);

  return {
    id: toNumber(record.id),
    bike_blueprint_id: toNumber(record.bike_blueprint_id),
    spare_part_id: toNumber(record.spare_part_id),
    created_at: toText(record.created_at) || undefined,
    spare_part:
      sparePart && Object.keys(sparePart).length > 0
        ? {
            id: toNumber(sparePart.id),
            name: toText(sparePart.name),
            sku: toText(sparePart.sku),
            stock_quantity: toNumber(sparePart.stock_quantity),
            sale_price: toNumber(sparePart.sale_price),
            currency_pricing: toText(sparePart.currency_pricing) || undefined,
            category:
              category && Object.keys(category).length > 0
                ? {
                    id: toNumber(category.id),
                    name: toText(category.name),
                  }
                : undefined,
            brand:
              brand && Object.keys(brand).length > 0
                ? {
                    id: toNumber(brand.id),
                    name: toText(brand.name),
                  }
                : undefined,
          }
        : undefined,
  };
}

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
  const query = buildQuery({
    page,
    per_page: filters?.per_page,
    category_id: filters?.category_id,
    brand_id: filters?.brand_id,
    search: filters?.search,
  });

  const payload = await authorizedFetch<unknown>(
    `/bike_blueprints/${blueprintId}/spare_parts?${query}`,
    token,
  );
  const rows = pickArray(payload, ["data", "spare_parts"]);
  const meta = parsePagination(payload);
  return {
    items: rows
      .map(normalizeBlueprintSparePartRow)
      .filter((item) => item.id > 0),
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
  return authorizedFetch<unknown>(
    `/bike_blueprints/${blueprintId}/spare_parts`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function removeSparePartFromBikeBlueprint(
  token: string,
  blueprintId: number,
  sparePartId: number,
): Promise<void> {
  await authorizedFetch<void>(
    `/bike_blueprints/${blueprintId}/spare_parts/${sparePartId}`,
    token,
    { method: "DELETE" },
  );
}

export async function getSparePartBlueprints(
  token: string,
  sparePartId: number,
): Promise<number[]> {
  const payload = await authorizedFetch<unknown>(
    `/spare_parts/${sparePartId}/bike_blueprints`,
    token,
  );
  const rows = pickArray(payload, ["data", "bike_blueprints"]);
  return rows
    .map((item: unknown) => toNumber(asRecord(item).id))
    .filter((id) => id > 0);
}

export async function assignBlueprintsToSparePart(
  token: string,
  sparePartId: number,
  blueprintIds: number[],
): Promise<void> {
  await authorizedFetch<void>(
    `/spare_parts/${sparePartId}/bike_blueprints`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bike_blueprint_ids: blueprintIds }),
    },
  );
}

export async function removeBlueprintFromSparePart(
  token: string,
  sparePartId: number,
  blueprintId: number,
): Promise<void> {
  await authorizedFetch<void>(
    `/spare_parts/${sparePartId}/bike_blueprints/${blueprintId}`,
    token,
    { method: "DELETE" },
  );
}
