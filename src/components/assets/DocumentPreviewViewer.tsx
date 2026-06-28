"use client";

import {
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useId, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ActionButton } from "@/components/ops-ui";
import type { MachineDocumentRecord } from "@/lib/api/machines";
import {
  canPreviewPdfInline,
  getDocumentPreviewUrl,
  getDocumentViewUrl,
  isImageDocument,
  isPdfDocument,
} from "@/lib/document-url";

function getDocumentBody(): HTMLElement | null {
  return typeof document !== "undefined" ? document.body : null;
}

function previewLabel(type: MachineDocumentRecord["type"]): string {
  if (type === "invoice") return "Preview Document";
  if (type === "contract") return "Preview Document";
  return "Preview Document";
}

type DocumentPreviewViewerProps = {
  document: MachineDocumentRecord | null;
  isOpen: boolean;
  onClose: () => void;
};

export function DocumentPreviewViewer({
  document: doc,
  isOpen,
  onClose,
}: DocumentPreviewViewerProps) {
  const titleId = useId();

  const portalTarget = useSyncExternalStore(
    () => () => {},
    getDocumentBody,
    () => null,
  );

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = globalThis.document.body.style.overflow;
    globalThis.document.body.style.overflow = "hidden";
    return () => {
      globalThis.document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || portalTarget === null || !doc) {
    return null;
  }

  const previewUrl = getDocumentPreviewUrl(doc.url, doc.mime_type);
  const openUrl = getDocumentViewUrl(doc.url, doc.mime_type);
  const showPdf = canPreviewPdfInline(doc.url, doc.mime_type);
  const showImage = isImageDocument(doc.mime_type);
  const isLegacyRawPdf =
    isPdfDocument(doc.mime_type, doc.url) && !showPdf;

  return createPortal(
    <div
      className="form-modal-overlay fixed inset-0 z-[120] flex flex-col bg-black/80 p-3 backdrop-blur-sm sm:p-4"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="mx-auto flex h-full w-full max-w-5xl flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant/15 bg-surface/95 px-4 py-3 shadow-lg">
          <div className="min-w-0">
            <p id={titleId} className="truncate text-sm font-semibold text-on-surface">
              {previewLabel(doc.type)}
            </p>
            <p className="truncate text-xs text-on-surface-variant">
              {doc.filename}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isLegacyRawPdf ? (
              <ActionButton
                href={openUrl}
                tone="default"
                variant="outline"
                size="sm"
                className="gap-1.5"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                Open
              </ActionButton>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              aria-label="Close document preview"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-outline-variant/15 bg-surface shadow-2xl">
          <div className="h-full overflow-y-auto bg-surface-container-low p-4 sm:p-6">
            {isLegacyRawPdf ? (
              <p className="rounded-xl border border-outline-variant/10 bg-surface px-4 py-6 text-sm text-on-surface-variant">
                This PDF was uploaded in an older format and cannot be previewed.
                Remove it and upload again to view it here.
              </p>
            ) : showPdf ? (
              <iframe
                title={doc.filename}
                src={previewUrl}
                className="mx-auto h-[min(80dvh,900px)] w-full max-w-4xl rounded-xl border border-outline-variant/10 bg-white"
              />
            ) : showImage ? (
              <div className="mx-auto flex max-w-4xl justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={doc.filename}
                  className="max-h-[80dvh] w-full rounded-xl border border-outline-variant/10 object-contain"
                />
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">
                Preview is not available for this file type.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}

function previewButtonLabel(type: MachineDocumentRecord["type"]): string {
  if (type === "invoice") return "Preview Document";
  if (type === "contract") return "Preview Document";
  return "Preview";
}

export { previewButtonLabel };
