"use client";

import {
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { InvoiceTemplate } from "@/components/invoice-template";
import { ActionButton } from "@/components/ops-ui";
import type { InvoiceGalleryItem } from "@/lib/invoice-gallery";
import { exportHtmlElementToPdf, printInvoiceElement } from "@/lib/pdf-export";

function getDocumentBody(): HTMLElement | null {
  return typeof document !== "undefined" ? document.body : null;
}

type InvoiceGalleryViewerProps = {
  items: InvoiceGalleryItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
};

export function InvoiceGalleryViewer({
  items,
  initialIndex,
  isOpen,
  onClose,
}: InvoiceGalleryViewerProps) {
  const titleId = useId();
  const exportRootId = useId().replace(/:/g, "");
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isExporting, setIsExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const portalTarget = useSyncExternalStore(
    () => () => {},
    getDocumentBody,
    () => null,
  );

  useEffect(() => {
    if (!isOpen) return;
    const bounded =
      items.length === 0
        ? 0
        : Math.min(Math.max(initialIndex, 0), items.length - 1);
    setCurrentIndex(bounded);
    setActionError(null);
  }, [isOpen, initialIndex, items.length]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || items.length === 0) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setCurrentIndex((prev) => (prev + 1) % items.length);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, items.length, onClose]);

  if (!isOpen || portalTarget === null || items.length === 0) {
    return null;
  }

  const safeIndex = Math.min(Math.max(currentIndex, 0), items.length - 1);
  const currentItem = items[safeIndex];
  const exportElementId = `invoice-export-root-${exportRootId}`;

  const handlePrint = () => {
    const element = document.getElementById(exportElementId);
    if (!element) {
      setActionError("Invoice preview is not ready. Please try again.");
      return;
    }

    try {
      printInvoiceElement(element, currentItem.invoiceNumber);
      setActionError(null);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Failed to print invoice.",
      );
    }
  };

  const handleExportPdf = async () => {
    const element = document.getElementById(exportElementId);
    if (!element) {
      setActionError("Invoice preview is not ready. Please try again.");
      return;
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const filename =
      currentItem.source === "ticket"
        ? `Invoice-Ticket-${currentItem.id}-${stamp}.pdf`
        : `Invoice-${currentItem.id}-${stamp}.pdf`;

    try {
      setIsExporting(true);
      setActionError(null);
      await exportHtmlElementToPdf(element, filename);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Failed to export PDF.",
      );
    } finally {
      setIsExporting(false);
    }
  };

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
        className="mx-auto flex h-full w-full max-w-6xl flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <p id={titleId} className="sr-only">
          Invoice gallery viewer
        </p>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant/15 bg-surface/95 px-4 py-3 shadow-lg">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-on-surface">
              {currentItem.invoiceNumber}
            </p>
            <p className="text-xs text-on-surface-variant">
              {safeIndex + 1} of {items.length} · {currentItem.customerName}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              href={currentItem.detailHref}
              tone="default"
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
              Open
            </ActionButton>
            <ActionButton
              type="button"
              tone="default"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handlePrint}
            >
              <PrinterIcon className="h-4 w-4" aria-hidden="true" />
              Print
            </ActionButton>
            <ActionButton
              type="button"
              tone="primary"
              size="sm"
              className="gap-1.5"
              disabled={isExporting}
              onClick={() => void handleExportPdf()}
            >
              <DocumentArrowDownIcon className="h-4 w-4" aria-hidden="true" />
              {isExporting ? "Exporting…" : "PDF"}
            </ActionButton>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              aria-label="Close invoice viewer"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {actionError ? (
          <p className="mb-3 rounded-xl border border-error/20 bg-error/10 px-4 py-2 text-sm text-error">
            {actionError}
          </p>
        ) : null}

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-outline-variant/15 bg-surface shadow-2xl">
          <div className="h-full overflow-y-auto bg-surface-container-low p-4 sm:p-6">
            <div className="mx-auto max-w-[210mm]">
              <div id={exportElementId} className="min-w-0 a4-sheet-preview">
                <InvoiceTemplate
                  sale={currentItem.sale}
                  documentTitle={currentItem.documentTitle}
                  referenceLabel={currentItem.referenceLabel}
                />
              </div>
            </div>
          </div>

          {items.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-surface/95 p-2.5 text-on-surface shadow-lg transition-colors hover:bg-surface"
                aria-label="Previous invoice"
              >
                <ChevronLeftIcon className="h-6 w-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((prev) => (prev + 1) % items.length)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-surface/95 p-2.5 text-on-surface shadow-lg transition-colors hover:bg-surface"
                aria-label="Next invoice"
              >
                <ChevronRightIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>

        {items.length > 1 ? (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {items.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === safeIndex
                    ? "w-5 bg-primary"
                    : "w-2 bg-on-surface-variant/30 hover:bg-on-surface-variant/50"
                }`}
                aria-label={`Go to invoice ${index + 1}`}
                aria-current={index === safeIndex ? "true" : undefined}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>,
    portalTarget,
  );
}
