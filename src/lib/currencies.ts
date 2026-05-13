/**
 * Supported catalog / expense ISO currency codes (aligned with backend config/currencies.php).
 */
export const SUPPORTED_PRICING_CURRENCIES = ["EGP", "USD", "EUR"] as const;

export type PricingCurrency = (typeof SUPPORTED_PRICING_CURRENCIES)[number];

export const CURRENCY_SELECT_OPTIONS: ReadonlyArray<{
  value: PricingCurrency;
  label: string;
}> = [
  { value: "EGP", label: "Egyptian Pound (EGP)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
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

/** EGP per 1 unit of foreign currency (same semantics as backend settings). */
export function egpMultiplierForPricingCurrency(
  currency: PricingCurrency,
  rates: { usdToEgp: number; eurToEgp: number },
): number {
  if (currency === "EGP") return 1;
  if (currency === "USD") return rates.usdToEgp > 0 ? rates.usdToEgp : 1;
  return rates.eurToEgp > 0 ? rates.eurToEgp : 1;
}
