import type { SaleRecord } from "@/lib/crud-api";
import type { ExchangeRates } from "@/lib/currencies";
import { buildInvoiceFromTicket } from "@/lib/build-invoice-from-ticket";
import { resolveDisplayTotal } from "@/lib/sale-line-pricing";
import type { Ticket } from "@/lib/tickets-api";

export type InvoiceGallerySource = "all" | "sales" | "tickets";

export type InvoiceGallerySort = "newest" | "oldest";

export type InvoiceGalleryFilters = {
  source: InvoiceGallerySource;
  date_from?: string;
  date_to?: string;
  search?: string;
  sort: InvoiceGallerySort;
  customer_id?: number;
};

export type InvoiceGalleryItem = {
  key: string;
  source: "sale" | "ticket";
  id: number;
  invoiceNumber: string;
  date: string;
  customerName: string;
  total: number;
  status: string;
  sale: SaleRecord;
  detailHref: string;
  documentTitle?: string;
  referenceLabel?: string;
};

function padId(id: number): string {
  return String(id).padStart(6, "0");
}

export function saleToGalleryItem(sale: SaleRecord): InvoiceGalleryItem {
  return {
    key: `sale-${sale.id}`,
    source: "sale",
    id: sale.id,
    invoiceNumber: `INV-${padId(sale.id)}`,
    date: sale.created_at ?? "",
    customerName: sale.customer?.name?.trim() || "Walk-in customer",
    total: resolveDisplayTotal(sale),
    status: sale.status,
    sale,
    detailHref: `/inventory/sales/${sale.id}`,
  };
}

export function ticketToGalleryItem(
  ticket: Ticket,
  rates: ExchangeRates,
): InvoiceGalleryItem {
  const sale = buildInvoiceFromTicket(ticket, rates);

  return {
    key: `ticket-${ticket.id}`,
    source: "ticket",
    id: ticket.id,
    invoiceNumber: `Ticket #${padId(ticket.id)}`,
    date: ticket.created_at,
    customerName: ticket.customer?.name?.trim() || "Unknown customer",
    total: sale.total,
    status: ticket.status,
    sale,
    detailHref: `/tickets/${ticket.id}`,
    documentTitle: "Maintenance Invoice",
    referenceLabel: "Ticket #",
  };
}

export function mergeGalleryItems(
  items: InvoiceGalleryItem[],
  sort: InvoiceGallerySort,
): InvoiceGalleryItem[] {
  const sorted = [...items];

  sorted.sort((a, b) => {
    const aTime = new Date(a.date).getTime();
    const bTime = new Date(b.date).getTime();
    const safeA = Number.isNaN(aTime) ? 0 : aTime;
    const safeB = Number.isNaN(bTime) ? 0 : bTime;

    if (sort === "oldest") {
      if (safeA !== safeB) return safeA - safeB;
      return a.source === b.source ? a.id - b.id : a.source.localeCompare(b.source);
    }

    if (safeA !== safeB) return safeB - safeA;
    return a.source === b.source ? b.id - a.id : b.source.localeCompare(a.source);
  });

  return sorted;
}

export function formatGalleryDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function filtersToSearchParams(filters: InvoiceGalleryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.source !== "all") params.set("source", filters.source);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.search) params.set("search", filters.search);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.customer_id) params.set("customer_id", String(filters.customer_id));
  return params;
}

export function searchParamsToFilters(params: URLSearchParams): InvoiceGalleryFilters {
  const sourceParam = params.get("source");
  const source: InvoiceGallerySource =
    sourceParam === "sales" || sourceParam === "tickets" ? sourceParam : "all";

  const sortParam = params.get("sort");
  const sort: InvoiceGallerySort = sortParam === "oldest" ? "oldest" : "newest";

  const customerId = Number(params.get("customer_id"));

  return {
    source,
    date_from: params.get("date_from") || undefined,
    date_to: params.get("date_to") || undefined,
    search: params.get("search")?.trim() || undefined,
    sort,
    customer_id: customerId > 0 ? customerId : undefined,
  };
}

export function countActiveGalleryFilters(filters: InvoiceGalleryFilters): number {
  let count = 0;
  if (filters.source !== "all") count += 1;
  if (filters.date_from) count += 1;
  if (filters.date_to) count += 1;
  if (filters.search) count += 1;
  if (filters.sort !== "newest") count += 1;
  if (filters.customer_id) count += 1;
  return count;
}

export function isoDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isoDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}
