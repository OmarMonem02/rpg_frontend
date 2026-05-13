"use client";

import { ActionButton, StatusBadge } from "@/components/ops-ui";
import type { ImportExportEntity, ImportPreview, ImportResult } from "@/types/import-export";
import { useMemo, useRef, useState } from "react";
import { importFile, parseImportFile } from "@/lib/api/import-export";
import { getAuthToken } from "@/lib/auth-session";
import { ImportResultAlert } from "./ImportResultAlert";
import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_EXTS = [".xlsx", ".xls", ".csv"];

export function ImportPanel({ entity }: { entity: ImportExportEntity }) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [httpError, setHttpError] = useState<string | null>(null);
  const [issueFilter, setIssueFilter] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const issueRows = useMemo(() => {
    const rows = preview?.rows ?? [];
    const query = issueFilter.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      `${row.status} ${Object.values(row.data).join(" ")} ${row.issues.map((issue) => issue.message).join(" ")}`
        .toLowerCase()
        .includes(query),
    );
  }, [preview, issueFilter]);

  const validateFile = (selectedFile: File): boolean => {
    setFileError(null);
    setResult(null);
    setPreview(null);
    setHttpError(null);

    if (selectedFile.size > MAX_SIZE_BYTES) {
      setFileError(`File is too large. Max size is ${MAX_SIZE_MB} MB.`);
      return false;
    }

    const hasValidExt = ALLOWED_EXTS.some((ext) => selectedFile.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setFileError(`Invalid file type. Accepted formats: ${ALLOWED_EXTS.join(", ")}`);
      return false;
    }

    return true;
  };

  const selectFile = (selectedFile?: File) => {
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
    }
  };

  const resetFile = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setHttpError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getToken = () => {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required");
    return token;
  };

  const handlePreview = async () => {
    if (!file) return;
    setIsParsing(true);
    setHttpError(null);
    setResult(null);

    try {
      setPreview(await parseImportFile(entity.slug, file, getToken()));
    } catch (err) {
      setHttpError(err instanceof Error ? err.message : "Could not preview this file.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setIsImporting(true);
    setHttpError(null);

    try {
      setResult(await importFile(entity.slug, file, getToken()));
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setHttpError(err instanceof Error ? err.message : "Could not import this file.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-lowest p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <DocumentMagnifyingGlassIcon className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-semibold text-on-surface">Preview & Import</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Upload a template, review row issues, then confirm. Valid rows import even when other rows need cleanup.
          </p>
        </div>
        <StatusBadge tone="primary">{entity.columns.filter((column) => column.required).length} required</StatusBadge>
      </div>

      <div className="space-y-5">
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            selectFile(event.dataTransfer.files?.[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[1rem] border-2 border-dashed border-outline-variant/30 bg-surface p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          <ArrowUpTrayIcon className="mb-3 h-9 w-9 text-on-surface-variant transition-colors group-hover:text-primary" />
          <p className="font-semibold text-on-surface">Drop a file here or browse</p>
          <p className="mt-1 text-xs text-on-surface-variant">XLSX, XLS, or CSV up to {MAX_SIZE_MB} MB</p>
        </div>

        {fileError ? <div className="rounded-xl bg-error/10 p-3 text-sm text-error">{fileError}</div> : null}

        {file ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/15 bg-surface p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-on-surface">{file.name}</p>
              <p className="text-xs text-on-surface-variant">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              onClick={resetFile}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error"
              aria-label="Remove file"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <ActionButton tone="primary" disabled={!file || isParsing || isImporting} onClick={handlePreview}>
            {isParsing ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <DocumentMagnifyingGlassIcon className="h-4 w-4" />}
            Preview file
          </ActionButton>
          <ActionButton disabled={!preview || isParsing || isImporting} onClick={handleImport}>
            {isImporting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckCircleIcon className="h-4 w-4" />}
            Confirm import
          </ActionButton>
        </div>

        {preview ? (
          <div className="space-y-4 rounded-[1rem] border border-outline-variant/15 bg-surface p-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <PreviewStat label="Valid" value={preview.summary.valid_count} tone="success" />
              <PreviewStat label="Invalid" value={preview.summary.invalid_count} tone="danger" />
              <PreviewStat label="Duplicates" value={preview.summary.duplicate_count} tone="warning" />
              <PreviewStat label="Total Rows" value={preview.summary.total_rows} tone="default" />
            </div>

            <input
              value={issueFilter}
              onChange={(event) => setIssueFilter(event.target.value)}
              placeholder="Search preview rows or issues"
              className="form-input-base"
            />

            <div className="max-h-96 overflow-auto rounded-xl border border-outline-variant/15">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="sticky top-0 bg-surface-container-low text-on-surface">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Preview</th>
                    <th className="px-3 py-2">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {issueRows.slice(0, 80).map((row) => (
                    <tr key={row.row_number} className="align-top">
                      <td className="px-3 py-3 mono-data">{row.row_number}</td>
                      <td className="px-3 py-3">
                        <StatusBadge tone={row.severity === "error" ? "danger" : row.severity === "warning" ? "warning" : "success"}>
                          {row.status}
                        </StatusBadge>
                      </td>
                      <td className="px-3 py-3 text-on-surface-variant">
                        {entity.columns.slice(0, 4).map((column) => (
                          <span key={column.key} className="mr-3 inline-block">
                            <span className="font-semibold text-on-surface">{column.label}:</span>{" "}
                            {String(row.data[column.key] ?? "-")}
                          </span>
                        ))}
                      </td>
                      <td className="px-3 py-3">
                        {row.issues.length > 0 ? (
                          <ul className="space-y-1 text-on-surface-variant">
                            {row.issues.map((issue, index) => (
                              <li key={`${issue.code}-${index}`} className="flex gap-2">
                                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
                                <span>{issue.message}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-on-surface-variant">Ready to {row.action ?? "create"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <ImportResultAlert result={result} httpError={httpError} />
      </div>
    </div>
  );
}

function PreviewStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "border-outline-variant/15 bg-surface-container-low text-on-surface",
    success: "border-green-500/20 bg-green-500/10 text-green-700",
    warning: "border-yellow-500/20 bg-yellow-500/10 text-yellow-700",
    danger: "border-error/20 bg-error/10 text-error",
  }[tone];

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="label-caps opacity-80">{label}</p>
      <p className="mono-data mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
