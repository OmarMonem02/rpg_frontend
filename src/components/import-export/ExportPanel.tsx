"use client";

import { ActionButton } from "@/components/ops-ui";
import type { ImportExportEntity } from "@/types/import-export";
import { useState } from "react";
import { downloadFile } from "@/lib/api/import-export";
import { getAuthToken } from "@/lib/auth-session";
import { ArrowDownTrayIcon, ArrowPathIcon, DocumentArrowDownIcon, TableCellsIcon } from "@heroicons/react/24/outline";

export function ExportPanel({ entity }: { entity: ImportExportEntity }) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (action: "export" | "template", format: "xlsx" | "csv") => {
    try {
      const type = `${action}-${format}`;
      setDownloading(type);
      setError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const endpoint = action === "export" ? entity.endpoints.export : entity.endpoints.template;
      await downloadFile(`${endpoint}?format=${format}`, token, `${entity.slug}_${action}.${format}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-lowest p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-start gap-3">
        <DocumentArrowDownIcon className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-xl font-semibold text-on-surface">Export & Templates</h3>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Download styled Excel workbooks for operations or guided templates for clean imports.
          </p>
        </div>
      </div>

      {error ? <div className="mb-4 rounded-xl bg-error/10 p-3 text-sm text-error">{error}</div> : null}

      <div className="space-y-5">
        <div className="rounded-xl border border-outline-variant/15 bg-surface p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold text-on-surface">
            <TableCellsIcon className="h-5 w-5 text-primary" />
            Current records
          </div>
          <div className="flex flex-wrap gap-3">
            <ActionButton onClick={() => handleDownload("export", "xlsx")} disabled={downloading !== null}>
              {downloading === "export-xlsx" ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ArrowDownTrayIcon className="h-4 w-4" />}
              Styled XLSX
            </ActionButton>
            <ActionButton variant="outline" onClick={() => handleDownload("export", "csv")} disabled={downloading !== null}>
              {downloading === "export-csv" ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ArrowDownTrayIcon className="h-4 w-4" />}
              CSV
            </ActionButton>
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant/15 bg-surface p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold text-on-surface">
            <DocumentArrowDownIcon className="h-5 w-5 text-primary" />
            Import template
          </div>
          <div className="flex flex-wrap gap-3">
            <ActionButton tone="primary" onClick={() => handleDownload("template", "xlsx")} disabled={downloading !== null}>
              {downloading === "template-xlsx" ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ArrowDownTrayIcon className="h-4 w-4" />}
              Guided XLSX
            </ActionButton>
            <ActionButton variant="outline" onClick={() => handleDownload("template", "csv")} disabled={downloading !== null}>
              {downloading === "template-csv" ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ArrowDownTrayIcon className="h-4 w-4" />}
              Header CSV
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
