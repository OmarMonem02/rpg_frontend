"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import { fetchAllPages, listBrands } from "@/lib/crud-api";
import type { CatalogListFilters } from "@/lib/crud-api";
import {
  ActionButton,
  PageHero,
  PageShell,
} from "@/components/ops-ui";
import { REFRESH_ALL_DATA_EVENT } from "@/components/refetch-all-data-button";
import { useGlobalDataRefresh } from "@/hooks/useGlobalDataRefresh";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import { filterBrandsByType } from "@/lib/brand-types";
import { BulkEditCompleteStep } from "./BulkEditCompleteStep";
import { BulkEditConfigureStep } from "./BulkEditConfigureStep";
import { BulkEditSelectStep } from "./BulkEditSelectStep";
import {
  draftHasEnabledFields,
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
  2: "Configure & preview",
  3: "Complete",
};

const PREVIEW_DEBOUNCE_MS = 500;

type BulkEditWizardProps = {
  config: BulkEditEntityConfig;
};

export function BulkEditWizard({ config }: BulkEditWizardProps) {
  const [step, setStep] = useState<BulkEditStep>(1);
  const entityFilters = useEntityFilters();
  const {
    filters,
    getModuleApiParams,
    setSearch,
    setCategory,
    setBrand,
    setPriceMin,
    setPriceMax,
    setCurrency,
    setBikeCompatibility,
    setTags,
    setLowStock,
    setFilter,
    resetFilters,
  } = entityFilters;

  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [bikeBrands, setBikeBrands] = useState<BrandRecord[]>([]);
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
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const listFilters = useMemo(
    () => getModuleApiParams(config.moduleId) as CatalogListFilters,
    [getModuleApiParams, config.moduleId, filters],
  );

  const selection = useBulkEditSelection(config, listFilters);

  useGlobalDataRefresh(selection.reload);

  useEffect(() => {
    async function loadDropdowns() {
      try {
        const token = getAuthToken();
        if (!token) return;
        const [cats, allBrands] = await Promise.all([
          fetchAllPages((p) => config.listCategories(token, p)),
          fetchAllPages((p) => listBrands(token, p)),
        ]);
        setCategories(cats);
        setBrands(filterBrandsByType(allBrands, config.brandType));
        setBikeBrands(filterBrandsByType(allBrands, "bikes"));
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
      const currencies = new Set(selected.map((i) => i.sale_currency));
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

  const runPreview = useCallback(async () => {
    const changes = draftToChanges(draft);
    if (!changes || selection.selectedCount === 0 || step !== 2) {
      setPreviewRows([]);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }

    for (const field of ["sale_price", "cost_price"] as const) {
      const block = changes[field];
      if (block?.mode === "percent" && block.value <= -100) {
        setPreviewError("Percentage must be greater than -100.");
        setPreviewRows([]);
        return;
      }
    }

    try {
      setPreviewLoading(true);
      setPreviewError(null);
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
  }, [draft, selection.selectedCount, step, buildPayload, config]);

  useEffect(() => {
    if (step !== 2) return;
    if (!draftHasEnabledFields(draft)) {
      setPreviewRows([]);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    if (draftToChanges(draft) === null) {
      setPreviewRows([]);
      setPreviewError("Complete all enabled fields with valid values to preview.");
      setPreviewLoading(false);
      return;
    }

    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }
    previewTimerRef.current = setTimeout(() => {
      void runPreview();
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
      }
    };
  }, [draft, step, runPreview]);

  const handleGoToConfigure = async () => {
    setConfigureError(null);
    await syncSelectionMeta();
    setPreviewRows([]);
    setPreviewError(null);
    setStep(2);
  };

  const handleApply = async () => {
    const changes = draftToChanges(draft);
    if (!changes) {
      if (draft.discount.enabled && draft.discount.value === "") {
        setConfigureError("Enter a max discount value.");
      } else {
        setConfigureError("Enable at least one field with a valid value.");
      }
      return;
    }

    try {
      setApplying(true);
      setConfigureError(null);
      setPreviewError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      const payload = buildPayload();
      if (!payload) throw new Error("Invalid selection or changes");

      const result = await config.apply(token, payload);
      setSuccessUpdated(result.updated);
      setStep(3);
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
            {([1, 2, 3] as BulkEditStep[]).map((s) => (
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
          moduleId={config.moduleId}
          entity={config.entity}
          filters={filters}
          setSearch={setSearch}
          setCategory={setCategory}
          setBrand={setBrand}
          setPriceMin={setPriceMin}
          setPriceMax={setPriceMax}
          setCurrency={setCurrency}
          setBikeCompatibility={setBikeCompatibility}
          setTags={setTags}
          setLowStock={setLowStock}
          setFilter={setFilter}
          resetFilters={resetFilters}
          brands={brands}
          bikeBrands={bikeBrands}
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
          previewRows={previewRows}
          previewLoading={previewLoading}
          previewError={previewError}
          applying={applying}
          onBack={() => setStep(1)}
          onApply={handleApply}
        />
      ) : null}

      {step === 3 && successUpdated !== undefined ? (
        <BulkEditCompleteStep successUpdated={successUpdated} listHref={config.listHref} />
      ) : null}
    </PageShell>
  );
}
