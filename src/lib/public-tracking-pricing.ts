import {
  convertToEGP,
  toPricingCurrency,
  type ExchangeRates,
  type PricingCurrency,
} from "@/lib/currencies";
import type {
  PublicExchangeRates,
  PublicTicketTracking,
  PublicTrackingItem,
} from "@/lib/public-tracking-api";

export function toPublicExchangeRates(
  rates?: PublicExchangeRates | null,
): ExchangeRates {
  return {
    usdToEgp: rates?.usd_to_egp ?? 0,
    eurToEgp: rates?.eur_to_egp ?? 0,
  };
}

function isLegacyPublicItem(item: PublicTrackingItem): boolean {
  const currency = toPricingCurrency(item.sale_currency);
  if (currency === "EGP") return false;
  if (item.catalog_unit_price == null) return true;
  return Math.abs(item.unit_price - item.catalog_unit_price) < 0.01;
}

export function convertPublicItemAmount(
  item: PublicTrackingItem,
  amount: number,
  rates: ExchangeRates,
): number {
  if (!isLegacyPublicItem(item)) {
    return Math.round(amount * 100) / 100;
  }
  return convertToEGP(
    amount,
    toPricingCurrency(item.sale_currency) as PricingCurrency,
    rates,
  );
}

export function convertPublicItemSubtotal(
  item: PublicTrackingItem,
  rates: ExchangeRates,
): number {
  const unit = convertPublicItemAmount(item, item.unit_price, rates);
  const discount = convertPublicItemAmount(item, item.discount, rates);
  return Math.round(Math.max(0, unit - discount) * item.qty * 100) / 100;
}

export function convertPublicTaskSubtotal(
  items: PublicTrackingItem[],
  rates: ExchangeRates,
): number {
  const total = items.reduce(
    (sum, item) => sum + convertPublicItemSubtotal(item, rates),
    0,
  );
  return Math.round(total * 100) / 100;
}

export function convertPublicTicketDiscount(
  discount: number,
  tasks: PublicTicketTracking["tasks"],
  rates: ExchangeRates,
): number {
  if (discount <= 0) return 0;
  const hasLegacy = tasks.some((task) =>
    task.items.some((item) => isLegacyPublicItem(item)),
  );
  if (!hasLegacy) return Math.round(discount * 100) / 100;
  return convertToEGP(discount, "USD", rates);
}

export function computePublicTrackingDisplayTotal(
  data: PublicTicketTracking,
): number {
  const rates = toPublicExchangeRates(data.exchange_rates);
  const linesSubtotal = data.tasks.reduce(
    (sum, task) => sum + convertPublicTaskSubtotal(task.items, rates),
    0,
  );
  const discount = convertPublicTicketDiscount(
    Number(data.ticket.discount ?? 0),
    data.tasks,
    rates,
  );
  return Math.max(0, Math.round((linesSubtotal - discount) * 100) / 100);
}
