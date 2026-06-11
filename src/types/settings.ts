export type Currency = "EGP" | "USD" | "EUR";

import type { PricingAlarmItem } from "@/lib/api/pricing-alarms";

export interface SettingsResponse {
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
}

export interface UpdateSettingsPayload {
  tax_rate?: number;
  exchange_rate?: number;
  exchange_rate_eur?: number;
}

export interface SettingsValidationErrors {
  tax_rate?: string;
  exchange_rate?: string;
  exchange_rate_eur?: string;
}
