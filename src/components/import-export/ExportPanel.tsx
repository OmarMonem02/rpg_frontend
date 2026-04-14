"use client";

import { ActionButton } from "@/components/ops-ui";
import type { ImportExportEntity } from "@/types/import-export";
import { useState } from "react";
import { downloadFile } from "@/lib/api/import-export";
import { getAuthToken } from "@/lib/auth-session";

export function ExportPanel({ entity }: { entity: ImportExportEntity }) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (action: 'export' | 'template', format: 'xlsx' | 'csv') => {
    try {
      const type = `${action}-${format}`;
      setDownloading(type);
      setError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const endpoint = action === 'export' ? entity.endpoints.export : entity.endpoints.template;
      // Depending on API design, it might have {entity} inside or it is full. Assuming it is correctly provided.
      const url = `${endpoint}?format=${format}`;
      const filename = `${entity.slug}_${action}.${format}`;

      await downloadFile(url, token, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
      // Could use a toast here if there's a toast system, using inline error for now
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="rounded-[1.5rem] border border-outline-variant/15 bg-surface p-5 md:p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">📥</span>
        <h3 className="text-xl font-semibold text-on-surface">Export Data</h3>
      </div>
      
      {error && <div className="mb-4 text-sm text-error bg-error/10 p-3 rounded-xl">{error}</div>}

      <div className="space-y-6">
        <div>
          <p className="text-sm text-on-surface-variant mb-3">Download all current records.</p>
          <div className="flex flex-wrap gap-3">
             <ActionButton 
                onClick={() => handleDownload('export', 'xlsx')}
                disabled={downloading !== null}
             >
                {downloading === 'export-xlsx' ? <span className="animate-pulse">Loading...</span> : '⬇ Export as XLSX'}
             </ActionButton>
             <ActionButton 
                onClick={() => handleDownload('export', 'csv')}
                disabled={downloading !== null}
             >
                {downloading === 'export-csv' ? <span className="animate-pulse">Loading...</span> : '⬇ Export as CSV'}
             </ActionButton>
          </div>
        </div>

        <div className="border-t border-outline-variant/15 pt-5">
           <h4 className="font-semibold text-on-surface mb-2">Template</h4>
           <p className="text-sm text-on-surface-variant mb-3">Download an empty template to fill and re-upload.</p>
           <div className="flex flex-wrap gap-3">
             <ActionButton 
                onClick={() => handleDownload('template', 'xlsx')}
                disabled={downloading !== null}
             >
                {downloading === 'template-xlsx' ? <span className="animate-pulse">Loading...</span> : '⬇ Template XLSX'}
             </ActionButton>
             <ActionButton 
                onClick={() => handleDownload('template', 'csv')}
                disabled={downloading !== null}
             >
                {downloading === 'template-csv' ? <span className="animate-pulse">Loading...</span> : '⬇ Template CSV'}
             </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
