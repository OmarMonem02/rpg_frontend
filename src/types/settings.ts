export type Currency = "EGP" | "USD" | "EUR";

export interface SettingsResponse {
  tax_rate: number | null;
  exchange_rate: number | null;
  exchange_rate_eur: number | null;
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
