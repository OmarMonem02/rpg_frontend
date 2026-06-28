"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import { usePermissions } from "@/components/permission-provider";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import { useExportColumns } from "@/hooks/useExportColumns";
import { useGlobalDataRefresh } from "@/hooks/useGlobalDataRefresh";
import { fetchExportColumnCatalog, toExportColumnDefs } from "@/lib/api/export-columns";
import {
  listSales,
  deleteSale,
  exportSales,
  listPaymentMethods,
  toNumber,
  type PaymentMethodRecord,
  type SaleListFilters,
  type SaleRecord,
} from "@/lib/crud-api";
import { InventoryModuleFilters } from "@/components/inventory/InventoryModuleFilters";
import { ActiveFilterChips } from "@/components/inventory/ActiveFilterChips";
import { buildActiveFilterChips } from "@/lib/inventory-filter-utils";
import type { ModuleFilterOptions } from "@/lib/inventory-filter-config";
import {
  ActionButton,
  EmptyState,
  FilterBar,
  InlineMessage,
  InputGroup,
  PageHero,
  PageShell,
  PaginationControls,
  SearchableSelect,
  SurfaceCard,
  StatusBadge,
  DataTableCard,
} from "@/components/ops-ui";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ClockIcon,
  CurrencyDollarIcon,
  EyeIcon,
  FunnelIcon,
  PlusIcon,
  PhotoIcon,
  ShoppingBagIcon,
  TrashIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { ExportColumnPicker } from "@/components/export/ExportColumnPicker";
import {
  resolveDisplayTotal,
  saleHasReturns,
} from "@/lib/sale-line-pricing";

type SaleSort = "newest" | "oldest" | "highest" | "lowest";

const SALES_FILTER_OPTIONS: ModuleFilterOptions = {
  deliveryStatuses: [
    { value: "pending", label: "Pending" },
    { value: "in-transit", label: "In transit" },
    { value: "delivered", label: "Delivered" },
  ],
  saleTypes: [
    { value: "site", label: "In store" },
    { value: "online", label: "Online" },
    { value: "delivery", label: "Delivery" },
  ],
  itemTypes: [
    { value: "product", label: "Products" },
    { value: "spare_part", label: "Spare parts" },
    { value: "maintenance_part", label: "Maintenance parts" },
    { value: "maintenance_service", label: "Services" },
    { value: "bike", label: "Bikes" },
  ],
  statuses: [
    { value: "pending", label: "Pending" },
    { value: "partial", label: "Partial" },
    { value: "completed", label: "Completed" },
  ],
};

function saleFiltersFromParams(
  params: Record<string, unknown>,
  extras: Partial<SaleListFilters> = {},
): SaleListFilters {
  const { type, ...rest } = params;
  return {
    ...(rest as SaleListFilters),
    sale_type: typeof type === "string" ? type : undefined,
    ...extras,
  };
}

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
  const [exportingFormat, setExportingFormat] = useState<"xlsx" | "csv" | null>(
    null,
  );
  const [salesExportColumns, setSalesExportColumns] = useState(
    () => [] as ReturnType<typeof toExportColumnDefs>,
  );
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRecord[]>([]);

  const salesColumnState = useExportColumns("export-cols:sales", salesExportColumns);

  useEffect(() => {
    const loadColumns = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const catalog = await fetchExportColumnCatalog(token);
        setSalesExportColumns(toExportColumnDefs(catalog.sales.columns));
      } catch {
        // Keep empty defaults until catalog loads.
      }
    };
    void loadColumns();
  }, []);

  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const result = await listPaymentMethods(token, { page: 1, per_page: 100 });
        setPaymentMethods(result.items);
      } catch {
        // Keep empty until payment methods load.
      }
    };
    void loadPaymentMethods();
  }, []);

  const {
    filters,
    page,
    setPage,
    getModuleApiParams,
    setSearch,
    setCategory,
    setBrand,
    setBlueprint,
    setSector,
    setStatus,
    setType,
    setPriceMin,
    setPriceMax,
    setCurrency,
    setLowStock,
    setTags,
    setFilter,
    resetFilters,
  } = useEntityFilters();
  const sellerFilterId = Number(searchParams.get("seller_id") || 0) || undefined;
  const sellerFilterName = searchParams.get("seller_name") || "";

  const [sortBy, setSortBy] = useState<SaleSort>("newest");
  const [perPage, setPerPage] = useState(20);

  const filterOptions = useMemo(
    (): ModuleFilterOptions => ({
      ...SALES_FILTER_OPTIONS,
      paymentMethods: paymentMethods.map((method) => ({
        value: method.id,
        label: method.name,
      })),
    }),
    [paymentMethods],
  );

  const listFilters = useMemo(
    (): SaleListFilters =>
      saleFiltersFromParams(getModuleApiParams("sales"), {
        seller_id: sellerFilterId,
        sort: sortBy,
        per_page: perPage,
      }),
    [getModuleApiParams, sellerFilterId, sortBy, perPage],
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await listSales(token, page, listFilters);

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
  }, [listFilters, page]);

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

  const filterChips = useMemo(
    () =>
      buildActiveFilterChips(filters, {
        selectOptions: filterOptions,
        onClear: (key) => {
          if (key === "bike_compat") return;
          setFilter(key, undefined);
        },
        extraChips: sellerFilterId
          ? [
              {
                key: "seller",
                label: `Seller: ${sellerFilterName || `#${sellerFilterId}`}`,
                onClear: () => router.push("/inventory/sales"),
              },
            ]
          : [],
      }),
    [filters, filterOptions, router, sellerFilterId, sellerFilterName, setFilter],
  );

  const exportFilters = useMemo(
    (): SaleListFilters =>
      saleFiltersFromParams(getModuleApiParams("sales"), {
        seller_id: sellerFilterId,
        sort: sortBy,
      }),
    [getModuleApiParams, sellerFilterId, sortBy],
  );

  const handleExportSales = useCallback(
    async (format: "xlsx" | "csv") => {
      try {
        setExportingFormat(format);
        setError(null);
        const token = getAuthToken();
        if (!token) throw new Error("Authentication required");
        await exportSales(token, exportFilters, format, salesColumnState.columnsParam());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Export failed");
      } finally {
        setExportingFormat(null);
      }
    },
    [exportFilters, salesColumnState],
  );

  function resetOperationsFilters() {
    resetFilters();
    setSortBy("newest");
    setPerPage(20);
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

    setFilter("date_from", formatDateInput(from));
    setFilter("date_to", formatDateInput(today));
  }

  return (
    <PageShell>
      <PageHero
        eyebrow="Sales operations"
        title="Sales Command Center"
        actions={
          permissions.canCreate("sales") || permissions.canExport("sales") ? (
            <div className="flex w-full flex-wrap items-center justify-end gap-2">
              {permissions.canExport("sales") ? (
                <div
                  className="flex flex-wrap items-center gap-2 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest/80 p-1.5 shadow-inner"
                  title="Downloads all sales matching your current filters (up to 50,000 rows). Pagination does not limit the export."
                >
                  <span className="label-caps hidden px-2 text-on-surface-variant sm:inline">
                    Export
                  </span>
                  <ActionButton
                    type="button"
                    tone="default"
                    variant="outline"
                    size="sm"
                    disabled={!!exportingFormat}
                    onClick={() => void handleExportSales("xlsx")}
                    className="gap-1.5"
                  >
                    {exportingFormat === "xlsx" ? (
                      <ArrowPathIcon className="h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                      <ArrowDownTrayIcon className="h-4 w-4 shrink-0" />
                    )}
                    Excel
                  </ActionButton>
                  <ActionButton
                    type="button"
                    tone="default"
                    variant="outline"
                    size="sm"
                    disabled={!!exportingFormat}
                    onClick={() => void handleExportSales("csv")}
                    className="gap-1.5"
                  >
                    {exportingFormat === "csv" ? (
                      <ArrowPathIcon className="h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                      <ArrowDownTrayIcon className="h-4 w-4 shrink-0" />
                    )}
                    CSV
                  </ActionButton>
                </div>
              ) : null}
              {permissions.canReadPage("sales") ? (
                <ActionButton
                  tone="default"
                  variant="outline"
                  href="/invoices?source=sales"
                  className="gap-2"
                >
                  <PhotoIcon className="h-5 w-5 flex-shrink-0" />
                  <span className="hidden sm:inline">Invoice Gallery</span>
                  <span className="sm:hidden">Invoices</span>
                </ActionButton>
              ) : null}
              {permissions.canCreate("sales") ? (
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
              ) : null}
            </div>
          ) : null
        }
      />
      {permissions.canExport("sales") && salesExportColumns.length > 0 ? (
        <div className="mb-6">
          <ExportColumnPicker
            allColumns={salesExportColumns}
            orderedKeys={salesColumnState.orderedKeys}
            isVisible={salesColumnState.isVisible}
            onToggle={salesColumnState.toggle}
            onMove={salesColumnState.move}
            onReset={salesColumnState.reset}
            collapsible
            defaultCollapsed
          />
        </div>
      ) : null}
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
            <input
              type="text"
              placeholder="Sale #, customer, phone, seller, item, SKU or VIN"
              value={filters.search || ""}
              onChange={(event) => setSearch(event.target.value)}
              className="form-input-base pl-10"
            />
          </div>
        </InputGroup>

        <InputGroup label="Sort" className="md:col-span-2">
          <SearchableSelect
            value={sortBy}
            onChange={(value) => {
              setSortBy(value as SaleSort);
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
            <FunnelIcon className="h-7 w-4" />
            Filters
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </ActionButton>
        </div>
      </FilterBar>

      {filterChips.length > 0 ? (
        <SurfaceCard className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
          <ActiveFilterChips chips={filterChips} />
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

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <InputGroup label="From date">
              <input
                type="date"
                value={filters.date_from || ""}
                onChange={(event) =>
                  setFilter("date_from", event.target.value || undefined)
                }
                className="form-input-base"
              />
            </InputGroup>
            <InputGroup label="To date">
              <input
                type="date"
                value={filters.date_to || ""}
                onChange={(event) =>
                  setFilter("date_to", event.target.value || undefined)
                }
                className="form-input-base"
              />
            </InputGroup>
          </div>

          <InventoryModuleFilters
            module="sales"
            filters={filters}
            layout="panel"
            sections={["more"]}
            setters={{
              setSearch,
              setCategory,
              setBrand,
              setBlueprint,
              setSector,
              setStatus,
              setType,
              setPriceMin,
              setPriceMax,
              setCurrency,
              setLowStock,
              setTags,
              setFilter,
              setBikeCompatibility: () => {},
            }}
            options={filterOptions}
          />

          <div className="mt-4 flex justify-end">
            <ActionButton
              type="button"
              variant="outline"
              onClick={resetOperationsFilters}
            >
              Clear filters
            </ActionButton>
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
              const displayTotal = resolveDisplayTotal(sale);
              const hasReturns = saleHasReturns(sale);

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
                          {formatMoney(displayTotal)}
                        </p>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-on-surface-variant">
                        {itemPreview}
                      </p>
                    </div>
                    <div className="col-span-2 flex flex-wrap gap-2">
                      {hasReturns ? (
                        <StatusBadge tone="warning">Has returns</StatusBadge>
                      ) : null}
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
                      <th className="label-caps px-5 py-4 text-center">Delivery</th>
                      <th className="label-caps px-5 py-4 text-center">Items</th>
                      <th className="label-caps px-5 py-4 text-right">Total</th>
                      <th className="label-caps px-5 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => {
                      const displayTotal = resolveDisplayTotal(sale);
                      const hasReturns = saleHasReturns(sale);

                      return (
                      <tr key={sale.id} className="data-row group">
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="mono-data font-bold text-primary">
                              INV-{sale.id}
                            </span>
                            {hasReturns ? (
                              <StatusBadge tone="warning" className="mt-1 w-max">
                                Has returns
                              </StatusBadge>
                            ) : null}
                            <span className="mono-data text-xs text-on-surface-variant">
                              {formatDate(sale.created_at)}
                            </span>
                            <span className="form-chip text-caption mt-1 w-max rounded-md">
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
                            {formatMoney(displayTotal)}
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
                      );
                    })}
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
