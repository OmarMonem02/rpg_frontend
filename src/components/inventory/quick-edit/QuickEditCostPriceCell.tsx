"use client";

import { useState } from "react";
import {
  convertFromEGP,
  convertToEGP,
  type ExchangeRates,
  type PricingCurrency,
} from "@/lib/currencies";
import { QuickEditInput } from "./QuickEditInput";

type QuickEditCostPriceCellProps = {
  value: string;
  onChange: (value: string) => void;
  costCurrency: PricingCurrency;
  rates: ExchangeRates;
  type?: "text" | "number";
  min?: number;
  step?: number | string;
  className?: string;
  align?: "left" | "right" | "center";
  disabled?: boolean;
  "aria-label"?: string;
};

export function QuickEditCostPriceCell({
  value,
  onChange,
  costCurrency,
  rates,
  type = "number",
  min,
  step,
  className = "",
  align = "left",
  disabled = false,
  "aria-label": ariaLabel,
}: QuickEditCostPriceCellProps) {
  const [viewInEgp, setViewInEgp] = useState(false);
  const canToggle = costCurrency === "USD" || costCurrency === "EUR";

  const numericValue = Number(value);
  const hasNumericValue = Number.isFinite(numericValue);

  const displayValue =
    viewInEgp && hasNumericValue
      ? String(convertToEGP(numericValue, costCurrency, rates))
      : value;

  const displayCurrency: PricingCurrency = viewInEgp ? "EGP" : costCurrency;

  const handleChange = (next: string) => {
    if (viewInEgp) {
      const egp = Number(next);
      if (!Number.isFinite(egp)) {
        onChange(next);
        return;
      }
      onChange(String(convertFromEGP(egp, costCurrency, rates)));
      return;
    }
    onChange(next);
  };

  const handleCurrencyClick = () => {
    if (!canToggle || disabled) return;
    setViewInEgp((prev) => !prev);
  };

  const currencyTitle = canToggle
    ? viewInEgp
      ? `View in ${costCurrency}`
      : "View in EGP"
    : undefined;

  return (
    <div
      className={`inline-flex max-w-full flex-nowrap items-center gap-1.5 ${align === "right" ? "justify-end" : ""}`}
    >
      <QuickEditInput
        value={displayValue}
        onChange={handleChange}
        type={type}
        min={min}
        step={step}
        className={className}
        align={align}
        disabled={disabled}
        aria-label={ariaLabel}
      />
      {canToggle ? (
        <button
          type="button"
          onClick={handleCurrencyClick}
          disabled={disabled}
          title={currencyTitle}
          className="form-chip mono-data shrink-0 cursor-pointer px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={currencyTitle}
        >
          {displayCurrency}
        </button>
      ) : (
        <span
          className="form-chip mono-data shrink-0 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant"
          aria-hidden
        >
          {displayCurrency}
        </span>
      )}
    </div>
  );
}
