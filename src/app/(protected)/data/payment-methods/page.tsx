"use client";

import { useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/components/permission-provider";
import { ApiError } from "@/lib/auth-api";
import { getAuthToken } from "@/lib/auth-session";
import { getSettings, updateSettings } from "@/lib/api/settings";
import {
  listPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  type PaymentMethodRecord,
  type CreatePaymentMethodPayload,
} from "@/lib/crud-api";
import {
  EntityFormModal,
  type FieldConfig,
} from "@/components/entity-form-modal";
import {
  ActionButton,
  EmptyState,
  InlineMessage,
  PageHero,
  PageShell,
  PaginationControls,
  StatCard,
  StatGrid,
  SurfaceCard,
} from "@/components/ops-ui";
import type {
  SettingsResponse,
  SettingsValidationErrors,
} from "@/types/settings";

type SettingsFormState = {
  tax_rate: string;
  exchange_rate: string;
};

const initialSettingsForm: SettingsFormState = {
  tax_rate: "",
  exchange_rate: "",
};

function formatNullableNumber(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "";
  return String(value);
}

function formatRateSummary(value: number | null): string {
  if (value === null) return "Not configured";
  return `1 USD = ${value.toFixed(2)} EGP`;
}

function validateSettingsForm(
  form: SettingsFormState,
): SettingsValidationErrors {
  const errors: SettingsValidationErrors = {};
  const taxRate = Number(form.tax_rate);
  const exchangeRate = Number(form.exchange_rate);

  if (form.tax_rate.trim() === "" || !Number.isFinite(taxRate)) {
    errors.tax_rate = "Tax rate is required.";
  } else if (taxRate < 0) {
    errors.tax_rate = "Tax rate must be 0 or greater.";
  }

  if (form.exchange_rate.trim() === "" || !Number.isFinite(exchangeRate)) {
    errors.exchange_rate = "Exchange rate is required.";
  } else if (exchangeRate <= 0) {
    errors.exchange_rate = "Exchange rate must be greater than 0.";
  }

  return errors;
}

export default function PaymentMethodsPage() {
  const permissions = usePermissions();
  const [methods, setMethods] = useState<PaymentMethodRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] =
    useState<PaymentMethodRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [settingsForm, setSettingsForm] =
    useState<SettingsFormState>(initialSettingsForm);
  const [settingsErrors, setSettingsErrors] =
    useState<SettingsValidationErrors>({});
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const canCreatePaymentMethods = permissions.canCreate("payment-methods");
  const canUpdatePaymentMethods = permissions.canUpdate("payment-methods");
  const canDeletePaymentMethods = permissions.canDelete("payment-methods");

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
      setError(
        err instanceof Error ? err.message : "Failed to load payment methods",
      );
    } finally {
      setLoading(false);
    }
  };

  const syncSettingsForm = (nextSettings: SettingsResponse) => {
    setSettings(nextSettings);
    setSettingsForm({
      tax_rate: formatNullableNumber(nextSettings.tax_rate),
      exchange_rate: formatNullableNumber(nextSettings.exchange_rate),
    });
  };

  const loadSettings = async () => {
    try {
      setIsSettingsLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await getSettings(token);
      syncSettingsForm(result);
      setSettingsError(null);
    } catch (err) {
      setSettingsError(
        err instanceof Error ? err.message : "Failed to load payment settings",
      );
    } finally {
      setIsSettingsLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      await loadMethods();
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const run = async () => {
      await loadSettings();
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasSettingsChanges = useMemo(() => {
    if (!settings) return false;

    return (
      settingsForm.tax_rate !== formatNullableNumber(settings.tax_rate) ||
      settingsForm.exchange_rate !==
        formatNullableNumber(settings.exchange_rate)
    );
  }, [settings, settingsForm]);

  const handleOpenModal = (method?: PaymentMethodRecord) => {
    if (method && !canUpdatePaymentMethods) return;
    if (!method && !canCreatePaymentMethods) return;
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
      if (
        (editingMethod && !canUpdatePaymentMethods) ||
        (!editingMethod && !canCreatePaymentMethods)
      ) {
        throw new Error("You do not have permission to save payment methods.");
      }
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
      setSubmitError(
        err instanceof Error ? err.message : "Failed to save payment method",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettingsFieldChange = (
    field: keyof SettingsFormState,
    value: string,
  ) => {
    setSettingsForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSettingsSuccess(null);
    if (settingsErrors[field]) {
      setSettingsErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSettingsSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!canUpdatePaymentMethods) {
      setSettingsError("You do not have permission to update payment settings.");
      return;
    }
    const nextErrors = validateSettingsForm(settingsForm);
    if (Object.keys(nextErrors).length > 0) {
      setSettingsErrors(nextErrors);
      setSettingsSuccess(null);
      return;
    }

    try {
      setIsSettingsSaving(true);
      setSettingsError(null);
      setSettingsSuccess(null);

      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const updatedSettings = await updateSettings(token, {
        tax_rate: Number(settingsForm.tax_rate),
        exchange_rate: Number(settingsForm.exchange_rate),
      });

      syncSettingsForm(updatedSettings);
      setSettingsErrors({});
      setSettingsSuccess("Payment settings saved successfully.");
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrors = (
          err as ApiError & { fieldErrors?: SettingsValidationErrors }
        ).fieldErrors;
        if (fieldErrors) {
          setSettingsErrors(fieldErrors);
        }
        setSettingsError(err.message);
      } else {
        setSettingsError(
          err instanceof Error
            ? err.message
            : "Failed to save payment settings",
        );
      }
    } finally {
      setIsSettingsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!canDeletePaymentMethods) {
      setError("You do not have permission to delete payment methods.");
      return;
    }
    if (!confirm("Are you sure you want to delete this payment method?"))
      return;

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await deletePaymentMethod(token, id);
      await loadMethods();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete payment method",
      );
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
      <StatGrid>
        <StatCard
          label="Tax Rate"
          value={
            settings?.tax_rate !== null && settings?.tax_rate !== undefined
              ? `${settings.tax_rate}%`
              : "Not set"
          }
          hint="Applied to totals wherever tax-aware pricing is used."
          tone="default"
        />
        <StatCard
          label="Exchange Rate"
          value={formatRateSummary(settings?.exchange_rate ?? null)}
          hint="Stored through the settings API and surfaced from Payments."
          tone="primary"
        />
      </StatGrid>

      {error && <InlineMessage tone="danger">{error}</InlineMessage>}

      <SurfaceCard>
        <div className="flex flex-col gap-2 border-b border-outline-variant/15 pb-4">
          <h2 className="text-xl font-semibold text-on-surface">
            Payment Settings
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-on-surface-variant">
            Manage the shared payment configuration here, including the
            `exchange_rate` used alongside the selected currency.
          </p>
        </div>

        {settingsError ? (
          <InlineMessage tone="danger">{settingsError}</InlineMessage>
        ) : null}
        {settingsSuccess ? (
          <InlineMessage tone="primary">{settingsSuccess}</InlineMessage>
        ) : null}

        {isSettingsLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"></div>
          </div>
        ) : (
          <form onSubmit={handleSettingsSubmit} className="mt-5 space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-on-surface">Tax Rate</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settingsForm.tax_rate}
                  onChange={(event) =>
                    handleSettingsFieldChange("tax_rate", event.target.value)
                  }
                  className={`form-input-base ${settingsErrors.tax_rate ? "form-input-error" : ""}`}
                  placeholder="14"
                  disabled={isSettingsSaving}
                />
                {settingsErrors.tax_rate ? (
                  <span className="text-xs font-medium text-error">
                    {settingsErrors.tax_rate}
                  </span>
                ) : null}
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-on-surface">
                  Exchange Rate
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={settingsForm.exchange_rate}
                  onChange={(event) =>
                    handleSettingsFieldChange(
                      "exchange_rate",
                      event.target.value,
                    )
                  }
                  className={`form-input-base ${settingsErrors.exchange_rate ? "form-input-error" : ""}`}
                  placeholder="50.25"
                  disabled={isSettingsSaving}
                />
                {settingsErrors.exchange_rate ? (
                  <span className="text-xs font-medium text-error">
                    {settingsErrors.exchange_rate}
                  </span>
                ) : null}
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-outline-variant/15 bg-surface px-4 py-3">
              <p className="text-sm text-on-surface-variant">
                {settingsForm.exchange_rate
                  ? `Preview: 1 USD = ${settingsForm.exchange_rate} EGP`
                  : "Enter a positive exchange rate to preview the conversion basis."}
              </p>
              <div className="flex gap-2">
                <ActionButton
                  type="button"
                  onClick={() => settings && syncSettingsForm(settings)}
                  disabled={
                    !hasSettingsChanges ||
                    isSettingsSaving ||
                    !canUpdatePaymentMethods
                  }
                >
                  Reset
                </ActionButton>
                <ActionButton
                  type="submit"
                  tone="primary"
                  disabled={
                    isSettingsSaving ||
                    !hasSettingsChanges ||
                    !canUpdatePaymentMethods
                  }
                >
                  {isSettingsSaving ? "Saving..." : "Save Settings"}
                </ActionButton>
              </div>
            </div>
          </form>
        )}
      </SurfaceCard>
      <PageHero
        eyebrow="Master Data"
        title="Payment Methods"
        description="Maintain the accepted payment channels used by the RPG shop across sales and reporting."
        actions={
          canCreatePaymentMethods ? (
            <ActionButton tone="primary" onClick={() => handleOpenModal()}>
              Add Payment Method
            </ActionButton>
          ) : null
        }
      />
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
              canCreatePaymentMethods ? (
                <ActionButton tone="primary" onClick={() => handleOpenModal()}>
                  Create Payment Method
                </ActionButton>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-on-surface">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {methods.map((method) => (
                  <tr
                    key={method.id}
                    className="border-b border-outline-variant/10 hover:bg-surface-container-low"
                  >
                    <td className="px-4 py-3 text-on-surface">{method.name}</td>
                    <td className="px-4 py-3 text-on-surface-variant text-xs">
                      {method.created_at
                        ? new Date(method.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenModal(method)}
                        hidden={!canUpdatePaymentMethods}
                        className="text-primary hover:underline text-xs font-medium"
                      >
                        Edit
                      </button>
                      <span className="mx-2 text-on-surface-variant">•</span>
                      <button
                        onClick={() => handleDelete(method.id)}
                        hidden={!canDeletePaymentMethods}
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
