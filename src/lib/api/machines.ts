"use client";

import { ApiError } from "@/lib/auth-api";
import { getApiUrl } from "@/lib/config";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  if (value && typeof value === "object") return value as UnknownRecord;
  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      message?: string;
      errors?: Record<string, string[]>;
    };

    if (payload.errors) {
      return Object.entries(payload.errors)
        .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
        .join("; ");
    }

    if (payload.message) return payload.message;
  } catch {
    // Ignore parsing failure.
  }

  if (response.status === 401) return "Your session expired. Please log in again.";
  if (response.status === 403) return "You do not have permission to manage assets.";
  if (response.status === 422) return "Please review the form and try again.";
  return "Request failed. Please try again.";
}

async function authorizedFetch<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
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

export type MachineCategory = "machine" | "equipment" | "vehicle";
export type MachineStatus = "active" | "inactive" | "retired";
export type MachineDocumentType = "invoice" | "contract";

export type MachineDocumentRecord = {
  id?: number;
  type: MachineDocumentType;
  url: string;
  public_id: string;
  filename: string;
  mime_type: string;
  uploaded_at?: string;
};

export type MachineRecord = {
  id: number;
  name: string;
  category: MachineCategory;
  serial_number?: string;
  location?: string;
  purchase_date?: string;
  purchase_cost?: number;
  status: MachineStatus;
  notes?: string;
  documents?: MachineDocumentRecord[];
  created_at?: string;
  updated_at?: string;
};

export type MachinePayload = {
  name: string;
  category: MachineCategory;
  serial_number?: string;
  location?: string;
  purchase_date?: string;
  purchase_cost?: number | null;
  status: MachineStatus;
  notes?: string;
  documents?: MachineDocumentRecord[];
  remove_document_ids?: number[];
};

export type MachineFilters = {
  search?: string;
  category?: MachineCategory | "";
  status?: MachineStatus | "";
  page?: number;
};

function normalizeDocument(raw: unknown): MachineDocumentRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id) || undefined,
    type: toText(record.type) as MachineDocumentType,
    url: toText(record.url),
    public_id: toText(record.public_id),
    filename: toText(record.filename),
    mime_type: toText(record.mime_type),
    uploaded_at: toText(record.uploaded_at) || undefined,
  };
}

function normalizeMachine(raw: unknown): MachineRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    category: toText(record.category) as MachineCategory,
    serial_number: toText(record.serial_number) || undefined,
    location: toText(record.location) || undefined,
    purchase_date: toText(record.purchase_date) || undefined,
    purchase_cost: record.purchase_cost != null ? toNumber(record.purchase_cost) : undefined,
    status: toText(record.status) as MachineStatus,
    notes: toText(record.notes) || undefined,
    documents: asArray(record.documents).map(normalizeDocument),
    created_at: toText(record.created_at) || undefined,
    updated_at: toText(record.updated_at) || undefined,
  };
}

function buildQuery(filters: MachineFilters = {}): string {
  const query = new URLSearchParams();
  if (filters.page) query.append("page", String(filters.page));
  if (filters.search) query.append("search", filters.search);
  if (filters.category) query.append("category", filters.category);
  if (filters.status) query.append("status", filters.status);
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export async function listMachines(
  token: string,
  filters: MachineFilters = {},
): Promise<{ data: MachineRecord[]; current_page: number; last_page: number; total: number }> {
  const payload = await authorizedFetch<unknown>(`/machines${buildQuery(filters)}`, token);
  const record = asRecord(payload);

  return {
    data: asArray(record.data).map(normalizeMachine),
    current_page: toNumber(record.current_page),
    last_page: toNumber(record.last_page),
    total: toNumber(record.total),
  };
}

export async function getMachine(token: string, id: number): Promise<MachineRecord> {
  const payload = await authorizedFetch<unknown>(`/machines/${id}`, token);
  return normalizeMachine(payload);
}

export async function createMachine(
  token: string,
  payload: MachinePayload,
): Promise<MachineRecord> {
  const result = await authorizedFetch<unknown>("/machines", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return normalizeMachine(result);
}

export async function updateMachine(
  token: string,
  id: number,
  payload: Partial<MachinePayload>,
): Promise<MachineRecord> {
  const result = await authorizedFetch<unknown>(`/machines/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return normalizeMachine(result);
}

export async function deleteMachine(token: string, id: number): Promise<void> {
  await authorizedFetch<void>(`/machines/${id}`, token, { method: "DELETE" });
}

export const MACHINE_CATEGORY_OPTIONS = [
  { value: "machine", label: "Machine" },
  { value: "equipment", label: "Equipment" },
  { value: "vehicle", label: "Vehicle" },
] as const;

export const MACHINE_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "retired", label: "Retired" },
] as const;
