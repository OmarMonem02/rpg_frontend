import type { SaleLineItemRecord, SaleRecord } from "@/lib/api/sales";

export type SaleLinePricingItem = Pick<
  SaleLineItemRecord,
  "selling_price" | "discount_amount" | "quantity" | "remaining_qty"
>;

export type SaleTotalsBreakdown = {
  grossSubtotal: number;
  lineDiscountTotal: number;
  netSubtotal: number;
  shipping: number;
  saleDiscount: number;
  total: number;
  units: number;
};

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function lineQuantity(item: SaleLinePricingItem): number {
  return Math.max(1, item.quantity);
}

/** Per-unit discount derived from total line discount on the original quantity. */
export function lineUnitDiscount(item: SaleLinePricingItem): number {
  return item.discount_amount / lineQuantity(item);
}

/** Gross line amount before discounts, based on remaining quantity. */
export function lineGrossAmount(item: SaleLinePricingItem): number {
  return roundMoney(item.remaining_qty * item.selling_price);
}

/** Prorated line discount for remaining quantity (handles partial returns). */
export function lineDiscountTotal(item: SaleLinePricingItem): number {
  if (item.remaining_qty <= 0 || item.discount_amount <= 0) {
    return 0;
  }

  return roundMoney(lineUnitDiscount(item) * item.remaining_qty);
}

/** Net line amount after prorated line discount. */
export function lineNetAmount(item: SaleLinePricingItem): number {
  return lineNetAmountForQty(item, item.remaining_qty);
}

/** Net amount for a specific quantity (e.g. return/exchange qty). */
export function lineNetAmountForQty(
  item: SaleLinePricingItem,
  qty: number,
): number {
  if (qty <= 0) {
    return 0;
  }

  const gross = roundMoney(qty * item.selling_price);
  const discount =
    item.discount_amount <= 0
      ? 0
      : roundMoney(lineUnitDiscount(item) * qty);

  return roundMoney(gross - discount);
}

export function computeSaleTotalsBreakdown(
  sale: Pick<
    SaleRecord,
    "line_items" | "shipping_fee" | "sale_discount" | "total"
  >,
): SaleTotalsBreakdown {
  const items = sale.line_items ?? [];

  let grossSubtotal = 0;
  let lineDiscounts = 0;
  let units = 0;

  for (const item of items) {
    if (item.remaining_qty <= 0) {
      continue;
    }

    grossSubtotal += lineGrossAmount(item);
    lineDiscounts += lineDiscountTotal(item);
    units += item.remaining_qty;
  }

  grossSubtotal = roundMoney(grossSubtotal);
  lineDiscounts = roundMoney(lineDiscounts);
  const netSubtotal = roundMoney(grossSubtotal - lineDiscounts);
  const shipping = roundMoney(sale.shipping_fee || 0);
  const saleDiscount = roundMoney(sale.sale_discount || 0);
  const total = roundMoney(
    Math.max(0, netSubtotal + shipping - saleDiscount),
  );

  return {
    grossSubtotal,
    lineDiscountTotal: lineDiscounts,
    netSubtotal,
    shipping,
    saleDiscount,
    total,
    units,
  };
}
