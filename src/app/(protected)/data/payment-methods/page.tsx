"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import {
  listPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  type PaymentMethodRecord,
  type CreatePaymentMethodPayload,
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

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethodRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethodRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMethods = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await listPaymentMethods(token, page);
      setMethods(result.items);
      setTotalPages(result.lastPage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMethods();
  }, [page]);

  const handleOpenModal = (method?: PaymentMethodRecord) => {
    setEditingMethod(method || null);
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMethod(null);
  };

  const handleSubmit = async (formData: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const payload: CreatePaymentMethodPayload = {
        name: String(formData.name),
      };

      if (editingMethod) {
        await updatePaymentMethod(token, editingMethod.id, payload);
      } else {
        await createPaymentMethod(token, payload);
      }

      await loadMethods();
      handleCloseModal();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save payment method");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this payment method?")) return;

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await deletePaymentMethod(token, id);
      await loadMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete payment method");
    }
  };

  const modalFields: FieldConfig[] = [
    {
      name: "name",
      label: "Payment Method Name",
      type: "text",
      required: true,
      placeholder: "e.g., Cash, Visa, Instapay, Check",
      value: editingMethod?.name,
    },
  ];

  return (
    <PageShell>
      <PageHero
        eyebrow="Master Data"
        title="Payment Methods"
        description="Maintain the accepted payment channels used by the RPG shop across sales and reporting."
        actions={
          <ActionButton tone="primary" onClick={() => handleOpenModal()}>
            Add Payment Method
          </ActionButton>
        }
      />

      {error && <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error">{error}</div>}

      <SurfaceCard>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"></div>
          </div>
        ) : methods.length === 0 ? (
          <EmptyState
            title="No payment methods found"
            description="Create the first payment method so the team can align transactions with your accepted payment channels."
            action={
              <ActionButton tone="primary" onClick={() => handleOpenModal()}>
                Create Payment Method
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
              {methods.map((method) => (
                <tr key={method.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low">
                  <td className="px-4 py-3 text-on-surface">{method.name}</td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {method.created_at ? new Date(method.created_at).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenModal(method)}
                      className="text-primary hover:underline text-xs font-medium"
                    >
                      Edit
                    </button>
                    <span className="mx-2 text-on-surface-variant">•</span>
                    <button
                      onClick={() => handleDelete(method.id)}
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
        title={editingMethod ? "Edit Payment Method" : "Create Payment Method"}
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
