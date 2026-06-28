"use client";

import { useState } from "react";
import type { MachineDocumentRecord } from "@/lib/api/machines";
import {
  canPreviewPdfInline,
  isPdfDocument,
} from "@/lib/document-url";
import { ActionButton, StatusBadge } from "@/components/ops-ui";
import {
  DocumentPreviewViewer,
  previewButtonLabel,
} from "@/components/assets/DocumentPreviewViewer";

export function AssetDocumentList({
  documents,
  compact = false,
}: {
  documents: MachineDocumentRecord[];
  compact?: boolean;
}) {
  const [previewDocument, setPreviewDocument] =
    useState<MachineDocumentRecord | null>(null);

  if (documents.length === 0) {
    return (
      <p className="text-sm text-on-surface-variant">No documents attached.</p>
    );
  }

  return (
    <>
      <div className={compact ? "space-y-2" : "space-y-3"}>
        {documents.map((document) => {
          const showPdfPreview = canPreviewPdfInline(
            document.url,
            document.mime_type,
          );
          const isLegacyRawPdf =
            isPdfDocument(document.mime_type, document.url) && !showPdfPreview;

          return (
            <div
              key={document.id ?? `${document.public_id}-${document.filename}`}
              className="rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone="default">{document.type}</StatusBadge>
                    <span className="truncate text-sm font-medium text-on-surface">
                      {document.filename}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {document.mime_type}
                  </p>
                </div>
                {isLegacyRawPdf ? (
                  <ActionButton variant="outline" disabled>
                    Preview unavailable
                  </ActionButton>
                ) : (
                  <ActionButton
                    variant="outline"
                    onClick={() => setPreviewDocument(document)}
                  >
                    {previewButtonLabel(document.type)}
                  </ActionButton>
                )}
              </div>

              {!compact && isLegacyRawPdf ? (
                <p className="mt-3 rounded-xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                  This PDF was uploaded in an older format and cannot be previewed.
                  Remove it and upload again to view it here.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <DocumentPreviewViewer
        document={previewDocument}
        isOpen={previewDocument !== null}
        onClose={() => setPreviewDocument(null)}
      />
    </>
  );
}
