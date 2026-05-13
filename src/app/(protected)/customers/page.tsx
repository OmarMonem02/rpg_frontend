"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import { listCustomers, type CustomerRecord } from "@/lib/api/customers";
import {
  PageShell,
  PageHero,
  ActionButton,
  DataTableCard,
  EmptyState,
} from "@/components/ops-ui";

export default function CustomersDirectoryPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="flex h-48 items-center justify-center text-on-surface-variant">
            Loading…
          </div>
        </PageShell>
      }
    >
      <CustomersDirectoryContent />
    </Suspense>
  );
}

function CustomersDirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const search = (searchParams.get("search") || "").trim();

  const [items, setItems] = useState<CustomerRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftSearch, setDraftSearch] = useState(search);

  const load = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      setLoading(true);
      setError(null);
      const res = await listCustomers(token, page, {
        search: search || undefined,
        per_page: 20,
      });
      setItems(res.items);
      setCurrentPage(res.currentPage);
      setLastPage(res.lastPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    setDraftSearch(search);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams();
    if (draftSearch) q.set("search", draftSearch);
    q.set("page", "1");
    router.push(`/customers?${q.toString()}`);
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="Sales & maintenance"
        title="Customers"
        meta={
          <p className="text-sm leading-relaxed text-on-surface-variant">
            Search the customer directory and open a workspace with bikes, sales
            history, and tickets.
          </p>
        }
      />

      <form
        onSubmit={applySearch}
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label
            htmlFor="customer-search"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
          >
            Search
          </label>
          <input
            id="customer-search"
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            placeholder="Name or phone"
            className="w-full rounded-xl border border-outline-variant/25 bg-surface px-4 py-3 text-sm text-on-surface outline-none ring-primary/30 focus:ring-2"
          />
        </div>
        <ActionButton type="submit" tone="primary" className="shrink-0">
          Search
        </ActionButton>
      </form>

      {error ? (
        <div className="mb-6 rounded-2xl border border-error/30 bg-error-container p-4 text-sm text-on-error-container">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex h-56 flex-col items-center justify-center gap-3 text-on-surface-variant">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="font-medium">Loading customers…</p>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No customers found"
          description={
            search
              ? "Try a different name or phone number."
              : "No customer records yet, or your search returned nothing."
          }
        />
      ) : (
        <>
          <DataTableCard className="overflow-hidden border-outline-variant/10 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-on-surface">
                <thead className="border-b border-outline-variant/20 bg-surface-container-low text-on-surface-variant">
                  <tr>
                    <th className="label-caps px-6 py-4">Name</th>
                    <th className="label-caps px-6 py-4">Phone</th>
                    <th className="label-caps px-6 py-4">Address</th>
                    <th className="label-caps px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5 bg-surface">
                  {items.map((row) => (
                    <tr key={row.id} className="data-row group">
                      <td className="px-6 py-4">
                        <Link
                          href={`/customers/${row.id}`}
                          className="font-semibold text-on-surface group-hover:text-primary"
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {row.phone || "—"}
                      </td>
                      <td className="max-w-xs truncate px-6 py-4 text-on-surface-variant">
                        {row.address || "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/customers/${row.id}`}
                          className="text-sm font-semibold text-primary hover:underline"
                        >
                          Open workspace
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataTableCard>

          {lastPage > 1 ? (
            <div className="mt-6 flex items-center justify-between gap-4 text-sm text-on-surface-variant">
              <span>
                Page {currentPage} of {lastPage}
              </span>
              <div className="flex gap-2">
                <ActionButton
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => {
                    const q = new URLSearchParams(searchParams.toString());
                    q.set("page", String(Math.max(1, currentPage - 1)));
                    router.push(`/customers?${q.toString()}`);
                  }}
                >
                  Previous
                </ActionButton>
                <ActionButton
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= lastPage}
                  onClick={() => {
                    const q = new URLSearchParams(searchParams.toString());
                    q.set("page", String(Math.min(lastPage, currentPage + 1)));
                    router.push(`/customers?${q.toString()}`);
                  }}
                >
                  Next
                </ActionButton>
              </div>
            </div>
          ) : null}
        </>
      )}
    </PageShell>
  );
}
