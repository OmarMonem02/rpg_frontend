import {
  convertToEGP,
  egpMultiplierForPricingCurrency,
  formatEgp,
  toPricingCurrency,
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

export function getItemCostCurrency(catalogItem: unknown): PricingCurrency {
  if (!catalogItem || typeof catalogItem !== "object") return "EGP";
  return toPricingCurrency(
    (catalogItem as { cost_currency?: string }).cost_currency,
  );
}

export function calculateProfitMarginInEgp(
  unitPrice: number,
  unitCurrency: PricingCurrency,
  costPrice: number,
  costCurrency: PricingCurrency,
  rates: ExchangeRates,
  unitDiscount = 0,
): { amount: number; percent: number } | null {
  if (unitPrice <= 0 || costPrice <= 0) return null;

  const unitPriceEgp = convertToEGP(unitPrice, unitCurrency, rates);
  const costPriceEgp = convertToEGP(costPrice, costCurrency, rates);
  const discountEgp = convertToEGP(unitDiscount, unitCurrency, rates);
  const netUnitEgp = Math.max(0, unitPriceEgp - discountEgp);

  if (netUnitEgp <= 0) return null;

  const amount = Math.round((netUnitEgp - costPriceEgp) * 100) / 100;
  const percent = Math.round((amount / netUnitEgp) * 1000) / 10;

  return { amount, percent };
}

export function formatProfitMarginHint(
  unitPrice: number,
  costPrice: number | null,
  rates: ExchangeRates,
  unitCurrency: PricingCurrency = "EGP",
  costCurrency: PricingCurrency = "EGP",
  unitDiscount = 0,
): string | null {
  if (costPrice == null) return null;

  const margin = calculateProfitMarginInEgp(
    unitPrice,
    unitCurrency,
    costPrice,
    costCurrency,
    rates,
    unitDiscount,
  );
  if (!margin) return null;

  return `Margin: ${formatEgp(margin.amount)} (${margin.percent}%)`;
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
  costCurrency?: PricingCurrency;
  unitDiscount?: number;
}): string[] {
  const {
    unitPrice,
    catalog,
    costPrice,
    rates,
    currency = "EGP",
    costCurrency = "EGP",
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
    costCurrency,
    unitDiscount,
  );
  if (marginHint) {
    hints.push(marginHint);
  }

  return hints;
}
