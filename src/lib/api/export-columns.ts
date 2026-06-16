import { getApiUrl } from "@/lib/config";
import { parseApiValidationError } from "@/lib/api/core";
import type { ExportColumnCatalog } from "@/types/export-columns";
import { ApiError } from "@/lib/auth-api";

export async function fetchExportColumnCatalog(token: string): Promise<ExportColumnCatalog> {
  const response = await fetch(getApiUrl("/export-columns"), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const { message } = await parseApiValidationError(response);
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as ExportColumnCatalog;
}

export function toExportColumnDefs(
  columns: Array<{
    key: string;
    label: string;
    required?: boolean;
    export_only?: boolean;
    exportOnly?: boolean;
  }>,
) {
  return columns.map((col) => ({
    key: col.key,
    label: col.label,
    required: col.required ?? false,
    exportOnly: col.exportOnly ?? col.export_only ?? false,
  }));
}
