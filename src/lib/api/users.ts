// === USERS ===
import {
  normalizePermissionMatrix,
  normalizePermissionMetadata,
  normalizeOptionalPermissionMatrix,
  type PermissionMetadata,
  type PermissionMatrix,
} from "@/lib/permissions";
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

export type UserRecord = {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions?: PermissionMatrix;
  role_permissions?: PermissionMatrix;
  permission_source?: "custom" | "role";
  created_at?: string;
};

export type SellerRecord = {
  id: number;
  name: string;
  phone: string;
  commission_rate: number;
  completed_sales_count: number;
  commission_base: number;
  commission_amount: number;
  created_at?: string;
  updated_at?: string;
};

export type SellerSummary = {
  totalSellers: number;
  commissionedSellers: number;
  highCommissionSellers: number;
  contactReadySellers: number;
  completedSalesCount: number;
  commissionBase: number;
  commissionAmount: number;
  averageCommissionRate: number;
};

export type SellerListFilters = {
  search?: string;
  sort?: string;
  per_page?: number;
};

export type SellerListResult = PaginatedResult<SellerRecord> & {
  total: number;
  perPage: number;
  summary?: SellerSummary;
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

export type UpdateUserPermissionsPayload = {
  permissions: PermissionMatrix;
};

export type UpsertSellerPayload = {
  name: string;
  commission_rate: number;
  phone: string;
};

export function normalizeUser(raw: unknown): UserRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    email: toText(record.email),
    role: toText(record.role),
    permissions: normalizeOptionalPermissionMatrix(record.permissions),
    role_permissions: normalizeOptionalPermissionMatrix(record.role_permissions),
    permission_source:
      record.permission_source === "custom" || record.permission_source === "role"
        ? record.permission_source
        : undefined,
    created_at: toText(record.created_at) || undefined,
  };
}

export function normalizeSeller(raw: unknown): SellerRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    phone: toText(record.phone),
    commission_rate: toNumber(record.commission_rate),
    completed_sales_count: toNumber(record.completed_sales_count),
    commission_base: toNumber(record.commission_base),
    commission_amount: toNumber(record.commission_amount),
    created_at: toText(record.created_at) || undefined,
    updated_at: toText(record.updated_at) || undefined,
  };
}

export function normalizeSellerSummary(raw: unknown): SellerSummary | undefined {
  const record = asRecord(raw);
  if (Object.keys(record).length === 0) return undefined;

  return {
    totalSellers: toNumber(record.total_sellers),
    commissionedSellers: toNumber(record.commissioned_sellers),
    highCommissionSellers: toNumber(record.high_commission_sellers),
    contactReadySellers: toNumber(record.contact_ready_sellers),
    completedSalesCount: toNumber(record.completed_sales_count),
    commissionBase: toNumber(record.commission_base),
    commissionAmount: toNumber(record.commission_amount),
    averageCommissionRate: toNumber(record.average_commission_rate),
  };
}

export async function listUsers(
  token: string,
  page = 1,
): Promise<PaginatedResult<UserRecord>> {
  const query = buildQuery({ page });
  const payload = await authorizedFetch<unknown>(`/users?${query}`, token);
  const rows = pickArray(payload, ["data", "users"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeUser).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function createUser(
  token: string,
  payload: CreateUserPayload,
): Promise<UserRecord> {
  const data = await authorizedFetch<unknown>("/users", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeUser(record.user ?? record.data ?? record);
}

export async function getUser(
  token: string,
  id: number,
): Promise<UserRecord> {
  const data = await authorizedFetch<unknown>(`/users/${id}`, token);
  const record = asRecord(data);
  return normalizeUser(record.user ?? record.data ?? record);
}

export async function updateUser(
  token: string,
  id: number,
  payload: UpdateUserPayload,
): Promise<UserRecord> {
  const data = await authorizedFetch<unknown>(`/users/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeUser(record.user ?? record.data ?? record);
}

export async function updateUserPermissions(
  token: string,
  id: number,
  permissions: PermissionMatrix,
): Promise<UserRecord> {
  const normalizedPermissions = normalizePermissionMatrix(permissions);
  const data = await authorizedFetch<unknown>(`/users/${id}/permissions`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permissions: normalizedPermissions }),
  });
  const record = asRecord(data);
  return normalizeUser(record.user ?? record.data ?? record);
}

export async function getPermissionMetadata(
  token: string,
): Promise<PermissionMetadata> {
  const data = await authorizedFetch<unknown>("/permissions/meta", token);
  return normalizePermissionMetadata(data);
}

export async function deleteUser(token: string, id: number): Promise<void> {
  await authorizedFetch<void>(`/users/${id}`, token, { method: "DELETE" });
}

export async function listSellers(
  token: string,
  page = 1,
  filters?: SellerListFilters,
): Promise<SellerListResult> {
  const query = buildQuery({
    page,
    search: filters?.search,
    sort: filters?.sort,
    per_page: filters?.per_page,
  });
  const payload = await authorizedFetch<unknown>(
    `/sellers?${query}`,
    token,
  );
  const rows = pickArray(payload, ["data", "sellers"]);
  const meta = parsePagination(payload);
  const record = asRecord(payload);
  return {
    items: rows.map(normalizeSeller).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
    total: toNumber(record.total),
    perPage: toNumber(record.per_page),
    summary: normalizeSellerSummary(record.summary),
  };
}

export async function createSeller(
  token: string,
  payload: UpsertSellerPayload,
): Promise<SellerRecord> {
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
