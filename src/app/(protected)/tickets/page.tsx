"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  FunnelIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { usePermissions } from "@/components/permission-provider";
import { useGlobalDataRefresh } from "@/hooks/useGlobalDataRefresh";
import {
  PageShell,
  PageHero,
  ActionButton,
  DataTableCard,
  StatusBadge,
  EmptyState,
  InputGroup,
  FilterBar,
  SearchableSelect,
  SurfaceCard,
} from "@/components/ops-ui";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { formatEgp } from "@/lib/currencies";
import { computeTicketDisplayTotals } from "@/lib/ticket-display-pricing";
import {
  buildTicketFilterOptions,
  filterTickets,
  getTicketBikeBrand,
  getTicketBikeModel,
  getTicketBikeYear,
  getTicketVin,
  hasActiveTicketFilters,
  TICKET_PAYMENT_METHODS,
  TICKET_STATUSES,
  TRACKING_LINK_FILTERS,
  type TicketFilters,
} from "@/lib/ticket-filters";
import { ticketsApi, exportUnstoredTicketItems, type Ticket } from "@/lib/tickets-api";
import { CreateTicketModal } from "./CreateTicketModal";

type TicketSort =
  | "newest"
  | "oldest"
  | "highest"
  | "lowest"
  | "customer_asc"
  | "customer_desc"
  | "status";

const TICKET_SORT_OPTIONS: Array<{ value: TicketSort; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "highest", label: "Highest total" },
  { value: "lowest", label: "Lowest total" },
  { value: "customer_asc", label: "Customer A–Z" },
  { value: "customer_desc", label: "Customer Z–A" },
  { value: "status", label: "Status" },
];

const STATUS_SORT_ORDER: Record<string, number> = {
  pending: 0,
  in_progress: 1,
  completed: 2,
  cancelled: 3,
  closed: 4,
  partial: 5,
};

const EMPTY_FILTERS: TicketFilters = {};

function sortTickets(tickets: Ticket[], sort: TicketSort): Ticket[] {
  const sorted = [...tickets];

  sorted.sort((a, b) => {
    let result = 0;

    switch (sort) {
      case "oldest":
        result =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "highest":
        result = Number(b.total || 0) - Number(a.total || 0);
        break;
      case "lowest":
        result = Number(a.total || 0) - Number(b.total || 0);
        break;
      case "customer_asc":
        result = (a.customer?.name || "").localeCompare(
          b.customer?.name || "",
          undefined,
          { sensitivity: "base" },
        );
        break;
      case "customer_desc":
        result = (b.customer?.name || "").localeCompare(
          a.customer?.name || "",
          undefined,
          { sensitivity: "base" },
        );
        break;
      case "status":
        result =
          (STATUS_SORT_ORDER[a.status.toLowerCase()] ?? 99) -
          (STATUS_SORT_ORDER[b.status.toLowerCase()] ?? 99);
        break;
      case "newest":
      default:
        result =
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        break;
    }

    return result !== 0 ? result : b.id - a.id;
  });

  return sorted;
}

function titleCase(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function TicketsPage() {
  const { rates } = useExchangeRates();
  const permissions = usePermissions();
  const canDeleteTickets = permissions.canDelete("maintenance");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<TicketSort>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);
  const [exporting, setExporting] = useState(false);

  const filterOptions = useMemo(
    () => buildTicketFilterOptions(tickets),
    [tickets],
  );

  const filteredTickets = useMemo(
    () => filterTickets(tickets, filters, rates),
    [tickets, filters, rates],
  );

  const sortedTickets = useMemo(
    () => sortTickets(filteredTickets, sortBy),
    [filteredTickets, sortBy],
  );

  const updateFilter = useCallback(
    <K extends keyof TicketFilters>(key: K, value: TicketFilters[K]) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: value };
        if (value === "" || value === undefined) {
          delete next[key];
        }
        return next;
      });
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  const activeFilters = useMemo(() => {
    const chips: Array<{ key: string; label: string; onClear: () => void }> =
      [];

    if (filters.search) {
      chips.push({
        key: "search",
        label: `Search: ${filters.search}`,
        onClear: () => updateFilter("search", undefined),
      });
    }
    if (filters.id) {
      chips.push({
        key: "id",
        label: `Ticket #${filters.id}`,
        onClear: () => updateFilter("id", undefined),
      });
    }
    if (filters.status) {
      chips.push({
        key: "status",
        label: `Status: ${titleCase(filters.status)}`,
        onClear: () => updateFilter("status", undefined),
      });
    }
    if (filters.customer_id) {
      const customer = filterOptions.customers.find(
        (entry) => entry.id === filters.customer_id,
      );
      chips.push({
        key: "customer",
        label: `Customer: ${customer?.name || `#${filters.customer_id}`}`,
        onClear: () => updateFilter("customer_id", undefined),
      });
    }
    if (filters.customer_bike_id) {
      const bike = filterOptions.bikes.find(
        (entry) => entry.id === filters.customer_bike_id,
      );
      chips.push({
        key: "bike",
        label: `Vehicle: ${bike?.label || `#${filters.customer_bike_id}`}`,
        onClear: () => updateFilter("customer_bike_id", undefined),
      });
    }
    if (filters.bike_brand) {
      chips.push({
        key: "brand",
        label: `Brand: ${filters.bike_brand}`,
        onClear: () => updateFilter("bike_brand", undefined),
      });
    }
    if (filters.bike_model) {
      chips.push({
        key: "model",
        label: `Model: ${filters.bike_model}`,
        onClear: () => updateFilter("bike_model", undefined),
      });
    }
    if (filters.vin) {
      chips.push({
        key: "vin",
        label: `VIN: ${filters.vin}`,
        onClear: () => updateFilter("vin", undefined),
      });
    }
    if (filters.payment_method) {
      const label =
        TICKET_PAYMENT_METHODS.find(
          (option) => option.value === filters.payment_method,
        )?.label || titleCase(filters.payment_method);
      chips.push({
        key: "payment",
        label: `Payment: ${label}`,
        onClear: () => updateFilter("payment_method", undefined),
      });
    }
    if (filters.tracking_link_sent) {
      const label =
        TRACKING_LINK_FILTERS.find(
          (option) => option.value === filters.tracking_link_sent,
        )?.label || filters.tracking_link_sent;
      chips.push({
        key: "tracking",
        label: `Tracking: ${label}`,
        onClear: () => updateFilter("tracking_link_sent", undefined),
      });
    }
    if (filters.notes) {
      chips.push({
        key: "notes",
        label: `Notes: ${filters.notes}`,
        onClear: () => updateFilter("notes", undefined),
      });
    }
    if (filters.opened_from) {
      chips.push({
        key: "opened_from",
        label: `Opened from: ${filters.opened_from}`,
        onClear: () => updateFilter("opened_from", undefined),
      });
    }
    if (filters.opened_to) {
      chips.push({
        key: "opened_to",
        label: `Opened to: ${filters.opened_to}`,
        onClear: () => updateFilter("opened_to", undefined),
      });
    }
    if (filters.closed_from) {
      chips.push({
        key: "closed_from",
        label: `Closed from: ${filters.closed_from}`,
        onClear: () => updateFilter("closed_from", undefined),
      });
    }
    if (filters.closed_to) {
      chips.push({
        key: "closed_to",
        label: `Closed to: ${filters.closed_to}`,
        onClear: () => updateFilter("closed_to", undefined),
      });
    }
    if (filters.total_min !== undefined) {
      chips.push({
        key: "total_min",
        label: `Min total: ${formatEgp(filters.total_min)}`,
        onClear: () => updateFilter("total_min", undefined),
      });
    }
    if (filters.total_max !== undefined) {
      chips.push({
        key: "total_max",
        label: `Max total: ${formatEgp(filters.total_max)}`,
        onClear: () => updateFilter("total_max", undefined),
      });
    }
    if (filters.discount_min !== undefined) {
      chips.push({
        key: "discount_min",
        label: `Min discount: ${formatEgp(filters.discount_min)}`,
        onClear: () => updateFilter("discount_min", undefined),
      });
    }
    if (filters.discount_max !== undefined) {
      chips.push({
        key: "discount_max",
        label: `Max discount: ${formatEgp(filters.discount_max)}`,
        onClear: () => updateFilter("discount_max", undefined),
      });
    }
    if (filters.amount_paid_min !== undefined) {
      chips.push({
        key: "paid_min",
        label: `Min paid: ${formatEgp(filters.amount_paid_min)}`,
        onClear: () => updateFilter("amount_paid_min", undefined),
      });
    }
    if (filters.amount_paid_max !== undefined) {
      chips.push({
        key: "paid_max",
        label: `Max paid: ${formatEgp(filters.amount_paid_max)}`,
        onClear: () => updateFilter("amount_paid_max", undefined),
      });
    }
    if (filters.has_unstored_items) {
      chips.push({
        key: "has_unstored_items",
        label: "Has unstored items",
        onClear: () => updateFilter("has_unstored_items", undefined),
      });
    }

    return chips;
  }, [filterOptions.bikes, filterOptions.customers, filters, updateFilter]);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await ticketsApi.getTickets();
      setTickets(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useGlobalDataRefresh(fetchTickets);

  const handleDeleteTicket = async (ticketId: number) => {
    if (!canDeleteTickets) {
      setError("You do not have permission to delete tickets.");
      return;
    }
    if (
      !confirm(
        "Are you sure you want to delete this ticket? All tasks and line items will be removed.",
      )
    ) {
      return;
    }
    try {
      setDeletingId(ticketId);
      setError("");
      await ticketsApi.deleteTicket(ticketId);
      await fetchTickets();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete ticket");
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportUnstored = async () => {
    try {
      setExporting(true);
      setError("");
      await exportUnstoredTicketItems(
        {
          status: filters.status || undefined,
          date_from: filters.opened_from || undefined,
          date_to: filters.opened_to || undefined,
          search: filters.search || undefined,
          has_unstored_items: filters.has_unstored_items || true,
        },
        "xlsx",
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const getStatusTone = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "warning";
      case "in_progress": return "primary";
      case "completed": return "success";
      case "cancelled": return "danger";
      case "closed": return "default";
      default: return "default";
    }
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="Operations"
        title="Maintenance Dashboard"
        actions={
          <ActionButton tone="primary" onClick={() => setIsCreateOpen(true)} className="px-8">
            + Create Ticket
          </ActionButton>
        }
      />

      {error ? (
        <div className="rounded-2xl bg-error/10 p-4 text-error border border-error/20 mb-6 animate-in fade-in">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4 text-on-surface-variant">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="font-medium">Loading tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          title="No active tickets"
          description="Your maintenance queue is empty. Start by opening a new ticket for a customer bike."
          action={
            <ActionButton tone="primary" onClick={() => setIsCreateOpen(true)}>
              Open New Ticket
            </ActionButton>
          }
        />
      ) : (
        <div className="space-y-4">
          <FilterBar className="shadow-sm">
            <InputGroup label="Search" className="md:col-span-4">
              <input
                type="text"
                placeholder="Ticket #, customer, phone, vehicle, VIN, notes..."
                value={filters.search || ""}
                onChange={(event) => updateFilter("search", event.target.value)}
                className="form-input-base"
              />
            </InputGroup>
            <InputGroup label="Status" className="md:col-span-2">
              <SearchableSelect
                value={filters.status || ""}
                onChange={(value) => updateFilter("status", value)}
                options={TICKET_STATUSES}
                className="form-input-base"
                aria-label="Filter by status"
              />
            </InputGroup>
            <InputGroup label="Customer" className="md:col-span-3">
              <SearchableSelect
                value={filters.customer_id || ""}
                onChange={(value) =>
                  updateFilter(
                    "customer_id",
                    value ? Number(value) : undefined,
                  )
                }
                options={[
                  { value: "", label: "All customers" },
                  ...filterOptions.customers.map((customer) => ({
                    value: customer.id,
                    label: customer.name,
                  })),
                ]}
                className="form-input-base"
                aria-label="Filter by customer"
              />
            </InputGroup>
            <div className="flex items-end md:col-span-3 gap-2">
              {filters.has_unstored_items ? (
                <ActionButton
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={exporting}
                  onClick={() => void handleExportUnstored()}
                >
                  {exporting ? "Exporting…" : "Export unstored"}
                </ActionButton>
              ) : null}
              <ActionButton
                type="button"
                variant="outline"
                className={filters.has_unstored_items ? "flex-1" : "w-full"}
                onClick={() => setShowFilters((value) => !value)}
              >
                <FunnelIcon className="h-4 w-4" />
                More filters
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
                />
              </ActionButton>
            </div>
          </FilterBar>

          {activeFilters.length > 0 ? (
            <SurfaceCard className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={filter.onClear}
                    className="form-chip gap-2 rounded-full border border-primary/15 bg-primary/5 text-primary hover:bg-primary/10"
                  >
                    {filter.label}
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
              <ActionButton
                type="button"
                size="sm"
                variant="ghost"
                onClick={resetFilters}
              >
                <ArrowPathIcon className="h-4 w-4" />
                Reset filters
              </ActionButton>
            </SurfaceCard>
          ) : null}

          {showFilters ? (
            <SurfaceCard className="animate-app-shell-enter">
              <div className="mb-4">
                <p className="label-caps text-primary">Ticket attribute filters</p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Narrow the queue by ID, vehicle, payment, dates, totals, and tracking.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <InputGroup label="Ticket ID">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Exact ticket #"
                    value={filters.id || ""}
                    onChange={(event) => updateFilter("id", event.target.value)}
                    className="form-input-base mono-data"
                  />
                </InputGroup>
                <InputGroup label="Vehicle">
                  <SearchableSelect
                    value={filters.customer_bike_id || ""}
                    onChange={(value) =>
                      updateFilter(
                        "customer_bike_id",
                        value ? Number(value) : undefined,
                      )
                    }
                    options={[
                      { value: "", label: "All vehicles" },
                      ...filterOptions.bikes.map((bike) => ({
                        value: bike.id,
                        label: bike.label,
                      })),
                    ]}
                    className="form-input-base"
                  />
                </InputGroup>
                <InputGroup label="Bike brand">
                  <SearchableSelect
                    value={filters.bike_brand || ""}
                    onChange={(value) => updateFilter("bike_brand", value)}
                    options={[
                      { value: "", label: "All brands" },
                      ...filterOptions.brands.map((brand) => ({
                        value: brand,
                        label: brand,
                      })),
                    ]}
                    className="form-input-base"
                  />
                </InputGroup>
                <InputGroup label="Bike model">
                  <SearchableSelect
                    value={filters.bike_model || ""}
                    onChange={(value) => updateFilter("bike_model", value)}
                    options={[
                      { value: "", label: "All models" },
                      ...filterOptions.models.map((model) => ({
                        value: model,
                        label: model,
                      })),
                    ]}
                    className="form-input-base"
                  />
                </InputGroup>
                <InputGroup label="VIN contains">
                  <input
                    type="text"
                    placeholder="Partial VIN match"
                    value={filters.vin || ""}
                    onChange={(event) => updateFilter("vin", event.target.value)}
                    className="form-input-base mono-data"
                  />
                </InputGroup>
                <InputGroup label="Payment method">
                  <SearchableSelect
                    value={filters.payment_method || ""}
                    onChange={(value) => updateFilter("payment_method", value)}
                    options={TICKET_PAYMENT_METHODS}
                    className="form-input-base"
                  />
                </InputGroup>
                <InputGroup label="Tracking link">
                  <SearchableSelect
                    value={filters.tracking_link_sent || ""}
                    onChange={(value) =>
                      updateFilter(
                        "tracking_link_sent",
                        value as TicketFilters["tracking_link_sent"],
                      )
                    }
                    options={TRACKING_LINK_FILTERS}
                    className="form-input-base"
                  />
                </InputGroup>
                <InputGroup label="Notes contain">
                  <input
                    type="text"
                    placeholder="Text in ticket notes"
                    value={filters.notes || ""}
                    onChange={(event) => updateFilter("notes", event.target.value)}
                    className="form-input-base"
                  />
                </InputGroup>
                <InputGroup label="Opened from">
                  <input
                    type="date"
                    value={filters.opened_from || ""}
                    onChange={(event) =>
                      updateFilter("opened_from", event.target.value)
                    }
                    className="form-input-base"
                  />
                </InputGroup>
                <InputGroup label="Opened to">
                  <input
                    type="date"
                    value={filters.opened_to || ""}
                    onChange={(event) =>
                      updateFilter("opened_to", event.target.value)
                    }
                    className="form-input-base"
                  />
                </InputGroup>
                <InputGroup label="Closed from">
                  <input
                    type="date"
                    value={filters.closed_from || ""}
                    onChange={(event) =>
                      updateFilter("closed_from", event.target.value)
                    }
                    className="form-input-base"
                  />
                </InputGroup>
                <InputGroup label="Closed to">
                  <input
                    type="date"
                    value={filters.closed_to || ""}
                    onChange={(event) =>
                      updateFilter("closed_to", event.target.value)
                    }
                    className="form-input-base"
                  />
                </InputGroup>
                <InputGroup label="Min total (EGP)">
                  <input
                    type="number"
                    min={0}
                    step="1"
                    placeholder="0"
                    onWheel={(event) => {
                      event.currentTarget.blur();
                    }}
                    value={filters.total_min ?? ""}
                    onChange={(event) =>
                      updateFilter(
                        "total_min",
                        parseOptionalNumber(event.target.value),
                      )
                    }
                    className="form-input-base mono-data"
                  />
                </InputGroup>
                <InputGroup label="Max total (EGP)">
                  <input
                    type="number"
                    min={0}
                    step="1"
                    onWheel={(event) => {
                      event.currentTarget.blur();
                    }}
                    value={filters.total_max ?? ""}
                    onChange={(event) =>
                      updateFilter(
                        "total_max",
                        parseOptionalNumber(event.target.value),
                      )
                    }
                    className="form-input-base mono-data"
                  />
                </InputGroup>
                <InputGroup label="Min discount (EGP)">
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    onWheel={(event) => {
                      event.currentTarget.blur();
                    }}
                    value={filters.discount_min ?? ""}
                    onChange={(event) =>
                      updateFilter(
                        "discount_min",
                        parseOptionalNumber(event.target.value),
                      )
                    }
                    className="form-input-base mono-data"
                  />
                </InputGroup>
                <InputGroup label="Max discount (EGP)">
                  <input
                    type="number"
                    min={0}
                    placeholder="No limit"
                    value={filters.discount_max ?? ""}
                    onWheel={(event) => {
                      event.currentTarget.blur();
                    }}
                    onChange={(event) =>
                      updateFilter(
                        "discount_max",
                        parseOptionalNumber(event.target.value),
                      )
                    }
                    className="form-input-base mono-data"
                  />
                </InputGroup>
                <InputGroup label="Min amount paid (EGP)">
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={filters.amount_paid_min ?? ""}
                    onWheel={(event) => {
                      event.currentTarget.blur();
                    }}
                    onChange={(event) =>
                      updateFilter(
                        "amount_paid_min",
                        parseOptionalNumber(event.target.value),
                      )
                    }
                    className="form-input-base mono-data"
                  />
                </InputGroup>
                <InputGroup label="Max amount paid (EGP)">
                  <input
                    type="number"
                    min={0}
                    placeholder="No limit"
                    value={filters.amount_paid_max ?? ""}
                    onWheel={(event) => {
                      event.currentTarget.blur();
                    }}
                    onChange={(event) =>
                      updateFilter(
                        "amount_paid_max",
                        parseOptionalNumber(event.target.value),
                      )
                    }
                    className="form-input-base mono-data"
                  />
                </InputGroup>
                <InputGroup label="Unstored items" className="md:col-span-2">
                  <label className="flex items-center gap-2 rounded-xl border border-outline-variant/20 bg-surface px-3 py-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(filters.has_unstored_items)}
                      onChange={(event) =>
                        updateFilter(
                          "has_unstored_items",
                          event.target.checked ? true : undefined,
                        )
                      }
                      className="h-4 w-4 rounded border-outline-variant/40"
                    />
                    Has unstored items only
                  </label>
                </InputGroup>
              </div>
            </SurfaceCard>
          ) : null}

          <DataTableCard className="overflow-hidden border-outline-variant/10 shadow-xl">
            <div className="border-b border-outline-variant/15 bg-surface-container-low px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="label-caps">Queue</p>
                  <h2 className="mt-1 text-xl font-bold text-on-surface">
                    {sortedTickets.length} ticket{sortedTickets.length === 1 ? "" : "s"}
                    {hasActiveTicketFilters(filters) ? (
                      <span className="ml-2 text-sm font-medium text-on-surface-variant">
                        of {tickets.length}
                      </span>
                    ) : null}
                  </h2>
                </div>
                <InputGroup label="Sort by" className="w-full sm:w-56">
                  <SearchableSelect
                    value={sortBy}
                    onChange={(value) => setSortBy(value as TicketSort)}
                    options={TICKET_SORT_OPTIONS}
                    className="form-input-base"
                    aria-label="Sort tickets"
                  />
                </InputGroup>
              </div>
            </div>
            {sortedTickets.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-lg font-semibold text-on-surface">
                  No tickets match your filters
                </p>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Try adjusting or clearing filters to see more results.
                </p>
                <ActionButton
                  type="button"
                  variant="outline"
                  className="mt-6"
                  onClick={resetFilters}
                >
                  Clear all filters
                </ActionButton>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-on-surface">
                  <thead className="border-b border-outline-variant/20 bg-surface-container-low text-on-surface-variant">
                    <tr>
                      <th className="label-caps px-6 py-5">ID</th>
                      <th className="label-caps px-6 py-5">Customer</th>
                      <th className="label-caps px-6 py-5">Vehicle</th>
                      <th className="label-caps px-6 py-5">Status</th>
                      <th className="label-caps px-6 py-5">Total</th>
                      <th className="label-caps px-6 py-5">Opened At</th>
                      <th className="label-caps px-6 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5 bg-surface">
                    {sortedTickets.map((ticket) => (
                      <tr key={ticket.id} className="data-row group">
                        <td className="mono-data px-6 py-5 font-bold text-primary">#{ticket.id}</td>
                        <td className="px-6 py-5">
                          <div className="font-semibold text-on-surface">{ticket.customer?.name || "Unknown"}</div>
                          <div className="text-xs text-on-surface-variant">{ticket.customer?.phone}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-medium">
                            {getTicketBikeBrand(ticket) || "Unknown"}{" "}
                            {getTicketBikeModel(ticket)}{" "}
                            {getTicketBikeYear(ticket) ? `(${getTicketBikeYear(ticket)})` : ""}
                          </div>
                          <div className="mono-data text-xs text-on-surface-variant">
                            VIN: {getTicketVin(ticket) || "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <StatusBadge tone={getStatusTone(ticket.status)}>
                            {ticket.status.toUpperCase().replace("_", " ")}
                          </StatusBadge>
                        </td>
                        <td className="mono-data px-6 py-5 font-black text-on-surface">
                          {formatEgp(computeTicketDisplayTotals(ticket, rates).total)}
                        </td>
                        <td className="mono-data px-6 py-5 text-on-surface-variant">{new Date(ticket.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-5 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <ActionButton
                              href={`/tickets/${ticket.id}`}
                              variant="outline"
                              size="sm"
                              className="group-hover:border-primary group-hover:bg-primary group-hover:text-on-primary transition-all"
                            >
                              View Details
                            </ActionButton>
                            {canDeleteTickets ? (
                              <ActionButton
                                variant="outline"
                                tone="danger"
                                size="sm"
                                disabled={deletingId === ticket.id}
                                className="group-hover:border-error group-hover:bg-error group-hover:text-on-primary transition-all"
                                onClick={() => void handleDeleteTicket(ticket.id)}
                                title="Delete ticket"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </ActionButton>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataTableCard>
        </div>
      )}

      {isCreateOpen && (
        <CreateTicketModal
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            setIsCreateOpen(false);
            fetchTickets();
          }}
        />
      )}
    </PageShell>
  );
}
