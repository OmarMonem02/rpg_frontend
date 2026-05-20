"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuthToken, getAuthUser } from "@/lib/auth-session";
import {
  listCustomers,
  createCustomer,
  deleteCustomer,
  type CustomerRecord,
  type CreateCustomerPayload,
} from "@/lib/api/customers";
import { usePermissions } from "@/components/permission-provider";
import { EntityDrawer } from "@/components/entity-drawer";
import type { FieldConfig } from "@/components/entity-form-modal";
import {
  PageShell,
  PageHero,
  ActionButton,
  DataTableCard,
  EmptyState,
} from "@/components/ops-ui";

const customerFields: FieldConfig[] = [
  {
    name: "name",
    label: "Full Name",
    type: "text",
    required: true,
    span: 2,
    placeholder: "e.g. John Doe",
  },
  {
    name: "phone",
    label: "Phone Number",
    type: "text",
    required: true,
    placeholder: "e.g. +20 123 456 7890",
  },
  {
    name: "address",
    label: "Physical Address",
    type: "textarea",
    span: 2,
    placeholder: "Street, area, city (optional)",
  },
  {
    name: "how_did_you_know_us",
    label: "How did they find us?",
    type: "text",
    span: 2,
    placeholder: "e.g. Instagram, walk-in, referral…",
  },
  {
    name: "notes",
    label: "Internal notes",
    type: "textarea",
    span: 2,
    placeholder: "Optional notes for staff",
  },
];

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
  const permissions = usePermissions();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const search = (searchParams.get("search") || "").trim();

  const isAdmin = getAuthUser()?.role === "admin";
  const canCreateCustomer =
    isAdmin ||
    permissions.canCreate("sales") ||
    permissions.canCreate("maintenance");

  const [items, setItems] = useState<CustomerRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftSearch, setDraftSearch] = useState(search);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  async function handleCreateCustomer(data: Record<string, unknown>) {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required");
    const payload: CreateCustomerPayload = {
      name: String(data.name ?? "").trim(),
      phone: String(data.phone ?? "").trim(),
      address: data.address ? String(data.address).trim() : undefined,
      how_did_you_know_us: data.how_did_you_know_us
        ? String(data.how_did_you_know_us).trim()
        : undefined,
      notes: data.notes ? String(data.notes).trim() : undefined,
    };
    if (!payload.name || !payload.phone) {
      throw new Error("Name and phone are required");
    }
    setCreating(true);
    setCreateError(null);
    try {
      const customer = await createCustomer(token, payload);
      setCreateOpen(false);
      router.push(`/customers/${customer.id}?linkBike=1`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create customer";
      setCreateError(message);
      throw err;
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || !isAdmin) return;
    const token = getAuthToken();
    if (!token) {
      setError("Authentication required");
      return;
    }
    setDeletingId(deleteTarget.id);
    setError(null);
    try {
      await deleteCustomer(token, deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete customer");
    } finally {
      setDeletingId(null);
    }
  }

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
        actions={
          canCreateCustomer ? (
            <ActionButton tone="primary" onClick={() => setCreateOpen(true)}>
              New customer
            </ActionButton>
          ) : null
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
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/customers/${row.id}`}
                            className="text-sm font-semibold text-primary hover:underline"
                          >
                            Open workspace
                          </Link>
                          {isAdmin ? (
                            <button
                              type="button"
                              className="text-sm font-semibold text-error hover:underline disabled:opacity-50"
                              disabled={deletingId === row.id}
                              onClick={() => setDeleteTarget(row)}
                            >
                              {deletingId === row.id ? "Deleting…" : "Delete"}
                            </button>
                          ) : null}
                        </div>
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

      <EntityDrawer
        isOpen={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateError(null);
        }}
        title="New customer"
        description="Create a customer profile, then link one or more bikes on their workspace."
        fields={customerFields}
        onSubmit={handleCreateCustomer}
        submitLabel="Create & link bike"
        heroLabel="New customer"
        isLoading={creating}
        error={createError || undefined}
      />

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-[1.25rem] border border-outline-variant/20 bg-surface p-6 shadow-lg">
            <h3 className="font-display text-lg font-semibold text-on-surface">
              Delete customer?
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Remove{" "}
              <span className="font-medium text-on-surface">{deleteTarget.name}</span>
              ? This cannot be undone if the server allows deletion.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <ActionButton
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingId !== null}
              >
                Cancel
              </ActionButton>
              <ActionButton
                type="button"
                tone="danger"
                onClick={() => void handleConfirmDelete()}
                disabled={deletingId !== null}
              >
                {deletingId !== null ? "Deleting…" : "Delete"}
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
