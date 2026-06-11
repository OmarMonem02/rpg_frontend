import { authorizedFetch } from "./core";
import type { SaleMarginType, SalePriceMode } from "@/lib/catalog-pricing";
import type { PricingCurrency } from "@/lib/currencies";

export type PricingAlarmItem = {
  item_type: "product" | "spare_part" | "bike";
  id: number;
  name: string;
  sku: string;
  cost_price: number;
  cost_currency: PricingCurrency;
  sale_price: number;
  sale_currency: PricingCurrency;
  cost_egp: number;
  sale_egp: number;
  loss_amount_egp: number;
  suggested_sale_price: number;
  sale_price_mode: SalePriceMode;
  sale_margin_type: SaleMarginType | null;
  sale_margin_value: number | null;
};

export type PricingAlarmsResponse = {
  items: PricingAlarmItem[];
};

export type RateChangePreviewResponse = {
  margin_items_to_update: number;
  manual_loss_items: PricingAlarmItem[];
  margin_updated_items: Array<PricingAlarmItem & { new_sale_price: number }>;
};

export type SettingsUpdateWithPricingImpact = {
  tax_rate: number | null;
  exchange_rate: number | null;
  exchange_rate_eur: number | null;
  pricing_impact?: {
    margin_items_updated: number;
    manual_loss_items: PricingAlarmItem[];
    rates_changed?: {
      usd: { from: number; to: number };
      eur: { from: number; to: number };
    };
  };
};

export async function listPricingAlarms(
  token: string,
): Promise<PricingAlarmsResponse> {
  return authorizedFetch<PricingAlarmsResponse>("/inventory/pricing-alarms", token);
}

export async function previewPricingAlarms(
  token: string,
  items?: Array<{ item_type: PricingAlarmItem["item_type"]; id: number }>,
): Promise<PricingAlarmsResponse> {
  return authorizedFetch<PricingAlarmsResponse>(
    "/inventory/pricing-alarms/preview",
    token,
    {
      method: "POST",
      body: JSON.stringify({ items: items ?? [] }),
    },
  );
}

export async function applyPricingAlarms(
  token: string,
  items: Array<{ item_type: PricingAlarmItem["item_type"]; id: number }>,
): Promise<{ updated: number; items: PricingAlarmItem[] }> {
  return authorizedFetch("/inventory/pricing-alarms/apply", token, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function previewRateChangePricing(
  token: string,
  rates: { exchange_rate?: number; exchange_rate_eur?: number },
): Promise<RateChangePreviewResponse> {
  return authorizedFetch<RateChangePreviewResponse>(
    "/inventory/pricing-alarms/preview-rate-change",
    token,
    {
      method: "POST",
      body: JSON.stringify(rates),
    },
  );
}
