"use client";

import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { StatusBadge } from "@/components/ops-ui";
import { formatEgp } from "@/lib/currencies";
import {
  formatGalleryDate,
  type InvoiceGalleryItem,
} from "@/lib/invoice-gallery";

type InvoiceGalleryCardProps = {
  item: InvoiceGalleryItem;
  onOpen: () => void;
};

export function InvoiceGalleryCard({ item, onOpen }: InvoiceGalleryCardProps) {
  const lineCount = item.sale.line_items?.length ?? 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      onDoubleClick={onOpen}
      className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-outline-variant/15 bg-surface text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="flex items-start justify-between gap-3 border-b border-outline-variant/10 bg-surface-container-low px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-on-surface">
            {item.invoiceNumber}
          </p>
          <p className="truncate text-xs text-on-surface-variant">
            {item.customerName}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            item.source === "sale"
              ? "bg-primary/10 text-primary"
              : "bg-tertiary/10 text-tertiary"
          }`}
        >
          {item.source === "sale" ? "Sale" : "Ticket"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        <div className="flex min-h-[7rem] flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-lowest px-3 py-5 text-center">
          <DocumentTextIcon
            className="mb-2 h-8 w-8 text-on-surface-variant/70 transition-colors group-hover:text-primary"
            aria-hidden="true"
          />
          <p className="text-xs text-on-surface-variant">
            {lineCount > 0
              ? `${lineCount} line item${lineCount === 1 ? "" : "s"}`
              : "No line items"}
          </p>
        </div>

        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-on-surface-variant">
              {formatGalleryDate(item.date)}
            </span>
            <StatusBadge tone="default">{item.status}</StatusBadge>
          </div>
          <p className="text-base font-semibold text-on-surface">
            {formatEgp(item.total)}
          </p>
        </div>
      </div>
    </button>
  );
}
