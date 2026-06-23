"use client";

import { useCallback, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import { addSaleLineItem, type CreateSaleLineItemPayload } from "@/lib/api/sales";
import { CatalogPickerModal } from "@/components/catalog-picker-modal";
import { ActionButton } from "@/components/ops-ui";
import { buildPayload, type CatalogItem, type CatalogType } from "@/app/(protected)/inventory/sales/[id]/sale-item-utils";
import {
  buildSaleUnstoredPayload,
  EMPTY_UNSTORED_DRAFT,
  UNSTORED_ITEM_TYPE_OPTIONS,
  validateUnstoredDraft,
  type UnstoredItemDraft,
} from "@/lib/unstored-line-item";
import { getSettings } from "@/lib/api/settings";
import { normalizeToEGP } from "@/app/(protected)/inventory/sales/[id]/sale-item-utils";
import { CheckIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

type SaleAddLineItemsProps = {
  saleId: number;
  onAdded: () => void;
};

export function SaleAddLineItems({ saleId, onAdded }: SaleAddLineItemsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState<CatalogType>("products");
  const [unstoredDraft, setUnstoredDraft] =
    useState<UnstoredItemDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const postItem = useCallback(
    async (payload: CreateSaleLineItemPayload) => {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      setBusy(true);
      setError(null);
      try {
        await addSaleLineItem(token, saleId, payload);
        onAdded();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add item");
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [onAdded, saleId],
  );

  const handleCatalogAdd = async (items: CatalogItem[]) => {
    const token = getAuthToken();
    if (!token) return;
    const settings = await getSettings(token);
    const rates = {
      usdToEgp: settings.exchange_rate ?? 0,
      eurToEgp: settings.exchange_rate_eur ?? 0,
    };
    try {
      for (const item of items) {
        const built = buildPayload(item);
        const payload: CreateSaleLineItemPayload = {
          ...built.payload,
          selling_price: normalizeToEGP(
            built.payload.selling_price,
            built.currency,
            rates,
          ),
        };
        await postItem(payload);
      }
      setPickerOpen(false);
    } catch {
      // error set in postItem
    }
  };

  const handleUnstoredSave = async () => {
    if (!unstoredDraft) return;
    const validationError = validateUnstoredDraft(unstoredDraft);
    if (validationError) {
      setDraftError(validationError);
      return;
    }
    try {
      await postItem(buildSaleUnstoredPayload(unstoredDraft));
      setUnstoredDraft(null);
      setDraftError(null);
    } catch {
      // error set in postItem
    }
  };

  return (
    <div className="border-b border-outline-variant/10 bg-surface-container-lowest p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-on-surface">Add line items</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Add catalog items or unstored items to this sale.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            variant="outline"
            size="sm"
            disabled={busy || unstoredDraft !== null}
            onClick={() => {
              setActiveCatalog("products");
              setPickerOpen(true);
            }}
            className="gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            From catalog
          </ActionButton>
          <ActionButton
            variant="outline"
            size="sm"
            disabled={busy || unstoredDraft !== null}
            onClick={() => {
              setUnstoredDraft({ ...EMPTY_UNSTORED_DRAFT });
              setDraftError(null);
            }}
            className="gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Add Unstored Item
          </ActionButton>
        </div>
      </div>

      {error ? (
        <p className="text-xs font-medium text-error">{error}</p>
      ) : null}

      {unstoredDraft ? (
        <div className="rounded-2xl border border-outline-variant/15 bg-surface overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 font-semibold">Item</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Sale price</th>
                <th className="px-4 py-3 font-semibold">Qty</th>
                <th className="px-4 py-3 font-semibold">Item disc.</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-primary/3">
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <input
                      value={unstoredDraft.custom_name}
                      onChange={(e) =>
                        setUnstoredDraft((prev) =>
                          prev ? { ...prev, custom_name: e.target.value } : prev,
                        )
                      }
                      placeholder="Name *"
                      className="form-input-base w-full py-1.5 text-sm"
                    />
                    <textarea
                      value={unstoredDraft.custom_description}
                      onChange={(e) =>
                        setUnstoredDraft((prev) =>
                          prev
                            ? { ...prev, custom_description: e.target.value }
                            : prev,
                        )
                      }
                      rows={2}
                      placeholder="Description *"
                      className="form-input-base w-full py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={unstoredDraft.cost_price}
                      onChange={(e) =>
                        setUnstoredDraft((prev) =>
                          prev
                            ? { ...prev, cost_price: Number(e.target.value) }
                            : prev,
                        )
                      }
                      placeholder="Cost (EGP) *"
                      className="form-input-base mono-data w-full py-1.5 text-sm"
                    />
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <select
                    value={unstoredDraft.unstored_type}
                    onChange={(e) =>
                      setUnstoredDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              unstored_type:
                                e.target.value as UnstoredItemDraft["unstored_type"],
                            }
                          : prev,
                      )
                    }
                    className="form-input-base w-full min-w-[9rem] py-1.5 text-xs"
                  >
                    {UNSTORED_ITEM_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 align-top">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={unstoredDraft.sale_price}
                    onChange={(e) =>
                      setUnstoredDraft((prev) =>
                        prev
                          ? { ...prev, sale_price: Number(e.target.value) }
                          : prev,
                      )
                    }
                    className="form-input-base mono-data w-24 py-1.5 text-right text-sm"
                  />
                </td>
                <td className="px-4 py-3 align-top">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={unstoredDraft.qty}
                    onChange={(e) =>
                      setUnstoredDraft((prev) =>
                        prev ? { ...prev, qty: Number(e.target.value) } : prev,
                      )
                    }
                    className="form-input-base mono-data w-16 py-1.5 text-right text-sm"
                  />
                </td>
                <td className="px-4 py-3 align-top text-on-surface-variant/40">—</td>
                <td className="px-4 py-3 align-top">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleUnstoredSave()}
                      className="rounded-lg p-1.5 text-on-success-container transition-colors hover:bg-success/10 disabled:opacity-50"
                      title="Add line"
                      aria-label="Add line"
                    >
                      <CheckIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setUnstoredDraft(null);
                        setDraftError(null);
                      }}
                      className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                      title="Cancel"
                      aria-label="Cancel"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                  {draftError ? (
                    <p className="mt-2 text-xs font-medium text-error text-right">
                      {draftError}
                    </p>
                  ) : null}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}

      <CatalogPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        catalogType={activeCatalog}
        onAddItems={handleCatalogAdd}
      />
    </div>
  );
}
