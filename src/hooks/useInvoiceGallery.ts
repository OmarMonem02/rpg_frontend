"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import { listSales, type SaleRecord } from "@/lib/crud-api";
import type { ExchangeRates } from "@/lib/currencies";
import {
  mergeGalleryItems,
  saleToGalleryItem,
  ticketToGalleryItem,
  type InvoiceGalleryFilters,
  type InvoiceGalleryItem,
} from "@/lib/invoice-gallery";
import { listTickets, type Ticket } from "@/lib/tickets-api";

const GALLERY_PER_PAGE = 12;

type SourcePages = {
  sales: number;
  tickets: number;
};

type SourceMeta = {
  salesLastPage: number;
  ticketsLastPage: number;
};

export type UseInvoiceGalleryOptions = {
  filters: InvoiceGalleryFilters;
  rates: ExchangeRates;
  canFetchSales: boolean;
  canFetchTickets: boolean;
};

export type UseInvoiceGalleryResult = {
  items: InvoiceGalleryItem[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  refresh: () => void;
  loadMore: () => void;
};

function resolveActiveSources(
  filters: InvoiceGalleryFilters,
  canFetchSales: boolean,
  canFetchTickets: boolean,
): { fetchSales: boolean; fetchTickets: boolean } {
  const source = filters.source;

  if (source === "sales") {
    return { fetchSales: canFetchSales, fetchTickets: false };
  }

  if (source === "tickets") {
    return { fetchSales: false, fetchTickets: canFetchTickets };
  }

  return {
    fetchSales: canFetchSales,
    fetchTickets: canFetchTickets,
  };
}

function buildSalesFilters(filters: InvoiceGalleryFilters) {
  return {
    date_from: filters.date_from,
    date_to: filters.date_to,
    search: filters.search,
    customer_id: filters.customer_id,
    sort: filters.sort,
    per_page: GALLERY_PER_PAGE,
  };
}

function buildTicketFilters(filters: InvoiceGalleryFilters) {
  return {
    date_from: filters.date_from,
    date_to: filters.date_to,
    search: filters.search,
    customer_id: filters.customer_id,
    sort: filters.sort,
    per_page: GALLERY_PER_PAGE,
  };
}

export function useInvoiceGallery({
  filters,
  rates,
  canFetchSales,
  canFetchTickets,
}: UseInvoiceGalleryOptions): UseInvoiceGalleryResult {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pages, setPages] = useState<SourcePages>({ sales: 0, tickets: 0 });
  const [meta, setMeta] = useState<SourceMeta>({ salesLastPage: 1, ticketsLastPage: 1 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const filtersKey = JSON.stringify(filters);

  const { fetchSales, fetchTickets } = useMemo(
    () => resolveActiveSources(filters, canFetchSales, canFetchTickets),
    [filters, canFetchSales, canFetchTickets],
  );

  const fetchPage = useCallback(
    async (nextPages: SourcePages, mode: "replace" | "append") => {
      const token = getAuthToken();
      if (!token) {
        setError("Authentication required. Please sign in again.");
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const requestId = ++requestIdRef.current;

      try {
        const tasks: Promise<void>[] = [];
        let salesResult: Awaited<ReturnType<typeof listSales>> | null = null;
        let ticketsResult: Awaited<ReturnType<typeof listTickets>> | null = null;

        if (fetchSales && nextPages.sales > 0) {
          tasks.push(
            listSales(token, nextPages.sales, buildSalesFilters(filters)).then((result) => {
              salesResult = result;
            }),
          );
        }

        if (fetchTickets && nextPages.tickets > 0) {
          tasks.push(
            listTickets(nextPages.tickets, buildTicketFilters(filters)).then((result) => {
              ticketsResult = result;
            }),
          );
        }

        await Promise.all(tasks);

        if (requestId !== requestIdRef.current) return;

        setSales((prev) => {
          if (!salesResult) return mode === "replace" ? [] : prev;
          if (mode === "replace") return salesResult.items;
          const existingIds = new Set(prev.map((sale) => sale.id));
          const appended = salesResult.items.filter((sale) => !existingIds.has(sale.id));
          return [...prev, ...appended];
        });

        setTickets((prev) => {
          if (!ticketsResult) return mode === "replace" ? [] : prev;
          if (mode === "replace") return ticketsResult.items;
          const existingIds = new Set(prev.map((ticket) => ticket.id));
          const appended = ticketsResult.items.filter(
            (ticket) => !existingIds.has(ticket.id),
          );
          return [...prev, ...appended];
        });

        setMeta((prev) => ({
          salesLastPage: salesResult?.lastPage ?? (fetchSales ? 1 : prev.salesLastPage),
          ticketsLastPage:
            ticketsResult?.lastPage ?? (fetchTickets ? 1 : prev.ticketsLastPage),
        }));

        setPages(nextPages);
        setError(null);
      } catch (err: unknown) {
        if (requestId !== requestIdRef.current) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load invoices. Check your connection and try again.",
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [fetchSales, fetchTickets, filters],
  );

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    void fetchPage(
      {
        sales: fetchSales ? 1 : 0,
        tickets: fetchTickets ? 1 : 0,
      },
      "replace",
    );
  }, [fetchPage, fetchSales, fetchTickets]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSales([]);
    setTickets([]);
    setPages({ sales: 0, tickets: 0 });
    setMeta({ salesLastPage: 1, ticketsLastPage: 1 });

    void fetchPage(
      {
        sales: fetchSales ? 1 : 0,
        tickets: fetchTickets ? 1 : 0,
      },
      "replace",
    );
  }, [filtersKey, fetchSales, fetchTickets, fetchPage]);

  const items = useMemo(() => {
    const galleryItems: InvoiceGalleryItem[] = [
      ...sales.map(saleToGalleryItem),
      ...tickets.map((ticket) => ticketToGalleryItem(ticket, rates)),
    ];
    return mergeGalleryItems(galleryItems, filters.sort);
  }, [sales, tickets, rates, filters.sort]);

  const hasMore = useMemo(() => {
    const salesHasMore = fetchSales && pages.sales < meta.salesLastPage;
    const ticketsHasMore = fetchTickets && pages.tickets < meta.ticketsLastPage;
    return salesHasMore || ticketsHasMore;
  }, [fetchSales, fetchTickets, pages, meta]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || loadingMore) return;

    setLoadingMore(true);
    void fetchPage(
      {
        sales: fetchSales ? pages.sales + 1 : 0,
        tickets: fetchTickets ? pages.tickets + 1 : 0,
      },
      "append",
    );
  }, [hasMore, loading, loadingMore, fetchPage, fetchSales, fetchTickets, pages]);

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
  };
}
