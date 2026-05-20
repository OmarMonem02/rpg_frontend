// === CUSTOMERS ===
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

export type CustomerRecord = {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  how_did_you_know_us?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export function normalizeCustomer(raw: unknown): CustomerRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    phone: toText(record.phone) || undefined,
    address: toText(record.address) || undefined,
    how_did_you_know_us: toText(record.how_did_you_know_us) || undefined,
    notes: toText(record.notes) || undefined,
    created_at: toText(record.created_at) || undefined,
    updated_at: toText(record.updated_at) || undefined,
  };
}

export async function listCustomers(
  token: string,
  page = 1,
  filters?: {
    search?: string;
    per_page?: number;
  },
): Promise<PaginatedResult<CustomerRecord>> {
  const query = buildQuery({
    page,
    search: filters?.search,
    per_page: filters?.per_page,
  });

  const payload = await authorizedFetch<unknown>(`/customers?${query}`, token);
  const rows = pickArray(payload, ["data", "customers"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeCustomer).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function getCustomer(
  token: string,
  id: number,
): Promise<CustomerRecord> {
  const { getCustomerWorkspace } = await import("./customer-workspace");
  const workspace = await getCustomerWorkspace(token, id);
  return workspace.customer;
}

export type CreateCustomerPayload = {
  name: string;
  phone: string;
  address?: string;
  how_did_you_know_us?: string;
  notes?: string;
};

export async function createCustomer(
  token: string,
  payload: CreateCustomerPayload,
): Promise<CustomerRecord> {
  const body: Record<string, string> = {
    name: payload.name.trim(),
    phone: payload.phone.trim(),
  };
  if (payload.address?.trim()) body.address = payload.address.trim();
  if (payload.how_did_you_know_us?.trim()) {
    body.how_did_you_know_us = payload.how_did_you_know_us.trim();
  }
  if (payload.notes?.trim()) body.notes = payload.notes.trim();

  const data = await authorizedFetch<unknown>("/customers", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const record = asRecord(data);
  return normalizeCustomer(record.data ?? record.customer ?? record);
}

export async function deleteCustomer(token: string, id: number): Promise<void> {
  await authorizedFetch<void>(`/customers/${id}`, token, {
    method: "DELETE",
  });
}

export type CreateCustomerBikePayload = {
  bike_blueprint_id: number;
  vin?: string;
  mileage?: number;
  image?: string;
  image_public_id?: string;
  notes?: string;
};

export async function createCustomerBike(
  token: string,
  customerId: number,
  payload: CreateCustomerBikePayload,
): Promise<import("./customer-workspace").CustomerBikeRecord> {
  const { normalizeCustomerBike } = await import("./customer-workspace");
  const body: Record<string, string | number> = {
    bike_blueprint_id: payload.bike_blueprint_id,
  };
  if (payload.vin?.trim()) body.vin = payload.vin.trim();
  if (payload.mileage != null && !Number.isNaN(payload.mileage)) {
    body.mileage = payload.mileage;
  }
  if (payload.image?.trim()) body.image = payload.image.trim();
  if (payload.image_public_id?.trim()) {
    body.image_public_id = payload.image_public_id.trim();
  }
  if (payload.notes?.trim()) body.notes = payload.notes.trim();

  const data = await authorizedFetch<unknown>(
    `/customers/${customerId}/bikes`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const record = asRecord(data);
  return normalizeCustomerBike(record.data ?? record);
}
