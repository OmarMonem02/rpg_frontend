"use client";

import {
  CalendarDaysIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { ActionButton, InputGroup } from "@/components/ops-ui";
import {
  isoDateDaysAgo,
  isoDateToday,
  type InvoiceGalleryFilters,
  type InvoiceGallerySource,
  type InvoiceGallerySort,
} from "@/lib/invoice-gallery";

type InvoiceGalleryFiltersProps = {
  filters: InvoiceGalleryFilters;
  onChange: (patch: Partial<InvoiceGalleryFilters>) => void;
  onReset: () => void;
  canFilterSales: boolean;
  canFilterTickets: boolean;
};

const SOURCE_OPTIONS: Array<{ value: InvoiceGallerySource; label: string }> = [
  { value: "all", label: "All invoices" },
  { value: "sales", label: "Sales" },
  { value: "tickets", label: "Tickets" },
];

const SORT_OPTIONS: Array<{ value: InvoiceGallerySort; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

export function InvoiceGalleryFiltersPanel({
  filters,
  onChange,
  onReset,
  canFilterSales,
  canFilterTickets,
}: InvoiceGalleryFiltersProps) {
  const visibleSourceOptions = SOURCE_OPTIONS.filter((option) => {
    if (option.value === "all") return canFilterSales || canFilterTickets;
    if (option.value === "sales") return canFilterSales;
    if (option.value === "tickets") return canFilterTickets;
    return true;
  });

  function applyDatePreset(preset: "today" | "week" | "month") {
    const today = new Date();
    const from = new Date(today);

    if (preset === "week") {
      from.setDate(today.getDate() - 6);
    } else if (preset === "month") {
      from.setDate(1);
    }

    onChange({
      date_from: from.toISOString().slice(0, 10),
      date_to: today.toISOString().slice(0, 10),
    });
  }

  return (
    <div className="space-y-4 rounded-[1.75rem] border border-outline-variant/15 bg-surface-container-lowest/80 p-4 shadow-inner sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-on-surface">
          <FunnelIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Filter invoices</h2>
        </div>
        <ActionButton type="button" variant="ghost" size="sm" onClick={onReset}>
          Clear filters
        </ActionButton>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleSourceOptions.length > 1 ? (
          <InputGroup label="Source">
            <select
              className="form-input-base"
              value={filters.source}
              onChange={(event) =>
                onChange({ source: event.target.value as InvoiceGallerySource })
              }
            >
              {visibleSourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </InputGroup>
        ) : null}

        <InputGroup label="Search">
          <div className="relative">
            <input
              type="search"
              className="form-input-base pl-9 "
              placeholder="Invoice #, customer, phone…"
              value={filters.search ?? ""}
              onChange={(event) =>
                onChange({ search: event.target.value.trim() || undefined })
              }
            />
          </div>
        </InputGroup>

        <InputGroup label="Date from">
          <input
            type="date"
            className="form-input-base"
            value={filters.date_from ?? ""}
            onChange={(event) =>
              onChange({ date_from: event.target.value || undefined })
            }
          />
        </InputGroup>

        <InputGroup label="Date to">
          <input
            type="date"
            className="form-input-base"
            value={filters.date_to ?? ""}
            onChange={(event) =>
              onChange({ date_to: event.target.value || undefined })
            }
          />
        </InputGroup>

        <InputGroup label="Sort">
          <select
            className="form-input-base"
            value={filters.sort}
            onChange={(event) =>
              onChange({ sort: event.target.value as InvoiceGallerySort })
            }
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </InputGroup>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
          <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
          Quick dates
        </span>
        <ActionButton
          type="button"
          size="sm"
          variant="outline"
          onClick={() => applyDatePreset("today")}
        >
          Today
        </ActionButton>
        <ActionButton
          type="button"
          size="sm"
          variant="outline"
          onClick={() => applyDatePreset("week")}
        >
          7 days
        </ActionButton>
        <ActionButton
          type="button"
          size="sm"
          variant="outline"
          onClick={() => applyDatePreset("month")}
        >
          This month
        </ActionButton>
        <ActionButton
          type="button"
          size="sm"
          variant="ghost"
          onClick={() =>
            onChange({
              date_from: isoDateDaysAgo(29),
              date_to: isoDateToday(),
            })
          }
        >
          Last 30 days
        </ActionButton>
      </div>
    </div>
  );
}
