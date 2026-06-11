/**
 * Supported catalog / expense ISO currency codes (aligned with backend config/currencies.php).
 */
export const SUPPORTED_PRICING_CURRENCIES = ["EGP", "USD", "EUR"] as const;

export type PricingCurrency = (typeof SUPPORTED_PRICING_CURRENCIES)[number];

export const CURRENCY_SELECT_OPTIONS: ReadonlyArray<{
  value: PricingCurrency;
  label: string;
}> = [
  { value: "EGP", label: "(EGP)" },
  { value: "USD", label: "(USD)" },
  { value: "EUR", label: "(EUR)" },
];

export function isPricingCurrency(value: string): value is PricingCurrency {
  return (SUPPORTED_PRICING_CURRENCIES as readonly string[]).includes(value);
}

export function toPricingCurrency(
  value: unknown,
  fallback: PricingCurrency = "EGP",
): PricingCurrency {
  const s = typeof value === "string" ? value : "";
  return isPricingCurrency(s) ? s : fallback;
}

export type ExchangeRates = {
  usdToEgp: number;
  eurToEgp: number;
};

/** EGP per 1 unit of foreign currency (same semantics as backend settings). */
export function egpMultiplierForPricingCurrency(
  currency: PricingCurrency,
  rates: ExchangeRates,
): number {
  if (currency === "EGP") return 1;
  if (currency === "USD") return rates.usdToEgp > 0 ? rates.usdToEgp : 1;
  return rates.eurToEgp > 0 ? rates.eurToEgp : 1;
}

/** Converts a catalog amount to EGP using exchange rates (2 decimal places). */
export function convertToEGP(
  amount: number,
  currency: PricingCurrency,
  rates: ExchangeRates,
): number {
  const m = egpMultiplierForPricingCurrency(currency, rates);
  return Math.round(amount * m * 100) / 100;
}

export function formatEgp(amount: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCatalogPriceInEGP(
  amount: number,
  currency: PricingCurrency,
  rates: ExchangeRates,
): string {
  return formatEgp(convertToEGP(amount, currency, rates));
}
