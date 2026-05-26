"use client";

import type { SaleLineItem } from "@/components/cart-line-items-panel";
import { egpMultiplierForPricingCurrency } from "@/lib/currencies";

export type CartTotalsBreakdown = {
  grossLinesTotal: number;
  itemDiscountTotal: number;
  netSubtotal: number;
};

export function computeCartTotalsBreakdown(
  items: SaleLineItem[],
  exchangeRate: number,
  exchangeRateEur: number,
): CartTotalsBreakdown {
  let grossLinesTotal = 0;
  let itemDiscountTotal = 0;

  for (const item of items) {
    const m = egpMultiplierForPricingCurrency(item.currency, {
      usdToEgp: exchangeRate,
      eurToEgp: exchangeRateEur,
    });
    const unitEGP = item.selling_price * m;
    const discEGP = item.discount_amount * m;
    grossLinesTotal += item.quantity * unitEGP;
    itemDiscountTotal += discEGP;
  }

  const netSubtotal =
    Math.round((grossLinesTotal - itemDiscountTotal) * 100) / 100;

  return {
    grossLinesTotal: Math.round(grossLinesTotal * 100) / 100,
    itemDiscountTotal: Math.round(itemDiscountTotal * 100) / 100,
    netSubtotal,
  };
}

function formatEgp(amount: number) {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2 });
}

type SaleTotalsSummaryProps = {
  breakdown: CartTotalsBreakdown;
  shippingFee?: number;
  showShipping?: boolean;
  overallDiscount?: number;
  overallDiscountDraft?: number | null;
  saleTotal: number;
  compact?: boolean;
};

export function SaleTotalsSummary({
  breakdown,
  shippingFee = 0,
  showShipping = false,
  overallDiscount = 0,
  overallDiscountDraft = null,
  saleTotal,
  compact = false,
}: SaleTotalsSummaryProps) {
  const { grossLinesTotal, itemDiscountTotal, netSubtotal } = breakdown;
  const hasItemDiscounts = itemDiscountTotal > 0;
  const hasOverallDiscount = overallDiscount > 0;
  const hasDraftOverall =
    overallDiscountDraft != null &&
    overallDiscountDraft > 0 &&
    overallDiscountDraft !== overallDiscount;

  const rowClass = compact ? "text-sm" : "text-sm";
  const labelClass = compact ? "label-caps" : "text-on-surface-variant";
  const valueClass = "mono-data font-semibold text-on-surface";

  return (
    <div className="space-y-2">
      

      <dl className={`space-y-2 ${rowClass}`}>
        {hasItemDiscounts ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <dt className={labelClass}>Subtotal</dt>
              <dd className={valueClass}>{formatEgp(grossLinesTotal)} EGP</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className={labelClass}>Discounts</dt>
              <dd className="mono-data font-semibold text-error">
                −{formatEgp(itemDiscountTotal)} EGP
              </dd>
            </div>
          </>
        ) : null}
        {showShipping && shippingFee > 0 ? (
          <div className="flex items-center justify-between gap-4">
            <dt className={labelClass}>Shipping</dt>
            <dd className={valueClass}>+{formatEgp(shippingFee)} EGP</dd>
          </div>
        ) : null}

        {hasOverallDiscount ? (
          <div className="flex items-center justify-between gap-4">
            <dt className={labelClass}>Overall discount (whole sale)</dt>
            <dd className="mono-data font-semibold text-error">
              −{formatEgp(overallDiscount)} EGP
            </dd>
          </div>
        ) : null}

        {hasDraftOverall ? (
          <div className="flex items-center justify-between gap-4 text-on-warning-container">
            <dt className="text-xs font-medium">
              Overall discount (pending approval)
            </dt>
            <dd className="mono-data text-xs font-semibold">
              −{formatEgp(overallDiscountDraft)} EGP
            </dd>
          </div>
        ) : null}

        <div
          className={`flex items-center justify-between gap-4 border-t border-outline-variant/15 ${
            compact ? "pt-3 mt-1" : "pt-3"
          }`}
        >
          <dt className="font-bold text-on-surface">
            {compact ? "Total" : "Estimated total"}
          </dt>
          <dd className="mono-data text-lg font-black text-primary">
            {formatEgp(saleTotal)} EGP
          </dd>
        </div>
      </dl>
    </div>
  );
}
