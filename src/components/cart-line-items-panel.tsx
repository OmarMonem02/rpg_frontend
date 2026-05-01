"use client";

import { useState } from "react";
import {
  ProductRecord,
  SparePartRecord,
  BikeRecord,
  MaintenanceServiceRecord,
} from "@/lib/crud-api";
import { ActionButton, EmptyState } from "@/components/ops-ui";
import { TrashIcon, PencilSquareIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

export type SaleLineItem = {
  id?: string; // temp ID for unsaved items
  sellable_id: number;
  sellable_type: "products" | "spare_parts" | "bikes" | "maintenance_services";
  item_name: string;
  selling_price: number;
  discount_amount: number;
  quantity: number;
  currency: "EGP" | "USD";
  catalogItem: ProductRecord | SparePartRecord | BikeRecord | MaintenanceServiceRecord;
};

interface CartLineItemsPanelProps {
  items: SaleLineItem[];
  onUpdateItem: (itemId: string | number, updates: Partial<SaleLineItem>) => void;
  onDeleteItem: (itemId: string | number) => void;
  shippingFee: number;
  saleDiscount: number;
  exchangeRate?: number;
}

export function CartLineItemsPanel({
  items,
  onUpdateItem,
  onDeleteItem,
  shippingFee = 0,
  saleDiscount = 0,
  exchangeRate = 0,
}: CartLineItemsPanelProps) {
  const [editingRowId, setEditingRowId] = useState<string | number | null>(null);
  const [editValues, setEditValues] = useState<{ qty: number; price: number; discount: number }>({ qty: 1, price: 0, discount: 0 });

  const handleEditClick = (item: SaleLineItem) => {
    setEditingRowId(item.id || item.sellable_id);
    setEditValues({
      qty: item.quantity,
      price: item.selling_price,
      discount: item.discount_amount,
    });
  };

  const handleSaveEdit = (itemId: string | number) => {
    onUpdateItem(itemId, {
      quantity: editValues.qty,
      selling_price: editValues.price,
      discount_amount: editValues.discount,
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
    if (item.currency === "USD" && exchangeRate > 0) {
      return item.selling_price * exchangeRate;
    }
    return item.selling_price;
  };

  const toEGPDiscount = (item: SaleLineItem): number => {
    if (item.currency === "USD" && exchangeRate > 0) {
      return item.discount_amount * exchangeRate;
    }
    return item.discount_amount;
  };

  const getDisplayPrice = (item: SaleLineItem): { amount: number; currency: string; converted?: { amount: number; currency: string } } => {
    const displayPrice = {
      amount: item.selling_price,
      currency: item.currency,
      converted: undefined as { amount: number; currency: string } | undefined,
    };

    // If item is priced in USD and we have exchange rate, show conversion to EGP
    if (item.currency === "USD" && exchangeRate > 0) {
      displayPrice.converted = {
        amount: item.selling_price * exchangeRate,
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

  const subtotal = items.reduce((sum, item) => sum + calculateLineSubtotal(item), 0);
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
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs text-on-surface-variant">Item</th>
                  <th className="px-5 py-3 text-center font-semibold uppercase tracking-wider text-xs text-on-surface-variant">Type</th>
                  <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider text-xs text-on-surface-variant">Price</th>
                  <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider text-xs text-on-surface-variant">Qty</th>
                  <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider text-xs text-on-surface-variant">Discount</th>
                  <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider text-xs text-on-surface-variant">Subtotal</th>
                  <th className="px-5 py-3 text-center font-semibold uppercase tracking-wider text-xs text-on-surface-variant">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {items.map((item, index) => {
                  const isEditing = editingRowId === (item.id || item.sellable_id);
                  return (
                    <tr
                      key={index}
                      className="group bg-surface transition-colors hover:bg-surface-container/30"
                    >
                      {/* Item Name */}
                      <td className="px-5 py-4">
                        <p className="font-semibold text-on-surface">{item.item_name}</p>
                        <p className="text-xs font-medium text-on-surface-variant/70 mt-0.5">
                          ID: {item.sellable_id}
                        </p>
                      </td>

                      {/* Item Type */}
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center rounded-lg bg-surface-container-high px-2.5 py-1 text-[11px] font-bold tracking-wide text-on-surface">
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
                              <p className="font-semibold text-on-surface">
                                {priceInfo.amount.toLocaleString()} <span className="text-xs text-on-surface-variant">{priceInfo.currency}</span>
                              </p>
                              {priceInfo.converted && (
                                <p className="text-[11px] font-medium text-on-surface-variant mt-0.5">
                                  ≈ {priceInfo.converted.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] uppercase">EGP</span>
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Quantity */}
                      <td className="px-5 py-4 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.qty}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                qty: Math.max(1, Number(e.target.value)),
                              })
                            }
                            disabled={item.sellable_type === "bikes"}
                            className="w-16 rounded-lg border-2 border-primary/30 bg-surface px-2 py-1.5 text-right font-medium text-on-surface outline-none focus:border-primary"
                          />
                        ) : (
                          <span className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-2 font-semibold text-on-surface shadow-sm">
                            {item.quantity}
                          </span>
                        )}
                      </td>

                      {/* Discount */}
                      <td className="px-5 py-4 text-right">
                        {isEditing ? (
                          <div className="flex flex-col items-end gap-1">
                            <input
                              type="number"
                              value={editValues.discount}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  discount: Math.max(0, Math.min(Number(e.target.value), calculateMaxDiscount(item))),
                                })
                              }
                              max={calculateMaxDiscount(item)}
                              className="w-20 rounded-lg border-2 border-primary/30 bg-surface px-2 py-1.5 text-right font-medium text-on-surface outline-none focus:border-primary"
                            />
                            <span className="text-[10px] font-semibold tracking-wider text-on-surface-variant uppercase">
                              Max: {calculateMaxDiscount(item).toFixed(0)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <p className={`font-semibold ${item.discount_amount > 0 ? 'text-error' : 'text-on-surface-variant opacity-50'}`}>
                              {item.discount_amount > 0 ? `-${item.discount_amount.toLocaleString()}` : "0"} <span className="text-[11px] uppercase">{item.currency}</span>
                            </p>
                            {item.currency === "USD" && item.discount_amount > 0 && exchangeRate > 0 && (
                              <p className="text-[11px] text-on-surface-variant/60 mt-0.5">
                                ≈ -{toEGPDiscount(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Subtotal — always EGP */}
                      <td className="px-5 py-4 text-right">
                        <p className="font-bold text-primary">
                          {calculateLineSubtotal(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[11px] uppercase">EGP</span>
                        </p>
                        {item.currency === "USD" && (
                          <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Converted @ {exchangeRate}x</p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(item.id || item.sellable_id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-600 transition-colors hover:bg-green-500/20"
                              title="Save Changes"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
                              title="Cancel"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 opacity-60 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => handleEditClick(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface-variant shadow-sm ring-1 ring-inset ring-outline-variant/20 transition-all hover:bg-surface-container-low hover:text-on-surface"
                              title="Edit Row"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDeleteItem(item.id || item.sellable_id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-container/50 text-error shadow-sm ring-1 ring-inset ring-error/20 transition-all hover:bg-error-container"
                              title="Delete Item"
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
        <div className="ml-auto w-full max-w-sm space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-on-surface-variant uppercase tracking-wider text-[11px]">Subtotal</span>
            <span className="font-semibold text-on-surface">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          {shippingFee > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-on-surface-variant uppercase tracking-wider text-[11px]">Shipping Fee</span>
              <span className="font-semibold text-on-surface">+{shippingFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}

          {saleDiscount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-on-surface-variant uppercase tracking-wider text-[11px]">Extra Discount</span>
              <span className="font-semibold text-error">-{saleDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}

          <div className="relative mt-4">
            <div className="absolute inset-x-0 -top-4 h-px bg-gradient-to-r from-transparent via-outline-variant/30 to-transparent" />
            <div className="flex items-end justify-between pt-2">
              <span className="font-display text-lg font-bold text-on-surface">Total</span>
              <div className="text-right">
                <span className="font-display text-3xl font-extrabold tracking-tight text-primary">
                  {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="ml-1 text-sm font-bold uppercase text-primary/70">EGP</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
