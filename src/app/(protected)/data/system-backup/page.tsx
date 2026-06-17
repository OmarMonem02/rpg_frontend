"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ActionButton,
  InlineMessage,
  PageHero,
  PageShell,
  StatusBadge,
  SurfaceCard,
} from "@/components/ops-ui";
import {
  downloadSystemBackup,
  importSystemBackup,
  previewSystemBackup,
} from "@/lib/api/backup";
import { getApiErrorDetails } from "@/lib/api/core";
import { getAuthToken, getAuthUser } from "@/lib/auth-session";
import type { BackupPreview, BackupRestoreMode } from "@/types/backup";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const MAX_SIZE_MB = 512;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_EXTS = [".sql", ".sql.gz", ".gz"];

const RESTORE_MODES: Array<{
  value: BackupRestoreMode;
  label: string;
  description: string;
  tone: "success" | "warning" | "danger";
}> = [
  {
    value: "merge",
    label: "Merge",
    description: "Insert missing records and skip duplicates. Existing data is kept.",
    tone: "success",
  },
  {
    value: "upsert",
    label: "Upsert",
    description: "Insert new records and update existing ones when keys match.",
    tone: "warning",
  },
  {
    value: "replace",
    label: "Replace",
    description: "Wipe application data, then restore from backup. Destructive.",
    tone: "danger",
  },
];

export default function SystemBackupPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [mode, setMode] = useState<BackupRestoreMode>("merge");
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [httpError, setHttpError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [replaceConfirmation, setReplaceConfirmation] = useState("");

  useEffect(() => {
    if (getAuthUser()?.role !== "admin") {
      router.replace("/");
    }
  }, [router]);

  const validateFile = (selectedFile: File): boolean => {
    setFileError(null);
    setPreview(null);
    setHttpError(null);
    setSuccessMessage(null);

    if (selectedFile.size > MAX_SIZE_BYTES) {
      setFileError(`File is too large. Max size is ${MAX_SIZE_MB} MB.`);
      return false;
    }

    const lowerName = selectedFile.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTS.some((ext) => lowerName.endsWith(ext));

    if (!hasValidExt) {
      setFileError(`Invalid file type. Accepted formats: ${ALLOWED_EXTS.join(", ")}`);
      return false;
    }

    return true;
  };

  const selectFile = (selectedFile?: File) => {
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
      setPreview(null);
    }
  };

  const handleExport = async () => {
    const token = getAuthToken();
    if (!token) return;

    setIsExporting(true);
    setHttpError(null);

    try {
      await downloadSystemBackup(token);
    } catch (error) {
      setHttpError(getApiErrorDetails(error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    const token = getAuthToken();
    if (!token) return;

    setIsPreviewing(true);
    setHttpError(null);
    setSuccessMessage(null);

    try {
      const result = await previewSystemBackup(file, token);
      setPreview(result);
    } catch (error) {
      setHttpError(getApiErrorDetails(error).message);
      setPreview(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  const runImport = async (confirmation?: string) => {
    if (!file || !preview?.compatible) return;

    const token = getAuthToken();
    if (!token) return;

    setIsImporting(true);
    setHttpError(null);
    setSuccessMessage(null);

    try {
      const result = await importSystemBackup(file, mode, token, confirmation);
      setSuccessMessage(result.message);
      setShowReplaceConfirm(false);
      setReplaceConfirmation("");
    } catch (error) {
      setHttpError(getApiErrorDetails(error).message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleRestore = () => {
    if (mode === "replace") {
      setShowReplaceConfirm(true);
      return;
    }

    void runImport();
  };

  const confirmReplace = () => {
    if (replaceConfirmation.trim().toUpperCase() !== "REPLACE") {
      setHttpError('Type REPLACE to confirm destructive restore.');
      return;
    }

    void runImport("REPLACE");
  };

  return (
    <PageShell>
      <div className="mb-2 text-sm text-on-surface-variant flex items-center gap-2">
        <Link href="#" className="hover:text-primary transition-colors">
          Data
        </Link>
        <span>/</span>
        <span className="font-medium text-on-surface">System Backup</span>
      </div>

      <PageHero
        title="System Backup & Restore"
        subtitle="Download a full database snapshot or restore from a previous backup. Sessions, cache, and queue tables are excluded."
      />

      {httpError ? <InlineMessage tone="danger">{httpError}</InlineMessage> : null}
      {successMessage ? <InlineMessage tone="success">{successMessage}</InlineMessage> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <SurfaceCard>
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-on-surface">Export backup</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Creates a gzip-compressed SQL dump of all application data.
              </p>
            </div>

            <ActionButton
              tone="primary"
              onClick={() => void handleExport()}
              disabled={isExporting}
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {isExporting ? "Preparing backup..." : "Download System Backup"}
            </ActionButton>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-on-surface">Restore backup</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Upload a `.sql` or `.sql.gz` backup file, preview it, then restore.
              </p>
            </div>

            <div
              className="rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-low p-6 text-center"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                selectFile(event.dataTransfer.files[0]);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".sql,.sql.gz,.gz"
                className="hidden"
                onChange={(event) => selectFile(event.target.files?.[0])}
              />

              {file ? (
                <div className="space-y-2">
                  <p className="font-medium text-on-surface">{file.name}</p>
                  <p className="text-sm text-on-surface-variant">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <ActionButton tone="default" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                    Choose a different file
                  </ActionButton>
                </div>
              ) : (
                <div className="space-y-3">
                  <ArrowUpTrayIcon className="mx-auto h-8 w-8 text-on-surface-variant" />
                  <p className="text-sm text-on-surface-variant">
                    Drag and drop a backup file here, or browse to upload.
                  </p>
                  <ActionButton tone="default" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    Browse files
                  </ActionButton>
                </div>
              )}
            </div>

            {fileError ? <InlineMessage tone="danger">{fileError}</InlineMessage> : null}

            <div className="space-y-3">
              <p className="text-sm font-medium text-on-surface">Restore mode</p>
              <div className="space-y-2">
                {RESTORE_MODES.map((option) => (
                  <label
                    key={option.value}
                    className={[
                      "flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors",
                      mode === option.value
                        ? "border-primary bg-primary/5"
                        : "border-outline-variant/20 hover:bg-surface-container-low",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="restore-mode"
                      value={option.value}
                      checked={mode === option.value}
                      onChange={() => {
                        setMode(option.value);
                        setPreview(null);
                      }}
                      className="mt-1"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-on-surface">{option.label}</span>
                        <StatusBadge tone={option.tone}>{option.tone}</StatusBadge>
                      </div>
                      <p className="text-sm text-on-surface-variant">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <ActionButton
                tone="default"
                variant="outline"
                onClick={() => void handlePreview()}
                disabled={!file || isPreviewing}
              >
                <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                {isPreviewing ? "Previewing..." : "Preview backup"}
              </ActionButton>

              <ActionButton
                tone={mode === "replace" ? "danger" : "primary"}
                onClick={handleRestore}
                disabled={!file || !preview?.compatible || isImporting}
              >
                {isImporting ? "Restoring..." : "Restore backup"}
              </ActionButton>
            </div>

            {preview ? (
              <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-on-surface">Preview</span>
                  <StatusBadge tone={preview.compatible ? "success" : "danger"}>
                    {preview.compatible ? "compatible" : "incompatible"}
                  </StatusBadge>
                </div>

                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-on-surface-variant">Created</dt>
                    <dd className="text-on-surface">{preview.manifest.created_at ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-on-surface-variant">Driver</dt>
                    <dd className="text-on-surface">{preview.manifest.driver ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-on-surface-variant">Tables</dt>
                    <dd className="text-on-surface">{preview.tables.length}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-on-surface-variant">Insert statements</dt>
                    <dd className="text-on-surface">{preview.insert_statements}</dd>
                  </div>
                </dl>

                {preview.warnings.length > 0 ? (
                  <InlineMessage tone="warning">
                    <div className="space-y-1">
                      {preview.warnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                      ))}
                    </div>
                  </InlineMessage>
                ) : null}
              </div>
            ) : null}
          </div>
        </SurfaceCard>
      </div>

      {showReplaceConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-4">
          <SurfaceCard className="w-full max-w-md space-y-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-danger shrink-0" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-on-surface">Confirm replace restore</h3>
                <p className="text-sm text-on-surface-variant">
                  This will wipe application data before restoring the backup. Type{" "}
                  <strong>REPLACE</strong> to continue.
                </p>
              </div>
            </div>

            <input
              type="text"
              value={replaceConfirmation}
              onChange={(event) => setReplaceConfirmation(event.target.value)}
              placeholder="Type REPLACE"
              className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-on-surface"
            />

            <div className="flex justify-end gap-3">
              <ActionButton
                tone="default"
                variant="ghost"
                onClick={() => {
                  setShowReplaceConfirm(false);
                  setReplaceConfirmation("");
                }}
              >
                Cancel
              </ActionButton>
              <ActionButton
                tone="danger"
                onClick={confirmReplace}
                disabled={isImporting}
              >
                {isImporting ? "Restoring..." : "Restore and replace"}
              </ActionButton>
            </div>
          </SurfaceCard>
        </div>
      ) : null}
    </PageShell>
  );
}
