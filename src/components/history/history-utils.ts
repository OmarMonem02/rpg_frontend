import type { HistoryFilters, HistoryRecord } from "@/lib/api/history";

export type HistorySummary = {
  total: number;
  creates: number;
  updates: number;
  deletes: number;
};

export function formatTimestamp(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatRelativeTime(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = date.getTime() - Date.now();
  const absSec = Math.abs(Math.round(diffMs / 1000));
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (absSec < 60) return rtf.format(Math.round(diffMs / 1000), "second");
  if (absSec < 3600) return rtf.format(Math.round(diffMs / 60000), "minute");
  if (absSec < 86400) return rtf.format(Math.round(diffMs / 3600000), "hour");
  if (absSec < 604800) return rtf.format(Math.round(diffMs / 86400000), "day");

  return formatTimestamp(value);
}

export function actionTone(action: string): "primary" | "danger" | "default" {
  if (action === "delete") return "danger";
  if (action === "create" || action === "update") return "primary";
  return "default";
}

export function actionLabel(action: string): string {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

export function groupRecordsByDay(
  records: HistoryRecord[],
): Array<{ label: string; records: HistoryRecord[] }> {
  const groups = new Map<string, HistoryRecord[]>();

  for (const record of records) {
    const date = new Date(record.created_at);
    const label = Number.isNaN(date.getTime())
      ? "Unknown date"
      : date.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });

    const bucket = groups.get(label) ?? [];
    bucket.push(record);
    groups.set(label, bucket);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    records: items,
  }));
}

export function countActiveFilters(filters: HistoryFilters): number {
  let count = 0;
  if (filters.entity_type) count += 1;
  if (filters.action) count += 1;
  if (filters.user_id) count += 1;
  if (filters.model_id) count += 1;
  if (filters.date_from) count += 1;
  if (filters.date_to) count += 1;
  if (filters.search) count += 1;
  return count;
}

export function filtersToSearchParams(
  filters: HistoryFilters,
  page: number,
): URLSearchParams {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (filters.entity_type) params.set("entity_type", filters.entity_type);
  if (filters.action) params.set("action", filters.action);
  if (filters.user_id) params.set("user_id", String(filters.user_id));
  if (filters.model_id) params.set("model_id", String(filters.model_id));
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.search) params.set("search", filters.search);
  return params;
}

export function searchParamsToFilters(params: URLSearchParams): {
  page: number;
  filters: HistoryFilters;
} {
  const userId = Number(params.get("user_id"));
  const modelId = Number(params.get("model_id"));

  return {
    page: Math.max(1, Number(params.get("page")) || 1),
    filters: {
      entity_type: params.get("entity_type") || undefined,
      action: params.get("action") || undefined,
      user_id: userId > 0 ? userId : undefined,
      model_id: modelId > 0 ? modelId : undefined,
      date_from: params.get("date_from") || undefined,
      date_to: params.get("date_to") || undefined,
      search: params.get("search")?.trim() || undefined,
      per_page: 20,
    },
  };
}

export function isoDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function isoDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}
