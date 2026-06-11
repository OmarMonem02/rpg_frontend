import {
  convertToEGP,
  formatEgp,
  toPricingCurrency,
  type ExchangeRates,
  type PricingCurrency,
} from "@/lib/currencies";

export type SalePriceMode = "manual" | "margin";
export type SaleMarginType = "percentage" | "fixed";

export type CatalogPricingFields = {
  cost_price: number;
  cost_currency: PricingCurrency;
  sale_price: number;
  sale_currency: PricingCurrency;
  sale_price_mode: SalePriceMode;
  sale_margin_type?: SaleMarginType;
  sale_margin_value?: number;
  currency_pricing?: PricingCurrency;
};

export function defaultCatalogPricingFromRecord(
  record?: Partial<CatalogPricingFields> & { currency_pricing?: string },
): CatalogPricingFields {
  const legacy = toPricingCurrency(record?.currency_pricing ?? "EGP");
  const costCurrency = toPricingCurrency(record?.cost_currency ?? legacy);
  const saleCurrency = toPricingCurrency(record?.sale_currency ?? legacy);

  return {
    cost_price: Number(record?.cost_price) || 0,
    cost_currency: costCurrency,
    sale_price: Number(record?.sale_price) || 0,
    sale_currency: saleCurrency,
    sale_price_mode: record?.sale_price_mode === "margin" ? "margin" : "manual",
    sale_margin_type:
      record?.sale_margin_type === "fixed" ? "fixed" : "percentage",
    sale_margin_value: Number(record?.sale_margin_value) || 0,
    currency_pricing: saleCurrency,
  };
}

export function computeCostInEgp(
  costPrice: number,
  costCurrency: PricingCurrency,
  rates: ExchangeRates,
): number {
  return convertToEGP(costPrice, costCurrency, rates);
}

export function computeSaleFromMargin(
  costPrice: number,
  costCurrency: PricingCurrency,
  marginType: SaleMarginType,
  marginValue: number,
  saleCurrency: PricingCurrency,
  rates: ExchangeRates,
): number {
  const costEgp = computeCostInEgp(costPrice, costCurrency, rates);
  const saleEgp =
    marginType === "percentage"
      ? Math.round(costEgp * (1 + marginValue / 100) * 100) / 100
      : Math.round((costEgp + marginValue) * 100) / 100;

  if (saleCurrency === "EGP") {
    return saleEgp;
  }

  const multiplier =
    saleCurrency === "USD"
      ? rates.usdToEgp > 0
        ? rates.usdToEgp
        : 1
      : rates.eurToEgp > 0
        ? rates.eurToEgp
        : 1;

  return Math.round((saleEgp / multiplier) * 100) / 100;
}

export function computeSaleInEgp(
  salePrice: number,
  saleCurrency: PricingCurrency,
  rates: ExchangeRates,
): number {
  return convertToEGP(salePrice, saleCurrency, rates);
}

export function isPricingLoss(
  pricing: Pick<
    CatalogPricingFields,
    "cost_price" | "cost_currency" | "sale_price" | "sale_currency"
  >,
  rates: ExchangeRates,
): boolean {
  const costEgp = computeCostInEgp(pricing.cost_price, pricing.cost_currency, rates);
  const saleEgp = computeSaleInEgp(pricing.sale_price, pricing.sale_currency, rates);
  return costEgp > saleEgp;
}

export function formatPricingLossHint(
  pricing: Pick<
    CatalogPricingFields,
    "cost_price" | "cost_currency" | "sale_price" | "sale_currency"
  >,
  rates: ExchangeRates,
): string | null {
  if (!isPricingLoss(pricing, rates)) return null;
  const costEgp = computeCostInEgp(pricing.cost_price, pricing.cost_currency, rates);
  const saleEgp = computeSaleInEgp(pricing.sale_price, pricing.sale_currency, rates);
  const loss = Math.round((costEgp - saleEgp) * 100) / 100;
  return `Cost (${formatEgp(costEgp)}) exceeds sale (${formatEgp(saleEgp)}) by ${formatEgp(loss)}.`;
}

export function buildCatalogPricingPayload(
  formData: Record<string, unknown>,
): CatalogPricingFields & { currency_pricing: PricingCurrency } {
  const saleCurrency = toPricingCurrency(String(formData.sale_currency ?? formData.currency_pricing ?? "EGP"));
  const mode = formData.sale_price_mode === "margin" ? "margin" : "manual";

  return {
    cost_currency: toPricingCurrency(String(formData.cost_currency ?? saleCurrency)),
    sale_currency: saleCurrency,
    currency_pricing: saleCurrency,
    cost_price: Number(formData.cost_price) || 0,
    sale_price: Number(formData.sale_price) || 0,
    sale_price_mode: mode,
    sale_margin_type:
      mode === "margin"
        ? formData.sale_margin_type === "fixed"
          ? "fixed"
          : "percentage"
        : undefined,
    sale_margin_value:
      mode === "margin" ? Number(formData.sale_margin_value) || 0 : undefined,
  };
}
