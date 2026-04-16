"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import {
  listSales,
  deleteSale,
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
} from "@/components/ops-ui";

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { filters, page, setPage, setSearch } = useEntityFilters();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await listSales(token, page, {
        search: filters.search || undefined,
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
  }, [page, filters.search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteSale = async (id: number) => {
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

  return (
    <PageShell>
      <PageHero
        title="Sales"
        description="Manage all sales transactions"
        actions={
          <button
            onClick={() => router.push("/inventory/sales/create")}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-medium transition-colors"
          >
            Create Sale
          </button>
        }
      />

      {/* Search */}
      <FilterBar>
        <InputGroup label="Search">
          <input
            type="text"
            placeholder="Search by customer, sale ID..."
            value={filters.search || ""}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 rounded border border-outline bg-white text-on-surface"
          />
        </InputGroup>
      </FilterBar>

      {/* Error */}
      {error && (
        <SurfaceCard className="bg-error/10 border border-error/30">
          <p className="text-error text-sm">{error}</p>
        </SurfaceCard>
      )}

      {/* Table */}
      {loading ? (
        <SurfaceCard>
          <div className="flex items-center justify-center h-24">
            <p className="text-on-surface-variant">Loading...</p>
          </div>
        </SurfaceCard>
      ) : sales.length === 0 ? (
        <EmptyState
          title="No Sales"
          description="Create your first sale to get started"
          action={
            <button
              onClick={() => router.push("/inventory/sales/create")}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-medium transition-colors"
            >
              Create Sale
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container">
              <tr className="border-b border-outline-variant/15">
                <th className="px-5 py-3 text-left font-semibold text-on-surface">ID</th>
                <th className="px-5 py-3 text-left font-semibold text-on-surface">Customer</th>
                <th className="px-5 py-3 text-left font-semibold text-on-surface">Seller</th>
                <th className="px-5 py-3 text-right font-semibold text-on-surface">Total</th>
                <th className="px-5 py-3 text-center font-semibold text-on-surface">Type</th>
                <th className="px-5 py-3 text-center font-semibold text-on-surface">Status</th>
                <th className="px-5 py-3 text-center font-semibold text-on-surface">Items</th>
                <th className="px-5 py-3 text-left font-semibold text-on-surface">Created</th>
                <th className="px-5 py-3 text-center font-semibold text-on-surface">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b border-outline-variant/10 hover:bg-surface-container/50 transition-colors"
                >
                  <td className="px-5 py-3 font-medium text-on-surface">#{sale.id}</td>
                  <td className="px-5 py-3 text-on-surface">Customer {sale.customer_id}</td>
                  <td className="px-5 py-3 text-on-surface">Seller {sale.seller_id}</td>
                  <td className="px-5 py-3 text-right font-medium text-on-surface">
                    {sale.total_amount}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-block px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {sale.sale_type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-block px-2 py-1 rounded-full bg-surface-container text-on-surface text-xs font-medium">
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center text-on-surface">
                    {sale.line_items?.length || 0}
                  </td>
                  <td className="px-5 py-3 text-on-surface-variant text-xs">
                    {new Date(sale.created_at || "").toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <ActionButton
                        variant="outline"
                        onClick={() => router.push(`/inventory/sales/${sale.id}`)}
                      >
                        View
                      </ActionButton>
                      <ActionButton
                        variant="filled"
                        tone="danger"
                        onClick={() => handleDeleteSale(sale.id)}
                      >
                        Delete
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
