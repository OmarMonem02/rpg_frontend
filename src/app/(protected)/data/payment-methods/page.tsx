"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/components/permission-provider";
import { ApiError } from "@/lib/auth-api";
import { getAuthToken, getAuthUser } from "@/lib/auth-session";
import { getSettings, updateSettings } from "@/lib/api/settings";
import {
  previewRateChangePricing,
  type RateChangePreviewResponse,
} from "@/lib/api/pricing-alarms";
import Link from "next/link";
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
  ConfirmDialog,
  EmptyState,
  InlineMessage,
  InputGroupCard,
  PageHero,
  PageShell,
  PaginationControls,
  SectionHeading,
  SurfaceCard,
} from "@/components/ops-ui";
import type {
  SettingsResponse,
  SettingsValidationErrors,
  UpdateSettingsPayload,
} from "@/types/settings";

type SettingsFormState = {
  exchange_rate: string;
  exchange_rate_eur: string;
};

const initialSettingsForm: SettingsFormState = {
  exchange_rate: "",
  exchange_rate_eur: "",
};

function formatNullableNumber(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "";
  return String(value);
}

function formatUsdRateSummary(value: number | null): string {
  if (value === null) return "Not configured";
  return `1 USD = ${value.toFixed(2)} EGP`;
}

function formatEurRateSummary(value: number | null): string {
  if (value === null) return "Not configured";
  return `1 EUR = ${value.toFixed(2)} EGP`;
}

function validateRateField(
  raw: string,
  label: string,
): string | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return `${label} is required.`;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) {
    return `${label} must be a number greater than 0.`;
  }
  return undefined;
}

export default function PaymentMethodsPage() {
  const permissions = usePermissions();
  const authUser = getAuthUser();
  const isAdmin = authUser?.role === "admin";

  const [methods, setMethods] = useState<PaymentMethodRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] =
    useState<PaymentMethodRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PaymentMethodRecord | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [settingsForm, setSettingsForm] =
    useState<SettingsFormState>(initialSettingsForm);
  const [settingsErrors, setSettingsErrors] =
    useState<SettingsValidationErrors>({});
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(isAdmin);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [ratePreview, setRatePreview] = useState<RateChangePreviewResponse | null>(
    null,
  );
  const [pendingSettingsPayload, setPendingSettingsPayload] =
    useState<UpdateSettingsPayload | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [lastManualLossCount, setLastManualLossCount] = useState(0);

  const canCreatePaymentMethods = permissions.canCreate("payment-methods");
  const canUpdatePaymentMethods = permissions.canUpdate("payment-methods");
  const canDeletePaymentMethods = permissions.canDelete("payment-methods");

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadMethods = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await listPaymentMethods(token, {
        page,
        search: debouncedSearch || undefined,
      });
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
  }, [page, debouncedSearch]);

  const syncSettingsForm = (nextSettings: SettingsResponse) => {
    setSettings(nextSettings);
    setSettingsForm({
      exchange_rate: formatNullableNumber(nextSettings.exchange_rate),
      exchange_rate_eur: formatNullableNumber(nextSettings.exchange_rate_eur),
    });
  };

  const loadSettings = async () => {
    if (!isAdmin) {
      setIsSettingsLoading(false);
      return;
    }
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
    void loadMethods();
  }, [loadMethods]);

  useEffect(() => {
    void loadSettings();
  }, [isAdmin]);

  const usdDirty = useMemo(() => {
    if (!settings) return false;
    return (
      settingsForm.exchange_rate !==
      formatNullableNumber(settings.exchange_rate)
    );
  }, [settings, settingsForm.exchange_rate]);

  const eurDirty = useMemo(() => {
    if (!settings) return false;
    return (
      settingsForm.exchange_rate_eur !==
      formatNullableNumber(settings.exchange_rate_eur)
    );
  }, [settings, settingsForm.exchange_rate_eur]);

  const hasSettingsChanges = usdDirty || eurDirty;

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
        name: String(formData.name).trim(),
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
    if (!isAdmin) {
      setSettingsError("Only administrators can update exchange rates.");
      return;
    }

    const nextErrors: SettingsValidationErrors = {};
    const payload: UpdateSettingsPayload = {};

    if (usdDirty) {
      const err = validateRateField(
        settingsForm.exchange_rate,
        "USD→EGP rate",
      );
      if (err) nextErrors.exchange_rate = err;
      else payload.exchange_rate = Number(settingsForm.exchange_rate);
    }

    if (eurDirty) {
      const err = validateRateField(
        settingsForm.exchange_rate_eur,
        "EUR→EGP rate",
      );
      if (err) nextErrors.exchange_rate_eur = err;
      else payload.exchange_rate_eur = Number(settingsForm.exchange_rate_eur);
    }

    if (Object.keys(nextErrors).length > 0) {
      setSettingsErrors(nextErrors);
      setSettingsSuccess(null);
      return;
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    try {
      setSettingsError(null);
      setSettingsSuccess(null);

      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      setIsPreviewLoading(true);
      const preview = await previewRateChangePricing(token, payload);
      setRatePreview(preview);
      setPendingSettingsPayload(payload);
      setIsPreviewLoading(false);
      return;
    } catch (err) {
      setIsPreviewLoading(false);
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
    }
  };

  const handleConfirmRateChange = async () => {
    if (!pendingSettingsPayload) return;
    try {
      setIsSettingsSaving(true);
      setSettingsError(null);
      setSettingsSuccess(null);

      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const updatedSettings = await updateSettings(token, pendingSettingsPayload);
      syncSettingsForm(updatedSettings);
      setSettingsErrors({});
      setRatePreview(null);
      setPendingSettingsPayload(null);

      const manualLoss =
        updatedSettings.pricing_impact?.manual_loss_items?.length ?? 0;
      const marginUpdated =
        updatedSettings.pricing_impact?.margin_items_updated ?? 0;

      let message = "Exchange rates saved successfully.";
      if (marginUpdated > 0) {
        message += ` ${marginUpdated} margin-based item(s) updated automatically.`;
      }
      if (manualLoss > 0) {
        message += ` ${manualLoss} manual item(s) need pricing review.`;
      }
      setLastManualLossCount(manualLoss);
      setSettingsSuccess(message);
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

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !canDeletePaymentMethods) return;
    try {
      setIsDeleting(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await deletePaymentMethod(token, deleteTarget.id);
      setDeleteTarget(null);
      await loadMethods();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete payment method",
      );
    } finally {
      setIsDeleting(false);
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
      {error && <InlineMessage tone="danger">{error}</InlineMessage>}

      <div className="flex flex-col gap-4">
        <SectionHeading
          title="Exchange rates"
          description="EGP amounts for sales and reporting use these rates for foreign-priced catalog lines. USD and EUR rates are stored as EGP per 1 unit of foreign currency. Only administrators can change them."
        />

        {!isAdmin ? (
          <InlineMessage tone="primary">
            Exchange rates are managed by an administrator. You can still manage
            payment method names below if you have permission.
          </InlineMessage>
        ) : null}

        {settingsError ? (
          <InlineMessage tone="danger">{settingsError}</InlineMessage>
        ) : null}
        {settingsSuccess ? (
          <InlineMessage tone="primary">
            <span>{settingsSuccess}</span>
            {lastManualLossCount > 0 ? (
              <>
                {" "}
                <Link
                  href="/inventory/alarms?tab=pricing"
                  className="font-semibold underline"
                >
                  Review pricing loss alarms
                </Link>
              </>
            ) : null}
          </InlineMessage>
        ) : null}

        {isAdmin && isSettingsLoading ? (
          <div className="flex justify-center rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-low py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"></div>
          </div>
        ) : isAdmin ? (
          <form onSubmit={handleSettingsSubmit} className="flex flex-col gap-4 grid grid-cols-2">
            <InputGroupCard
              label="USD → EGP"
              hint="Saved on the server as exchange_rate. Used when line items are priced in USD."
              tone="default"
              value={formatUsdRateSummary(settings?.exchange_rate ?? null)}
              footer={
                <div className="flex w-full flex-wrap items-end justify-between gap-3">
                  <p className="min-w-0 text-sm text-on-surface-variant">
                    <span className="font-medium text-on-surface">Preview</span>
                    {settingsForm.exchange_rate.trim() !== ""
                      ? `: 1 USD = ${settingsForm.exchange_rate} EGP`
                      : ": enter a positive rate."}
                  </p>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <ActionButton
                      type="button"
                      onClick={() => settings && syncSettingsForm(settings)}
                      disabled={!usdDirty || isSettingsSaving}
                    >
                      Reset USD
                    </ActionButton>
                    <ActionButton
                      type="submit"
                      tone="primary"
                      disabled={
                        isSettingsSaving || isPreviewLoading || !hasSettingsChanges
                      }
                    >
                      {isPreviewLoading
                        ? "Checking impact…"
                        : isSettingsSaving
                          ? "Saving..."
                          : "Save rate changes"}
                    </ActionButton>
                  </div>
                </div>
              }
            >
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-on-surface">EGP per 1 USD</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  autoComplete="off"
                  value={settingsForm.exchange_rate}
                  onChange={(event) =>
                    handleSettingsFieldChange("exchange_rate", event.target.value)
                  }
                  onWheel={(event) => {
                    event.currentTarget.blur();
                  }}
                  className={`form-input-base max-w-xs [&::-webkit-inner-spin-button]:appearance-none ${settingsErrors.exchange_rate ? "form-input-error" : ""}`}
                  placeholder="e.g. 50.25"
                  disabled={isSettingsSaving}
                  aria-invalid={Boolean(settingsErrors.exchange_rate)}
                />
                {settingsErrors.exchange_rate ? (
                  <span className="text-xs font-medium text-error">
                    {settingsErrors.exchange_rate}
                  </span>
                ) : null}
              </label>
            </InputGroupCard>

            <InputGroupCard
              label="EUR → EGP"
              hint="Saved on the server as exchange_rate_eur. Used when line items are priced in EUR."
              tone="default"
              value={formatEurRateSummary(settings?.exchange_rate_eur ?? null)}
              footer={
                <div className="flex w-full flex-wrap items-end justify-between gap-3">
                  <p className="min-w-0 text-sm text-on-surface-variant">
                    <span className="font-medium text-on-surface">Preview</span>
                    {settingsForm.exchange_rate_eur.trim() !== ""
                      ? `: 1 EUR = ${settingsForm.exchange_rate_eur} EGP`
                      : ": enter a positive rate."}
                  </p>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <ActionButton
                      type="button"
                      onClick={() => settings && syncSettingsForm(settings)}
                      disabled={!eurDirty || isSettingsSaving}
                    >
                      Reset EUR
                    </ActionButton>
                    <ActionButton
                      type="submit"
                      tone="primary"
                      disabled={
                        isSettingsSaving || isPreviewLoading || !hasSettingsChanges
                      }
                    >
                      {isPreviewLoading
                        ? "Checking impact…"
                        : isSettingsSaving
                          ? "Saving..."
                          : "Save rate changes"}
                    </ActionButton>
                  </div>
                </div>
              }
            >
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-on-surface">EGP per 1 EUR</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  inputMode="decimal"
                  autoComplete="off"
                  value={settingsForm.exchange_rate_eur}
                  onChange={(event) =>
                    handleSettingsFieldChange(
                      "exchange_rate_eur",
                      event.target.value,
                    )
                  }
                  onWheel={(event) => {
                    event.currentTarget.blur();
                  }}
                  className={`form-input-base max-w-xs [&::-webkit-inner-spin-button]:appearance-none ${settingsErrors.exchange_rate_eur ? "form-input-error" : ""}`}
                  placeholder="e.g. 52.50"
                  disabled={isSettingsSaving}
                  aria-invalid={Boolean(settingsErrors.exchange_rate_eur)}
                />
                {settingsErrors.exchange_rate_eur ? (
                  <span className="text-xs font-medium text-error">
                    {settingsErrors.exchange_rate_eur}
                  </span>
                ) : null}
              </label>
            </InputGroupCard>
          </form>
        ) : null}
      </div>

      <PageHero
        eyebrow="Master Data"
        title="Payment Methods"
        actions={
          canCreatePaymentMethods ? (
            <ActionButton tone="primary" onClick={() => handleOpenModal()}>
              Add Payment Method
            </ActionButton>
          ) : null
        }
      />

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex max-w-md flex-col gap-1 text-sm">
          <span className="font-medium text-on-surface">Search</span>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filter by name…"
            className="form-input-base"
          />
        </label>
      </div>

      <SurfaceCard>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"></div>
          </div>
        ) : methods.length === 0 ? (
          <EmptyState
            title="No payment methods found"
            description={
              debouncedSearch
                ? "Try a different search term."
                : "Create the first payment method so the team can align transactions with your accepted payment channels."
            }
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
                        type="button"
                        onClick={() => handleOpenModal(method)}
                        hidden={!canUpdatePaymentMethods}
                        className="text-primary hover:underline text-xs font-medium"
                      >
                        Edit
                      </button>
                      <span className="mx-2 text-on-surface-variant">•</span>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(method)}
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
        onPageChange={setPage}
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

      <ConfirmDialog
        isOpen={ratePreview !== null}
        onClose={() => {
          setRatePreview(null);
          setPendingSettingsPayload(null);
        }}
        title="Confirm exchange rate change"
        confirmLabel="Confirm and save"
        isLoading={isSettingsSaving}
        onConfirm={() => void handleConfirmRateChange()}
      >
        <p className="text-sm text-on-surface-variant">
          Margin-based catalog items will update automatically when you
          confirm. Manual items at a loss should be reviewed afterward.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete payment method?"
        confirmLabel="Delete"
        confirmTone="danger"
        isLoading={isDeleting}
        onConfirm={() => void handleConfirmDelete()}
      >
        <p className="text-sm text-on-surface-variant">
          Remove{" "}
          <span className="font-medium text-on-surface">
            {deleteTarget?.name}
          </span>
          ? This cannot be undone if the server allows deletion.
        </p>
      </ConfirmDialog>
    </PageShell>
  );
}
