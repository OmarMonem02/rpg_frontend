import { ApiError } from "@/lib/auth-api";
import { getApiUrl } from "@/lib/config";
import type { SettingsResponse, SettingsValidationErrors, UpdateSettingsPayload } from "@/types/settings";

type ValidationErrorResponse = {
  message?: string;
  errors?: Record<string, string[] | string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeSettings(payload: unknown): SettingsResponse {
  const data = isRecord(payload) ? payload : {};
  const nestedData = isRecord(data.data) ? data.data : null;
  const source = nestedData ?? data;

  return {
    tax_rate: toNumberOrNull(source.tax_rate),
    exchange_rate: toNumberOrNull(source.exchange_rate),
    exchange_rate_eur: toNumberOrNull(source.exchange_rate_eur),
  };
}

async function parseApiError(response: Response): Promise<{ message: string; fieldErrors: SettingsValidationErrors }> {
  let message = "Request failed. Please try again.";
  const fieldErrors: SettingsValidationErrors = {};

  try {
    const text = await response.text();
    if (text) {
      try {
        const json = JSON.parse(text) as ValidationErrorResponse;
        if (json.errors) {
          for (const [field, rawValue] of Object.entries(json.errors)) {
            const nextMessage = Array.isArray(rawValue) ? rawValue[0] : rawValue;
            if (!nextMessage) continue;

            if (
              field === "tax_rate" ||
              field === "exchange_rate" ||
              field === "exchange_rate_eur"
            ) {
              fieldErrors[field as keyof SettingsValidationErrors] = nextMessage;
            }
          }
        }

        if (json.message) {
          message = json.message;
        } else if (Object.keys(fieldErrors).length > 0) {
          message = "Please review the highlighted settings fields.";
        }
      } catch {
        message = text.slice(0, 200);
      }
    }
  } catch {
    // Fall through to status-based messages below.
  }

  if (response.status === 401) {
    message = "Your session expired. Please log in again.";
  } else if (response.status === 422 && Object.keys(fieldErrors).length === 0) {
    message = "Please review the highlighted settings fields.";
  }

  return { message, fieldErrors };
}

async function settingsFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const parsedError = await parseApiError(response);
    const error = new ApiError(parsedError.message, response.status) as ApiError & {
      fieldErrors?: SettingsValidationErrors;
    };
    error.fieldErrors = parsedError.fieldErrors;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function getSettings(token: string): Promise<SettingsResponse> {
  const response = await settingsFetch<unknown>("/settings", token);
  return normalizeSettings(response);
}

export async function updateSettings(token: string, payload: UpdateSettingsPayload): Promise<SettingsResponse> {
  const response = await settingsFetch<unknown>("/settings", token, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return normalizeSettings(response);
}
