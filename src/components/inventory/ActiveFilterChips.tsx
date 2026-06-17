"use client";

import { ActionButton } from "@/components/ops-ui";
import type { ActiveFilterChip } from "@/lib/inventory-filter-utils";

type ActiveFilterChipsProps = {
  chips: ActiveFilterChip[];
  onClearAll?: () => void;
  className?: string;
};

export function ActiveFilterChips({
  chips,
  onClearAll,
  className = "",
}: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onClear}
          className="form-chip inline-flex items-center gap-1.5 text-xs transition-colors hover:border-error/30 hover:bg-error/5 hover:text-error"
        >
          {chip.label}
          <span aria-hidden>×</span>
        </button>
      ))}
      {onClearAll ? (
        <ActionButton type="button" size="sm" variant="ghost" onClick={onClearAll}>
          Clear all
        </ActionButton>
      ) : null}
    </div>
  );
}
