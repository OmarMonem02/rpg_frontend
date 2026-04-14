"use client";

import { ActionButton } from "@/components/ops-ui";
import type { ImportExportEntity, ImportResult } from "@/types/import-export";
import { useState, useRef } from "react";
import { importFile } from "@/lib/api/import-export";
import { getAuthToken } from "@/lib/auth-session";
import { ImportResultAlert } from "./ImportResultAlert";

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_EXTS = ['.xlsx', '.xls', '.csv'];

export function ImportPanel({ entity }: { entity: ImportExportEntity }) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  const [result, setResult] = useState<ImportResult | null>(null);
  const [httpError, setHttpError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (f: File): boolean => {
    setFileError(null);
    setResult(null);
    setHttpError(null);

    if (f.size > MAX_SIZE_BYTES) {
        setFileError(`File is too large. Max size is ${MAX_SIZE_MB} MB.`);
        return false;
    }

    const nameStr = f.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTS.some(ext => nameStr.endsWith(ext));
    
    if (!hasValidExt) {
        setFileError(`Invalid file type. Accepted formats: ${ALLOWED_EXTS.join(', ')}`);
        return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
        if (validateFile(selected)) setFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) {
          if (validateFile(dropped)) setFile(dropped);
      }
  };

  const handleUpload = async () => {
      if (!file) return;

      setIsImporting(true);
      setResult(null);
      setHttpError(null);

      try {
          const token = getAuthToken();
          if (!token) throw new Error("Authentication required");

          const res = await importFile(entity.slug, file, token);
          setResult(res);
          setFile(null); // Clear selected file on success
          if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
          setHttpError(err instanceof Error ? err.message : "Could not reach the server. Please try again.");
      } finally {
          setIsImporting(false);
      }
  };

  return (
    <div className="rounded-[1.5rem] border border-outline-variant/15 bg-surface p-5 md:p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">📤</span>
        <h3 className="text-xl font-semibold text-on-surface">Import Data</h3>
      </div>

      <div className="space-y-5">
        <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-outline-variant/30 rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5 group"
        >
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
            />
            <div className="text-on-surface-variant group-hover:text-primary transition-colors">
                 <p className="font-semibold mb-1">Drag & drop or click to browse</p>
                 <p className="text-xs opacity-70">Accepts: .xlsx .xls .csv | Max size: 10 MB</p>
            </div>
        </div>

        {fileError && <div className="text-sm text-error bg-error/10 p-3 rounded-xl">{fileError}</div>}

        {file && (
            <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant/15">
                <span className="text-sm font-medium text-on-surface truncate pr-4">📄 {file.name}</span>
                <button 
                  onClick={() => { setFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="text-xs text-on-surface-variant hover:text-error transition-colors whitespace-nowrap"
                >
                  Remove
                </button>
            </div>
        )}

        <ActionButton 
            tone="primary" 
            className="w-full"
            disabled={!file || isImporting}
            onClick={handleUpload}
        >
            {isImporting ? "Importing..." : "Upload & Import"}
        </ActionButton>

        <ImportResultAlert result={result} httpError={httpError} />
      </div>
    </div>
  );
}
