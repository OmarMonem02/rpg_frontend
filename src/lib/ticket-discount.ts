import type { CartTotalsBreakdown } from "@/components/sale-totals-summary";
import type { ExchangeRates } from "@/lib/currencies";
import {
  scopeIncludesTicketItem,
  type DiscountScope,
} from "@/lib/discount-scope";
import {
  convertTicketLineAmount,
  computeTicketLineSubtotalDisplay,
} from "@/lib/ticket-display-pricing";
import type { TicketItem } from "@/lib/tickets-api";
import { ticketItemName } from "@/lib/tickets-api";

export function hasMaintenanceTicketItems(items: TicketItem[]): boolean {
  return items.some((item) => item.maintenance_service_id != null);
}

export function hasSparePartTicketItems(items: TicketItem[]): boolean {
  return items.some((item) => item.spare_part_id != null);
}

export function hasProductTicketItems(items: TicketItem[]): boolean {
  return items.some((item) => item.product_id != null);
}

export function computeTicketTotalsBreakdown(
  items: TicketItem[],
  rates: ExchangeRates,
): CartTotalsBreakdown {
  let grossLinesTotal = 0;
  let itemDiscountTotal = 0;

  for (const item of items) {
    const unitPrice = convertTicketLineAmount(
      item,
      Number(item.price_snapshot) || 0,
      rates,
    );
    const discount = convertTicketLineAmount(
      item,
      Number(item.discount) || 0,
      rates,
    );
    const qty = Number(item.qty) || 0;
    grossLinesTotal += unitPrice * qty;
    itemDiscountTotal += discount * qty;
  }

  const netSubtotal =
    Math.round((grossLinesTotal - itemDiscountTotal) * 100) / 100;

  return {
    grossLinesTotal: Math.round(grossLinesTotal * 100) / 100,
    itemDiscountTotal: Math.round(itemDiscountTotal * 100) / 100,
    netSubtotal,
  };
}

export function computeTicketDiscountBase(
  items: TicketItem[],
  rates: ExchangeRates,
  scope: DiscountScope,
): number {
  let subtotal = 0;

  for (const item of items) {
    if (!scopeIncludesTicketItem(item, scope)) {
      continue;
    }

    subtotal += computeTicketLineSubtotalDisplay(item, rates);
  }

  return Math.round(subtotal * 100) / 100;
}

export function getTicketItemsSignature(items: TicketItem[]): string {
  return JSON.stringify(
    items
      .map((item) => ({
        id: item.id,
        price: item.price_snapshot,
        discount: item.discount,
        qty: item.qty,
        spare_part_id: item.spare_part_id,
        product_id: item.product_id,
        maintenance_service_id: item.maintenance_service_id,
      }))
      .sort((a, b) => a.id - b.id),
  );
}

export function ticketItemSellableType(item: TicketItem): string {
  if (item.spare_part_id) return "spare_parts";
  if (item.product_id) return "products";
  return "maintenance_services";
}

export function ticketItemSellableId(item: TicketItem): number {
  return (
    item.spare_part_id ??
    item.product_id ??
    item.maintenance_service_id ??
    0
  );
}

export function buildTicketDiscountCartItems(
  items: TicketItem[],
  rates: ExchangeRates,
) {
  return items.map((item) => {
    const unitPrice = convertTicketLineAmount(
      item,
      Number(item.price_snapshot) || 0,
      rates,
    );
    const discount = convertTicketLineAmount(
      item,
      Number(item.discount) || 0,
      rates,
    );
    const qty = Number(item.qty) || 1;
    const lineTotal = Math.round(Math.max(0, unitPrice - discount) * qty * 100) / 100;

    return {
      sellable_type: ticketItemSellableType(item),
      sellable_id: ticketItemSellableId(item),
      item_name: ticketItemName(item),
      selling_price: unitPrice,
      discount_amount: discount,
      quantity: qty,
      currency: "EGP",
      line_total: lineTotal,
    };
  });
}
