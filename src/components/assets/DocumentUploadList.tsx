"use client";

import { useRef, useState } from "react";
import { ActionButton, StatusBadge } from "@/components/ops-ui";
import {
  uploadDocument,
  UploadDocumentError,
} from "@/lib/uploadDocument";
import type { MachineDocumentRecord, MachineDocumentType } from "@/lib/api/machines";
import { getDocumentViewUrl } from "@/lib/document-url";

type DocumentEntry = MachineDocumentRecord & {
  localKey: string;
};

export function DocumentUploadList({
  type,
  label,
  documents,
  onChange,
  disabled = false,
  onError,
}: {
  type: MachineDocumentType;
  label: string;
  documents: MachineDocumentRecord[];
  onChange: (
    next: MachineDocumentRecord[],
    removedId?: number,
  ) => void;
  disabled?: boolean;
  onError?: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const entries: DocumentEntry[] = documents.map((document, index) => ({
    ...document,
    localKey: document.id
      ? `existing-${document.id}`
      : `pending-${document.public_id}-${index}`,
  }));

  const handleRemove = (entry: DocumentEntry) => {
    const nextDocuments = documents.filter((document) => {
      if (entry.id) return document.id !== entry.id;
      return !(
        document.public_id === entry.public_id &&
        document.filename === entry.filename
      );
    });

    onChange(nextDocuments, entry.id);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setUploading(true);
      const uploaded = await uploadDocument(file, "rpg-system/assets");
      const nextDocument: MachineDocumentRecord = {
        type,
        url: uploaded.url,
        public_id: uploaded.public_id,
        filename: uploaded.filename,
        mime_type: uploaded.mime_type,
      };
      onChange([...documents, nextDocument]);
    } catch (err) {
      onError?.(
        err instanceof UploadDocumentError || err instanceof Error
          ? err.message
          : "Failed to upload document.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-on-surface">{label}</p>
        <ActionButton
          type="button"
          variant="outline"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading..." : "Add file"}
        </ActionButton>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />

      {entries.length === 0 ? (
        <p className="text-sm text-on-surface-variant">
          No {type === "invoice" ? "invoices" : "contracts"} uploaded yet.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.localKey}
              className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="default">{type}</StatusBadge>
                  <a
                    href={getDocumentViewUrl(entry.url, entry.mime_type)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm font-medium text-primary hover:underline"
                  >
                    {entry.filename}
                  </a>
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {entry.mime_type}
                </p>
              </div>
              {!disabled ? (
                <ActionButton
                  type="button"
                  variant="outline"
                  onClick={() => handleRemove(entry)}
                >
                  Remove
                </ActionButton>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
