import { getApiUrl } from "@/lib/config";
import { parseApiValidationError } from "@/lib/api/core";
import type { ImportExportEntity, ImportPreview, ImportResult } from "@/types/import-export";
import { ApiError } from "@/lib/auth-api";

async function throwApiError(response: Response): Promise<never> {
  const { message, fieldErrors } = await parseApiValidationError(response);
  throw new ApiError(message, response.status, fieldErrors);
}

export async function fetchImportExportEntities(token: string): Promise<ImportExportEntity[]> {
  const response = await fetch(getApiUrl("/import-export/entities"), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await throwApiError(response);
  }

  return (await response.json()) as ImportExportEntity[];
}

function resolveDownloadUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const { pathname, search } = new URL(url);
      const apiPath = pathname.startsWith("/api/")
        ? pathname.slice(4)
        : pathname;

      return getApiUrl(`${apiPath}${search}`);
    } catch {
      return url;
    }
  }

  return getApiUrl(url.startsWith("/") ? url : `/${url}`);
}

export async function downloadFile(url: string, token: string, filename: string): Promise<void> {
  const fullUrl = resolveDownloadUrl(url);

  const response = await fetch(fullUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: filename.endsWith(".csv")
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });

  if (!response.ok) {
    await throwApiError(response);
  }

  const blob = await response.blob();
  const contentType = response.headers.get("content-type");
  const headerBytes = blob.size > 0 ? new Uint8Array(await blob.slice(0, 4).arrayBuffer()) : new Uint8Array();
  const isZipXlsx = headerBytes[0] === 0x50 && headerBytes[1] === 0x4b;
  const isCsv = filename.endsWith(".csv");

  if (blob.size < 50) {
    throw new ApiError("Export file is empty. Check that records exist and try again.", 500);
  }

  if (!isCsv && !isZipXlsx) {
    throw new ApiError("Export did not return a valid Excel file. Please retry or contact support.", 500);
  }
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}

export async function importFile(
  entitySlug: string,
  file: File,
  token: string
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(getApiUrl(`/import-export/${entitySlug}/import`), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  
  if (!response.ok) {
    if (isJson && (response.status === 422 || response.status === 400 || response.status === 200)) {
        try {
            const data = await response.json();
            if (data.message && Array.isArray(data.errors)) {
               return data as ImportResult;
            }
        } catch {
            // ignore
        }
    }
    await throwApiError(response);
  }
  
  if (isJson) {
      return (await response.json()) as ImportResult;
  }
  
  throw new ApiError("Import completed but the server returned an unreadable response.", response.status);
}

export async function parseImportFile(
  entitySlug: string,
  file: File,
  token: string
): Promise<ImportPreview> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(getApiUrl(`/import-export/${entitySlug}/parse`), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    await throwApiError(response);
  }

  return (await response.json()) as ImportPreview;
}
