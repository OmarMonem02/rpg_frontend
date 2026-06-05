"use client";

import { useState } from "react";
import type { PricingCurrency } from "@/lib/currencies";
import { egpMultiplierForPricingCurrency } from "@/lib/currencies";
import {
  ProductRecord,
  SparePartRecord,
  BikeRecord,
  MaintenanceServiceRecord,
} from "@/lib/crud-api";
import { EmptyState } from "@/components/ops-ui";
import {
  computeCartTotalsBreakdown,
  SaleTotalsSummary,
} from "@/components/sale-totals-summary";
import { TrashIcon, PencilSquareIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  clampRawDiscountValue,
  clampResolvedDiscount,
  convertDiscountBetweenTypes,
  maxRawDiscountValue,
  resolveDiscountAmount,
  type DiscountInputType,
} from "@/lib/discount-input";

export type SaleLineItem = {
  id?: string; // temp ID for unsaved items
  sellable_id: number;
  sellable_type: "products" | "spare_parts" | "bikes" | "maintenance_services";
  item_name: string;
  selling_price: number;
  discount_amount: number;
  quantity: number;
  currency: PricingCurrency;
  catalogItem: ProductRecord | SparePartRecord | BikeRecord | MaintenanceServiceRecord;
};

interface CartLineItemsPanelProps {
  items: SaleLineItem[];
  onUpdateItem: (itemId: string | number, updates: Partial<SaleLineItem>) => void;
  onDeleteItem: (itemId: string | number) => void;
  shippingFee: number;
  saleDiscount: number;
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
  exchangeRate = 0,
  exchangeRateEur = 0,
}: CartLineItemsPanelProps) {
  const [editingRowId, setEditingRowId] = useState<string | number | null>(null);
  const [editValues, setEditValues] = useState<{
    qty: number;
    price: number;
    discount: number;
    discountType: DiscountInputType;
  }>({ qty: 1, price: 0, discount: 0, discountType: "fixed" });

  const getMaxQty = (item: SaleLineItem): number | undefined => {
    if (item.sellable_type === "bikes" || item.sellable_type === "maintenance_services") return 1;
    // Products + spare parts come from inventory and have stock_quantity
    if (
      item.sellable_type === "products" ||
      item.sellable_type === "spare_parts"
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

  const lineDiscountBase = (item: SaleLineItem, qty: number) =>
    item.selling_price * qty;

  const normalizeDiscount = (
    item: SaleLineItem,
    raw: number,
    type: DiscountInputType = "fixed",
    qty = item.quantity,
  ): number => {
    const baseAmount = lineDiscountBase(item, qty);
    const maxFixed = calculateMaxDiscount(item);
    return clampRawDiscountValue(type, raw, maxFixed, baseAmount);
  };

  const resolveLineDiscountAmount = (
    item: SaleLineItem,
    raw: number,
    type: DiscountInputType,
    qty: number,
  ): number => {
    const baseAmount = lineDiscountBase(item, qty);
    const maxFixed = calculateMaxDiscount(item);
    const resolved = resolveDiscountAmount(type, raw, baseAmount);
    return clampResolvedDiscount(resolved, maxFixed, baseAmount);
  };

  const handleEditClick = (item: SaleLineItem) => {
    const qty = normalizeQty(item, item.quantity);
    setEditingRowId(item.id || item.sellable_id);
    setEditValues({
      qty,
      price: item.selling_price,
      discount: normalizeDiscount(item, item.discount_amount, "fixed", qty),
      discountType: "fixed",
    });
  };

  const handleSaveEdit = (itemId: string | number) => {
    const item = items.find((i) => (i.id || i.sellable_id) === itemId);
    const qty = item ? normalizeQty(item, editValues.qty) : Math.max(1, Math.trunc(editValues.qty || 0));
    const discount = item
      ? resolveLineDiscountAmount(
          item,
          editValues.discount,
          editValues.discountType,
          qty,
        )
      : Math.max(0, editValues.discount || 0);
    onUpdateItem(itemId, {
      quantity: qty,
      selling_price: editValues.price,
      discount_amount: discount,
    });
    setEditingRowId(null);
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
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

  const getDisplayPrice = (item: SaleLineItem): {
    amount: number;
    currency: string;
    converted?: { amount: number; currency: string };
  } => {
    const displayPrice = {
      amount: item.selling_price,
      currency: item.currency,
      converted: undefined as { amount: number; currency: string } | undefined,
    };

    const m = egpMultiplierForPricingCurrency(item.currency, {
      usdToEgp: exchangeRate,
      eurToEgp: exchangeRateEur,
    });
    if (item.currency !== "EGP" && m > 0 && m !== 1) {
      displayPrice.converted = {
        amount: item.selling_price * m,
        currency: "EGP",
      };
    }

    return displayPrice;
  };

  const calculateMaxDiscount = (item: SaleLineItem): number => {
    const maxDiscountValue = item.catalogItem.max_discount_value || 0;
    // Max discount is always in item's native currency
    if (item.catalogItem.max_discount_type === "percentage") {
      return (item.selling_price * maxDiscountValue) / 100;
    }
    return maxDiscountValue;
  };

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
                    Line disc.
                  </th>
                  <th className="label-caps px-5 py-3 text-right">Total</th>
                  <th className="label-caps px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {items.map((item, index) => {
                  const rowId = item.id || item.sellable_id;
                  const isEditing = editingRowId === rowId;
                  const maxQty = getMaxQty(item);
                  const isStockLimited = item.sellable_type === "products" || item.sellable_type === "spare_parts";
                  const isOutOfStock = isStockLimited && typeof maxQty === "number" && maxQty === 0;
                  const maxDiscount = calculateMaxDiscount(item);
                  const editLineBase = lineDiscountBase(item, editValues.qty);
                  const editResolvedDiscount = isEditing
                    ? resolveLineDiscountAmount(
                        item,
                        editValues.discount,
                        editValues.discountType,
                        editValues.qty,
                      )
                    : 0;
                  return (
                    <tr
                      key={index}
                      className={`data-row group ${isEditing ? "bg-primary/3 ring-2 ring-primary/20" : ""}`}
                    >
                      {/* Item Name */}
                      <td className="px-5 py-4">
                        <p className="font-semibold text-on-surface">{item.item_name}</p>
                        <p className="mono-data mt-0.5 text-xs font-medium text-on-surface-variant/70">
                          ID: {item.sellable_id}
                        </p>
                      </td>

                      {/* Item Type */}
                      <td className="px-5 py-4 text-center">
                        <span className="form-chip rounded-lg bg-primary/8 text-primary border-primary/15 font-mono text-caption">
                          {item.sellable_type === "products" && "PRODUCT"}
                          {item.sellable_type === "spare_parts" && "SPARE PART"}
                          {item.sellable_type === "bikes" && "BIKE"}
                          {item.sellable_type === "maintenance_services" && "SERVICE"}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-5 py-4 text-right">
                        {(() => {
                          const priceInfo = getDisplayPrice(item);
                          return (
                            <div className="flex flex-col items-end">
                              <p className="mono-data font-semibold text-on-surface">
                                {priceInfo.amount.toLocaleString()} <span className="form-chip bg-primary/8 text-primary border-primary/15 font-mono text-caption">{priceInfo.currency}</span>
                              </p>
                              {priceInfo.converted && (
                                <p className="mono-data mt-0.5 text-caption font-medium text-on-surface-variant">
                                  ≈ {priceInfo.converted.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-caption uppercase">EGP</span>
                                </p>
                              )}
                            </div>
                          );
                        })()}
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
                                  discount: normalizeDiscount(
                                    item,
                                    v.discount,
                                    v.discountType,
                                    nextQty,
                                  ),
                                }));
                              }}
                              onBlur={() =>
                                setEditValues((v) => ({
                                  ...v,
                                  qty: normalizeQty(item, v.qty),
                                  discount: normalizeDiscount(
                                    item,
                                    v.discount,
                                    v.discountType,
                                    v.qty,
                                  ),
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
                              className="form-input-base mono-data w-16 py-1.5 text-right text-sm"
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
                        {isEditing ? (
                          <div className="flex min-w-[9rem] flex-col items-end gap-1">
                            <div
                              className="grid w-full grid-cols-2 gap-1"
                              role="radiogroup"
                              aria-label="Line discount type"
                            >
                              {(["fixed", "percentage"] as const).map((type) => {
                                const active = editValues.discountType === type;
                                return (
                                  <button
                                    key={type}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    onClick={() =>
                                      setEditValues((v) => {
                                        const converted =
                                          convertDiscountBetweenTypes(
                                            v.discountType,
                                            type,
                                            v.discount,
                                            lineDiscountBase(item, v.qty),
                                          );
                                        return {
                                          ...v,
                                          discountType: type,
                                          discount: normalizeDiscount(
                                            item,
                                            converted,
                                            type,
                                            v.qty,
                                          ),
                                        };
                                      })
                                    }
                                    className={`rounded-md border px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-all ${
                                      active
                                        ? "border-primary bg-primary/10 text-on-surface"
                                        : "border-outline-variant/30 bg-surface text-on-surface-variant hover:border-primary/30"
                                    }`}
                                  >
                                    {type === "fixed" ? "Fixed" : "%"}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="relative w-full">
                              <input
                                type="number"
                                value={editValues.discount}
                                onChange={(e) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    discount: normalizeDiscount(
                                      item,
                                      Number(e.target.value),
                                      v.discountType,
                                      v.qty,
                                    ),
                                  }))
                                }
                                onBlur={() =>
                                  setEditValues((v) => ({
                                    ...v,
                                    discount: normalizeDiscount(
                                      item,
                                      v.discount,
                                      v.discountType,
                                      v.qty,
                                    ),
                                  }))
                                }
                                className="form-input-base mono-data w-full py-1.5 pr-10 text-right text-sm"
                                aria-label={
                                  editValues.discountType === "percentage"
                                    ? "Line item discount percentage"
                                    : "Line item discount amount"
                                }
                              />
                              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] font-semibold uppercase text-on-surface-variant">
                                {editValues.discountType === "percentage"
                                  ? "%"
                                  : item.currency}
                              </span>
                            </div>
                            {editValues.discountType === "percentage" &&
                            editResolvedDiscount > 0 ? (
                              <span className="label-caps">
                                = {editResolvedDiscount.toFixed(2)} {item.currency}
                              </span>
                            ) : null}
                            <span className="label-caps">
                              {editValues.discountType === "percentage"
                                ? `Max: ${maxRawDiscountValue("percentage", maxDiscount, editLineBase).toFixed(1)}%`
                                : `Max: ${maxDiscount.toFixed(0)} ${item.currency}`}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <p className={`mono-data font-semibold ${item.discount_amount > 0 ? 'text-error' : 'text-on-surface-variant opacity-50'}`}>
                              {item.discount_amount > 0 ? `-${item.discount_amount.toLocaleString()}` : "0"} <span className="text-caption uppercase">{item.currency}</span>
                            </p>
                            {item.currency === "USD" && item.discount_amount > 0 && exchangeRate > 0 && (
                              <p className="mono-data mt-0.5 text-caption text-on-surface-variant/60">
                                ≈ -{toEGPDiscount(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Subtotal — always EGP */}
                      <td className="px-5 py-4 text-right">
                        <p className="mono-data font-bold text-primary">
                          {calculateLineSubtotal(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-caption uppercase">EGP</span>
                        </p>
                        {item.currency === "USD" && (
                          <p className="mono-data mt-0.5 text-caption text-on-surface-variant/50">Converted @ {exchangeRate}x</p>
                        )}
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
                              onClick={handleCancelEdit}
                              className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                              title="Cancel"
                              aria-label="Cancel editing"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 opacity-60 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => handleEditClick(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface-variant shadow-sm ring-1 ring-inset ring-outline-variant/20 transition-all hover:bg-surface-container-low hover:text-on-surface"
                              title="Edit Row"
                              aria-label="Edit row"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
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
