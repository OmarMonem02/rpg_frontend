import { asRecord, toNumber, toText } from "@/lib/api/core";
import { formatEgp, type ExchangeRates } from "@/lib/currencies";
import { convertTicketLineAmount } from "@/lib/ticket-display-pricing";
import type { TicketItem } from "@/lib/tickets-api";
import {
  calculateMaxLineDiscount,
  clampLineDiscount,
  type MaxDiscountType,
} from "@/lib/max-discount";

export type TicketItemCatalogDiscount = {
  max_discount_type: MaxDiscountType | "";
  max_discount_value: number;
};

function readCatalogRecord(item: TicketItem): Record<string, unknown> {
  if (item.spare_part) return asRecord(item.spare_part);
  if (item.product) return asRecord(item.product);
  if (item.maintenance_service) return asRecord(item.maintenance_service);

  const raw = item as unknown as Record<string, unknown>;
  if (raw.sparePart) return asRecord(raw.sparePart);
  if (raw.product) return asRecord(raw.product);
  if (raw.maintenanceService) return asRecord(raw.maintenanceService);

  return {};
}

export function getTicketItemCatalogDiscount(
  item: TicketItem,
): TicketItemCatalogDiscount {
  const catalog = readCatalogRecord(item);
  const type = toText(catalog.max_discount_type);

  return {
    max_discount_type: type === "percentage" || type === "fixed" ? type : "",
    max_discount_value: toNumber(catalog.max_discount_value),
  };
}

export function ticketItemMaxDiscount(
  item: TicketItem,
  options?: { applyCatalogCap?: boolean },
): number {
  const unitPrice = Number(item.price_snapshot) || 0;
  const applyCatalogCap = options?.applyCatalogCap ?? true;

  if (!applyCatalogCap) {
    return unitPrice;
  }

  const catalog = getTicketItemCatalogDiscount(item);
  return Math.min(
    unitPrice,
    calculateMaxLineDiscount(
      unitPrice,
      catalog.max_discount_type || "fixed",
      catalog.max_discount_value,
    ),
  );
}

export function clampTicketItemDiscount(
  item: TicketItem,
  raw: number,
  options?: { applyCatalogCap?: boolean },
): number {
  const catalog = getTicketItemCatalogDiscount(item);
  if (options?.applyCatalogCap === false) {
    return Math.max(0, Math.min(raw, Number(item.price_snapshot) || 0));
  }

  return clampLineDiscount(
    raw,
    item.price_snapshot,
    catalog.max_discount_type || "fixed",
    catalog.max_discount_value,
  );
}

export function formatTicketMaxDiscountHint(
  item: TicketItem,
  rates: ExchangeRates,
): string {
  const catalog = getTicketItemCatalogDiscount(item);
  const max = ticketItemMaxDiscount(item, { applyCatalogCap: true });
  const maxDisplay = convertTicketLineAmount(item, max, rates);

  if (catalog.max_discount_type === "percentage" && catalog.max_discount_value > 0) {
    return `Max ${catalog.max_discount_value}% (${formatEgp(maxDisplay)})`;
  }

  return `Max ${formatEgp(maxDisplay)}`;
}
