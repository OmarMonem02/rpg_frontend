import { getApiUrl } from "@/lib/config";
import { parseApiValidationError } from "@/lib/api/core";
import { ApiError } from "@/lib/auth-api";
import type { BackupImportResult, BackupPreview, BackupRestoreMode } from "@/types/backup";

async function throwApiError(response: Response): Promise<never> {
  const { message, fieldErrors } = await parseApiValidationError(response);
  throw new ApiError(message, response.status, fieldErrors);
}

export async function downloadSystemBackup(token: string): Promise<void> {
  const response = await fetch(getApiUrl("/backup/export"), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/gzip",
    },
  });

  if (!response.ok) {
    await throwApiError(response);
  }

  const blob = await response.blob();

  if (blob.size < 20) {
    throw new ApiError("Backup file is empty. Please retry or contact support.", 500);
  }

  const disposition = response.headers.get("content-disposition");
  const filenameMatch = disposition?.match(/filename="?([^"]+)"?/i);
  const filename = filenameMatch?.[1] ?? `rpg-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.sql.gz`;

  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(downloadUrl);
}

export async function previewSystemBackup(file: File, token: string): Promise<BackupPreview> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(getApiUrl("/backup/preview"), {
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

  return (await response.json()) as BackupPreview;
}

export async function importSystemBackup(
  file: File,
  mode: BackupRestoreMode,
  token: string,
  confirmation?: string,
): Promise<BackupImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);

  if (confirmation) {
    formData.append("confirmation", confirmation);
  }

  const response = await fetch(getApiUrl("/backup/import"), {
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

  return (await response.json()) as BackupImportResult;
}
