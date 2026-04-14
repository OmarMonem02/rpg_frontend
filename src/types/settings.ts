export type Currency = "EGP" | "USD";

export interface SettingsResponse {
  tax_rate: number | null;
  exchange_rate: number | null;
}

export interface UpdateSettingsPayload {
  tax_rate?: number;
  exchange_rate?: number;
}

export interface SettingsValidationErrors {
  tax_rate?: string;
  exchange_rate?: string;
}
