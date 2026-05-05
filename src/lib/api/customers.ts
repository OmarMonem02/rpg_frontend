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
  email?: string;
  phone?: string;
  address?: string;
  created_at?: string;
};

export function normalizeCustomer(raw: unknown): CustomerRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    email: toText(record.email) || undefined,
    phone: toText(record.phone) || undefined,
    address: toText(record.address) || undefined,
    created_at: toText(record.created_at) || undefined,
  };
}

export async function listCustomers(
  token: string,
  page = 1,
  filters?: {
    search?: string;
  },
): Promise<PaginatedResult<CustomerRecord>> {
  const query = buildQuery({
    page,
    search: filters?.search,
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
  const data = await authorizedFetch<unknown>(`/customers/${id}`, token);
  const record = asRecord(data);
  return normalizeCustomer(record.data ?? record.customer ?? record);
}

export type CreateCustomerPayload = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
};

export async function createCustomer(
  token: string,
  payload: CreateCustomerPayload,
): Promise<CustomerRecord> {
  const data = await authorizedFetch<unknown>("/customers", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeCustomer(record.data ?? record.customer ?? record);
}
