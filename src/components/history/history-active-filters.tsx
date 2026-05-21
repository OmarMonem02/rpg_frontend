"use client";

import type { HistoryFilters } from "@/lib/api/history";
import { HISTORY_ENTITY_OPTIONS } from "@/lib/api/history";

export function HistoryActiveFilters({
  filters,
  userLabel,
  onRemove,
  onClearAll,
}: {
  filters: HistoryFilters;
  userLabel?: string;
  onRemove: (key: keyof HistoryFilters) => void;
  onClearAll: () => void;
}) {
  const chips: Array<{ key: keyof HistoryFilters; label: string }> = [];

  if (filters.entity_type) {
    const entity = HISTORY_ENTITY_OPTIONS.find((item) => item.key === filters.entity_type);
    chips.push({
      key: "entity_type",
      label: `Entity: ${entity?.label ?? filters.entity_type}`,
    });
  }

  if (filters.action) {
    chips.push({
      key: "action",
      label: `Action: ${filters.action}`,
    });
  }

  if (filters.user_id) {
    chips.push({
      key: "user_id",
      label: userLabel ? `User: ${userLabel}` : `User #${filters.user_id}`,
    });
  }

  if (filters.model_id) {
    chips.push({
      key: "model_id",
      label: `Record #${filters.model_id}`,
    });
  }

  if (filters.date_from) {
    chips.push({ key: "date_from", label: `From ${filters.date_from}` });
  }

  if (filters.date_to) {
    chips.push({ key: "date_to", label: `To ${filters.date_to}` });
  }

  if (filters.search) {
    chips.push({ key: "search", label: `Search: ${filters.search}` });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[1.25rem] border border-outline-variant/12 bg-surface-container-low px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
        Active filters
      </span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onRemove(chip.key)}
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-container px-3 py-1 text-xs font-medium text-on-primary-container transition-colors hover:bg-primary/10"
        >
          {chip.label}
          <span aria-hidden className="text-on-primary-container/70">
            ×
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="ml-auto text-xs font-semibold text-primary hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
