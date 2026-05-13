"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import { usePermissions } from "@/components/permission-provider";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import { useGlobalDataRefresh } from "@/hooks/useGlobalDataRefresh";
import {
  listSales,
  deleteSale,
  toNumber,
  type SaleRecord,
} from "@/lib/crud-api";
import {
  ActionButton,
  EmptyState,
  FilterBar,
  InlineMessage,
  InputGroup,
  PageHero,
  PageShell,
  PaginationControls,
  SurfaceCard,
  StatusBadge,
  DataTableCard,
  StatCard,
  StatGrid,
} from "@/components/ops-ui";
import {
  ArrowPathIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ClockIcon,
  CurrencyDollarIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrashIcon,
  TruckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type SaleSort = "newest" | "oldest" | "highest" | "lowest";
type ItemTypeFilter = "" | "product" | "spare_part" | "maintenance_service" | "bike";

const SALE_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "completed", label: "Completed" },
];

const DELIVERY_STATUSES = [
  { value: "", label: "All delivery" },
  { value: "pending", label: "Pending" },
  { value: "in-transit", label: "In transit" },
  { value: "delivered", label: "Delivered" },
];

const SALE_TYPES = [
  { value: "", label: "All channels" },
  { value: "site", label: "In store" },
  { value: "online", label: "Online" },
  { value: "delivery", label: "Delivery" },
];

const ITEM_TYPES = [
  { value: "", label: "All item types" },
  { value: "product", label: "Products" },
  { value: "spare_part", label: "Spare parts" },
  { value: "maintenance_service", label: "Services" },
  { value: "bike", label: "Bikes" },
] satisfies Array<{ value: ItemTypeFilter; label: string }>;

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatMoney(value: number): string {
  return `EGP ${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string): string {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function titleCase(value?: string): string {
  if (!value) return "Not set";
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function SalesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const permissions = usePermissions();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { filters, page, setPage, setSearch } = useEntityFilters();
  const sellerFilterId = Number(searchParams.get("seller_id") || 0) || undefined;
  const sellerFilterName = searchParams.get("seller_name") || "";

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>("");
  const [saleTypeFilter, setSaleTypeFilter] = useState<string>("");
  const [itemTypeFilter, setItemTypeFilter] = useState<ItemTypeFilter>("");
  const [totalMin, setTotalMin] = useState("");
  const [totalMax, setTotalMax] = useState("");
  const [sortBy, setSortBy] = useState<SaleSort>("newest");
  const [perPage, setPerPage] = useState(20);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await listSales(token, page, {
        search: filters.search || undefined,
        seller_id: sellerFilterId,
        status: statusFilter || undefined,
        delivery_status: deliveryStatusFilter || undefined,
        sale_type: saleTypeFilter || undefined,
        item_type: itemTypeFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        total_min: totalMin ? Number(totalMin) : undefined,
        total_max: totalMax ? Number(totalMax) : undefined,
        sort: sortBy,
        per_page: perPage,
      });

      setSales(result.items);
      setTotalPages(result.lastPage);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load sales"
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    filters.search,
    sellerFilterId,
    dateFrom,
    dateTo,
    statusFilter,
    deliveryStatusFilter,
    saleTypeFilter,
    itemTypeFilter,
    totalMin,
    totalMax,
    sortBy,
    perPage,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useGlobalDataRefresh(loadData);

  const handleDeleteSale = async (id: number) => {
    if (!permissions.canDelete("sales")) {
      setError("You don't have permission to delete sales.");
      return;
    }
    if (!confirm("Are you sure you want to delete this sale?")) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      setDeletingId(id);
      await deleteSale(token, id);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete sale"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusTone = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "delivered":
        return "success";
      case "pending":
      case "in-transit":
      case "partial":
        return "warning";
      case "cancelled":
      case "returned":
        return "danger";
      default:
        return "default";
    }
  };

  const getDeliveryTone = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "success";
      case "in-transit":
        return "warning";
      case "pending":
        return "default";
      default:
        return "default";
    }
  };

  const pageSummary = useMemo(() => {
    const revenue = sales.reduce((sum, sale) => sum + (toNumber(sale.total) || 0), 0);
    const pendingCount = sales.filter((sale) =>
      ["pending", "partial"].includes(sale.status.toLowerCase()),
    ).length;
    const deliveryQueue = sales.filter((sale) =>
      sale.sale_type === "delivery" && sale.delivery_status !== "delivered",
    ).length;
    const itemCount = sales.reduce(
      (sum, sale) => sum + (sale.line_items?.length || 0),
      0,
    );

    return { revenue, pendingCount, deliveryQueue, itemCount };
  }, [sales]);

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
        sellerFilterId
          ? {
              key: "seller",
              label: `Seller: ${sellerFilterName || `#${sellerFilterId}`}`,
              onClear: () => router.push("/inventory/sales"),
            }
          : null,
        statusFilter
          ? {
              key: "status",
              label: `Status: ${titleCase(statusFilter)}`,
              onClear: () => {
                setStatusFilter("");
                setPage(1);
              },
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
        saleTypeFilter
          ? {
              key: "type",
              label: `Channel: ${titleCase(saleTypeFilter)}`,
              onClear: () => {
                setSaleTypeFilter("");
                setPage(1);
              },
            }
          : null,
        itemTypeFilter
          ? {
              key: "item",
              label: `Item: ${titleCase(itemTypeFilter)}`,
              onClear: () => {
                setItemTypeFilter("");
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
        totalMin
          ? {
              key: "min",
              label: `Min: ${formatMoney(Number(totalMin))}`,
              onClear: () => {
                setTotalMin("");
                setPage(1);
              },
            }
          : null,
        totalMax
          ? {
              key: "max",
              label: `Max: ${formatMoney(Number(totalMax))}`,
              onClear: () => {
                setTotalMax("");
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
      itemTypeFilter,
      router,
      saleTypeFilter,
      sellerFilterId,
      sellerFilterName,
      setPage,
      setSearch,
      statusFilter,
      totalMax,
      totalMin,
    ],
  );

  function resetOperationsFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("");
    setDeliveryStatusFilter("");
    setSaleTypeFilter("");
    setItemTypeFilter("");
    setTotalMin("");
    setTotalMax("");
    setSortBy("newest");
    setPerPage(20);
    setPage(1);
    if (sellerFilterId) router.push("/inventory/sales");
  }

  function applyDatePreset(preset: "today" | "week" | "month") {
    const today = new Date();
    const from = new Date(today);

    if (preset === "week") {
      from.setDate(today.getDate() - 6);
    } else if (preset === "month") {
      from.setDate(1);
    }

    setDateFrom(formatDateInput(from));
    setDateTo(formatDateInput(today));
    setPage(1);
  }

  return (
    <PageShell>
      <PageHero
        eyebrow="Sales operations"
        title="Sales Command Center"
        meta={
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3">
              <p className="label-caps flex items-center gap-2 text-primary">
                <BanknotesIcon className="h-4 w-4" />
                Visible revenue
              </p>
              <p className="mono-data mt-2 text-lg font-semibold text-on-surface">
                {formatMoney(pageSummary.revenue)}
              </p>
            </div>
            <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-3">
              <p className="label-caps flex items-center gap-2 text-on-surface-variant">
                <ClockIcon className="h-4 w-4" />
                Pending work
              </p>
              <p className="mono-data mt-2 text-lg font-semibold text-on-surface">
                {pageSummary.pendingCount} sales
              </p>
            </div>
          </div>
        }
        actions={
          permissions.canCreate("sales") ? (
            <ActionButton
              tone="primary"
              variant="filled"
              onClick={() => router.push("/inventory/sales/create")}
              className="gap-2 shadow-sm"
            >
              <PlusIcon className="h-5 w-5 flex-shrink-0" />
              <span className="hidden sm:inline">Create New Sale</span>
              <span className="sm:hidden">Create</span>
            </ActionButton>
          ) : null
        }
      />

      <StatGrid>
        <StatCard
          label="Visible sales"
          value={sales.length.toLocaleString()}
          hint={`${pageSummary.itemCount.toLocaleString()} line items on this page`}
          tone="primary"
        />
        <StatCard
          label="Revenue"
          value={formatMoney(pageSummary.revenue)}
          hint="Calculated from the current result page"
          tone="success"
        />
        <StatCard
          label="Pending or partial"
          value={pageSummary.pendingCount.toLocaleString()}
          hint="Needs cashier or fulfillment attention"
          tone={pageSummary.pendingCount > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Delivery queue"
          value={pageSummary.deliveryQueue.toLocaleString()}
          hint="Delivery sales not marked delivered"
          tone={pageSummary.deliveryQueue > 0 ? "warning" : "default"}
        />
      </StatGrid>

      {sellerFilterId ? (
        <InlineMessage tone="primary">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Viewing assigned sales for seller{" "}
              <span className="font-semibold">
                {sellerFilterName || `#${sellerFilterId}`}
              </span>
              .
            </span>
            <ActionButton
              type="button"
              size="sm"
              variant="outline"
              onClick={() => router.push("/inventory/sales")}
            >
              Clear seller filter
            </ActionButton>
          </div>
        </InlineMessage>
      ) : null}

      <FilterBar className="shadow-sm">
        <InputGroup label="Search Sales" className="md:col-span-5 xl:col-span-6">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/55" />
            <input
              type="text"
              placeholder="Sale #, customer, phone, seller, item, SKU or VIN"
              value={filters.search || ""}
              onChange={(event) => setSearch(event.target.value)}
              className="form-input-base pl-10"
            />
          </div>
        </InputGroup>

        <InputGroup label="Status" className="md:col-span-2">
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="form-input-base"
          >
            {SALE_STATUSES.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </InputGroup>

        <InputGroup label="Sort" className="md:col-span-2">
          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as SaleSort);
              setPage(1);
            }}
            className="form-input-base"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest total</option>
            <option value="lowest">Lowest total</option>
          </select>
        </InputGroup>

        <InputGroup label="Rows" className="md:col-span-1">
          <select
            value={perPage}
            onChange={(event) => {
              setPerPage(Number(event.target.value));
              setPage(1);
            }}
            className="form-input-base"
          >
            {[10, 20, 50, 100].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </InputGroup>

        <div className="flex items-end md:col-span-2 xl:col-span-1">
          <ActionButton
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setShowFilters((value) => !value)}
          >
            <FunnelIcon className="h-4 w-4" />
            Filters
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
            onClick={resetOperationsFilters}
          >
            <ArrowPathIcon className="h-4 w-4" />
            Reset view
          </ActionButton>
        </SurfaceCard>
      ) : null}

      {showFilters ? (
        <SurfaceCard className="animate-app-shell-enter">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="label-caps flex items-center gap-2 text-primary">
                <CalendarDaysIcon className="h-4 w-4" />
                Operations filters
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Narrow the queue by date, delivery, channel, item type, and total amount.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton type="button" size="sm" variant="outline" onClick={() => applyDatePreset("today")}>
                Today
              </ActionButton>
              <ActionButton type="button" size="sm" variant="outline" onClick={() => applyDatePreset("week")}>
                7 days
              </ActionButton>
              <ActionButton type="button" size="sm" variant="outline" onClick={() => applyDatePreset("month")}>
                This month
              </ActionButton>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
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
            <InputGroup label="Delivery status">
              <select
                value={deliveryStatusFilter}
                onChange={(event) => {
                  setDeliveryStatusFilter(event.target.value);
                  setPage(1);
                }}
                className="form-input-base"
              >
                {DELIVERY_STATUSES.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </InputGroup>
            <InputGroup label="Sales channel">
              <select
                value={saleTypeFilter}
                onChange={(event) => {
                  setSaleTypeFilter(event.target.value);
                  setPage(1);
                }}
                className="form-input-base"
              >
                {SALE_TYPES.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </InputGroup>
            <InputGroup label="Item type">
              <select
                value={itemTypeFilter}
                onChange={(event) => {
                  setItemTypeFilter(event.target.value as ItemTypeFilter);
                  setPage(1);
                }}
                className="form-input-base"
              >
                {ITEM_TYPES.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </InputGroup>
            <InputGroup label="Min total">
              <input
                type="number"
                min="0"
                value={totalMin}
                onChange={(event) => {
                  setTotalMin(event.target.value);
                  setPage(1);
                }}
                placeholder="0.00"
                className="form-input-base"
              />
            </InputGroup>
            <InputGroup label="Max total">
              <input
                type="number"
                min="0"
                value={totalMax}
                onChange={(event) => {
                  setTotalMax(event.target.value);
                  setPage(1);
                }}
                placeholder="0.00"
                className="form-input-base"
              />
            </InputGroup>
            <div className="flex items-end">
              <ActionButton
                type="button"
                variant="outline"
                className="w-full"
                onClick={resetOperationsFilters}
              >
                <XMarkIcon className="h-4 w-4" />
                Clear filters
              </ActionButton>
            </div>
          </div>
        </SurfaceCard>
      ) : null}

      {error ? (
        <InlineMessage tone="danger">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-medium">{error}</span>
            <ActionButton type="button" size="sm" variant="outline" onClick={loadData}>
              Retry
            </ActionButton>
          </div>
        </InlineMessage>
      ) : null}

      {loading ? (
        <DataTableCard>
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-2xl bg-surface-container"
              />
            ))}
          </div>
        </DataTableCard>
      ) : sales.length === 0 ? (
        <EmptyState
          title="No Sales Found"
          description="No sales match the current operations view. Adjust filters or create a new sale to start the workflow."
          action={
            permissions.canCreate("sales") ? (
              <ActionButton
                tone="primary"
                variant="filled"
                onClick={() => router.push("/inventory/sales/create")}
              >
                Start First Sale
              </ActionButton>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:hidden">
            {sales.map((sale) => {
              const itemPreview =
                sale.line_items
                  ?.slice(0, 2)
                  .map((item) => item.item_name || item.item_label)
                  .filter(Boolean)
                  .join(", ") || "No item preview";

              return (
                <SurfaceCard
                  key={sale.id}
                  className="p-4 shadow-sm transition-colors hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-outline-variant/15 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                        <ShoppingBagIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="mono-data font-bold text-primary">INV-{sale.id}</p>
                        <p className="mt-0.5 text-xs text-on-surface-variant">
                          {formatDate(sale.created_at)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge tone={getStatusTone(sale.status)}>
                      {titleCase(sale.status)}
                    </StatusBadge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="label-caps mb-1">Customer</p>
                      <p className="font-medium text-on-surface">
                        {sale.customer?.name || `Customer ${sale.customer_id}`}
                      </p>
                    </div>
                    <div>
                      <p className="label-caps mb-1">Seller</p>
                      <p className="font-medium text-on-surface">
                        {sale.seller?.name || (sale.seller_id ? `Seller ${sale.seller_id}` : "Unassigned")}
                      </p>
                    </div>
                    <div className="col-span-2 rounded-2xl bg-surface-container-highest/30 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="label-caps">Total amount</p>
                        <p className="mono-data flex items-center gap-1 font-bold text-primary">
                          <CurrencyDollarIcon className="h-4 w-4" />
                          {formatMoney(toNumber(sale.total) || 0)}
                        </p>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-on-surface-variant">
                        {itemPreview}
                      </p>
                    </div>
                    <div className="col-span-2 flex flex-wrap gap-2">
                      <StatusBadge tone={getDeliveryTone(sale.delivery_status)}>
                        <TruckIcon className="mr-1 h-3.5 w-3.5" />
                        {titleCase(sale.delivery_status)}
                      </StatusBadge>
                      <span className="form-chip rounded-full">
                        {titleCase(sale.sale_type)}
                      </span>
                      <span className="form-chip rounded-full">
                        {sale.line_items?.length || 0} items
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <ActionButton
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push(`/inventory/sales/${sale.id}`)}
                    >
                      View Details
                    </ActionButton>
                    {permissions.canDelete("sales") ? (
                      <ActionButton
                        variant="outline"
                        tone="danger"
                        className="px-4"
                        disabled={deletingId === sale.id}
                        onClick={() => handleDeleteSale(sale.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </ActionButton>
                    ) : null}
                  </div>
                </SurfaceCard>
              );
            })}
          </div>

          <div className="hidden lg:block">
            <DataTableCard>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-container/50">
                    <tr className="border-b border-outline-variant/15">
                      <th className="label-caps px-5 py-4 text-left">Invoice</th>
                      <th className="label-caps px-5 py-4 text-left">Customer</th>
                      <th className="label-caps px-5 py-4 text-left">Seller / Payment</th>
                      <th className="label-caps px-5 py-4 text-center">Status</th>
                      <th className="label-caps px-5 py-4 text-center">Delivery</th>
                      <th className="label-caps px-5 py-4 text-center">Items</th>
                      <th className="label-caps px-5 py-4 text-right">Total</th>
                      <th className="label-caps px-5 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <tr key={sale.id} className="data-row group">
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="mono-data font-bold text-primary">
                              INV-{sale.id}
                            </span>
                            <span className="mono-data text-xs text-on-surface-variant">
                              {formatDate(sale.created_at)}
                            </span>
                            <span className="form-chip mt-1 w-max rounded-md text-[10px]">
                              {titleCase(sale.sale_type)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-on-surface">
                              {sale.customer?.name || `Customer ${sale.customer_id}`}
                            </span>
                            <span className="text-xs text-on-surface-variant">
                              {sale.customer?.phone || "No phone on record"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-on-surface">
                              {sale.seller?.name || (sale.seller_id ? `Seller ${sale.seller_id}` : "Unassigned")}
                            </span>
                            <span className="text-xs text-on-surface-variant">
                              {sale.payment_method_name || "Payment method not set"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <StatusBadge tone={getStatusTone(sale.status)}>
                            {titleCase(sale.status)}
                          </StatusBadge>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <StatusBadge tone={getDeliveryTone(sale.delivery_status)}>
                            {titleCase(sale.delivery_status)}
                          </StatusBadge>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-outline-variant/20 bg-surface-container px-2 text-xs font-semibold text-on-surface">
                            {sale.line_items?.length || 0}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="mono-data text-base font-semibold text-on-surface">
                            {formatMoney(toNumber(sale.total) || 0)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex justify-center gap-2 opacity-75 transition-opacity group-hover:opacity-100">
                            <ActionButton
                              variant="outline"
                              size="sm"
                              className="px-3"
                              onClick={() => router.push(`/inventory/sales/${sale.id}`)}
                            >
                              <EyeIcon className="h-4 w-4" />
                              View
                            </ActionButton>
                            {permissions.canDelete("sales") ? (
                              <ActionButton
                                variant="outline"
                                tone="danger"
                                size="sm"
                                className="px-3"
                                disabled={deletingId === sale.id}
                                onClick={() => handleDeleteSale(sale.id)}
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
            </DataTableCard>
          </div>
        </div>
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

export default function SalesPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <SurfaceCard className="min-h-[400px] flex items-center justify-center border-dashed">
            <div className="flex flex-col items-center gap-4 text-primary animate-pulse">
              <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-sm font-semibold tracking-wide text-on-surface-variant uppercase">
                Loading Sales...
              </p>
            </div>
          </SurfaceCard>
        </PageShell>
      }
    >
      <SalesPageContent />
    </Suspense>
  );
}
