"use client";

import {
  convertToEGP,
  formatEgp,
  type ExchangeRates,
  type PricingCurrency,
} from "@/lib/currencies";
import { useExchangeRates } from "@/hooks/useExchangeRates";

type EgpPriceProps = {
  amount: number;
  currency: PricingCurrency;
  /** When provided, skips the settings fetch (use on pages that already load rates). */
  rates?: ExchangeRates;
  className?: string;
};

export function EgpPrice({ amount, currency, rates: ratesProp, className }: EgpPriceProps) {
  const { rates: hookRates, loading } = useExchangeRates();
  const rates = ratesProp ?? hookRates;

  if (!ratesProp && loading) {
    return <span className={className}>—</span>;
  }

  return (
    <span className={className}>
      {formatEgp(convertToEGP(amount, currency, rates))}
    </span>
  );
}
