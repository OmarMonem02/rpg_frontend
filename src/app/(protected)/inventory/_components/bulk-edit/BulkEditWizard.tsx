"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import { fetchAllPages } from "@/lib/crud-api";
import {
  ActionButton,
  PageHero,
  PageShell,
} from "@/components/ops-ui";
import { REFRESH_ALL_DATA_EVENT } from "@/components/refetch-all-data-button";
import { useGlobalDataRefresh } from "@/hooks/useGlobalDataRefresh";
import { BulkEditConfigureStep } from "./BulkEditConfigureStep";
import { BulkEditPreviewStep } from "./BulkEditPreviewStep";
import { BulkEditSelectStep } from "./BulkEditSelectStep";
import {
  buildListFilters,
  draftToChanges,
  emptyBulkEditDraft,
  type BulkEditDraft,
  type BulkEditEntityConfig,
  type BulkEditStep,
  type BulkInventoryListItem,
} from "./types";
import type { BulkInventoryEditPayload, BulkInventoryPreviewRow } from "@/lib/crud-api";
import { useBulkEditSelection } from "./useBulkEditSelection";
import type { BrandRecord, ProductCategoryRecord, SparePartCategoryRecord } from "@/lib/crud-api";

const STEP_LABELS: Record<BulkEditStep, string> = {
  1: "Select items",
  2: "Configure changes",
  3: "Preview",
  4: "Complete",
};

type BulkEditWizardProps = {
  config: BulkEditEntityConfig;
};

export function BulkEditWizard({ config }: BulkEditWizardProps) {
  const [step, setStep] = useState<BulkEditStep>(1);
  const [search, setSearch] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [currency, setCurrency] = useState("all");
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [categories, setCategories] = useState<
    (ProductCategoryRecord | SparePartCategoryRecord)[]
  >([]);
  const [draft, setDraft] = useState<BulkEditDraft>(emptyBulkEditDraft);
  const [configureError, setConfigureError] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<BulkInventoryPreviewRow[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [successUpdated, setSuccessUpdated] = useState<number | undefined>();
  const [mixedCurrency, setMixedCurrency] = useState(false);
  const listFilters = useMemo(
    () => buildListFilters({ search, brandId, categoryId, currency }),
    [search, brandId, categoryId, currency],
  );

  const selection = useBulkEditSelection(config, listFilters);

  useGlobalDataRefresh(selection.reload);

  useEffect(() => {
    async function loadDropdowns() {
      try {
        const token = getAuthToken();
        if (!token) return;
        const [cats, brs] = await Promise.all([
          fetchAllPages((p) => config.listCategories(token, p)),
          fetchAllPages((p) =>
            config.listBrands(token, p).then((r) => ({
              ...r,
              items: r.items,
            })),
          ),
        ]);
        setCategories(cats);
        setBrands(brs);
      } catch {
        // Non-blocking
      }
    }
    loadDropdowns();
  }, [config]);

  const syncSelectionMeta = useCallback(async () => {
    const token = getAuthToken();
    if (!token || selection.selectedCount === 0) {
      setMixedCurrency(false);
      return;
    }
    try {
      const all = await fetchAllPages<BulkInventoryListItem>((p) =>
        config.listItems(token, p, listFilters),
      );
      const selected = all.filter((i) => selection.selectedIds.has(i.id));
      const currencies = new Set(selected.map((i) => i.currency_pricing));
      setMixedCurrency(currencies.size > 1);
    } catch {
      setMixedCurrency(false);
    }
  }, [config, listFilters, selection.selectedCount, selection.selectedIds]);

  const buildPayload = useCallback((): BulkInventoryEditPayload | null => {
    const changes = draftToChanges(draft);
    if (!changes || selection.selectedCount === 0) return null;
    return {
      ids: Array.from(selection.selectedIds),
      changes,
    };
  }, [draft, selection.selectedIds, selection.selectedCount]);

  const handleGoToConfigure = async () => {
    setConfigureError(null);
    await syncSelectionMeta();
    setStep(2);
  };

  const handlePreview = async () => {
    const changes = draftToChanges(draft);
    if (!changes) {
      setConfigureError("Enable at least one field with a valid value.");
      return;
    }
    for (const field of ["sale_price", "cost_price"] as const) {
      const block = changes[field];
      if (block?.mode === "percent" && block.value <= -100) {
        setConfigureError("Percentage must be greater than -100.");
        return;
      }
    }

    setConfigureError(null);
    setStep(3);
    setPreviewLoading(true);
    setPreviewError(null);
    setSuccessUpdated(undefined);

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      const payload = buildPayload();
      if (!payload) throw new Error("Invalid selection or changes");

      const result = await config.preview(token, payload);
      setPreviewRows(result.rows);
      if (result.rows.length === 0) {
        setPreviewError("No items would change with this configuration.");
      }
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Preview failed");
      setPreviewRows([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApply = async () => {
    try {
      setApplying(true);
      setPreviewError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      const payload = buildPayload();
      if (!payload) throw new Error("Invalid selection or changes");

      const result = await config.apply(token, payload);
      setSuccessUpdated(result.updated);
      setStep(4);
      window.dispatchEvent(new Event(REFRESH_ALL_DATA_EVENT));
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Failed to apply changes");
    } finally {
      setApplying(false);
    }
  };

  return (
    <PageShell>
      <PageHero
        eyebrow={config.eyebrow}
        title={config.title}
        subtitle={config.subtitle}
        actions={
          <ActionButton variant="ghost" href={config.listHref}>
            Cancel
          </ActionButton>
        }
        meta={
          <div className="flex flex-wrap gap-2">
            {([1, 2, 3, 4] as BulkEditStep[]).map((s) => (
              <span
                key={s}
                className={`form-chip ${
                  step === s
                    ? "border-primary/30 bg-primary-container text-on-primary-container"
                    : step > s
                      ? "border-primary/15 text-on-surface-variant"
                      : ""
                }`}
              >
                {s}. {STEP_LABELS[s]}
              </span>
            ))}
          </div>
        }
      />

      {step === 1 ? (
        <BulkEditSelectStep
          search={search}
          setSearch={setSearch}
          brandId={brandId}
          setBrandId={setBrandId}
          categoryId={categoryId}
          setCategoryId={setCategoryId}
          currency={currency}
          setCurrency={setCurrency}
          brands={brands}
          categories={categories}
          items={selection.items}
          loading={selection.loading}
          error={selection.error}
          page={selection.page}
          totalPages={selection.totalPages}
          onPageChange={selection.setPage}
          selectedIds={selection.selectedIds}
          selectedCount={selection.selectedCount}
          onToggleId={selection.toggleId}
          onTogglePageAll={selection.togglePageAll}
          pageAllSelected={selection.pageAllSelected}
          onSelectAllFiltered={selection.selectAllFiltered}
          selectAllFilteredLoading={selection.selectAllFilteredLoading}
          onClearSelection={selection.clearSelection}
          onNext={handleGoToConfigure}
        />
      ) : null}

      {step === 2 ? (
        <BulkEditConfigureStep
          draft={draft}
          setDraft={setDraft}
          selectedCount={selection.selectedCount}
          mixedCurrency={mixedCurrency}
          error={configureError}
          onBack={() => setStep(1)}
          onNext={handlePreview}
        />
      ) : null}

      {step === 3 || step === 4 ? (
        <BulkEditPreviewStep
          rows={previewRows}
          loading={previewLoading}
          applying={applying}
          error={previewError}
          listHref={config.listHref}
          successUpdated={step === 4 ? successUpdated : undefined}
          onBack={() => {
            setStep(2);
            setSuccessUpdated(undefined);
          }}
          onConfirm={handleApply}
        />
      ) : null}
    </PageShell>
  );
}
