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
    const json = (await response.json()) as ValidationErrorResponse;
    if (json.errors) {
      const firstError = Object.values(json.errors)[0]?.[0];
      if (firstError) return firstError;
    }
    if (json.message) return json.message;
  } catch {
    // Intentionally ignored; fallback message is used below.
  }

  if (response.status === 401) return "Your session expired. Please log in again.";
  if (response.status === 422) return "Please review your form inputs and try again.";
  return "Request failed. Please try again.";
}

async function authorizedFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
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
