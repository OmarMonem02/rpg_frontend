"use client";

import {
  ActionButton,
  InlineMessage,
  SearchableSelect,
  SurfaceCard,
} from "@/components/ops-ui";
import type { BulkInventoryPreviewRow } from "@/lib/crud-api";
import {
  NUMERIC_BULK_EDIT_FIELDS,
  draftHasEnabledFields,
  type BulkEditDraft,
} from "./types";
import { BulkEditPreviewPanel } from "./BulkEditPreviewPanel";

type BulkEditConfigureStepProps = {
  draft: BulkEditDraft;
  setDraft: React.Dispatch<React.SetStateAction<BulkEditDraft>>;
  selectedCount: number;
  mixedCurrency: boolean;
  error: string | null;
  previewRows: BulkInventoryPreviewRow[];
  previewLoading: boolean;
  previewError: string | null;
  applying: boolean;
  onBack: () => void;
  onApply: () => void;
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

export function BulkEditConfigureStep({
  draft,
  setDraft,
  selectedCount,
  mixedCurrency,
  error,
  previewRows,
  previewLoading,
  previewError,
  applying,
  onBack,
  onApply,
}: BulkEditConfigureStepProps) {
  const updateNumericField = (
    key: (typeof NUMERIC_BULK_EDIT_FIELDS)[number]["key"],
    patch: Partial<BulkEditDraft[typeof key]>,
  ) => {
    setDraft((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
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
      </div>

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

      <BulkEditPreviewPanel
        rows={previewRows}
        loading={previewLoading}
        error={previewError}
      />

      <div className="flex flex-wrap justify-between gap-3">
        <ActionButton variant="ghost" onClick={onBack} disabled={applying}>
          Back
        </ActionButton>
        <ActionButton
          tone="primary"
          onClick={onApply}
          disabled={!hasEnabled || applying || previewLoading || previewRows.length === 0}
        >
          {applying ? "Applying…" : "Apply changes"}
        </ActionButton>
      </div>
    </div>
  );
}
