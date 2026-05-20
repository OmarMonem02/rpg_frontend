"use client";

import {
  ActionButton,
  InlineMessage,
  SurfaceCard,
} from "@/components/ops-ui";
import {
  BULK_EDIT_FIELDS,
  type BulkEditDraft,
} from "./types";

type BulkEditConfigureStepProps = {
  draft: BulkEditDraft;
  setDraft: React.Dispatch<React.SetStateAction<BulkEditDraft>>;
  selectedCount: number;
  mixedCurrency: boolean;
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

export function BulkEditConfigureStep({
  draft,
  setDraft,
  selectedCount,
  mixedCurrency,
  error,
  onBack,
  onNext,
}: BulkEditConfigureStepProps) {
  const updateField = (
    key: keyof BulkEditDraft,
    patch: Partial<BulkEditDraft[keyof BulkEditDraft]>,
  ) => {
    setDraft((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const hasEnabled = BULK_EDIT_FIELDS.some((f) => draft[f.key].enabled);

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
        {BULK_EDIT_FIELDS.map((field) => {
          const d = draft[field.key];
          const modes = field.price ? PRICE_MODES : STOCK_MODES;
          return (
            <SurfaceCard key={field.key} className="p-4">
              <div className="form-section-header !mb-3 !pb-2">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={d.enabled}
                    onChange={(e) => updateField(field.key, { enabled: e.target.checked })}
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
                    <select
                      value={d.mode}
                      onChange={(e) => updateField(field.key, { mode: e.target.value })}
                      className="form-input-base py-2 text-sm"
                    >
                      {modes.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-caps mb-1.5 block">Value</label>
                    <input
                      type="number"
                      step={field.price ? "0.01" : "1"}
                      value={d.value}
                      onChange={(e) => updateField(field.key, { value: e.target.value })}
                      className="form-input-base py-2 text-sm mono-data"
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
