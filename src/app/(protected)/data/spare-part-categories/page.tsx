"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import {
  listSparePartCategories,
  createSparePartCategory,
  updateSparePartCategory,
  deleteSparePartCategory,
  type SparePartCategoryRecord,
  type CreateCategoryPayload,
} from "@/lib/crud-api";
import { EntityFormModal, type FieldConfig } from "@/components/entity-form-modal";
import {
  ActionButton,
  EmptyState,
  PageHero,
  PageShell,
  PaginationControls,
  SurfaceCard,
} from "@/components/ops-ui";

export default function SparePartCategoriesPage() {
  const [categories, setCategories] = useState<SparePartCategoryRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SparePartCategoryRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await listSparePartCategories(token, page);
      setCategories(result.items);
      setTotalPages(result.lastPage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, [page]);

  const handleOpenModal = (category?: SparePartCategoryRecord) => {
    setEditingCategory(category || null);
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = async (formData: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const payload: CreateCategoryPayload = {
        name: String(formData.name),
      };

      if (editingCategory) {
        await updateSparePartCategory(token, editingCategory.id, payload);
      } else {
        await createSparePartCategory(token, payload);
      }

      await loadCategories();
      handleCloseModal();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await deleteSparePartCategory(token, id);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    }
  };

  const modalFields: FieldConfig[] = [
    {
      name: "name",
      label: "Category Name",
      type: "text",
      required: true,
      placeholder: "e.g., Engine Parts, Brake System",
      value: editingCategory?.name,
    },
  ];

  return (
    <PageShell>
      <PageHero
        eyebrow="Master Data"
        title="Spare Part Categories"
        actions={
          <ActionButton tone="primary" onClick={() => handleOpenModal()}>
            Add Category
          </ActionButton>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error">
          {error}
        </div>
      ) : null}

      <SurfaceCard>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary" />
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            title="No categories found"
            description="Create your first spare part category to organize the catalog."
            action={
              <ActionButton tone="primary" onClick={() => handleOpenModal()}>
                Create Category
              </ActionButton>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">Created</th>
                  <th className="px-4 py-3 text-right font-semibold text-on-surface">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr
                    key={category.id}
                    className="border-b border-outline-variant/10 hover:bg-surface-container-low"
                  >
                    <td className="px-4 py-3 text-on-surface">{category.name}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">
                      {category.created_at
                        ? new Date(category.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(category)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <span className="mx-2 text-on-surface-variant">•</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(category.id)}
                        className="text-xs font-medium text-error hover:underline"
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
        onPageChange={setPage}
        onPrevious={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />

      <EntityFormModal
        title={editingCategory ? "Edit Category" : "Create Category"}
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
