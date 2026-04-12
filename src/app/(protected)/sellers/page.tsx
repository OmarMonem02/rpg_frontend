"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "@/lib/auth-api";
import { getAuthToken } from "@/lib/auth-session";
import { createSeller, deleteSeller, listSellers, updateSeller, type SellerRecord } from "@/lib/crud-api";
import { ActionButton, InlineMessage, PageHero, PageShell, PaginationControls, SurfaceCard } from "@/components/ops-ui";

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

export default function SellersPage() {
  const [records, setRecords] = useState<SellerRecord[]>([]);
  const [form, setForm] = useState<SellerFormState>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  async function loadSellers(nextPage = page) {
    const token = getAuthToken();
    if (!token) {
      setError("You are not authenticated. Please sign in again.");
      setIsLoading(false);
      return;
    }

    setError("");
    try {
      const response = await listSellers(token, nextPage);
      setRecords(response.items);
      setPage(response.currentPage);
      setLastPage(response.lastPage);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to load sellers at the moment.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSellers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      phone: form.phone.trim() || undefined,
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
    const token = getAuthToken();
    if (!token) {
      setError("You are not authenticated. Please sign in again.");
      return;
    }

    if (!window.confirm("Delete this seller permanently?")) return;

    setError("");
    setMessage("");
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
    }
  }

  function onEdit(record: SellerRecord) {
    setEditingId(record.id);
    setForm({
      name: record.name,
      commission_rate: String(record.commission_rate),
      phone: record.phone ?? "",
    });
    setMessage("");
    setError("");
  }

  return (
    <PageShell>
      <PageHero
        eyebrow="Admin"
        title="Sellers"
        description="Maintain commission-ready seller records with the existing `/sellers` backend integration."
      />

      <SurfaceCard>
      <form className="space-y-4" onSubmit={onSubmit}>
        <h2 className="text-lg font-semibold text-on-surface">{editingId ? "Edit Seller" : "Create Seller"}</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm text-on-surface">
            <span className="font-medium">Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              className="w-full rounded-md border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 outline-none focus:border-primary"
              placeholder="Seller name"
            />
          </label>

          <label className="space-y-1 text-sm text-on-surface">
            <span className="font-medium">Commission Rate (%)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.commission_rate}
              onChange={(event) => setForm((prev) => ({ ...prev, commission_rate: event.target.value }))}
              required
              className="w-full rounded-md border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 outline-none focus:border-primary"
              placeholder="5"
            />
          </label>

          <label className="space-y-1 text-sm text-on-surface">
            <span className="font-medium">Phone</span>
            <input
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full rounded-md border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 outline-none focus:border-primary"
              placeholder="+20..."
            />
          </label>

        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            type="submit"
            disabled={isSubmitting}
            tone="primary"
          >
            {isSubmitting ? "Saving..." : editingId ? "Update Seller" : "Create Seller"}
          </ActionButton>
          {editingId ? (
            <ActionButton
              type="button"
              onClick={resetForm}
            >
              Cancel Edit
            </ActionButton>
          ) : null}
        </div>
      </form>
      </SurfaceCard>

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
      {message ? (
        <InlineMessage tone="primary">{message}</InlineMessage>
      ) : null}

      <SurfaceCard className="p-0">
        <div className="border-b border-outline-variant/20 px-4 py-3">
          <h2 className="text-lg font-semibold text-on-surface">Sellers List</h2>
        </div>

        {isLoading ? (
          <p className="p-4 text-sm text-on-surface-variant">Loading sellers...</p>
        ) : records.length === 0 ? (
          <p className="p-4 text-sm text-on-surface-variant">No sellers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-container-low text-on-surface">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Commission</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-t border-outline-variant/20 text-on-surface">
                    <td className="px-4 py-3">{record.name}</td>
                    <td className="px-4 py-3">{record.commission_rate}%</td>
                    <td className="px-4 py-3">{record.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(record)}
                          className="rounded-md border border-outline-variant/40 bg-surface-container-low px-3 py-1 font-medium text-on-surface"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(record.id)}
                          className="rounded-md bg-error-container px-3 py-1 font-medium text-on-error-container"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </SurfaceCard>

      <PaginationControls
        page={page}
        totalPages={lastPage}
        onPrevious={() => loadSellers(page - 1)}
        onNext={() => loadSellers(page + 1)}
      />
    </PageShell>
  );
}
