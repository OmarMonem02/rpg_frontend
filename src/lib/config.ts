const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!API_BASE_URL) {
    return normalizedPath;
  }

  return `${API_BASE_URL}${normalizedPath}`;
}
