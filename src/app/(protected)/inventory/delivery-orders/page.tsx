"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import { usePermissions } from "@/components/permission-provider";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import { useGlobalDataRefresh } from "@/hooks/useGlobalDataRefresh";
import {
  exportSales,
  listSales,
  resolveSaleAddress,
  toNumber,
  type SaleListFilters,
  type SaleRecord,
} from "@/lib/crud-api";
import {
  DELIVERY_STATUS_OPTIONS,
  formatDate,
  formatDateInput,
  formatMoney,
  getChannelLabel,
  getDeliveryTone,
  summarizeDeliveryOrders,
  titleCase,
} from "@/lib/delivery-orders/utils";
import {
  ActionButton,
  DataTableCard,
  EmptyState,
  FilterBar,
  InlineMessage,
  InputGroup,
  PageHero,
  PageShell,
  PaginationControls,
  SearchableSelect,
  StatCard,
  StatGrid,
  StatusBadge,
  SurfaceCard,
} from "@/components/ops-ui";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TruckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type DeliverySort = "newest" | "oldest" | "highest" | "lowest";

const DELIVERY_FILTERS = [
  { value: "", label: "All delivery statuses" },
  ...DELIVERY_STATUS_OPTIONS,
];

export default function DeliveryOrdersPage() {
  const router = useRouter();
  const permissions = usePermissions();
  const [orders, setOrders] = useState<SaleRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<"xlsx" | "csv" | null>(
    null,
  );

  const { filters, page, setPage, setSearch } = useEntityFilters();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<DeliverySort>("newest");
  const [perPage, setPerPage] = useState(20);

  const listFilters = useMemo(
    (): SaleListFilters => ({
      search: filters.search || undefined,
      delivery_status: deliveryStatusFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      sort: sortBy,
      per_page: perPage,
      remote_only: true,
    }),
    [
      filters.search,
      deliveryStatusFilter,
      dateFrom,
      dateTo,
      sortBy,
      perPage,
    ],
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      const result = await listSales(token, page, listFilters);
      setOrders(result.items);
      setTotalPages(result.lastPage);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load delivery orders",
      );
    } finally {
      setLoading(false);
    }
  }, [listFilters, page]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useGlobalDataRefresh(loadData);

  const pageSummary = useMemo(
    () => summarizeDeliveryOrders(orders),
    [orders],
  );

  const activeFilters = useMemo(
    () =>
      [
        filters.search
          ? {
              key: "search",
              label: `Search: ${filters.search}`,
              onClear: () => setSearch(""),
            }
          : null,
        deliveryStatusFilter
          ? {
              key: "delivery",
              label: `Delivery: ${titleCase(deliveryStatusFilter)}`,
              onClear: () => {
                setDeliveryStatusFilter("");
                setPage(1);
              },
            }
          : null,
        dateFrom
          ? {
              key: "from",
              label: `From: ${formatDate(dateFrom)}`,
              onClear: () => {
                setDateFrom("");
                setPage(1);
              },
            }
          : null,
        dateTo
          ? {
              key: "to",
              label: `To: ${formatDate(dateTo)}`,
              onClear: () => {
                setDateTo("");
                setPage(1);
              },
            }
          : null,
      ].filter(Boolean) as Array<{
        key: string;
        label: string;
        onClear: () => void;
      }>,
    [
      dateFrom,
      dateTo,
      deliveryStatusFilter,
      filters.search,
      setPage,
      setSearch,
    ],
  );

  const handleExport = useCallback(
    async (format: "xlsx" | "csv") => {
      try {
        setExportingFormat(format);
        setError(null);
        const token = getAuthToken();
        if (!token) throw new Error("Authentication required");
        await exportSales(token, listFilters, format);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Export failed");
      } finally {
        setExportingFormat(null);
      }
    },
    [listFilters],
  );

  function resetFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setDeliveryStatusFilter("");
    setSortBy("newest");
    setPerPage(20);
    setPage(1);
  }

  function applyDatePreset(preset: "today" | "week" | "month") {
    const today = new Date();
    const from = new Date(today);
    if (preset === "week") from.setDate(today.getDate() - 6);
    if (preset === "month") from.setDate(1);
    setDateFrom(formatDateInput(from));
    setDateTo(formatDateInput(today));
    setPage(1);
  }

  return (
    <PageShell>
      <PageHero
        eyebrow="Fulfillment"
        title="Delivery Orders"
        subtitle="View and manage online and delivery sales awaiting shipment or completion."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ActionButton
              variant="outline"
              onClick={() => void loadData()}
              disabled={loading}
              className="gap-2"
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </ActionButton>
            {permissions.canExport("sales") ? (
              <>
                <ActionButton
                  variant="outline"
                  size="sm"
                  disabled={!!exportingFormat}
                  onClick={() => void handleExport("xlsx")}
                  className="gap-1.5"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Excel
                </ActionButton>
                <ActionButton
                  variant="outline"
                  size="sm"
                  disabled={!!exportingFormat}
                  onClick={() => void handleExport("csv")}
                  className="gap-1.5"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  CSV
                </ActionButton>
              </>
            ) : null}
            {permissions.canCreate("sales") ? (
              <ActionButton
                tone="primary"
                onClick={() => router.push("/inventory/sales/create")}
                className="gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                Create Sale
              </ActionButton>
            ) : null}
          </div>
        }
      />

      {error ? (
        <InlineMessage tone="danger">{error}</InlineMessage>
      ) : null}

      <StatGrid>
        <StatCard
          label="Active queue"
          value={String(pageSummary.activeQueue)}
          tone="warning"
          hint="Orders not yet delivered"
        />
        <StatCard
          label="In transit"
          value={String(pageSummary.inTransit)}
          tone="primary"
          hint="Currently shipping"
        />
        <StatCard
          label="Delivered"
          value={String(pageSummary.delivered)}
          tone="success"
          hint="On this page"
        />
        <StatCard
          label="Page value"
          value={formatMoney(pageSummary.revenue)}
          tone="default"
          hint="Totals on current page"
        />
      </StatGrid>

      <FilterBar className="shadow-sm">
        <InputGroup label="Search orders" className="md:col-span-5 xl:col-span-6">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Order #, customer, phone, or item"
              value={filters.search || ""}
              onChange={(event) => setSearch(event.target.value)}
              className="form-input-base pl-10"
            />
          </div>
        </InputGroup>

        <InputGroup label="Delivery status" className="md:col-span-2">
          <SearchableSelect
            value={deliveryStatusFilter}
            onChange={(value) => {
              setDeliveryStatusFilter(value);
              setPage(1);
            }}
            options={DELIVERY_FILTERS}
            className="form-input-base"
          />
        </InputGroup>

        <InputGroup label="Sort" className="md:col-span-2">
          <SearchableSelect
            value={sortBy}
            onChange={(value) => {
              setSortBy(value as DeliverySort);
              setPage(1);
            }}
            options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "highest", label: "Highest total" },
              { value: "lowest", label: "Lowest total" },
            ]}
            className="form-input-base"
          />
        </InputGroup>

        <InputGroup label="Rows" className="md:col-span-1">
          <SearchableSelect
            value={perPage}
            onChange={(value) => {
              setPerPage(Number(value));
              setPage(1);
            }}
            options={[10, 20, 50, 100].map((value) => ({
              value,
              label: String(value),
            }))}
            className="form-input-base"
          />
        </InputGroup>

        <div className="flex items-end md:col-span-2 xl:col-span-1">
          <ActionButton
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setShowFilters((value) => !value)}
          >
            <FunnelIcon className="h-4 w-4" />
            Dates
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
          <ActionButton type="button" size="sm" variant="ghost" onClick={resetFilters}>
            <ArrowPathIcon className="h-4 w-4" />
            Reset view
          </ActionButton>
        </SurfaceCard>
      ) : null}

      {showFilters ? (
        <SurfaceCard>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="label-caps flex items-center gap-2 text-primary">
                <CalendarDaysIcon className="h-4 w-4" />
                Date range
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
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
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <InputGroup label="From date">
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setPage(1);
                }}
                className="form-input-base"
              />
            </InputGroup>
            <InputGroup label="To date">
              <input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setPage(1);
                }}
                className="form-input-base"
              />
            </InputGroup>
          </div>
        </SurfaceCard>
      ) : null}

      {loading ? (
        <SurfaceCard className="flex min-h-[280px] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </SurfaceCard>
      ) : orders.length === 0 ? (
        <EmptyState
          title="No delivery orders found"
          description="Try adjusting filters or create a new online or delivery sale."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:hidden">
            {orders.map((order) => (
              <SurfaceCard
                key={order.id}
                className="p-4 shadow-sm transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-3 border-b border-outline-variant/15 pb-3">
                  <div>
                    <p className="mono-data font-bold text-primary">
                      INV-{order.id}
                    </p>
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <StatusBadge tone={getDeliveryTone(order.delivery_status)}>
                    {titleCase(order.delivery_status)}
                  </StatusBadge>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <p className="font-medium text-on-surface">
                    {order.customer?.name || `Customer ${order.customer_id}`}
                  </p>
                  <p className="text-on-surface-variant line-clamp-2">
                    {resolveSaleAddress(order) || "No address"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="form-chip rounded-full">
                      {getChannelLabel(order.sale_type)}
                    </span>
                    <span className="form-chip rounded-full">
                      {order.line_items?.length || 0} items
                    </span>
                  </div>
                  <p className="mono-data font-bold text-primary">
                    {formatMoney(toNumber(order.total) || 0)}
                  </p>
                </div>
                <ActionButton
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() =>
                    router.push(`/inventory/delivery-orders/${order.id}`)
                  }
                >
                  Manage
                </ActionButton>
              </SurfaceCard>
            ))}
          </div>

          <DataTableCard className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/15 bg-surface-container-low text-left text-xs uppercase tracking-wider text-on-surface-variant">
                    <th className="px-5 py-4 font-bold">Order</th>
                    <th className="px-5 py-4 font-bold">Customer</th>
                    <th className="px-5 py-4 font-bold">Channel</th>
                    <th className="px-5 py-4 font-bold">Delivery</th>
                    <th className="px-5 py-4 font-bold">Address</th>
                    <th className="px-5 py-4 font-bold text-right">Total</th>
                    <th className="px-5 py-4 font-bold">Created</th>
                    <th className="px-5 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-surface-container-lowest"
                    >
                      <td className="px-5 py-4">
                        <p className="mono-data font-bold text-primary">
                          INV-{order.id}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {order.line_items?.length || 0} items
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-on-surface">
                          {order.customer?.name || `Customer ${order.customer_id}`}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {order.customer?.phone || "No phone"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="form-chip rounded-full">
                          {getChannelLabel(order.sale_type)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge tone={getDeliveryTone(order.delivery_status)}>
                          <TruckIcon className="mr-1 h-3.5 w-3.5" />
                          {titleCase(order.delivery_status)}
                        </StatusBadge>
                      </td>
                      <td className="max-w-[220px] px-5 py-4 text-on-surface-variant">
                        <p className="line-clamp-2">
                          {resolveSaleAddress(order) || "No address"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-primary tabular-nums">
                        {formatMoney(toNumber(order.total) || 0)}
                      </td>
                      <td className="px-5 py-4 text-on-surface-variant">
                        <span className="inline-flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          {formatDate(order.created_at)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <ActionButton
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/inventory/delivery-orders/${order.id}`)
                          }
                        >
                          Manage
                        </ActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataTableCard>
        </>
      )}

      {totalPages > 1 ? (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
        />
      ) : null}
    </PageShell>
  );
}
