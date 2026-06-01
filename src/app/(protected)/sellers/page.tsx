"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import { ApiError } from "@/lib/auth-api";
import { getAuthToken } from "@/lib/auth-session";
import {
  createSeller,
  deleteSeller,
  listSellers,
  updateSeller,
  type SellerListFilters,
  type SellerRecord,
  type SellerSummary,
} from "@/lib/crud-api";
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
  StatusBadge,
  SurfaceCard,
} from "@/components/ops-ui";

type SellerFormState = {
  name: string;
  commission_rate: string;
  phone: string;
};

const initialForm: SellerFormState = {
  name: "",
  commission_rate: "",
  phone: "",
};

function getSellerInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "S";
}

function formatCommissionRate(value: number): string {
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  })}%`;
}

function formatMoney(value: number): string {
  return `EGP ${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function getAverageCommission(records: SellerRecord[]): number {
  if (records.length === 0) return 0;
  return records.reduce((sum, record) => sum + record.commission_rate, 0) / records.length;
}

function getPageSummary(records: SellerRecord[]): SellerSummary {
  return {
    totalSellers: records.length,
    commissionedSellers: records.filter((record) => record.commission_rate > 0).length,
    highCommissionSellers: records.filter((record) => record.commission_rate >= 10).length,
    contactReadySellers: records.filter(hasSellerPhone).length,
    completedSalesCount: records.reduce((sum, record) => sum + record.completed_sales_count, 0),
    commissionBase: records.reduce((sum, record) => sum + record.commission_base, 0),
    commissionAmount: records.reduce((sum, record) => sum + record.commission_amount, 0),
    averageCommissionRate: getAverageCommission(records),
  };
}

function hasSellerPhone(record: SellerRecord): boolean {
  return Boolean(record.phone?.trim());
}

export default function SellersPage() {
  const router = useRouter();
  const permissions = usePermissions();
  const [records, setRecords] = useState<SellerRecord[]>([]);
  const [summary, setSummary] = useState<SellerSummary | undefined>();
  const [form, setForm] = useState<SellerFormState>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [perPage, setPerPage] = useState(20);
  const canCreateSellers = permissions.canCreate("sellers");
  const canUpdateSellers = permissions.canUpdate("sellers");
  const canDeleteSellers = permissions.canDelete("sellers");
  const canReadSales = permissions.canReadPage("sales");
  const sellerFilters = useMemo<SellerListFilters>(
    () => ({
      search: search || undefined,
      sort,
      per_page: perPage,
    }),
    [perPage, search, sort],
  );
  const pageSummary = useMemo(() => getPageSummary(records), [records]);
  const dashboardSummary = summary ?? pageSummary;
  const averageCommission = dashboardSummary.averageCommissionRate;
  const hasActiveFilters = Boolean(search);
  const currentEditingRecord = editingId ? records.find((record) => record.id === editingId) : null;
  const formHeading = editingId ? "Edit Seller" : "Create Seller";
  const formDescription = editingId
    ? "Update seller profile details, phone contact, and commission rate."
    : "Create a seller profile that can be linked to sales and commission reporting.";
  const canShowSellerForm = isFormOpen && (canCreateSellers || Boolean(editingId));

  const loadSellers = useCallback(async (nextPage: number) => {
    const token = getAuthToken();
    if (!token) {
      setError("You are not authenticated. Please sign in again.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await listSellers(token, nextPage, sellerFilters);
      setRecords(response.items);
      setPage(response.currentPage);
      setLastPage(response.lastPage);
      setSummary(response.summary);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to load sellers at the moment.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [sellerFilters]);

  useEffect(() => {
    loadSellers(page);
  }, [loadSellers, page]);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setIsFormOpen(false);
  }

  function openCreateForm() {
    if (!canCreateSellers) return;
    setForm(initialForm);
    setEditingId(null);
    setIsFormOpen(true);
    setMessage("");
    setError("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((editingId && !canUpdateSellers) || (!editingId && !canCreateSellers)) {
      setError("You do not have permission to save sellers.");
      return;
    }
    const token = getAuthToken();
    if (!token) {
      setError("You are not authenticated. Please sign in again.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");
    const payload = {
      name: form.name.trim(),
      commission_rate: Number(form.commission_rate),
      phone: form.phone.trim(),
    };

    try {
      if (editingId) {
        await updateSeller(token, editingId, payload);
        setMessage("Seller updated successfully.");
      } else {
        await createSeller(token, payload);
        setMessage("Seller created successfully.");
      }
      resetForm();
      await loadSellers(page);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to save this seller right now.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDelete(id: number) {
    if (!canDeleteSellers) {
      setError("You do not have permission to delete sellers.");
      return;
    }
    const token = getAuthToken();
    if (!token) {
      setError("You are not authenticated. Please sign in again.");
      return;
    }

    if (!window.confirm("Delete this seller permanently?")) return;

    setError("");
    setMessage("");
    setDeletingId(id);
    try {
      await deleteSeller(token, id);
      setMessage("Seller deleted successfully.");
      await loadSellers(page);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to delete this seller right now.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  function onEdit(record: SellerRecord) {
    if (!canUpdateSellers) return;
    setEditingId(record.id);
    setIsFormOpen(true);
    setForm({
      name: record.name,
      commission_rate: String(record.commission_rate),
      phone: record.phone ?? "",
    });
    setMessage("");
    setError("");
  }

  function applyFilters(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setSort("newest");
    setPerPage(20);
    setPage(1);
  }

  function renderSellerActions(record: SellerRecord, align: "start" | "end" = "start") {
    const canViewHistory = permissions.canReadPage("sellers");

    if (!canViewHistory && !canReadSales && !canUpdateSellers && !canDeleteSellers) {
      return (
        <span className="text-xs font-medium text-on-surface-variant">
          Read only
        </span>
      );
    }

    return (
      <div className={`flex flex-wrap gap-2 ${align === "end" ? "justify-end" : ""}`.trim()}>
        {canViewHistory ? (
          <ActionButton
            type="button"
            size="sm"
            variant="outline"
            disabled={deletingId === record.id}
            className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
            onClick={() => router.push(`/sellers/${record.id}/history`)}
          >
            View seller history
          </ActionButton>
        ) : null}
        {canReadSales ? (
          <ActionButton
            type="button"
            size="sm"
            variant="outline"
            disabled={deletingId === record.id}
            className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
            onClick={() =>
              router.push(
                `/inventory/sales?seller_id=${record.id}&seller_name=${encodeURIComponent(record.name)}`,
              )
            }
          >
            View sales
          </ActionButton>
        ) : null}
        {canUpdateSellers ? (
          <ActionButton
            type="button"
            size="sm"
            variant="outline"
            disabled={deletingId === record.id}
            onClick={() => onEdit(record)}
          >
            Edit
          </ActionButton>
        ) : null}
        {canDeleteSellers ? (
          <button
            type="button"
            onClick={() => onDelete(record.id)}
            disabled={deletingId === record.id}
            className="inline-flex items-center justify-center rounded-xl bg-error-container px-3 py-1.5 text-xs font-semibold text-on-error-container transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
          >
            {deletingId === record.id ? "Deleting..." : "Delete"}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <PageShell>
      <PageHero
        eyebrow="Admin"
        title="Sellers"
        actions={
          canCreateSellers ? (
            <ActionButton
              type="button"
              tone="primary"
              onClick={openCreateForm}
            >
              Add Seller
            </ActionButton>
          ) : null
        }
      />

      {canShowSellerForm ? (
        <SurfaceCard className="overflow-hidden bg-surface-container-lowest p-0 shadow-ambient">
          <div id="seller-form" className="border-b border-outline-variant/15 bg-surface-container-low px-4 py-4 md:px-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusBadge tone={editingId ? "primary" : "default"}>
                    {editingId ? "Editing seller" : "New seller"}
                  </StatusBadge>
                  {currentEditingRecord ? (
                    <span className="mono-data rounded-full border border-outline-variant/15 bg-surface px-3 py-1 text-xs text-on-surface-variant">
                      ID {currentEditingRecord.id}
                    </span>
                  ) : null}
                </div>
                <h2 className="text-2xl font-bold text-on-surface">{formHeading}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">
                  {formDescription}
                </p>
              </div>
              <div className="rounded-2xl border border-outline-variant/15 bg-surface px-3 py-2">
                <p className="label-caps">Average Rate</p>
                <p className="mono-data mt-1 text-sm font-semibold text-primary">
                  {formatCommissionRate(averageCommission)}
                </p>
              </div>
            </div>
          </div>

          <form className="grid gap-5 p-4 md:p-5" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="label-caps">Name</span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                  className="form-input-base"
                  placeholder="Seller name"
                />
              </label>

              <label className="space-y-2">
                <span className="label-caps">Commission Rate</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.commission_rate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      commission_rate: event.target.value,
                    }))
                  }
                  required
                  className="form-input-base"
                  placeholder="5"
                />
              </label>

              <label className="space-y-2">
                <span className="label-caps">Phone</span>
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  required
                  className="form-input-base"
                  placeholder="+20##########"
                />
              </label>

              <div className="flex flex-wrap gap-2 md:col-span-2">
                <ActionButton
                  type="submit"
                  disabled={isSubmitting}
                  tone="primary"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingId
                      ? "Update Seller"
                      : "Create Seller"}
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  {editingId ? "Cancel Edit" : "Cancel"}
                </ActionButton>
              </div>
            </div>
          </form>
        </SurfaceCard>
      ) : null}

      {!canCreateSellers && !canUpdateSellers ? (
        <InlineMessage tone="default">
          Your account can read sellers, but it cannot create or update them.
        </InlineMessage>
      ) : null}

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
      {message ? <InlineMessage tone="primary">{message}</InlineMessage> : null}

      <FilterBar>
        <form className="grid gap-3 md:col-span-7 md:grid-cols-7" onSubmit={applyFilters}>
          <InputGroup label="Search Sellers" className="md:col-span-5">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="form-input-base"
              placeholder="Search by name, phone, or ID..."
            />
          </InputGroup>
          <div className="flex items-end gap-2 md:col-span-2">
            <ActionButton type="submit" tone="primary" className="flex-1">
              Search
            </ActionButton>
            {hasActiveFilters ? (
              <ActionButton type="button" variant="outline" onClick={clearFilters}>
                Clear
              </ActionButton>
            ) : null}
          </div>
        </form>
      </FilterBar>

      <DataTableCard>
        <div className="border-b border-outline-variant/15 bg-surface-container-low px-4 py-4 md:px-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="label-caps">Directory</p>
              <h2 className="mt-1 text-2xl font-bold text-on-surface">
                Sellers List
              </h2>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-outline-variant/25 border-t-primary" />
            <div>
              <p className="font-semibold text-on-surface">Loading sellers</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Syncing the latest seller directory.
              </p>
            </div>
          </div>
        ) : records.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={hasActiveFilters ? "No sellers match your search" : "No sellers found"}
              description={
                hasActiveFilters
                  ? "Adjust or clear the current search to return to the full seller directory."
                  : "Create the first seller profile to start tracking commissions and sales attribution."
              }
              action={
                hasActiveFilters ? (
                  <ActionButton type="button" variant="outline" onClick={clearFilters}>
                    Clear Search
                  </ActionButton>
                ) : canCreateSellers ? (
                  <ActionButton
                    type="button"
                    tone="primary"
                    onClick={openCreateForm}
                  >
                    Add Seller
                  </ActionButton>
                ) : null
              }
            />
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-3 lg:hidden">
              {records.map((record) => (
                <article
                  key={record.id}
                  className="rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-lowest p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-container font-display text-sm font-bold text-on-primary-container">
                      {getSellerInitials(record.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold text-on-surface">
                        {record.name}
                      </h3>
                      <p className="mono-data mt-1 text-xs text-on-surface-variant">
                        ID {record.id}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusBadge tone={hasSellerPhone(record) ? "primary" : "default"}>
                      {hasSellerPhone(record) ? "Contact ready" : "Missing phone"}
                    </StatusBadge>
                  </div>

                  <div className="mt-4 grid gap-2 rounded-xl border border-outline-variant/10 bg-surface px-3 py-2">
                    <div>
                      <p className="label-caps">Completed Sales (this month)</p>
                      <p className="mono-data mt-1 text-sm font-semibold text-on-surface">
                        {record.completed_sales_count}
                      </p>
                    </div>
                    <div>
                      <p className="label-caps">Commission</p>
                      <p className="mono-data mt-1 text-sm font-semibold text-primary">
                        {formatCommissionRate(record.commission_rate)}
                      </p>
                    </div>
                    <div>
                      <p className="label-caps">Sales Base (this month)</p>
                      <p className="mono-data mt-1 text-sm font-semibold text-on-surface">
                        {formatMoney(record.commission_base)}
                      </p>
                    </div>
                    <div>
                      <p className="label-caps">Earned (this month)</p>
                      <p className="mono-data mt-1 text-sm font-semibold text-primary">
                        {formatMoney(record.commission_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="label-caps">Phone</p>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {record.phone?.trim() || "No phone"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-outline-variant/10 pt-3">
                    {renderSellerActions(record)}
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                    <th className="label-caps px-4 py-3">Seller</th>
                    <th className="label-caps px-4 py-3">Rate</th>
                    <th className="label-caps px-4 py-3">
                      <span>Completed Sales</span>
                      <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-on-surface-variant/80">
                        This month
                      </span>
                    </th>
                    <th className="label-caps px-4 py-3">
                      <span>Sales Base</span>
                      <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-on-surface-variant/80">
                        This month
                      </span>
                    </th>
                    <th className="label-caps px-4 py-3">
                      <span>Earned</span>
                      <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-on-surface-variant/80">
                        This month
                      </span>
                    </th>
                    <th className="label-caps px-4 py-3">Contact</th>
                    <th className="label-caps px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="data-row">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-container font-display text-sm font-bold text-on-primary-container">
                            {getSellerInitials(record.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-on-surface">{record.name}</p>
                            <p className="mono-data mt-0.5 text-xs text-on-surface-variant">
                              ID {record.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <span className="mono-data text-sm font-semibold text-primary">
                            {formatCommissionRate(record.commission_rate)}
                          </span>
                        </div>
                      </td>
                      <td className="mono-data px-4 py-4 text-on-surface">
                        {record.completed_sales_count}
                      </td>
                      <td className="mono-data px-4 py-4 text-on-surface">
                        {formatMoney(record.commission_base)}
                      </td>
                      <td className="mono-data px-4 py-4 font-semibold text-primary">
                        {formatMoney(record.commission_amount)}
                      </td>
                      <td className="px-4 py-4 text-on-surface-variant">
                        {record.phone?.trim() || "No phone"}
                      </td>
                      <td className="px-4 py-4">
                        {renderSellerActions(record, "end")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DataTableCard>

      <PaginationControls
        page={page}
        totalPages={lastPage}
        onPrevious={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
        onNext={() => setPage((currentPage) => Math.min(lastPage, currentPage + 1))}
        onPageChange={(nextPage) => setPage(nextPage)}
      />
    </PageShell>
  );
}
