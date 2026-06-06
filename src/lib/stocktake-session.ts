import type { CountItemType, CountLine, CountListTab, CountSortKey } from "@/lib/stocktake";

const STORAGE_KEY = "rpg-inventory-count-session";
const LEGACY_SESSION_KEY = "rpg-inventory-count-session";

export type CountSessionLastScan = {
  key: string;
  name: string;
  type: CountItemType;
  sku: string;
  counted: number;
  systemQty: number;
  image?: string;
};

export type CountSessionSnapshot = {
  version: 1;
  savedAt: string;
  lines: CountLine[];
  listTab: CountListTab;
  listSearch: string;
  lastScan: CountSessionLastScan | null;
  lastTouchedKey: string | null;
  sortKey?: CountSortKey;
  scanHistory?: CountSessionLastScan[];
};

function isCountItemType(value: unknown): value is CountItemType {
  return value === "product" || value === "spare_part";
}

function isCountListTab(value: unknown): value is CountListTab {
  return value === "all" || value === "matches" || value === "discrepancies";
}

function normalizeCountLine(raw: unknown): CountLine | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const type = record.type;
  const id = Number(record.id);
  const name = typeof record.name === "string" ? record.name : "";
  const sku = typeof record.sku === "string" ? record.sku : "";
  const systemQty = Number(record.systemQty ?? record.system_qty);
  const counted = Number(record.counted);

  if (
    !isCountItemType(type) ||
    !Number.isFinite(id) ||
    id <= 0 ||
    !name ||
    !Number.isFinite(systemQty) ||
    systemQty < 0 ||
    !Number.isFinite(counted) ||
    counted < 0
  ) {
    return null;
  }

  return {
    type,
    id,
    name,
    sku,
    partNumber:
      typeof record.partNumber === "string"
        ? record.partNumber
        : typeof record.part_number === "string"
          ? record.part_number
          : undefined,
    image: typeof record.image === "string" ? record.image : undefined,
    systemQty,
    counted,
  };
}

function normalizeLastScan(raw: unknown): CountSessionLastScan | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const type = record.type;
  const counted = Number(record.counted);
  const systemQty = Number(record.systemQty ?? record.system_qty);
  const name = typeof record.name === "string" ? record.name : "";
  const sku = typeof record.sku === "string" ? record.sku : "";
  const key = typeof record.key === "string" ? record.key : "";

  if (
    !isCountItemType(type) ||
    !key ||
    !name ||
    !Number.isFinite(counted) ||
    !Number.isFinite(systemQty)
  ) {
    return null;
  }

  return {
    key,
    name,
    type,
    sku,
    counted,
    systemQty,
    image: typeof record.image === "string" ? record.image : undefined,
  };
}

const VALID_SORT_KEYS: CountSortKey[] = ["name", "sku", "variance", "type", "default"];

function isCountSortKey(value: unknown): value is CountSortKey {
  return typeof value === "string" && VALID_SORT_KEYS.includes(value as CountSortKey);
}

function normalizeSnapshot(raw: unknown): CountSessionSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const lineRows = Array.isArray(record.lines) ? record.lines : [];
  const lines = lineRows
    .map(normalizeCountLine)
    .filter((line): line is CountLine => line !== null);

  if (lines.length === 0) return null;

  const rawHistory = Array.isArray(record.scanHistory) ? record.scanHistory : [];
  const scanHistory = rawHistory
    .map(normalizeLastScan)
    .filter((scan): scan is CountSessionLastScan => scan !== null)
    .slice(0, 10);

  return {
    version: 1,
    savedAt:
      typeof record.savedAt === "string"
        ? record.savedAt
        : new Date().toISOString(),
    lines,
    listTab: isCountListTab(record.listTab) ? record.listTab : "all",
    listSearch: typeof record.listSearch === "string" ? record.listSearch : "",
    lastScan: normalizeLastScan(record.lastScan),
    lastTouchedKey:
      typeof record.lastTouchedKey === "string" ? record.lastTouchedKey : null,
    sortKey: isCountSortKey(record.sortKey) ? record.sortKey : undefined,
    scanHistory,
  };
}

function readRawStorage(): string | null {
  if (typeof window === "undefined") return null;

  const fromLocal = localStorage.getItem(STORAGE_KEY);
  if (fromLocal) return fromLocal;

  const fromSession = sessionStorage.getItem(LEGACY_SESSION_KEY);
  if (!fromSession) return null;

  try {
    localStorage.setItem(STORAGE_KEY, fromSession);
  } catch {
    // Keep using session value for this load only.
  }
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
  return fromSession;
}

export function loadCountSession(): CountSessionSnapshot | null {
  try {
    const raw = readRawStorage();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return normalizeSnapshot(parsed);
  } catch {
    clearCountSession();
    return null;
  }
}

export function saveCountSession(snapshot: Omit<CountSessionSnapshot, "version" | "savedAt">): void {
  if (typeof window === "undefined") return;
  if (snapshot.lines.length === 0) {
    clearCountSession();
    return;
  }

  const payload: CountSessionSnapshot = {
    version: 1,
    savedAt: new Date().toISOString(),
    ...snapshot,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // Storage full or unavailable — counting still works in memory.
  }
}

export function clearCountSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
}

export function formatSessionSavedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "earlier";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
