"use client";

import {
  formatMarginModeLabel,
  formatMarginQuickEditHint,
  isPricingLoss,
  type MarginAwarePricingRecord,
  type SaleMarginType,
  type SalePriceQuickEditStrategy,
} from "@/lib/catalog-pricing";
import {
  formatCatalogPriceInEGP,
  type ExchangeRates,
  type PricingCurrency,
} from "@/lib/currencies";
import { SearchableSelect } from "@/components/ops-ui";
import { QuickEditInput } from "./QuickEditInput";
import { QuickEditPriceInput } from "./QuickEditPriceInput";

type QuickEditSalePriceCellProps = {
  editing: boolean;
  pricing: MarginAwarePricingRecord;
  rates: ExchangeRates | null;
  salePriceValue: string;
  salePriceStrategy: SalePriceQuickEditStrategy;
  saleMarginType: SaleMarginType;
  saleMarginValue: string;
  onSalePriceChange: (value: string) => void;
  onStrategyChange: (strategy: SalePriceQuickEditStrategy) => void;
  onSaleMarginTypeChange: (type: SaleMarginType) => void;
  onSaleMarginValueChange: (value: string) => void;
  align?: "left" | "right" | "center";
};

const STRATEGY_OPTIONS: Array<{
  value: SalePriceQuickEditStrategy;
  label: string;
  description: string;
}> = [
  {
    value: "adjust_margin",
    label: "Adjust margin",
    description: "Keep margin mode; update margin value to match this sale price",
  },
  {
    value: "switch_manual",
    label: "Switch to manual",
    description: "Stop auto-calculating; use this sale price as-is",
  },
];

const MARGIN_TYPE_OPTIONS = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed (EGP)" },
] as const;

export function QuickEditSalePriceCell({
  editing,
  pricing,
  rates,
  salePriceValue,
  salePriceStrategy,
  saleMarginType,
  saleMarginValue,
  onSalePriceChange,
  onStrategyChange,
  onSaleMarginTypeChange,
  onSaleMarginValueChange,
  align = "left",
}: QuickEditSalePriceCellProps) {
  const saleCurrency = pricing.sale_currency;
  const effectiveRates = rates ?? { usdToEgp: 1, eurToEgp: 1 };
  const isMargin = pricing.sale_price_mode === "margin";
  const marginLabel = formatMarginModeLabel(pricing);
  const draftMarginValue = Number(saleMarginValue);
  const draftHintPricing = {
    sale_price_mode: pricing.sale_price_mode,
    sale_margin_type: saleMarginType,
    sale_margin_value: Number.isFinite(draftMarginValue)
      ? draftMarginValue
      : (pricing.sale_margin_value ?? 0),
  };
  const marginHint = formatMarginQuickEditHint(draftHintPricing);
  const showLoss = isPricingLoss(
    {
      cost_price: pricing.cost_price,
      cost_currency: pricing.cost_currency,
      sale_price: pricing.sale_price,
      sale_currency: pricing.sale_currency,
    },
    effectiveRates,
  );

  if (editing) {
    return (
      <div className="flex min-w-[10rem] flex-col gap-1.5">
        <QuickEditPriceInput
          value={salePriceValue}
          onChange={onSalePriceChange}
          currency={saleCurrency as PricingCurrency}
          type="number"
          min={0}
          step="any"
          align={align}
          aria-label="Sale price"
        />
        {isMargin && marginHint ? (
          <p className="text-[10px] leading-snug text-on-surface-variant">
            {marginHint}
          </p>
        ) : null}
        {isMargin ? (
          <fieldset className="space-y-1">
            <legend className="sr-only">How to apply sale price change</legend>
            {STRATEGY_OPTIONS.map((option) => {
              const active = salePriceStrategy === option.value;

              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2 py-1.5 text-[10px] leading-snug transition-colors ${
                    active
                      ? "border-primary/30 bg-primary/8 text-on-surface"
                      : "border-outline-variant/20 bg-surface-container-lowest text-on-surface-variant hover:border-outline-variant/35"
                  }`}
                >
                  <input
                    type="radio"
                    name="sale_price_strategy"
                    value={option.value}
                    checked={active}
                    onChange={() => onStrategyChange(option.value)}
                    className="mt-0.5 shrink-0 accent-primary"
                  />
                  <span>
                    <span className="block font-semibold text-on-surface">
                      {option.label}
                    </span>
                    <span className="block text-on-surface-variant">
                      {option.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>
        ) : null}
        {isMargin && salePriceStrategy === "adjust_margin" ? (
          <div className="space-y-1.5">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-on-surface-variant">
                Margin type
              </label>
              <SearchableSelect
                searchable={false}
                value={saleMarginType}
                onChange={(value) =>
                  onSaleMarginTypeChange(value as SaleMarginType)
                }
                options={[...MARGIN_TYPE_OPTIONS]}
                className="form-input-base !px-2 !py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-on-surface-variant">
                Margin value
              </label>
              <div
                className={`inline-flex max-w-full flex-nowrap items-center gap-1.5 ${align === "right" ? "justify-end" : ""}`}
              >
                <QuickEditInput
                  value={saleMarginValue}
                  onChange={onSaleMarginValueChange}
                  type="number"
                  min={0}
                  step="any"
                  align={align}
                  aria-label="Margin value"
                />
                <span
                  className="form-chip mono-data shrink-0 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant"
                  aria-hidden
                >
                  {saleMarginType === "fixed" ? "EGP" : "%"}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-2 ${align === "right" ? "justify-end" : ""}`}
    >
      {formatCatalogPriceInEGP(
        pricing.sale_price,
        saleCurrency as PricingCurrency,
        effectiveRates,
      )}
      {marginLabel ? (
        <span className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          {marginLabel}
        </span>
      ) : null}
      {showLoss ? (
        <span className="rounded-full bg-error/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-error">
          Loss
        </span>
      ) : null}
    </span>
  );
}
