import {
  egpMultiplierForPricingCurrency,
  formatEgp,
  type ExchangeRates,
  type PricingCurrency,
} from "@/lib/currencies";
import { calculateMaxLineDiscount, type MaxDiscountType } from "@/lib/max-discount";

type CatalogDiscountFields = {
  max_discount_type?: MaxDiscountType | string;
  max_discount_value?: number;
};

export function getItemCostPrice(
  catalogItem: unknown,
): number | null {
  if (!catalogItem || typeof catalogItem !== "object") return null;
  const cost = Number(
    (catalogItem as { cost_price?: number }).cost_price,
  );
  return Number.isFinite(cost) && cost > 0 ? cost : null;
}

export function calculateProfitMargin(
  unitPrice: number,
  costPrice: number | null,
  unitDiscount = 0,
): { amount: number; percent: number } | null {
  if (costPrice == null || unitPrice <= 0) return null;

  const netUnit = Math.max(0, unitPrice - unitDiscount);
  if (netUnit <= 0) return null;

  const amount = netUnit - costPrice;
  const percent = (amount / netUnit) * 100;

  return {
    amount: Math.round(amount * 100) / 100,
    percent: Math.round(percent * 10) / 10,
  };
}

export function formatProfitMarginHint(
  unitPrice: number,
  costPrice: number | null,
  rates: ExchangeRates,
  currency: PricingCurrency = "EGP",
  unitDiscount = 0,
): string | null {
  const margin = calculateProfitMargin(unitPrice, costPrice, unitDiscount);
  if (!margin) return null;

  const multiplier = egpMultiplierForPricingCurrency(currency, rates);
  const amountEgp = margin.amount * multiplier;

  return `Margin: ${formatEgp(amountEgp)} (${margin.percent}%)`;
}

export function formatCatalogMaxHint(
  unitPrice: number,
  catalog: CatalogDiscountFields,
  rates: ExchangeRates,
  currency: PricingCurrency = "EGP",
): string {
  const maxValue = Number(catalog.max_discount_value) || 0;
  if (maxValue <= 0) return "Max discount: None";

  const maxUnit = calculateMaxLineDiscount(
    unitPrice,
    catalog.max_discount_type,
    maxValue,
  );
  const multiplier = egpMultiplierForPricingCurrency(currency, rates);
  const maxEgp = maxUnit * multiplier;

  if (catalog.max_discount_type === "percentage") {
    return `Max discount: ${maxValue}% (${formatEgp(maxEgp)})`;
  }

  return `Max discount: ${formatEgp(maxEgp)}`;
}

export function formatItemDiscountMarginHints(params: {
  unitPrice: number;
  catalog: CatalogDiscountFields;
  costPrice: number | null;
  rates: ExchangeRates;
  currency?: PricingCurrency;
  unitDiscount?: number;
}): string[] {
  const {
    unitPrice,
    catalog,
    costPrice,
    rates,
    currency = "EGP",
    unitDiscount = 0,
  } = params;

  const hints: string[] = [
    formatCatalogMaxHint(unitPrice, catalog, rates, currency),
  ];

  const marginHint = formatProfitMarginHint(
    unitPrice,
    costPrice,
    rates,
    currency,
    unitDiscount,
  );
  if (marginHint) {
    hints.push(marginHint);
  }

  return hints;
}
