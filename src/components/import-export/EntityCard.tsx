"use client";

import Link from "next/link";
import { ActionButton, StatusBadge } from "@/components/ops-ui";
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
    <div className="group relative flex h-full flex-col overflow-hidden rounded-[2.5rem] border border-outline-variant/15 bg-surface-container-lowest p-7 transition-all duration-500 hover:border-primary/40 hover:shadow-[0_20px_50px_-12px_rgba(0,83,220,0.12)] hover:-translate-y-2">
      {/* Dynamic Background Glow */}
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl transition-all duration-700 group-hover:bg-primary/10 group-hover:scale-110" />
      
      <div className="relative mb-6 flex items-start justify-between">
        <div className="flex items-center gap-5">
          <div className="glass flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-outline-variant/20 text-3xl text-primary shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:bg-primary/10 group-hover:border-primary/30 group-hover:shadow-primary/10">
            {entity.slug.includes('product') ? '📦' : 
             entity.slug.includes('bike') ? '🚲' : 
             entity.slug.includes('part') ? '⚙️' : 
             entity.slug.includes('brand') ? '🏷️' : 
             entity.slug.includes('category') ? '📂' : '🗂️'}
          </div>
          <div>
            <h3 className="font-display text-2xl font-extrabold tracking-tight text-on-surface">
              {entity.label}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">
                {entity.slug}
              </p>
            </div>
          </div>
        </div>
        
        {entity.columns && (
          <div className="shrink-0 scale-110 translate-x-1">
            <StatusBadge tone="primary">
              {entity.columns.length} Fields
            </StatusBadge>
          </div>
        )}
      </div>

      <div className="relative mb-6 flex-grow">
        <p className="text-[15px] leading-relaxed text-on-surface-variant/90">
          Manage bulk data for <span className="font-bold text-on-surface underline decoration-primary/20 decoration-2 underline-offset-4">{entity.label}</span> module.
        </p>
        
        {/* Useful Field Preview Section */}
        {entity.columns.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">Field Preview</p>
            <div className="flex flex-wrap gap-1.5">
              {entity.columns.slice(0, 4).map((col) => (
                <span key={col} className="rounded-lg border border-outline-variant/10 bg-surface-container-low px-2 py-0.5 text-[10px] font-medium text-on-surface-variant transition-colors group-hover:bg-surface-container group-hover:text-primary/70">
                  {col}
                </span>
              ))}
              {entity.columns.length > 4 && (
                <span className="px-1 text-[10px] font-bold text-on-surface-variant/40">+{entity.columns.length - 4} more</span>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="relative mt-auto space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => handleDownload('export', 'xlsx')}
            disabled={downloading !== null}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-outline-variant/15 bg-surface-container-lowest px-4 py-3 text-xs font-bold text-on-surface transition-all duration-300 hover:bg-primary/5 hover:border-primary/20 hover:text-primary disabled:opacity-50"
          >
            {downloading === 'export-xlsx' ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : '⬇'} Export
          </button>
          <button 
            onClick={() => handleDownload('template', 'xlsx')}
            disabled={downloading !== null}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-outline-variant/15 bg-surface-container-lowest px-4 py-3 text-xs font-bold text-on-surface transition-all duration-300 hover:bg-primary/5 hover:border-primary/20 hover:text-primary disabled:opacity-50"
          >
            {downloading === 'template-xlsx' ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : '📋'} Template
          </button>
        </div>
        
        <Link 
          href={`/data/import-export/${entity.slug}`}
          className="group/btn relative flex items-center justify-center overflow-hidden rounded-2xl bg-primary px-4 py-4 text-sm font-bold text-on-primary shadow-xl shadow-primary/20 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover/btn:opacity-100" />
          <span className="relative z-10 flex items-center gap-2">
            Control Dataset <span className="transition-transform duration-300 group-hover/btn:translate-x-1">→</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
