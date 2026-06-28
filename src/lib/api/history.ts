import { getApiUrl } from "@/lib/config";
import { ApiError } from "@/lib/auth-api";
import {
  asRecord,
  authorizedFetch,
  buildQuery,
  parseErrorMessage,
  parsePagination,
  pickArray,
  toNumber,
  toText,
  type PaginatedResult,
} from "./core";

export type HistoryUser = {
  id: number;
  name: string;
  email: string;
};

export type HistoryChangeEntry = {
  field: string;
  label: string;
  before: string;
  after: string;
};

export type HistoryRecord = {
  id: number;
  action: "create" | "update" | "delete" | string;
  created_at: string;
  ip_address?: string;
  entity_type?: string;
  entity_label: string;
  model_type: string;
  model_id: number;
  entity_path?: string;
  summary: string[];
  changes: HistoryChangeEntry[];
  changes_count: number;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  user: HistoryUser | null;
};

export type HistorySummary = {
  total: number;
  creates: number;
  updates: number;
  deletes: number;
};

export type HistoryEntityOption = {
  key: string;
  label: string;
};

export type HistoryFilters = {
  entity_type?: string;
  action?: string;
  user_id?: number;
  model_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  per_page?: number;
};

export type HistoryListResult = PaginatedResult<HistoryRecord> & {
  summary: HistorySummary;
  total: number;
  entities: HistoryEntityOption[];
};

export const HISTORY_ENTITY_OPTIONS: HistoryEntityOption[] = [
  { key: "ticket", label: "Ticket" },
  { key: "ticket_item", label: "Ticket Item" },
  { key: "ticket_task", label: "Ticket Task" },
  { key: "sale", label: "Sale" },
  { key: "sale_item", label: "Sale Item" },
  { key: "customer", label: "Customer" },
  { key: "customer_bike", label: "Customer Bike" },
  { key: "customer_sale", label: "Customer Sale" },
  { key: "delivery", label: "Delivery" },
  { key: "product", label: "Product" },
  { key: "spare_part", label: "Spare Part" },
  { key: "product_category", label: "Product Category" },
  { key: "spare_part_category", label: "Spare Part Category" },
  { key: "brand", label: "Brand" },
  { key: "bike_for_sale", label: "Bike For Sale" },
  { key: "bike_blueprint", label: "Bike Blueprint" },
  { key: "maintenance_service", label: "Maintenance Service" },
  { key: "maintenance_service_sector", label: "Service Sector" },
  { key: "payment_method", label: "Payment Method" },
  { key: "seller", label: "Seller" },
  { key: "user", label: "User" },
  { key: "setting", label: "Setting" },
];

function normalizeHistoryUser(raw: unknown): HistoryUser | null {
  if (!raw || typeof raw !== "object") return null;
  const record = asRecord(raw);
  const id = toNumber(record.id);
  if (id <= 0) return null;
  return {
    id,
    name: toText(record.name) || "Unknown user",
    email: toText(record.email),
  };
}

function normalizeHistoryChange(raw: unknown): HistoryChangeEntry | null {
  const record = asRecord(raw);
  const field = toText(record.field);
  if (!field) return null;
  return {
    field,
    label: toText(record.label) || field,
    before: toText(record.before) || "—",
    after: toText(record.after) || "—",
  };
}

export function normalizeHistoryRecord(raw: unknown): HistoryRecord | null {
  const record = asRecord(raw);
  const id = toNumber(record.id);
  if (id <= 0) return null;

  const summaryRaw = record.summary;
  const summary = Array.isArray(summaryRaw)
    ? summaryRaw.map((line) => toText(line)).filter(Boolean)
    : [];

  const changesRaw = record.changes;
  const changes = Array.isArray(changesRaw)
    ? changesRaw
        .map(normalizeHistoryChange)
        .filter((item): item is HistoryChangeEntry => item !== null)
    : [];

  const beforeRaw = record.before;
  const afterRaw = record.after;

  return {
    id,
    action: toText(record.action) || "update",
    created_at: toText(record.created_at),
    ip_address: toText(record.ip_address) || undefined,
    entity_type: toText(record.entity_type) || undefined,
    entity_label: toText(record.entity_label) || "Record",
    model_type: toText(record.model_type),
    model_id: toNumber(record.model_id),
    entity_path: toText(record.entity_path) || undefined,
    summary,
    changes,
    changes_count: toNumber(record.changes_count) || changes.length,
    before:
      beforeRaw && typeof beforeRaw === "object"
        ? (beforeRaw as Record<string, unknown>)
        : null,
    after:
      afterRaw && typeof afterRaw === "object"
        ? (afterRaw as Record<string, unknown>)
        : null,
    user: normalizeHistoryUser(record.user),
  };
}

function normalizeSummary(raw: unknown): HistorySummary {
  const record = asRecord(raw);
  return {
    total: toNumber(record.total),
    creates: toNumber(record.creates),
    updates: toNumber(record.updates),
    deletes: toNumber(record.deletes),
  };
}

function normalizeEntityOptions(raw: unknown): HistoryEntityOption[] {
  if (!Array.isArray(raw)) return HISTORY_ENTITY_OPTIONS;
  return raw
    .map((item) => {
      const record = asRecord(item);
      const key = toText(record.key);
      const label = toText(record.label);
      if (!key || !label) return null;
      return { key, label };
    })
    .filter((item): item is HistoryEntityOption => item !== null);
}

export async function listHistory(
  token: string,
  page = 1,
  filters?: HistoryFilters,
): Promise<HistoryListResult> {
  const query = buildQuery({
    page,
    per_page: filters?.per_page ?? 20,
    entity_type: filters?.entity_type,
    action: filters?.action,
    user_id: filters?.user_id,
    model_id: filters?.model_id,
    date_from: filters?.date_from,
    date_to: filters?.date_to,
    search: filters?.search,
  });

  const payload = await authorizedFetch<unknown>(`/history?${query}`, token);
  const data = asRecord(payload);
  const rows = pickArray(payload, ["data"]);
  const meta = parsePagination(payload);

  return {
    items: rows
      .map(normalizeHistoryRecord)
      .filter((item): item is HistoryRecord => item !== null),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
    total:
      toNumber(asRecord(data.meta).total) ||
      toNumber(data.total) ||
      rows.length,
    summary: normalizeSummary(data.summary),
    entities: normalizeEntityOptions(data.entities),
  };
}

export async function listSaleHistory(
  token: string,
  saleId: number,
  page = 1,
  perPage = 50,
): Promise<PaginatedResult<HistoryRecord>> {
  const query = buildQuery({ page, per_page: perPage });
  const payload = await authorizedFetch<unknown>(
    `/sales/${saleId}/history?${query}`,
    token,
  );
  const rows = pickArray(payload, ["data"]);
  const meta = parsePagination(payload);

  return {
    items: rows
      .map(normalizeHistoryRecord)
      .filter((item): item is HistoryRecord => item !== null),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}
  token: string,
  filters?: HistoryFilters,
  columns?: string,
): Promise<Blob> {
  const query = buildQuery({
    per_page: 50,
    entity_type: filters?.entity_type,
    action: filters?.action,
    user_id: filters?.user_id,
    model_id: filters?.model_id,
    date_from: filters?.date_from,
    date_to: filters?.date_to,
    search: filters?.search,
    columns,
  });

  const response = await fetch(getApiUrl(`/history/export?${query}`), {
    headers: {
      Accept: "text/csv",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  return response.blob();
}
