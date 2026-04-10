"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import {
  listBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  type BrandRecord,
  type CreateBrandPayload,
} from "@/lib/crud-api";
import { EntityFormModal, type FieldConfig } from "@/components/entity-form-modal";

export default function BrandsPage() {
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"" | "spare_parts" | "products" | "bikes">("");

  const loadBrands = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await listBrands(token, page, typeFilter || undefined);
      setBrands(result.items);
      setTotalPages(result.lastPage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, [page, typeFilter]);

  const handleOpenModal = (brand?: BrandRecord) => {
    setEditingBrand(brand || null);
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBrand(null);
  };

  const handleSubmit = async (formData: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const payload: CreateBrandPayload = {
        name: String(formData.name),
        type: String(formData.type) as "spare_parts" | "products" | "bikes",
      };

      if (editingBrand) {
        await updateBrand(token, editingBrand.id, payload);
      } else {
        await createBrand(token, payload);
      }

      await loadBrands();
      handleCloseModal();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save brand");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this brand?")) return;

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await deleteBrand(token, id);
      await loadBrands();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete brand");
    }
  };

  const modalFields: FieldConfig[] = [
    {
      name: "name",
      label: "Brand Name",
      type: "text",
      required: true,
      placeholder: "e.g., Honda, Yamaha",
      value: editingBrand?.name,
    },
    {
      name: "type",
      label: "Brand Type",
      type: "select",
      required: true,
      options: [
        { value: "spare_parts", label: "Spare Parts" },
        { value: "products", label: "Products" },
        { value: "bikes", label: "Bikes" },
      ],
      value: editingBrand?.type,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-on-surface">Brands</h1>
        <button
          onClick={() => handleOpenModal()}
          className="rounded bg-primary px-4 py-2 text-on-primary hover:opacity-90"
        >
          + Add Brand
        </button>
      </div>

      {error && <div className="mb-4 rounded bg-error/20 p-4 text-error">{error}</div>}

      <div className="mb-4 flex gap-2">
        <label className="flex items-center gap-2 text-sm text-on-surface-variant">
          Filter by Type:
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as "" | "spare_parts" | "products" | "bikes");
              setPage(1);
            }}
            className="rounded border border-outline-variant/30 bg-surface-container-lowest px-2 py-1"
          >
            <option value="">All Types</option>
            <option value="spare_parts">Spare Parts</option>
            <option value="products">Products</option>
            <option value="bikes">Bikes</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"></div>
        </div>
      ) : brands.length === 0 ? (
        <div className="rounded border border-outline-variant/15 bg-surface-container p-8 text-center text-on-surface-variant">
          No brands found. Create your first brand!
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-ghost-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container">
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Created</th>
                <th className="px-4 py-3 text-right font-semibold text-on-surface">Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low">
                  <td className="px-4 py-3 text-on-surface">{brand.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded bg-primary-container px-2 py-1 text-xs text-on-primary-container">
                      {brand.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {brand.created_at ? new Date(brand.created_at).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenModal(brand)}
                      className="text-primary hover:underline text-xs font-medium"
                    >
                      Edit
                    </button>
                    <span className="mx-2 text-on-surface-variant">•</span>
                    <button
                      onClick={() => handleDelete(brand.id)}
                      className="text-error hover:underline text-xs font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded px-3 py-2 text-sm hover:bg-surface-container disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-2 text-sm text-on-surface-variant">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded px-3 py-2 text-sm hover:bg-surface-container disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      <EntityFormModal
        title={editingBrand ? "Edit Brand" : "Create Brand"}
        fields={modalFields}
        isOpen={isModalOpen}
        isLoading={isSubmitting}
        error={submitError || undefined}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
