import {
  convertToEGP,
  type ExchangeRates,
  type PricingCurrency,
  toPricingCurrency,
} from "@/lib/currencies";
import type { Ticket, TicketItem } from "@/lib/tickets-api";

export function getTicketItemSourceCurrency(item: TicketItem): PricingCurrency {
  const catalog =
    item.spare_part ?? item.product ?? item.maintenance_service;
  if (catalog?.sale_currency) {
    return toPricingCurrency(catalog.sale_currency);
  }
  return "EGP";
}

function getCatalogListPrice(item: TicketItem): number | null {
  const catalog =
    item.spare_part ?? item.product ?? item.maintenance_service;
  if (!catalog) return null;
  if ("service_price" in catalog && typeof catalog.service_price === "number") {
    return catalog.service_price;
  }
  if ("sale_price" in catalog && typeof catalog.sale_price === "number") {
    return catalog.sale_price;
  }
  return null;
}

/**
 * Legacy tickets stored price_snapshot in the catalog's native currency.
 * New tickets (after EGP normalization) store price_snapshot already in EGP.
 */
export function isLegacyNativeSnapshot(item: TicketItem): boolean {
  const currency = getTicketItemSourceCurrency(item);
  if (currency === "EGP") return false;

  const catalogPrice = getCatalogListPrice(item);
  if (catalogPrice == null) return true;

  return Math.abs(item.price_snapshot - catalogPrice) < 0.01;
}

export function convertTicketLineAmount(
  item: TicketItem,
  amount: number,
  rates: ExchangeRates,
): number {
  if (!isLegacyNativeSnapshot(item)) {
    return Math.round(amount * 100) / 100;
  }

  return convertToEGP(amount, getTicketItemSourceCurrency(item), rates);
}

export function convertLegacyTicketDiscount(
  discount: number,
  rates: ExchangeRates,
): number {
  if (discount <= 0) return 0;
  return convertToEGP(discount, "USD", rates);
}

export function hasLegacyNativeTicketLines(items: TicketItem[]): boolean {
  return items.some(isLegacyNativeSnapshot);
}

/** Legacy overall discounts were entered in USD; new discounts are stored in EGP. */
export function convertTicketDiscountForDisplay(
  discount: number,
  items: TicketItem[],
  rates: ExchangeRates,
): number {
  if (discount <= 0) return 0;
  if (!hasLegacyNativeTicketLines(items)) {
    return Math.round(discount * 100) / 100;
  }
  return convertLegacyTicketDiscount(discount, rates);
}

export function computeTicketLineSubtotalDisplay(
  item: TicketItem,
  rates: ExchangeRates,
): number {
  const unit = convertTicketLineAmount(item, item.price_snapshot, rates);
  const disc = convertTicketLineAmount(item, item.discount, rates);
  const qty = Number(item.qty) || 0;
  return Math.round(Math.max(0, unit - disc) * qty * 100) / 100;
}

export function computeTicketTaskSubtotalDisplay(
  items: TicketItem[] | undefined,
  rates: ExchangeRates,
): number {
  if (!items?.length) return 0;
  const total = items.reduce(
    (sum, item) => sum + computeTicketLineSubtotalDisplay(item, rates),
    0,
  );
  return Math.round(total * 100) / 100;
}

export function computeTicketDisplayTotals(
  ticket: Ticket,
  rates: ExchangeRates,
): {
  linesSubtotal: number;
  ticketDiscount: number;
  total: number;
} {
  const allItems =
    ticket.tasks?.flatMap((task) => task.items ?? []) ?? [];

  const linesSubtotal = allItems.reduce(
    (sum, item) => sum + computeTicketLineSubtotalDisplay(item, rates),
    0,
  );

  const roundedLines = Math.round(linesSubtotal * 100) / 100;
  const ticketDiscount = convertLegacyTicketDiscount(
    Number(ticket.discount) || 0,
    rates,
  );
  const total = Math.max(0, Math.round((roundedLines - ticketDiscount) * 100) / 100);

  return {
    linesSubtotal: roundedLines,
    ticketDiscount,
    total,
  };
}
