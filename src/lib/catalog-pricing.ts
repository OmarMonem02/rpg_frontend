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
};

export function defaultCatalogPricingFromRecord(
  record?: Partial<CatalogPricingFields>,
): CatalogPricingFields {
  const costCurrency = toPricingCurrency(record?.cost_currency ?? "EGP");
  const saleCurrency = toPricingCurrency(record?.sale_currency ?? costCurrency);

  return {
    cost_price: Number(record?.cost_price) || 0,
    cost_currency: costCurrency,
    sale_price: Number(record?.sale_price) || 0,
    sale_currency: saleCurrency,
    sale_price_mode: record?.sale_price_mode === "margin" ? "margin" : "manual",
    sale_margin_type:
      record?.sale_margin_type === "fixed" ? "fixed" : "percentage",
    sale_margin_value: Number(record?.sale_margin_value) || 0,
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

export type SalePriceQuickEditStrategy = "adjust_margin" | "switch_manual";

export type MarginAwarePricingRecord = Pick<
  CatalogPricingFields,
  | "cost_price"
  | "cost_currency"
  | "sale_price"
  | "sale_currency"
  | "sale_price_mode"
  | "sale_margin_type"
  | "sale_margin_value"
>;

export function computeMarginFromSale(
  costPrice: number,
  costCurrency: PricingCurrency,
  marginType: SaleMarginType,
  salePrice: number,
  saleCurrency: PricingCurrency,
  rates: ExchangeRates,
): number {
  const costEgp = computeCostInEgp(costPrice, costCurrency, rates);
  const saleEgp = computeSaleInEgp(salePrice, saleCurrency, rates);

  if (costEgp <= 0) {
    return 0;
  }

  if (marginType === "percentage") {
    return Math.round(((saleEgp / costEgp - 1) * 100) * 100) / 100;
  }

  return Math.round((saleEgp - costEgp) * 100) / 100;
}

export function formatMarginModeLabel(
  record: Pick<
    CatalogPricingFields,
    "sale_price_mode" | "sale_margin_type" | "sale_margin_value"
  >,
): string | null {
  if (record.sale_price_mode !== "margin") {
    return null;
  }

  const marginType = record.sale_margin_type ?? "percentage";
  const marginValue = record.sale_margin_value ?? 0;

  if (marginType === "fixed") {
    return `Margin · ${formatEgp(marginValue)} fixed`;
  }

  return `Margin · ${marginValue}%`;
}

export function formatMarginQuickEditHint(
  record: Pick<
    CatalogPricingFields,
    "sale_price_mode" | "sale_margin_type" | "sale_margin_value"
  >,
): string | null {
  if (record.sale_price_mode !== "margin") {
    return null;
  }

  const marginType = record.sale_margin_type ?? "percentage";
  const marginValue = record.sale_margin_value ?? 0;

  if (marginType === "fixed") {
    return `Sale price is auto-calculated from cost plus a fixed ${formatEgp(marginValue)} margin.`;
  }

  return `Sale price is auto-calculated from cost plus a ${marginValue}% margin.`;
}

export type MarginQuickEditPricingResult =
  | { ok: true; fields: Partial<CatalogPricingFields> }
  | { ok: false; error: string };

export function resolveMarginQuickEditPricing(
  record: MarginAwarePricingRecord,
  changes: {
    cost_price?: number;
    sale_price?: number;
    sale_margin_type?: SaleMarginType;
    sale_margin_value?: number;
  },
  rates: ExchangeRates,
  strategy: SalePriceQuickEditStrategy,
): MarginQuickEditPricingResult {
  const hasSaleChange = changes.sale_price !== undefined;
  const hasMarginTypeChange = changes.sale_margin_type !== undefined;
  const hasMarginValueChange = changes.sale_margin_value !== undefined;

  if (!hasSaleChange && !hasMarginTypeChange && !hasMarginValueChange) {
    return { ok: true, fields: {} };
  }

  const salePrice = changes.sale_price ?? record.sale_price;

  if (record.sale_price_mode !== "margin") {
    if (!hasSaleChange) {
      return { ok: true, fields: {} };
    }
    return { ok: true, fields: { sale_price: salePrice } };
  }

  if (strategy === "switch_manual") {
    if (!hasSaleChange) {
      return { ok: true, fields: {} };
    }
    return {
      ok: true,
      fields: {
        sale_price_mode: "manual",
        sale_price: salePrice,
      },
    };
  }

  const costPrice = changes.cost_price ?? record.cost_price;
  const marginType =
    changes.sale_margin_type ?? record.sale_margin_type ?? "percentage";

  if (hasMarginValueChange) {
    const marginValue = changes.sale_margin_value ?? 0;

    if (marginValue < 0) {
      return {
        ok: false,
        error: "Margin value must be a number ≥ 0.",
      };
    }

    const computedSale = computeSaleFromMargin(
      costPrice,
      record.cost_currency,
      marginType,
      marginValue,
      record.sale_currency,
      rates,
    );

    return {
      ok: true,
      fields: {
        sale_price_mode: "margin",
        sale_margin_type: marginType,
        sale_margin_value: marginValue,
        sale_price: computedSale,
      },
    };
  }

  const marginValue = computeMarginFromSale(
    costPrice,
    record.cost_currency,
    marginType,
    salePrice,
    record.sale_currency,
    rates,
  );

  if (marginValue < 0) {
    return {
      ok: false,
      error: "Sale price must be at least the EGP cost when adjusting margin.",
    };
  }

  return {
    ok: true,
    fields: {
      sale_price_mode: "margin",
      sale_margin_type: marginType,
      sale_margin_value: marginValue,
      sale_price: salePrice,
    },
  };
}

export function pricingRecordFromItem(
  item: Partial<CatalogPricingFields>,
): MarginAwarePricingRecord {
  const pricing = defaultCatalogPricingFromRecord(item);
  return {
    cost_price: pricing.cost_price,
    cost_currency: pricing.cost_currency,
    sale_price: pricing.sale_price,
    sale_currency: pricing.sale_currency,
    sale_price_mode: pricing.sale_price_mode,
    sale_margin_type: pricing.sale_margin_type,
    sale_margin_value: pricing.sale_margin_value,
  };
}

export function buildCatalogPricingPayload(
  formData: Record<string, unknown>,
): CatalogPricingFields {
  const saleCurrency = toPricingCurrency(String(formData.sale_currency ?? "EGP"));
  const mode = formData.sale_price_mode === "margin" ? "margin" : "manual";

  return {
    cost_currency: toPricingCurrency(String(formData.cost_currency ?? saleCurrency)),
    sale_currency: saleCurrency,
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
