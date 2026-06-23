"use client";

import { useEffect, useState } from "react";
import { SaleLineItemDiscountCell } from "@/components/sale-line-item-discount-cell";
import type { PricingCurrency } from "@/lib/currencies";
import { egpMultiplierForPricingCurrency, formatEgp } from "@/lib/currencies";
import {
  ProductRecord,
  SparePartRecord,
  MaintenancePartRecord,
  BikeRecord,
  MaintenanceServiceRecord,
} from "@/lib/crud-api";
import {
  UNSTORED_ITEM_TYPE_OPTIONS,
  unstoredTypeLabel,
  validateUnstoredDraft,
  type UnstoredItemType,
} from "@/lib/unstored-line-item";
import { EmptyState } from "@/components/ops-ui";
import {
  computeCartTotalsBreakdown,
  SaleTotalsSummary,
} from "@/components/sale-totals-summary";
import { TrashIcon, PencilSquareIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
export type SaleLineItem = {
  id?: string; // temp ID for unsaved items
  sellable_id: number;
  sellable_type:
    | "products"
    | "spare_parts"
    | "maintenance_parts"
    | "bikes"
    | "maintenance_services"
    | "unstored";
  item_name: string;
  selling_price: number;
  discount_amount: number;
  discount_approval_request_id?: number;
  discount_approval_request_pending?: boolean;
  quantity: number;
  currency: PricingCurrency;
  is_unstored?: boolean;
  custom_name?: string;
  custom_description?: string;
  unstored_type?: UnstoredItemType;
  cost_price?: number;
  is_draft?: boolean;
  catalogItem?:
    | ProductRecord
    | SparePartRecord
    | MaintenancePartRecord
    | BikeRecord
    | MaintenanceServiceRecord;
};

interface CartLineItemsPanelProps {
  items: SaleLineItem[];
  onUpdateItem: (itemId: string | number, updates: Partial<SaleLineItem>) => void;
  onDeleteItem: (itemId: string | number) => void;
  shippingFee: number;
  saleDiscount: number;
  isAdmin?: boolean;
  saleContext?: {
    customer_id?: number | null;
    customer_name?: string | null;
    seller_id?: number | null;
    sale_type?: string | null;
  };
  onPendingItemApprovalsChange?: (hasPending: boolean) => void;
  exchangeRate?: number;
  /** EGP per 1 EUR (same naming as settings `exchange_rate_eur`). */
  exchangeRateEur?: number;
}

export function CartLineItemsPanel({
  items,
  onUpdateItem,
  onDeleteItem,
  shippingFee = 0,
  saleDiscount = 0,
  isAdmin = false,
  saleContext,
  onPendingItemApprovalsChange,
  exchangeRate = 0,
  exchangeRateEur = 0,
}: CartLineItemsPanelProps) {
  const [editingRowId, setEditingRowId] = useState<string | number | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    qty: number;
    price: number;
    custom_name: string;
    custom_description: string;
    unstored_type: UnstoredItemType;
    cost_price: number;
  }>({
    qty: 1,
    price: 0,
    custom_name: "",
    custom_description: "",
    unstored_type: "product",
    cost_price: 0,
  });
  const exchangeRates = {
    usdToEgp: exchangeRate,
    eurToEgp: exchangeRateEur,
  };

  useEffect(() => {
    const hasPending = items.some(
      (line) => line.discount_approval_request_pending === true,
    );
    onPendingItemApprovalsChange?.(hasPending);
  }, [items, onPendingItemApprovalsChange]);

  const getMaxQty = (item: SaleLineItem): number | undefined => {
    if (item.is_unstored || item.sellable_type === "unstored") return undefined;
    if (item.sellable_type === "bikes" || item.sellable_type === "maintenance_services") return 1;
    // Products + spare parts come from inventory and have stock_quantity
    if (
      item.sellable_type === "products" ||
      item.sellable_type === "spare_parts" ||
      item.sellable_type === "maintenance_parts"
    ) {
      const stock = (item.catalogItem as { stock_quantity?: number }).stock_quantity;
      if (typeof stock === "number" && Number.isFinite(stock) && stock >= 0) return Math.trunc(stock);
    }
    return undefined;
  };

  const normalizeQty = (item: SaleLineItem, raw: number): number => {
    const max = getMaxQty(item);
    const n = Number.isFinite(raw) ? Math.trunc(raw) : 0;
    const clampedMin = Math.max(1, n);
    // If stock is 0, we still keep qty >= 1 but UI will prevent saving.
    if (max === 0) return clampedMin;
    return typeof max === "number" ? Math.min(clampedMin, max) : clampedMin;
  };

  useEffect(() => {
    const draft = items.find((line) => line.is_draft);
    if (!draft) return;
    const rowId = draft.id || draft.sellable_id;
    if (editingRowId === rowId) return;
    const qty = normalizeQty(draft, draft.quantity);
    setEditingRowId(rowId);
    setEditError(null);
    setEditValues({
      qty,
      price: draft.selling_price,
      custom_name: draft.custom_name ?? "",
      custom_description: draft.custom_description ?? "",
      unstored_type: draft.unstored_type ?? "product",
      cost_price: draft.cost_price ?? 0,
    });
  }, [items, editingRowId]);

  const handleEditClick = (item: SaleLineItem) => {
    const qty = normalizeQty(item, item.quantity);
    setEditingRowId(item.id || item.sellable_id);
    setEditError(null);
    setEditValues({
      qty,
      price: item.selling_price,
      custom_name: item.custom_name ?? "",
      custom_description: item.custom_description ?? "",
      unstored_type: item.unstored_type ?? "product",
      cost_price: item.cost_price ?? 0,
    });
  };

  const handleSaveEdit = (itemId: string | number) => {
    const item = items.find((i) => (i.id || i.sellable_id) === itemId);
    if (!item) return;

    if (item.is_unstored || item.sellable_type === "unstored") {
      const validationError = validateUnstoredDraft({
        custom_name: editValues.custom_name,
        custom_description: editValues.custom_description,
        unstored_type: editValues.unstored_type,
        qty: editValues.qty,
        cost_price: editValues.cost_price,
        sale_price: editValues.price,
      });
      if (validationError) {
        setEditError(validationError);
        return;
      }

      const qty = normalizeQty(item, editValues.qty);
      const customName = editValues.custom_name.trim();
      onUpdateItem(itemId, {
        custom_name: customName,
        custom_description: editValues.custom_description.trim(),
        unstored_type: editValues.unstored_type,
        cost_price: Number(editValues.cost_price),
        item_name: customName,
        selling_price: Number(editValues.price),
        quantity: qty,
        discount_amount: 0,
        discount_approval_request_id: undefined,
        discount_approval_request_pending: undefined,
        is_draft: false,
      });
      setEditingRowId(null);
      setEditError(null);
      return;
    }

    const qty = normalizeQty(item, editValues.qty);
    onUpdateItem(itemId, {
      quantity: qty,
      selling_price: editValues.price,
    });
    setEditingRowId(null);
    setEditError(null);
  };

  const handleDiscountApply = (
    itemId: string | number,
    discountAmount: number,
    approvalRequestId?: number,
  ) => {
    onUpdateItem(itemId, {
      discount_amount: discountAmount,
      ...(approvalRequestId != null
        ? {
            discount_approval_request_id: approvalRequestId,
            discount_approval_request_pending: false,
          }
        : {
            discount_approval_request_id: undefined,
            discount_approval_request_pending: undefined,
          }),
    });
  };

  const handlePersistPendingRequest = (
    itemId: string | number,
    requestId: number,
  ) => {
    onUpdateItem(itemId, {
      discount_approval_request_id: requestId,
      discount_approval_request_pending: true,
    });
  };

  const handleClearStoredRequest = (itemId: string | number) => {
    onUpdateItem(itemId, {
      discount_approval_request_id: undefined,
      discount_approval_request_pending: undefined,
    });
  };

  const handleCancelEdit = (itemId?: string | number) => {
    const item = itemId
      ? items.find((i) => (i.id || i.sellable_id) === itemId)
      : undefined;
    if (item?.is_draft && itemId != null) {
      onDeleteItem(itemId);
    }
    setEditingRowId(null);
    setEditError(null);
  };

  // ─── Currency Normalization ────────────────────────────────────────────────
  /**
   * Returns the EGP-normalised unit price for an item.
   * USD items are multiplied by exchangeRate; EGP items pass through unchanged.
   */
  const toEGP = (item: SaleLineItem): number => {
    const m = egpMultiplierForPricingCurrency(item.currency, {
      usdToEgp: exchangeRate,
      eurToEgp: exchangeRateEur,
    });
    return item.selling_price * m;
  };

  const toEGPDiscount = (item: SaleLineItem): number => {
    const m = egpMultiplierForPricingCurrency(item.currency, {
      usdToEgp: exchangeRate,
      eurToEgp: exchangeRateEur,
    });
    return item.discount_amount * m;
  };

  const getDisplayPriceEgp = (item: SaleLineItem): number => toEGP(item);

  /**
   * Line subtotal always in EGP (base currency).
   * Formula: (unitPriceEGP * qty) - discountEGP
   */
  const calculateLineSubtotal = (item: SaleLineItem): number => {
    const unitEGP = toEGP(item);
    const discEGP = toEGPDiscount(item);
    return Math.round((item.quantity * unitEGP - discEGP) * 100) / 100;
  };

  const totalsBreakdown = computeCartTotalsBreakdown(
    items,
    exchangeRate,
    exchangeRateEur,
  );
  const subtotal = totalsBreakdown.netSubtotal;
  const total = Math.round((subtotal + shippingFee - saleDiscount) * 100) / 100;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-outline-variant/20 bg-surface shadow-sm lg:h-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant/15 bg-surface-container-low px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-on-surface">Sale Items</h3>
            <p className="text-xs font-medium text-on-surface-variant">
              {items.length} {items.length === 1 ? "item" : "items"} in cart
            </p>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-x-auto">
        {items.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Cart is Empty"
              description="Select items from the catalogs on the left to add them to your sale."
            />
          </div>
        ) : (
          <div className="min-w-[800px]">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-surface-container-lowest sticky top-0 z-10 border-b border-outline-variant/15 shadow-sm">
                <tr>
                  <th className="label-caps px-5 py-3">Item</th>
                  <th className="label-caps px-5 py-3 text-center">Type</th>
                  <th className="label-caps px-5 py-3 text-right">Price</th>
                  <th className="label-caps px-5 py-3 text-right">Qty</th>
                  <th
                    className="label-caps px-5 py-3 text-right"
                    title="Discount for this line only (not the overall sale discount)"
                  >
                    Item disc.
                  </th>
                  <th className="label-caps px-5 py-3 text-right">Total</th>
                  <th className="label-caps px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {items.map((item, index) => {
                  const rowId = item.id || item.sellable_id;
                  const isUnstored =
                    item.is_unstored || item.sellable_type === "unstored";
                  const isEditing = editingRowId === rowId || item.is_draft === true;
                  const maxQty = getMaxQty(item);
                  const isStockLimited =
                    item.sellable_type === "products" ||
                    item.sellable_type === "spare_parts" ||
                    item.sellable_type === "maintenance_parts";
                  const isOutOfStock = isStockLimited && typeof maxQty === "number" && maxQty === 0;
                  const draftLineSubtotal = isUnstored && isEditing
                    ? Math.round(
                        (editValues.qty * Number(editValues.price || 0)) * 100,
                      ) / 100
                    : calculateLineSubtotal(item);
                  return (
                    <tr
                      key={index}
                      className={`data-row group ${isEditing ? "bg-primary/3 ring-2 ring-primary/20" : ""}`}
                    >
                      {/* Item Name */}
                      <td className="px-5 py-4">
                        {isUnstored && isEditing ? (
                          <div className="flex flex-col gap-2 min-w-[200px]">
                            <input
                              value={editValues.custom_name}
                              onChange={(e) =>
                                setEditValues((v) => ({
                                  ...v,
                                  custom_name: e.target.value,
                                }))
                              }
                              placeholder="Name *"
                              className="form-input-base w-full py-1.5 text-sm"
                            />
                            <textarea
                              value={editValues.custom_description}
                              onChange={(e) =>
                                setEditValues((v) => ({
                                  ...v,
                                  custom_description: e.target.value,
                                }))
                              }
                              rows={2}
                              placeholder="Description *"
                              className="form-input-base w-full py-1.5 text-sm"
                            />
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={editValues.cost_price}
                              onChange={(e) =>
                                setEditValues((v) => ({
                                  ...v,
                                  cost_price: Number(e.target.value),
                                }))
                              }
                              placeholder="Cost (EGP) *"
                              className="form-input-base mono-data w-full py-1.5 text-sm"
                            />
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold text-on-surface">{item.item_name}</p>
                            {item.is_unstored && item.custom_description ? (
                              <p className="mt-0.5 text-xs text-on-surface-variant">
                                {item.custom_description}
                              </p>
                            ) : null}
                            {item.is_unstored && item.cost_price != null ? (
                              <p className="mono-data mt-0.5 text-xs font-medium text-on-surface-variant/70">
                                Cost: {formatEgp(item.cost_price)}
                              </p>
                            ) : (
                              !item.is_unstored && (
                                <p className="mono-data mt-0.5 text-xs font-medium text-on-surface-variant/70">
                                  ID: {item.sellable_id}
                                </p>
                              )
                            )}
                          </>
                        )}
                      </td>

                      {/* Item Type */}
                      <td className="px-5 py-4 text-center">
                        {isUnstored && isEditing ? (
                          <select
                            value={editValues.unstored_type}
                            onChange={(e) =>
                              setEditValues((v) => ({
                                ...v,
                                unstored_type: e.target
                                  .value as UnstoredItemType,
                              }))
                            }
                            className="form-input-base w-full min-w-[9rem] py-1.5 text-xs"
                          >
                            {UNSTORED_ITEM_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="form-chip rounded-lg bg-primary/8 text-primary border-primary/15 font-mono-data text-caption">
                            {item.is_unstored
                              ? unstoredTypeLabel(item.unstored_type).toUpperCase()
                              : null}
                            {!item.is_unstored && item.sellable_type === "products" && "PRODUCT"}
                            {!item.is_unstored && item.sellable_type === "spare_parts" && "SPARE PART"}
                            {!item.is_unstored && item.sellable_type === "maintenance_parts" && "MAINT. PART"}
                            {!item.is_unstored && item.sellable_type === "bikes" && "BIKE"}
                            {!item.is_unstored && item.sellable_type === "maintenance_services" && "SERVICE"}
                          </span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="px-5 py-4 text-right">
                        {isUnstored && isEditing ? (
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={editValues.price}
                            onChange={(e) =>
                              setEditValues((v) => ({
                                ...v,
                                price: Number(e.target.value),
                              }))
                            }
                            className="form-input-base mono-data w-24 py-1.5 text-right text-sm"
                            aria-label="Sale price (EGP)"
                          />
                        ) : (
                          <p className="mono-data font-semibold text-on-surface">
                            {formatEgp(getDisplayPriceEgp(item))}
                          </p>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="px-5 py-4 text-right">
                        {isEditing ? (
                          <div className="flex flex-col items-end gap-1">
                            <input
                              type="number"
                              value={editValues.qty}
                              onChange={(e) => {
                                const nextQty = normalizeQty(
                                  item,
                                  Number(e.target.value),
                                );
                                setEditValues((v) => ({
                                  ...v,
                                  qty: nextQty,
                                }));
                              }}
                              onBlur={() =>
                                setEditValues((v) => ({
                                  ...v,
                                  qty: normalizeQty(item, v.qty),
                                }))
                              }
                              
                              min={1}
                              max={maxQty}
                              step={1}
                              inputMode="numeric"
                              onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                              disabled={
                                isOutOfStock ||
                                item.sellable_type === "bikes" ||
                                item.sellable_type === "maintenance_services"
                              }
                              className="form-input-base mono-data w-16 py-1.5 text-right text-sm [&::-webkit-inner-spin-button]:appearance-none"
                              aria-label="Quantity"
                            />
                            {isOutOfStock ? (
                              <span className="label-caps text-error">
                                Out of stock
                              </span>
                            ) : (
                              isStockLimited && typeof maxQty === "number" && (
                                <span className="label-caps">
                                  Max: {maxQty}
                                </span>
                              )
                            )}
                            {(item.sellable_type === "bikes" || item.sellable_type === "maintenance_services") && (
                              <span className="label-caps">
                                Fixed qty: 1
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="mono-data inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-2 font-semibold text-on-surface shadow-sm">
                            {item.quantity}
                          </span>
                        )}
                      </td>

                      {/* Discount */}
                      <td className="px-5 py-4 text-right">
                        {isUnstored ? (
                          <span className="text-on-surface-variant/40">—</span>
                        ) : isEditing ? (
                          <SaleLineItemDiscountCell
                            item={{
                              ...item,
                              quantity: editValues.qty,
                              selling_price: editValues.price,
                            }}
                            isAdmin={isAdmin}
                            exchangeRates={exchangeRates}
                            saleContext={saleContext}
                            onApply={handleDiscountApply}
                            onPersistPendingRequest={handlePersistPendingRequest}
                            onClearStoredRequest={handleClearStoredRequest}
                          />
                        ) : (
                          <p
                            className={`mono-data font-semibold ${item.discount_amount > 0 ? "text-error" : "text-on-surface-variant opacity-50"}`}
                          >
                            {item.discount_amount > 0
                              ? `-${formatEgp(toEGPDiscount(item))}`
                              : formatEgp(0)}
                          </p>
                        )}
                      </td>

                      {/* Subtotal — always EGP */}
                      <td className="px-5 py-4 text-right">
                        <p className="mono-data font-bold text-primary">
                          {formatEgp(draftLineSubtotal)}
                        </p>
                        {isEditing && editError ? (
                          <p className="mt-1 text-xs font-medium text-error">{editError}</p>
                        ) : null}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(rowId)}
                              disabled={isOutOfStock}
                              className={`rounded-lg p-1.5 transition-colors ${
                                isOutOfStock
                                  ? "cursor-not-allowed text-on-surface-variant/40"
                                  : "text-on-success-container hover:bg-success/10"
                              }`}
                              title="Save Changes"
                              aria-label="Save changes"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelEdit(rowId)}
                              className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                              title="Cancel"
                              aria-label="Cancel editing"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 opacity-60 transition-opacity group-hover:opacity-100">
                            {!item.is_draft ? (
                              <button
                                type="button"
                                onClick={() => handleEditClick(item)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface-variant shadow-sm ring-1 ring-inset ring-outline-variant/20 transition-all hover:bg-surface-container-low hover:text-on-surface"
                                title="Edit Row"
                                aria-label="Edit row"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => onDeleteItem(rowId)}
                              className="rounded-lg p-1.5 text-error/60 transition-colors hover:bg-error/5 hover:text-error"
                              title="Delete Item"
                              aria-label="Delete item"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Totals Summary */}
      <div className="mt-auto border-t border-outline-variant/20 bg-surface-container-low px-5 py-5 sm:px-6">
        <div className="ml-auto w-full max-w-md rounded-2xl border border-outline-variant/15 bg-surface-container p-4">
          <SaleTotalsSummary
            compact
            breakdown={totalsBreakdown}
            shippingFee={shippingFee}
            showShipping={shippingFee > 0}
            overallDiscount={saleDiscount}
            saleTotal={total}
          />
        </div>
      </div>
    </div>
  );
}
