// === MAINTENANCE ===
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
import type { PricingCurrency } from "@/lib/currencies";
import { toPricingCurrency } from "@/lib/currencies";

// --- MAINTENANCE SERVICE SECTORS ---
export type MaintenanceServiceSectorRecord = {
  id: number;
  name: string;
  created_at?: string;
};

export type CreateMaintenanceServiceSectorPayload = {
  name: string;
};

export function normalizeMaintenanceServiceSector(
  raw: unknown,
): MaintenanceServiceSectorRecord {
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
  const query = buildQuery({ page });
  const payload = await authorizedFetch<unknown>(
    `/maintenance_service_sectors?${query}`,
    token,
  );
  const rows = pickArray(payload, ["data", "maintenance_service_sectors"]);
  const meta = parsePagination(payload);
  return {
    items: rows
      .map(normalizeMaintenanceServiceSector)
      .filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function createMaintenanceServiceSector(
  token: string,
  payload: CreateMaintenanceServiceSectorPayload,
): Promise<MaintenanceServiceSectorRecord> {
  const data = await authorizedFetch<unknown>(
    "/maintenance_service_sectors",
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const record = asRecord(data);
  return normalizeMaintenanceServiceSector(record.data ?? record);
}

export async function updateMaintenanceServiceSector(
  token: string,
  id: number,
  payload: CreateMaintenanceServiceSectorPayload,
): Promise<MaintenanceServiceSectorRecord> {
  const data = await authorizedFetch<unknown>(
    `/maintenance_service_sectors/${id}`,
    token,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const record = asRecord(data);
  return normalizeMaintenanceServiceSector(record.data ?? record);
}

export async function deleteMaintenanceServiceSector(
  token: string,
  id: number,
): Promise<void> {
  await authorizedFetch<void>(`/maintenance_service_sectors/${id}`, token, {
    method: "DELETE",
  });
}

// --- MAINTENANCE SERVICES ---
export type MaintenanceServiceRecord = {
  id: number;
  name: string;
  sale_currency: PricingCurrency;
  service_price: number;
  max_discount_type: "fixed" | "percentage";
  max_discount_value: number;
  maintenance_service_sector_id: number;
  created_at?: string;
};

export type CreateMaintenanceServicePayload = {
  name: string;
  sale_currency: PricingCurrency;
  service_price: number;
  max_discount_type: "fixed" | "percentage";
  max_discount_value: number;
  maintenance_service_sector_id: number;
};

export type UpdateMaintenanceServicePayload = CreateMaintenanceServicePayload;

export function normalizeMaintenanceService(raw: unknown): MaintenanceServiceRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    sale_currency: toPricingCurrency(record.sale_currency),
    service_price: toNumber(record.service_price),
    max_discount_type: toText(record.max_discount_type) as
      | "fixed"
      | "percentage",
    max_discount_value: toNumber(record.max_discount_value),
    maintenance_service_sector_id: toNumber(
      record.maintenance_service_sector_id,
    ),
    created_at: toText(record.created_at) || undefined,
  };
}

export async function listMaintenanceServices(
  token: string,
  page = 1,
  filters?: {
    search?: string;
    sector_id?: number;
    price_range?: string;
    currency?: string;
    per_page?: number;
  },
): Promise<PaginatedResult<MaintenanceServiceRecord>> {
  const query = buildQuery({
    page,
    per_page: filters?.per_page,
    search: filters?.search,
    sector_id: filters?.sector_id,
    price_range: filters?.price_range,
    currency: filters?.currency,
  });

  const payload = await authorizedFetch<unknown>(
    `/maintenance_services?${query}`,
    token,
  );
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
  const data = await authorizedFetch<unknown>(
    `/maintenance_services/${id}`,
    token,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const record = asRecord(data);
  return normalizeMaintenanceService(record.data ?? record);
}

export type MaintenanceServiceQuickEditFields = Partial<
  Pick<MaintenanceServiceRecord, "name" | "service_price">
>;

export async function patchMaintenanceService(
  token: string,
  id: number,
  payload: MaintenanceServiceQuickEditFields,
): Promise<MaintenanceServiceRecord> {
  const data = await authorizedFetch<unknown>(
    `/maintenance_services/${id}`,
    token,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const record = asRecord(data);
  return normalizeMaintenanceService(record.data ?? record);
}

export async function deleteMaintenanceService(
  token: string,
  id: number,
): Promise<void> {
  await authorizedFetch<void>(`/maintenance_services/${id}`, token, {
    method: "DELETE",
  });
}

export async function getMaintenanceService(
  token: string,
  id: number,
): Promise<MaintenanceServiceRecord> {
  const data = await authorizedFetch<unknown>(
    `/maintenance_services/${id}`,
    token,
  );
  const record = asRecord(data);
  return normalizeMaintenanceService(
    record.data ?? record.maintenance_service ?? record,
  );
}
