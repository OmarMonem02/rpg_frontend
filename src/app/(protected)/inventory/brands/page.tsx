"use client";

import { useCallback, useEffect, useState } from "react";
import { usePermissions } from "@/components/permission-provider";
import { getApiErrorDetails } from "@/lib/api/core";
import { getAuthToken } from "@/lib/auth-session";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import { useGlobalDataRefresh } from "@/hooks/useGlobalDataRefresh";
import {
  listBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  type BrandRecord,
  type CreateBrandPayload,
} from "@/lib/crud-api";
import { EntityFormModal, type FieldConfig } from "@/components/entity-form-modal";
import { InventoryModuleFilters } from "@/components/inventory/InventoryModuleFilters";
import {
  ActionButton,
  EmptyState,
  PageHero,
  PageShell,
  PaginationControls,
  StatusBadge,
  SurfaceCard,
} from "@/components/ops-ui";
import {
  BRAND_TYPE_OPTIONS,
  formatBrandType,
  type BrandType,
} from "@/lib/brand-types";
import { DEFAULT_BRAND_TYPE_OPTIONS } from "@/lib/inventory-filter-config";

export default function BrandsPage() {
  const permissions = usePermissions();
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitFieldErrors, setSubmitFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    page,
    setPage,
    getModuleApiParams,
    setSearch,
    setType,
    setFilter,
    filters,
  } = useEntityFilters();

  const canCreateBrands = permissions.canCreate("brands");
  const canUpdateBrands = permissions.canUpdate("brands");
  const canDeleteBrands = permissions.canDelete("brands");

  const loadBrands = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const apiFilters = getModuleApiParams("brands");
      const result = await listBrands(
        token,
        page,
        apiFilters as { type?: string; search?: string; created_from?: string; created_to?: string },
      );
      setBrands(result.items);
      setTotalPages(result.lastPage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load brands");
    } finally {
      setLoading(false);
    }
  }, [page, getModuleApiParams]);

  useEffect(() => {
    void loadBrands();
  }, [loadBrands]);

  useGlobalDataRefresh(loadBrands);

  const handleOpenModal = (brand?: BrandRecord) => {
    if (brand && !canUpdateBrands) return;
    if (!brand && !canCreateBrands) return;

    setEditingBrand(brand || null);
    setSubmitError(null);
    setSubmitFieldErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBrand(null);
  };

  const handleSubmit = async (formData: Record<string, unknown>) => {
    try {
      if ((editingBrand && !canUpdateBrands) || (!editingBrand && !canCreateBrands)) {
        throw new Error("You do not have permission to save brands.");
      }

      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitFieldErrors({});
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const payload: CreateBrandPayload = {
        name: String(formData.name),
        types: (Array.isArray(formData.types)
          ? formData.types
          : [formData.types]
        ).map(String) as BrandType[],
      };

      if (editingBrand) {
        await updateBrand(token, editingBrand.id, payload);
      } else {
        await createBrand(token, payload);
      }

      await loadBrands();
      handleCloseModal();
    } catch (err) {
      const { message, fieldErrors } = getApiErrorDetails(err, "Failed to save brand");
      setSubmitError(message);
      setSubmitFieldErrors(fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!canDeleteBrands) {
      setError("You do not have permission to delete brands.");
      return;
    }

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
      name: "types",
      label: "Brand Types",
      type: "multiselect",
      required: true,
      options: BRAND_TYPE_OPTIONS,
      value: editingBrand?.types,
    },
  ];

  return (
    <PageShell>
      <PageHero
        eyebrow="Master Data"
        title="Brands"
        actions={
          canCreateBrands ? (
            <ActionButton tone="primary" onClick={() => handleOpenModal()}>
              Add Brand
            </ActionButton>
          ) : null
        }
      />

      {error ? (
        <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error">
          {error}
        </div>
      ) : null}

      <SurfaceCard>
        <InventoryModuleFilters
          module="brands"
          filters={filters}
          setters={{
            setSearch,
            setCategory: () => {},
            setBrand: () => {},
            setBlueprint: () => {},
            setSector: () => {},
            setStatus: () => {},
            setType,
            setPriceMin: () => {},
            setPriceMax: () => {},
            setCurrency: () => {},
            setLowStock: () => {},
            setTags: () => {},
            setBikeCompatibility: () => {},
            setFilter,
          }}
          options={{
            brandTypes: DEFAULT_BRAND_TYPE_OPTIONS,
          }}
        />
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary" />
          </div>
        ) : brands.length === 0 ? (
          <EmptyState
            title="No brands found"
            description="Create your first brand so parts, products, and bikes can share the same catalog source."
            action={
              canCreateBrands ? (
                <ActionButton tone="primary" onClick={() => handleOpenModal()}>
                  Create Brand
                </ActionButton>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">Types</th>
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">Created</th>
                  <th className="px-4 py-3 text-right font-semibold text-on-surface">Actions</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((brand) => (
                  <tr
                    key={brand.id}
                    className="border-b border-outline-variant/10 hover:bg-surface-container-low"
                  >
                    <td className="px-4 py-3 text-on-surface">{brand.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {brand.types.map((type) => (
                          <StatusBadge key={type} tone="primary">
                            {formatBrandType(type)}
                          </StatusBadge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant text-xs">
                      {brand.created_at
                        ? new Date(brand.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canUpdateBrands ? (
                        <button
                          onClick={() => handleOpenModal(brand)}
                          className="text-primary hover:underline text-xs font-medium"
                        >
                          Edit
                        </button>
                      ) : null}
                      {canUpdateBrands && canDeleteBrands ? (
                        <span className="mx-2 text-on-surface-variant">•</span>
                      ) : null}
                      {canDeleteBrands ? (
                        <button
                          onClick={() => handleDelete(brand.id)}
                          className="text-error hover:underline text-xs font-medium"
                        >
                          Delete
                        </button>
                      ) : null}
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
        onPageChange={setPage}
        onPrevious={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
        onNext={() =>
          setPage((currentPage) => Math.min(totalPages, currentPage + 1))
        }
      />

      <EntityFormModal
        title={editingBrand ? "Edit Brand" : "Create Brand"}
        fields={modalFields}
        isOpen={isModalOpen}
        isLoading={isSubmitting}
        error={submitError || undefined}
        serverFieldErrors={submitFieldErrors}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />
    </PageShell>
  );
}
