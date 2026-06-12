"use client";

import type { PricingCurrency } from "@/lib/currencies";
import { QuickEditInput } from "./QuickEditInput";

type QuickEditPriceInputProps = {
  value: string;
  onChange: (value: string) => void;
  currency: PricingCurrency;
  type?: "text" | "number";
  min?: number;
  step?: number | string;
  className?: string;
  align?: "left" | "right" | "center";
  disabled?: boolean;
  "aria-label"?: string;
};

export function QuickEditPriceInput({
  value,
  onChange,
  currency,
  type = "number",
  min,
  step,
  className = "",
  align = "left",
  disabled = false,
  "aria-label": ariaLabel,
}: QuickEditPriceInputProps) {
  return (
    <div
      className={`inline-flex max-w-full flex-nowrap items-center gap-1.5 ${align === "right" ? "justify-end" : ""}`}
    >
      <QuickEditInput
        value={value}
        onChange={onChange}
        type={type}
        min={min}
        step={step}
        className={className}
        align={align}
        disabled={disabled}
        aria-label={ariaLabel}
      />
      <span
        className="form-chip mono-data shrink-0 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant"
        aria-hidden
      >
        {currency}
      </span>
    </div>
  );
}
