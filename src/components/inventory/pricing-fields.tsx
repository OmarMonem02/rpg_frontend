"use client";

import { useEffect, useMemo } from "react";
import {
  computeCostInEgp,
  computeSaleFromMargin,
  formatPricingLossHint,
  type CatalogPricingFields,
  type SaleMarginType,
  type SalePriceMode,
} from "@/lib/catalog-pricing";
import {
  CURRENCY_SELECT_OPTIONS,
  formatEgp,
  toPricingCurrency,
  type ExchangeRates,
  type PricingCurrency,
} from "@/lib/currencies";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { InlineMessage, SurfaceCard } from "@/components/ops-ui";

type PricingFieldsProps = {
  values: CatalogPricingFields;
  onChange: (partial: Partial<CatalogPricingFields>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
};

function numInput(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
}

function ModeToggle({
  mode,
  current,
  disabled,
  onSelect,
}: {
  mode: SalePriceMode;
  current: SalePriceMode;
  disabled: boolean;
  onSelect: (mode: SalePriceMode) => void;
}) {
  const active = current === mode;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(mode)}
      className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-outline-variant/30 bg-surface text-on-surface-variant hover:border-primary/25"
      }`}
    >
      {mode === "manual" ? "Manual" : "Margin"}
    </button>
  );
}

export function PricingFields({
  values,
  onChange,
  errors = {},
  disabled = false,
}: PricingFieldsProps) {
  const { rates, loading: ratesLoading } = useExchangeRates();

  const effectiveRates: ExchangeRates = rates ?? { usdToEgp: 1, eurToEgp: 1 };

  const marginSalePrice = useMemo(() => {
    if (values.sale_price_mode !== "margin") return null;
    return computeSaleFromMargin(
      values.cost_price,
      values.cost_currency,
      values.sale_margin_type ?? "percentage",
      values.sale_margin_value ?? 0,
      values.sale_currency,
      effectiveRates,
    );
  }, [values, effectiveRates]);

  useEffect(() => {
    if (values.sale_price_mode !== "margin" || marginSalePrice === null) return;
    if (Math.abs(marginSalePrice - values.sale_price) < 0.01) return;
    onChange({ sale_price: marginSalePrice, currency_pricing: values.sale_currency });
  }, [marginSalePrice, onChange, values.sale_price, values.sale_currency, values.sale_price_mode]);

  const costEgpHint = computeCostInEgp(
    values.cost_price,
    values.cost_currency,
    effectiveRates,
  );

  const displaySalePrice =
    values.sale_price_mode === "margin" && marginSalePrice !== null
      ? marginSalePrice
      : values.sale_price;

  const lossHint = formatPricingLossHint(
    { ...values, sale_price: displaySalePrice },
    effectiveRates,
  );

  const marginModeAllowed =
    (values.cost_currency === "USD" || values.cost_currency === "EUR") &&
    values.sale_currency === "EGP";

  const setMode = (mode: SalePriceMode) => {
    if (mode === "margin") {
      onChange({
        sale_price_mode: mode,
        sale_currency: "EGP",
        currency_pricing: "EGP",
        cost_currency:
          values.cost_currency === "EGP" ? "USD" : values.cost_currency,
      });
      return;
    }
    onChange({ sale_price_mode: mode });
  };

  const marginType = values.sale_margin_type ?? "percentage";

  const compactInput = "form-input-base !px-3 !py-2 text-sm";

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <SurfaceCard className="space-y-2 rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-3">
        <p className="label-caps text-on-surface">Cost</p>

        <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
          <div>
            <label className="mb-1 block text-xs text-on-surface-variant">
              Amount <span className="text-error">*</span>
            </label>
            <input
              type="number"
              min={0}
              step="1"
              onWheel={(event) => {
                event.currentTarget.blur();
              }}
              disabled={disabled}
              value={numInput(values.cost_price)}
              onChange={(e) =>
                onChange({ cost_price: Number(e.target.value) || 0 })
              }
              className={compactInput}
              placeholder="0.00"
            />
            {errors.cost_price ? (
              <p className="mt-0.5 text-xs text-error">{errors.cost_price}</p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs text-on-surface-variant">Currency</label>
            <select
              disabled={disabled}
              value={values.cost_currency}
              onChange={(e) =>
                onChange({
                  cost_currency: toPricingCurrency(e.target.value) as PricingCurrency,
                })
              }
              className={compactInput}
            >
              {CURRENCY_SELECT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {errors.cost_currency ? (
              <p className="mt-0.5 text-xs text-error">{errors.cost_currency}</p>
            ) : null}
          </div>
        </div>

        <p className="text-xs text-on-surface-variant">
          EGP equivalent:{" "}
          <span className="mono-data font-medium text-on-surface">
            {ratesLoading ? "…" : formatEgp(costEgpHint)}
          </span>
        </p>
      </SurfaceCard>

      <SurfaceCard className="space-y-2 rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-3">
        <p className="label-caps text-on-surface">Sale price</p>

        <div>
          <label className="mb-1 block text-xs text-on-surface-variant">Mode</label>
          <div className="flex gap-1.5">
            <ModeToggle
              mode="manual"
              current={values.sale_price_mode}
              disabled={disabled}
              onSelect={setMode}
            />
            <ModeToggle
              mode="margin"
              current={values.sale_price_mode}
              disabled={disabled}
              onSelect={setMode}
            />
          </div>
          {values.sale_price_mode === "margin" && !marginModeAllowed ? (
            <p className="mt-1 text-xs text-on-surface-variant">
              Margin mode needs USD/EUR cost and EGP sale.
            </p>
          ) : null}
        </div>

        {values.sale_price_mode === "margin" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-on-surface-variant">Margin type</label>
              <select
                disabled={disabled}
                value={marginType}
                onChange={(e) =>
                  onChange({
                    sale_margin_type: e.target.value as SaleMarginType,
                  })
                }
                className={compactInput}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (EGP)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-on-surface-variant">Margin value</label>
              <input
                type="number"
                min={0}
                step="1"
                onWheel={(event) => {
                  event.currentTarget.blur();
                }}
                disabled={disabled}
                value={numInput(values.sale_margin_value ?? 0)}
                onChange={(e) =>
                  onChange({ sale_margin_value: Number(e.target.value) || 0 })
                }
                className={compactInput}
                placeholder={marginType === "fixed" ? "0.00" : "10"}
              />
              {errors.sale_margin_value ? (
                <p className="mt-0.5 text-xs text-error">{errors.sale_margin_value}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
          <div>
            <label className="mb-1 block text-xs text-on-surface-variant">
              Amount <span className="text-error">*</span>
            </label>
            <input
              type="number"
              min={0}
              step="1"
              onWheel={(event) => {
                event.currentTarget.blur();
              }}
              disabled={disabled || values.sale_price_mode === "margin"}
              value={numInput(displaySalePrice)}
              onChange={(e) =>
                onChange({
                  sale_price: Number(e.target.value) || 0,
                  currency_pricing: values.sale_currency,
                })
              }
              className={compactInput}
              placeholder="0.00"
            />
            {errors.sale_price ? (
              <p className="mt-0.5 text-xs text-error">{errors.sale_price}</p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs text-on-surface-variant">Currency</label>
            <select
              disabled={disabled || values.sale_price_mode === "margin"}
              value={values.sale_currency}
              onChange={(e) => {
                const saleCurrency = toPricingCurrency(e.target.value) as PricingCurrency;
                onChange({
                  sale_currency: saleCurrency,
                  currency_pricing: saleCurrency,
                });
              }}
              className={compactInput}
            >
              {CURRENCY_SELECT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {values.sale_price_mode === "margin" ? (
              <p className="mt-0.5 text-xs text-on-surface-variant">EGP only</p>
            ) : null}
            {errors.sale_currency ? (
              <p className="mt-0.5 text-xs text-error">{errors.sale_currency}</p>
            ) : null}
          </div>
        </div>

        {values.sale_price_mode === "margin" && marginSalePrice !== null ? (
          <p className="text-xs text-on-surface-variant">
            Calculated:{" "}
            <span className="mono-data font-medium text-on-surface">
              {formatEgp(marginSalePrice)}
            </span>
            {" · "}
            {formatEgp(costEgpHint)} cost +{" "}
            {marginType === "fixed"
              ? formatEgp(values.sale_margin_value ?? 0)
              : `${formatEgp(
                  Math.round(
                    costEgpHint * ((values.sale_margin_value ?? 0) / 100) * 100,
                  ) / 100,
                )} (${values.sale_margin_value ?? 0}%)`}
          </p>
        ) : null}
      </SurfaceCard>

      {lossHint ? (
        <InlineMessage tone="warning">
          <p className="text-sm font-medium">Pricing loss</p>
          <p className="mt-0.5 text-xs">{lossHint}</p>
        </InlineMessage>
      ) : null}
    </div>
  );
}
