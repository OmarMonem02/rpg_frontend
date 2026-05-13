import { getApiUrl } from "@/lib/config";
import type { ImportExportEntity, ImportPreview, ImportResult } from "@/types/import-export";
import { ApiError } from "@/lib/auth-api";

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { message?: string };
    if (json.message) return json.message;
  } catch {
    // Ignore parse errors and use fallback message.
  }
  return "Request failed. Please try again.";
}

export async function fetchImportExportEntities(token: string): Promise<ImportExportEntity[]> {
  const response = await fetch(getApiUrl("/import-export/entities"), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  return (await response.json()) as ImportExportEntity[];
}

export async function downloadFile(url: string, token: string, filename: string): Promise<void> {
  const isAbsolute = url.startsWith("http://") || url.startsWith("https://");
  const fullUrl = isAbsolute ? url : getApiUrl(!url.startsWith("/") ? `/${url}` : url);

  const response = await fetch(fullUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  const blob = await response.blob();
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
    throw new ApiError(await parseErrorMessage(response), response.status);
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
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  return (await response.json()) as ImportPreview;
}
