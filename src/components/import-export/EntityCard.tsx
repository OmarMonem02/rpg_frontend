"use client";

import Link from "next/link";
import { ActionButton } from "@/components/ops-ui";
import type { ImportExportEntity } from "@/types/import-export";
import { useState } from "react";
import { downloadFile } from "@/lib/api/import-export";
import { getAuthToken } from "@/lib/auth-session";

export function EntityCard({ entity }: { entity: ImportExportEntity }) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (action: 'export' | 'template', format: 'xlsx' | 'csv') => {
    try {
      const type = `${action}-${format}`;
      setDownloading(type);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const endpoint = action === 'export' ? entity.endpoints.export : entity.endpoints.template;
      // Replace {entity} with slug in endpoint if it exists, otherwise assuming it's already formatting correctly
      // But based on prompt, endpoint comes pre-formatted or I should use slug
      const url = `${endpoint}?format=${format}`;
      const filename = `${entity.slug}_${action}.${format}`;

      await downloadFile(url, token, filename);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest p-5 flex flex-col h-full shadow-sm hover:border-outline-variant/30 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low border border-outline-variant/20 text-xl text-primary">
            🗂️
        </div>
        <h3 className="font-semibold text-lg text-on-surface">{entity.label}</h3>
      </div>
      
      <div className="mt-auto flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
            <button 
                onClick={() => handleDownload('export', 'xlsx')}
                disabled={downloading !== null}
                className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold border border-outline-variant/20 bg-surface text-on-surface hover:bg-surface-container disabled:opacity-50"
            >
                {downloading === 'export-xlsx' ? '...' : '⬇ Export XLSX'}
            </button>
            <button 
                onClick={() => handleDownload('template', 'xlsx')}
                disabled={downloading !== null}
                className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold border border-outline-variant/20 bg-surface text-on-surface hover:bg-surface-container disabled:opacity-50"
            >
                {downloading === 'template-xlsx' ? '...' : '⬇ Template'}
            </button>
        </div>
        <Link 
            href={`/data/import-export/${entity.slug}`}
            className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-primary text-on-primary hover:opacity-90 w-full"
        >
            Manage
        </Link>
      </div>
    </div>
  );
}
