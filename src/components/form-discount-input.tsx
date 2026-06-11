"use client";

import type { ComponentType } from "react";
import {
  clampRawDiscountValue,
  convertDiscountBetweenTypes,
  resolveDiscountAmount,
  type DiscountInputType,
} from "@/lib/discount-input";

const DISCOUNT_TYPE_OPTIONS: {
  value: DiscountInputType;
  label: string;
}[] = [
  { value: "fixed", label: "Fixed Amount" },
  { value: "percentage", label: "Percentage (%)" },
];

export function formatDiscountAmount(amount: number) {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2 });
}

export type FormDiscountInputProps = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  prefix?: string;
  value: number;
  discountType: DiscountInputType;
  onChange: (value: number) => void;
  onTypeChange: (type: DiscountInputType) => void;
  onBlur?: () => void;
  baseAmount: number;
  maxFixedAmount?: number;
  disabled?: boolean;
  hint?: string;
  currencySuffix?: string;
};

export function FormDiscountInput({
  id,
  label,
  icon: Icon,
  prefix = "-",
  value,
  discountType,
  onChange,
  onTypeChange,
  onBlur,
  baseAmount,
  maxFixedAmount,
  disabled,
  hint,
  currencySuffix = "EGP",
}: FormDiscountInputProps) {
  const isPercentage = discountType === "percentage";
  const suffix = isPercentage ? "%" : currencySuffix;
  const resolvedAmount = resolveDiscountAmount(
    discountType,
    value,
    baseAmount,
  );
  const maxFixed = maxFixedAmount ?? baseAmount;

  const handleTypeChange = (nextType: DiscountInputType) => {
    if (nextType === discountType) return;
    const converted = convertDiscountBetweenTypes(
      discountType,
      nextType,
      value,
      baseAmount,
    );
    const clamped = clampRawDiscountValue(
      nextType,
      converted,
      maxFixed,
      baseAmount,
    );
    onChange(clamped);
    onTypeChange(nextType);
  };

  const handleValueChange = (raw: number) => {
    onChange(
      clampRawDiscountValue(discountType, raw, maxFixed, baseAmount),
    );
  };

  return (
    <div className={`space-y-2 ${disabled ? "opacity-70" : ""}`}>
      <label
        htmlFor={id}
        className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant"
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        {label}
      </label>
      <div
        className="grid grid-cols-2 gap-1.5"
        role="radiogroup"
        aria-label={`${label} type`}
      >
        {DISCOUNT_TYPE_OPTIONS.map((option) => {
          const active = discountType === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => handleTypeChange(option.value)}
              className={`rounded-xl border px-2.5 py-2 text-xs font-semibold transition-all ${
                active
                  ? "border-primary bg-primary/10 text-on-surface shadow-sm ring-1 ring-primary/20"
                  : "border-outline-variant/30 bg-surface text-on-surface-variant hover:border-primary/30 hover:bg-primary/5"
              } disabled:cursor-not-allowed`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <div
        className={`relative rounded-2xl border border-outline-variant/30 bg-surface shadow-sm transition-shadow focus-within:ring-2 focus-within:border-error/50 focus-within:ring-error/20 ${
          disabled
            ? "cursor-not-allowed bg-surface-container/50"
            : "hover:shadow-md"
        }`}
      >
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 font-bold text-error">
          {prefix}
        </span>
        <input
          id={id}
          type="number"
          onWheel={(event) => {
            event.currentTarget.blur();
          }}
          step="0.01"
          min="0"
          disabled={disabled}
          value={value || ""}
          onChange={(e) => handleValueChange(Number(e.target.value) || 0)}
          onBlur={onBlur}
          placeholder="0.00"
          className="w-full appearance-none bg-transparent py-3.5 pl-10 pr-14 text-sm font-medium text-on-surface outline-none disabled:cursor-not-allowed"
        />
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-xs text-on-surface-variant">
          {suffix}
        </span>
      </div>
      {isPercentage && resolvedAmount > 0 ? (
        <p className="text-xs font-medium text-on-surface-variant">
          = {formatDiscountAmount(resolvedAmount)} {currencySuffix} off
        </p>
      ) : null}
      {hint ? (
        <p className="text-xs text-on-surface-variant/90">{hint}</p>
      ) : null}
    </div>
  );
}
