const DEFAULT_DEV_API_BASE_URL = "http://127.0.0.1:8000/api";
// const DEFAULT_DEV_API_BASE_URL = "https://rpg-backend-main-vduhcn.free.laravel.cloud/api";
// const DEFAULT_PROD_API_BASE_URL = "https://rpg-backend-main-vduhcn.free.laravel.cloud/api";
const DEFAULT_PROD_API_BASE_URL = "http://127.0.0.1:8000/api";

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PROD_API_BASE_URL;
  }

  return DEFAULT_DEV_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!API_BASE_URL) {
    return normalizedPath;
  }

  return `${API_BASE_URL}${normalizedPath}`;
}
