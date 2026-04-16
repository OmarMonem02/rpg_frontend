"use client";

import { useState } from "react";
import {
  ProductRecord,
  SparePartRecord,
  BikeRecord,
  MaintenanceServiceRecord,
} from "@/lib/crud-api";

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

  // Calculations
  const getDisplayPrice = (item: SaleLineItem): { amount: number; currency: string; converted?: { amount: number; currency: string } } => {
    const displayPrice = {
      amount: item.selling_price,
      currency: item.currency,
      converted: undefined as { amount: number; currency: string } | undefined,
    };

    // If item is priced in USD and we have exchange rate, show conversion to EGP
    if (item.catalogItem.currency_pricing === "USD" && exchangeRate > 0) {
      displayPrice.converted = {
        amount: item.selling_price * exchangeRate,
        currency: "EGP",
      };
    }

    return displayPrice;
  };

  const calculateMaxDiscount = (item: SaleLineItem): number => {
    const maxDiscountValue = item.catalogItem.max_discount_value || 0;
    if (item.catalogItem.max_discount_type === "percentage") {
      return (item.selling_price * maxDiscountValue) / 100;
    }
    return maxDiscountValue;
  };

  const calculateLineSubtotal = (item: SaleLineItem): number => {
    return item.quantity * item.selling_price - item.discount_amount;
  };

  const subtotal = items.reduce((sum, item) => sum + calculateLineSubtotal(item), 0);
  const total = subtotal + shippingFee - saleDiscount;

  return (
    <div className="flex-1 border border-outline-variant/15 rounded-2xl bg-surface-container-lowest overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-surface-container-high px-5 py-3 border-b border-outline-variant/15">
        <h3 className="font-display font-600 text-lg text-on-surface">
          Sale Items ({items.length})
        </h3>
      </div>

      {/* Items Table */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-on-surface-variant text-sm">
              No items added yet. Select items from the catalogs above.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-container sticky top-0">
              <tr className="border-b border-outline-variant/15">
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Item</th>
                <th className="px-4 py-3 text-center font-semibold text-on-surface">Type</th>
                <th className="px-4 py-3 text-right font-semibold text-on-surface">Price</th>
                <th className="px-4 py-3 text-right font-semibold text-on-surface">Qty</th>
                <th className="px-4 py-3 text-right font-semibold text-on-surface">Discount</th>
                <th className="px-4 py-3 text-right font-semibold text-on-surface">Subtotal</th>
                <th className="px-4 py-3 text-center font-semibold text-on-surface">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const isEditing = editingRowId === (item.id || item.sellable_id);
                return (
                  <tr
                    key={index}
                    className="border-b border-outline-variant/10 hover:bg-surface-container/50 transition-colors"
                  >
                    {/* Item Name */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-on-surface">{item.item_name}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        ID: {item.sellable_id}
                      </p>
                    </td>

                    {/* Item Type */}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {item.sellable_type === "products" && "Product"}
                        {item.sellable_type === "spare_parts" && "Spare Part"}
                        {item.sellable_type === "bikes" && "Bike"}
                        {item.sellable_type === "maintenance_services" && "Service"}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-right">
                      {(() => {
                        const priceInfo = getDisplayPrice(item);
                        return (
                          <div className="flex flex-col items-end">
                            <p className="font-medium text-on-surface">
                              {priceInfo.amount} {priceInfo.currency}
                            </p>
                            {priceInfo.converted && (
                              <p className="text-xs text-on-surface-variant mt-0.5">
                                ≈ {priceInfo.converted.amount.toFixed(2)} {priceInfo.converted.currency}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Quantity */}
                    <td className="px-4 py-3 text-right">
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
                          className="form-input-base w-20 text-right"
                        />
                      ) : (
                        <p className="font-medium text-on-surface">{item.quantity}</p>
                      )}
                    </td>

                    {/* Discount */}
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="flex flex-col">
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
                            className="form-input-base w-20 text-right"
                          />
                          <span className="text-xs text-on-surface-variant mt-1">
                            Max: {calculateMaxDiscount(item).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <p className="font-medium text-error">
                          -{item.discount_amount} {item.currency}
                        </p>
                      )}
                    </td>

                    {/* Subtotal */}
                    <td className="px-4 py-3 text-right">
                      <p className="font-semibold text-primary">
                        {calculateLineSubtotal(item).toFixed(2)} {item.currency}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleSaveEdit(item.id || item.sellable_id)}
                            className="px-2 py-1 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-medium transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="px-2 py-1 rounded-lg hover:bg-surface-container text-on-surface text-xs font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDeleteItem(item.id || item.sellable_id)}
                            className="px-2 py-1 rounded-lg hover:bg-error/10 text-error text-xs font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Totals Summary */}
      <div className="border-t border-outline-variant/15 bg-surface-container px-5 py-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">Subtotal:</span>
          <span className="font-medium text-on-surface">{subtotal.toFixed(2)}</span>
        </div>
        {shippingFee > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Shipping Fee:</span>
            <span className="font-medium text-on-surface">+{shippingFee.toFixed(2)}</span>
          </div>
        )}
        {saleDiscount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Sale Discount:</span>
            <span className="font-medium text-error">-{saleDiscount.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-outline-variant/15 pt-2 mt-2 flex justify-between">
          <span className="font-semibold text-on-surface">Total:</span>
          <span className="font-display font-600 text-lg text-primary">
            {total.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
