"use client";

import { useMemo, useState } from "react";
import {
  ActionButton,
  InlineMessage,
  SearchableSelect,
  SurfaceCard,
} from "@/components/ops-ui";
import type { BikeBlueprintRecord } from "@/lib/crud-api";
import {
  NUMERIC_BULK_EDIT_FIELDS,
  draftHasEnabledFields,
  type BulkEditDraft,
} from "./types";

type BulkEditConfigureStepProps = {
  draft: BulkEditDraft;
  setDraft: React.Dispatch<React.SetStateAction<BulkEditDraft>>;
  selectedCount: number;
  mixedCurrency: boolean;
  bikeBlueprints: BikeBlueprintRecord[];
  error: string | null;
  onBack: () => void;
  onNext: () => void;
};

const PRICE_MODES = [
  { value: "set", label: "Set to" },
  { value: "add", label: "Add" },
  { value: "subtract", label: "Subtract" },
  { value: "percent", label: "Adjust by %" },
];

const STOCK_MODES = [
  { value: "set", label: "Set to" },
  { value: "add", label: "Add" },
  { value: "subtract", label: "Subtract" },
];

function formatBlueprintLabel(bp: BikeBlueprintRecord): string {
  const brand = bp.brand?.name;
  const core = `${bp.model} · ${bp.year}`;
  return brand ? `${brand} — ${core}` : core;
}

export function BulkEditConfigureStep({
  draft,
  setDraft,
  selectedCount,
  mixedCurrency,
  bikeBlueprints,
  error,
  onBack,
  onNext,
}: BulkEditConfigureStepProps) {
  const [blueprintSearch, setBlueprintSearch] = useState("");

  const updateNumericField = (
    key: (typeof NUMERIC_BULK_EDIT_FIELDS)[number]["key"],
    patch: Partial<BulkEditDraft[typeof key]>,
  ) => {
    setDraft((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const filteredBlueprints = useMemo(() => {
    const query = blueprintSearch.trim().toLowerCase();
    const selected = new Set(draft.compatibility.blueprintIds);
    const sorted = [...bikeBlueprints].sort((a, b) =>
      formatBlueprintLabel(a).localeCompare(formatBlueprintLabel(b)),
    );

    if (!query) return sorted;

    return sorted.filter(
      (bp) =>
        selected.has(bp.id) ||
        formatBlueprintLabel(bp).toLowerCase().includes(query),
    );
  }, [bikeBlueprints, blueprintSearch, draft.compatibility.blueprintIds]);

  const toggleBlueprint = (id: number) => {
    setDraft((prev) => {
      const current = prev.compatibility.blueprintIds;
      const next = current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id];
      return {
        ...prev,
        compatibility: { ...prev.compatibility, blueprintIds: next },
      };
    });
  };

  const hasEnabled = draftHasEnabledFields(draft);

  return (
    <div className="space-y-4 animate-fade-in">
      <SurfaceCard className="p-5">
        <p className="text-sm text-on-surface-variant">
          Configure changes for <span className="mono-data font-medium text-on-surface">{selectedCount}</span>{" "}
          selected items. Enable only the fields you want to update.
        </p>
        {mixedCurrency ? (
          <div className="mt-3">
            <InlineMessage tone="warning">
              Selection includes multiple currencies. Price changes apply per item in its own currency.
            </InlineMessage>
          </div>
        ) : null}
      </SurfaceCard>

      <div className="grid gap-4 md:grid-cols-2">
        {NUMERIC_BULK_EDIT_FIELDS.map((field) => {
          const d = draft[field.key];
          const modes = field.price ? PRICE_MODES : STOCK_MODES;
          return (
            <SurfaceCard key={field.key} className="p-4">
              <div className="form-section-header !mb-3 !pb-2">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={d.enabled}
                    onChange={(e) => updateNumericField(field.key, { enabled: e.target.checked })}
                    className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary/20"
                  />
                  <span className="font-display text-sm font-semibold text-on-surface">
                    {field.label}
                  </span>
                </label>
              </div>
              {d.enabled ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label-caps mb-1.5 block">Mode</label>
                    <SearchableSelect
                      value={d.mode}
                      onChange={(value) => updateNumericField(field.key, { mode: value })}
                      options={modes.map((m) => ({
                        value: m.value,
                        label: m.label,
                      }))}
                      className="form-input-base py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="label-caps mb-1.5 block">Value</label>
                    <input
                      type="number"
                      step={field.price ? "0.01" : "1"}
                      value={d.value}
                      onWheel={(event) => {
                        event.currentTarget.blur();
                      }}
                      onChange={(e) => updateNumericField(field.key, { value: e.target.value })}
                      className="form-input-base py-2 text-sm mono-data [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder={d.mode === "percent" ? "e.g. 10" : "0"}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant">Not included in this bulk edit.</p>
              )}
            </SurfaceCard>
          );
        })}

        <SurfaceCard className="p-4">
          <div className="form-section-header !mb-3 !pb-2">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={draft.item_status.enabled}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    item_status: { ...prev.item_status, enabled: e.target.checked },
                  }))
                }
                className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary/20"
              />
              <span className="font-display text-sm font-semibold text-on-surface">Item status</span>
            </label>
          </div>
          {draft.item_status.enabled ? (
            <SearchableSelect
              value={draft.item_status.value}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  item_status: {
                    ...prev.item_status,
                    value: value as "new" | "used",
                  },
                }))
              }
              options={[
                { value: "new", label: "New" },
                { value: "used", label: "Used" },
              ]}
              className="form-input-base py-2 text-sm"
            />
          ) : (
            <p className="text-xs text-on-surface-variant">Not included in this bulk edit.</p>
          )}
        </SurfaceCard>

        <SurfaceCard className="p-4">
          <div className="form-section-header !mb-3 !pb-2">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={draft.have_commission.enabled}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    have_commission: { ...prev.have_commission, enabled: e.target.checked },
                  }))
                }
                className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary/20"
              />
              <span className="font-display text-sm font-semibold text-on-surface">Commission</span>
            </label>
          </div>
          {draft.have_commission.enabled ? (
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={draft.have_commission.value}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    have_commission: { ...prev.have_commission, value: e.target.checked },
                  }))
                }
                className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary/20"
              />
              <span className="text-sm text-on-surface">Have commission on sales</span>
            </label>
          ) : (
            <p className="text-xs text-on-surface-variant">Not included in this bulk edit.</p>
          )}
        </SurfaceCard>

        <SurfaceCard className="p-4">
          <div className="form-section-header !mb-3 !pb-2">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={draft.discount.enabled}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    discount: { ...prev.discount, enabled: e.target.checked },
                  }))
                }
                className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary/20"
              />
              <span className="font-display text-sm font-semibold text-on-surface">Discounts</span>
            </label>
          </div>
          {draft.discount.enabled ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label-caps mb-1.5 block">Discount type</label>
                <SearchableSelect
                  value={draft.discount.type}
                  onChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      discount: {
                        ...prev.discount,
                        type: value as "fixed" | "percentage",
                      },
                    }))
                  }
                  options={[
                    { value: "percentage", label: "Percentage" },
                    { value: "fixed", label: "Fixed amount" },
                  ]}
                  className="form-input-base py-2 text-sm"
                />
              </div>
              <div>
                <label className="label-caps mb-1.5 block">Max discount value</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={draft.discount.value}
                  onWheel={(event) => {
                    event.currentTarget.blur();
                  }}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      discount: { ...prev.discount, value: e.target.value },
                    }))
                  }
                  className="form-input-base py-2 text-sm mono-data [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant">Not included in this bulk edit.</p>
          )}
        </SurfaceCard>

        <SurfaceCard className="p-4 md:col-span-2">
          <div className="form-section-header !mb-3 !pb-2">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={draft.compatibility.enabled}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    compatibility: { ...prev.compatibility, enabled: e.target.checked },
                  }))
                }
                className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary/20"
              />
              <span className="font-display text-sm font-semibold text-on-surface">Compatibility</span>
            </label>
          </div>
          {draft.compatibility.enabled ? (
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={draft.compatibility.universal}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      compatibility: {
                        ...prev.compatibility,
                        universal: e.target.checked,
                        blueprintIds: e.target.checked ? [] : prev.compatibility.blueprintIds,
                      },
                    }))
                  }
                  className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-on-surface">Universal (applies broadly without blueprint links)</span>
              </label>

              {!draft.compatibility.universal ? (
                <div className="space-y-2">
                  <label className="label-caps block">Compatible bike blueprints</label>
                  <input
                    type="search"
                    value={blueprintSearch}
                    onChange={(e) => setBlueprintSearch(e.target.value)}
                    placeholder="Search blueprints…"
                    className="form-input-base py-2 text-sm"
                  />
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-outline-variant/15 bg-surface-container-low p-2">
                    {filteredBlueprints.length === 0 ? (
                      <p className="px-2 py-3 text-sm text-on-surface-variant">No blueprints found.</p>
                    ) : (
                      <ul className="space-y-1">
                        {filteredBlueprints.map((bp) => (
                          <li key={bp.id}>
                            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-container">
                              <input
                                type="checkbox"
                                checked={draft.compatibility.blueprintIds.includes(bp.id)}
                                onChange={() => toggleBlueprint(bp.id)}
                                className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary/20"
                              />
                              <span className="text-sm text-on-surface">{formatBlueprintLabel(bp)}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    Selected blueprints replace compatibility links on every item in this bulk edit.
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant">Not included in this bulk edit.</p>
          )}
        </SurfaceCard>
      </div>

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

      <div className="flex flex-wrap justify-between gap-3">
        <ActionButton variant="ghost" onClick={onBack}>
          Back
        </ActionButton>
        <ActionButton tone="primary" onClick={onNext} disabled={!hasEnabled}>
          Preview changes
        </ActionButton>
      </div>
    </div>
  );
}
