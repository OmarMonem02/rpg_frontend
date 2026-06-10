import { getApiUrl } from "@/lib/config";
import { ApiError } from "@/lib/auth-api";

export type ValidationErrorResponse = {
  message?: string;
  errors?: Record<string, string[] | string>;
};

export function extractValidationErrors(
  json: ValidationErrorResponse,
): { message: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};

  if (json.errors && typeof json.errors === "object") {
    for (const [field, rawValue] of Object.entries(json.errors)) {
      const nextMessage = Array.isArray(rawValue) ? rawValue[0] : rawValue;
      if (typeof nextMessage === "string" && nextMessage.trim() !== "") {
        fieldErrors[field] = nextMessage;
      }
    }
  }

  const firstFieldMessage = Object.values(fieldErrors)[0];
  const message =
    json.message ??
    firstFieldMessage ??
    "Request failed. Please try again.";

  return { message, fieldErrors };
}

export function getApiErrorDetails(
  err: unknown,
  fallback = "Request failed. Please try again.",
): { message: string; fieldErrors: Record<string, string> } {
  if (err instanceof ApiError) {
    let fieldErrors = err.fieldErrors ?? {};

    if (
      err.status === 422 &&
      Object.keys(fieldErrors).length === 0 &&
      err.message &&
      !/please review your form inputs/i.test(err.message)
    ) {
      if (/name already exists/i.test(err.message)) {
        fieldErrors = { name: err.message };
      }
    }

    return {
      message: err.message,
      fieldErrors,
    };
  }

  if (err instanceof Error) {
    return { message: err.message, fieldErrors: {} };
  }

  return { message: fallback, fieldErrors: {} };
}

export async function parseApiValidationError(
  response: Response,
): Promise<{ message: string; fieldErrors: Record<string, string> }> {
  let message = "Request failed. Please try again.";
  let fieldErrors: Record<string, string> = {};

  try {
    const text = await response.text();
    if (text) {
      try {
        const parsed = extractValidationErrors(
          JSON.parse(text) as ValidationErrorResponse,
        );
        message = parsed.message;
        fieldErrors = parsed.fieldErrors;
      } catch {
        message = text.slice(0, 200);
      }
    }
  } catch {
    // Fall through to status-based messages below.
  }

  if (response.status === 401) {
    message = "Your session expired. Please log in again.";
  } else if (response.status === 403) {
    message = "You don't have permission to perform this action.";
  } else if (
    response.status === 422 &&
    Object.keys(fieldErrors).length === 0 &&
    (message === "Request failed. Please try again." ||
      message === "The given data was invalid.")
  ) {
    message = "Please review your form inputs and try again.";
  } else if (response.status === 500) {
    message = "Server error. Check browser console for details.";
  }

  return { message, fieldErrors };
}

export type PaginationMeta = {
  current_page?: number;
  last_page?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  currentPage: number;
  lastPage: number;
};

export type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord {
  if (value && typeof value === "object") return value as UnknownRecord;
  return {};
}

export function pickArray(payload: unknown, keys: string[]): unknown[] {
  const data = asRecord(payload);
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key] as unknown[];
  }
  if (Array.isArray(payload)) return payload;
  return [];
}

export function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export async function parseErrorMessage(response: Response): Promise<string> {
  const { message } = await parseApiValidationError(response);
  return message;
}

export async function authorizedFetch<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  let requestBody: unknown = null;
  try {
    if (init?.body) {
      requestBody =
        typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    }
  } catch (e) {
    console.warn("[API] Failed to parse request body:", e);
  }

  console.log(`[API ${init?.method || "GET"}] ${path}`, requestBody);

  const response = await fetch(getApiUrl(path), {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const { message, fieldErrors } = await parseApiValidationError(response);

    if (response.status === 422) {
      console.warn(`[API Validation ${response.status}] ${path} - ${message}`, {
        requestBody,
        fieldErrors,
      });
    } else {
      console.error(`[API Error ${response.status}] ${path} - ${message}`, {
        requestBody,
        fieldErrors,
      });
    }

    let enhancedMsg = message;
    if (response.status === 403) {
      const resourceMatch = path.match(/(\w+)/)?.[1];
      if (resourceMatch) {
        enhancedMsg = `Permission denied: You don't have access to ${resourceMatch}. Please contact your administrator.`;
      }
    }

    throw new ApiError(enhancedMsg, response.status, fieldErrors);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/**
 * Retry helper for API calls with exponential backoff
 * Does NOT retry on 403 errors (permission issues)
 */
export async function retryApiCall<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on permission errors
      if (err instanceof ApiError && err.status === 403) {
        throw err;
      }

      // Don't retry on auth errors
      if (err instanceof ApiError && err.status === 401) {
        throw err;
      }

      // Only retry if we have attempts left
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 500; // 500ms, 1s, 2s
        console.warn(
          `[API] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms:`,
          lastError.message,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

export async function fetchAllPages<T>(
  fetcher: (page: number) => Promise<PaginatedResult<T>>,
): Promise<T[]> {
  const firstPage = await fetcher(1);
  const items = [...firstPage.items];
  const lastPage = firstPage.lastPage;

  if (lastPage <= 1) {
    return items;
  }

  const batchSize = 4;
  const remainingPages = Array.from({ length: lastPage - 1 }, (_, index) => index + 2);

  for (let i = 0; i < remainingPages.length; i += batchSize) {
    const batch = remainingPages.slice(i, i + batchSize);
    const responses = await Promise.all(batch.map((page) => fetcher(page)));
    responses.forEach((response) => items.push(...response.items));
  }

  return items;
}

export function parsePagination(payload: unknown): PaginationMeta {
  const data = asRecord(payload);
  const meta = asRecord(data.meta);
  const innerData = asRecord(data.data);
  return {
    current_page: toNumber(meta.current_page) || toNumber(data.current_page) || toNumber(innerData.current_page) || 1,
    last_page: toNumber(meta.last_page) || toNumber(data.last_page) || toNumber(innerData.last_page) || 1,
  };
}

/**
 * Builds a URLSearchParams from a flat object, skipping falsy/empty values.
 * Booleans: only appended when true. Numbers: skipped when 0 unless key is in allowZero.
 */
export function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>,
  allowZero: string[] = [],
): URLSearchParams {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'boolean') { if (value) q.append(key, 'true'); continue; }
    if (typeof value === 'number' && value === 0 && !allowZero.includes(key)) continue;
    q.append(key, String(value));
  }
  return q;
}
