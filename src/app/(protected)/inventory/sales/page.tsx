"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken, getAuthUser } from "@/lib/auth-session";
import { useEntityFilters } from "@/hooks/useEntityFilters";
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
  InputGroup,
  PageHero,
  PageShell,
  PaginationControls,
  SurfaceCard,
  StatusBadge,
  DataTableCard
} from "@/components/ops-ui";
import { ShoppingBagIcon, CurrencyDollarIcon, PlusIcon, TrashIcon, EyeIcon, ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function SalesPage() {
  const router = useRouter();
  const currentUser = getAuthUser();
  const isAdmin = currentUser?.role?.toLowerCase() === "admin";
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { filters, page, setPage, setSearch } = useEntityFilters();

  // Advanced filter states
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await listSales(token, page, {
        search: filters.search || undefined,
        status: statusFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });

      // Apply sorting on client side since backend might not support all sort options
      const sortedSales = [...result.items];
      if (sortBy === "newest") {
        sortedSales.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      } else if (sortBy === "oldest") {
        sortedSales.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
      } else if (sortBy === "highest") {
        sortedSales.sort((a, b) => (toNumber(b.total) || 0) - (toNumber(a.total) || 0));
      } else if (sortBy === "lowest") {
        sortedSales.sort((a, b) => (toNumber(a.total) || 0) - (toNumber(b.total) || 0));
      }

      setSales(sortedSales);
      setTotalPages(result.lastPage);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load sales"
      );
    } finally {
      setLoading(false);
    }
  }, [page, filters.search, dateFrom, dateTo, statusFilter, sortBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteSale = async (id: number) => {
    if (!isAdmin) {
      setError("Only admin users can delete sales.");
      return;
    }
    if (!confirm("Are you sure you want to delete this sale?")) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      await deleteSale(token, id);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete sale"
      );
    }
  };

  const getStatusTone = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "delivered":
        return "success";
      case "pending":
      case "in-transit":
        return "warning";
      case "cancelled":
        return "danger";
      default:
        return "default";
    }
  };

  return (
    <PageShell>
      <PageHero
        title="Sales"
        description="Manage, track, and monitor all your sales transactions efficiently."
        actions={
          <ActionButton
            tone="primary"
            variant="filled"
            onClick={() => router.push("/inventory/sales/create")}
            className="gap-2 shadow-sm"
          >
            <PlusIcon className="w-5 h-5 flex-shrink-0" />
            <span className="hidden sm:inline">Create New Sale</span>
            <span className="sm:hidden">Create</span>
          </ActionButton>
        }
      />

      {/* Search & Filters */}
      <FilterBar className="shadow-sm">
        <InputGroup label="Search Sales" className="md:col-span-12">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant/50">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by customer, sale ID or seller..."
              value={filters.search || ""}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input-base pl-10"
            />
          </div>
        </InputGroup>
      </FilterBar>

      {/* Advanced Filters Toggle & Summary */}
      <div className="flex items-center justify-between gap-3 animate-app-shell-enter">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant/30 hover:border-outline-variant/60 bg-surface-container-lowest text-on-surface font-medium text-sm transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          <ChevronDownIcon className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>

        {/* Active Filter Count */}
        {(dateFrom || dateTo || statusFilter) && (
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">
              {[dateFrom, dateTo, statusFilter].filter(Boolean).length}
            </span>
            <span>active</span>
          </div>
        )}

        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(
              e.target.value as "newest" | "oldest" | "highest" | "lowest",
            )
          }
          className="ml-auto px-4 py-2 rounded-xl border border-outline-variant/30 hover:border-outline-variant/60 bg-surface-container-lowest text-on-surface font-medium text-sm transition-all form-input-base"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Amount</option>
          <option value="lowest">Lowest Amount</option>
        </select>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest animate-app-shell-enter">
          <InputGroup label="From Date">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="form-input-base"
            />
          </InputGroup>
          <InputGroup label="To Date">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="form-input-base"
            />
          </InputGroup>
          <InputGroup label="Status">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input-base"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="partial">Partial</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </InputGroup>
          <div className="flex items-end">
            <ActionButton
              variant="outline"
              className="w-full"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setStatusFilter("");
              }}
            >
              <XMarkIcon className="w-4 h-4" />
              Clear Filters
            </ActionButton>
          </div>
        </div>
      )}


      {/* Error State */}
      {error && (
        <div className="rounded-2xl border border-error/30 bg-error-container p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <svg className="w-5 h-5 text-on-error-container flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-on-error-container text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Data Section */}
      {loading ? (
        <SurfaceCard className="min-h-[400px] flex items-center justify-center border-dashed">
          <div className="flex flex-col items-center gap-4 text-primary animate-pulse">
            <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin"/>
            <p className="text-sm font-semibold tracking-wide text-on-surface-variant uppercase">Loading Sales...</p>
          </div>
        </SurfaceCard>
      ) : sales.length === 0 ? (
        <EmptyState
          title="No Sales Found"
          description="You haven't recorded any sales yet. Click 'Create New Sale' to get started."
          action={
            <ActionButton
              tone="primary"
              variant="filled"
              onClick={() => router.push("/inventory/sales/create")}
            >
              Start First Sale
            </ActionButton>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Mobile Card Layout */}
          <div className="grid gap-4 lg:hidden">
            {sales.map((sale) => (
              <SurfaceCard key={sale.id} className="p-4 flex flex-col gap-4 shadow-sm hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-primary/10 text-primary">
                      <ShoppingBagIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">Sale #{sale.id}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {sale.created_at ? new Date(sale.created_at).toLocaleDateString() : "No Date"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge tone={getStatusTone(sale.status)}>{sale.status}</StatusBadge>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                  <div>
                    <p className="text-xs uppercase text-on-surface-variant tracking-wider font-semibold mb-1">Customer</p>
                    <p className="font-medium text-on-surface">{sale.customer?.name || `ID ${sale.customer_id}`}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-on-surface-variant tracking-wider font-semibold mb-1">Items</p>
                    <p className="font-medium text-on-surface">{sale.line_items?.length || 0} items</p>
                  </div>
                  <div className="col-span-2 p-3 rounded-xl bg-surface-container-highest/30 flex justify-between items-center">
                    <p className="text-xs uppercase text-on-surface-variant tracking-wider font-semibold">Total Amount</p>
                    <p className="font-bold text-base text-primary flex items-center gap-1">
                      <CurrencyDollarIcon className="w-4 h-4"/>
                      {(toNumber(sale.total) || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <ActionButton
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push(`/inventory/sales/${sale.id}`)}
                  >
                    View Details
                  </ActionButton>
                  {isAdmin ? (
                    <ActionButton
                      variant="outline"
                      tone="danger"
                      className="px-4"
                      onClick={() => handleDeleteSale(sale.id)}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </ActionButton>
                  ) : null}
                </div>
              </SurfaceCard>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden lg:block">
            <DataTableCard>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-container/50">
                    <tr className="border-b border-outline-variant/15">
                      <th className="px-6 py-4 text-left font-semibold text-on-surface-variant uppercase tracking-wider text-xs">Sale Info</th>
                      <th className="px-6 py-4 text-left font-semibold text-on-surface-variant uppercase tracking-wider text-xs">Customer/Seller</th>
                      <th className="px-6 py-4 text-center font-semibold text-on-surface-variant uppercase tracking-wider text-xs">Items</th>
                      <th className="px-6 py-4 text-center font-semibold text-on-surface-variant uppercase tracking-wider text-xs">Status</th>
                      <th className="px-6 py-4 text-right font-semibold text-on-surface-variant uppercase tracking-wider text-xs">Total Amount</th>
                      <th className="px-6 py-4 text-center font-semibold text-on-surface-variant uppercase tracking-wider text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <tr
                        key={sale.id}
                        className="border-b border-outline-variant/10 hover:bg-surface-container/30 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-on-surface">#{sale.id}</span>
                            <span className="text-xs text-on-surface-variant">
                              {sale.created_at ? new Date(sale.created_at).toLocaleDateString() : "No Date"}
                            </span>
                            <span className="inline-max-w-fit px-2 py-0.5 rounded-md bg-outline-variant/10 text-[10px] text-on-surface-variant uppercase font-semibold inline-block mt-1 w-max">
                              {sale.sale_type}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-on-surface font-medium">{sale.customer?.name || `Customer ${sale.customer_id}`}</span>
                            <span className="text-on-surface-variant text-xs">Seller {sale.seller?.name || sale.seller_id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface-container text-on-surface font-semibold text-xs border border-outline-variant/20">
                            {sale.line_items?.length || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <StatusBadge tone={getStatusTone(sale.status)}>
                            {sale.status}
                          </StatusBadge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-on-surface text-base">
                            ${(toNumber(sale.total) || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex gap-2 justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                            <ActionButton
                              variant="outline"
                              size="sm"
                              className="px-3"
                              onClick={() => router.push(`/inventory/sales/${sale.id}`)}
                            >
                              <EyeIcon className="w-4 h-4" />
                            </ActionButton>
                            {isAdmin ? (
                              <ActionButton
                                variant="outline"
                                tone="danger"
                                size="sm"
                                className="px-3"
                                onClick={() => handleDeleteSale(sale.id)}
                              >
                                <TrashIcon className="w-4 h-4" />
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

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPrevious={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      )}
    </PageShell>
  );
}
