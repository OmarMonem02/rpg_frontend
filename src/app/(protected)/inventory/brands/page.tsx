"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import {
  listBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  type BrandRecord,
  type CreateBrandPayload,
} from "@/lib/crud-api";
import { EntityFormModal, type FieldConfig } from "@/components/entity-form-modal";
import { AdvancedFilters } from "@/components/advanced-filters";
import {
  ActionButton,
  EmptyState,
  FilterBar,
  InputGroup,
  PageHero,
  PageShell,
  PaginationControls,
  StatusBadge,
  SurfaceCard,
} from "@/components/ops-ui";

export default function BrandsPage() {
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"" | "spare_parts" | "products" | "bikes">("");

  // Use custom filter hook
  const { page, setPage, getCleanFilters, setCurrency, filters, logFilters } = useEntityFilters();

  const loadBrands = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      console.log("[Brands] Applying filters:", filters, "Page:", page);
      logFilters();

      const cleanFilters = getCleanFilters();
      const result = await listBrands(token, page, typeFilter || undefined, cleanFilters as any);
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
    <PageShell>
      <PageHero
        eyebrow="Master Data"
        title="Brands"
        description="Keep supplier and manufacturer brands clean across spare parts, products, and bike blueprints."
        actions={
          <ActionButton tone="primary" onClick={() => handleOpenModal()}>
            Add Brand
          </ActionButton>
        }
      />

      {error && <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error">{error}</div>}

      <SurfaceCard>
        <FilterBar className="md:grid-cols-4">
          <InputGroup label="Filter by Type" className="md:col-span-2">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as "" | "spare_parts" | "products" | "bikes");
                setPage(1);
              }}
              className="form-input-base"
            >
              <option value="">All Types</option>
              <option value="spare_parts">Spare Parts</option>
              <option value="products">Products</option>
              <option value="bikes">Bikes</option>
            </select>
          </InputGroup>
        </FilterBar>

        <AdvancedFilters
        currency={filters.currency || "all"}
          setCurrency={setCurrency}
          showPriceFilters={false}
          showCurrencyFilter={true}
        />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"></div>
        </div>
      ) : brands.length === 0 ? (
        <EmptyState
          title="No brands found"
          description="Create your first brand so parts, products, and bikes can share the same catalog source."
          action={
            <ActionButton tone="primary" onClick={() => handleOpenModal()}>
              Create Brand
            </ActionButton>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container-low">
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
                    <StatusBadge tone="primary">
                      {brand.type.replace("_", " ")}
                    </StatusBadge>
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
      </SurfaceCard>

      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPrevious={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />

      <EntityFormModal
        title={editingBrand ? "Edit Brand" : "Create Brand"}
        fields={modalFields}
        isOpen={isModalOpen}
        isLoading={isSubmitting}
        error={submitError || undefined}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />
    </PageShell>
  );
}
