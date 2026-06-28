"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowPathIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { InvoiceGalleryCard } from "@/components/invoices/invoice-gallery-card";
import { InvoiceGalleryFiltersPanel } from "@/components/invoices/invoice-gallery-filters";
import { InvoiceGalleryViewer } from "@/components/invoices/invoice-gallery-viewer";
import { usePermissions } from "@/components/permission-provider";
import {
  ActionButton,
  EmptyState,
  InlineMessage,
  PageHero,
  PageShell,
  SurfaceCard,
} from "@/components/ops-ui";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useInvoiceGallery } from "@/hooks/useInvoiceGallery";
import {
  countActiveGalleryFilters,
  filtersToSearchParams,
  searchParamsToFilters,
  type InvoiceGalleryFilters,
  type InvoiceGallerySource,
} from "@/lib/invoice-gallery";

const DEFAULT_FILTERS: InvoiceGalleryFilters = {
  source: "all",
  sort: "newest",
};

function resolveDefaultSource(
  source: InvoiceGallerySource,
  canFetchSales: boolean,
  canFetchTickets: boolean,
): InvoiceGallerySource {
  if (source === "sales" && !canFetchSales) {
    return canFetchTickets ? "tickets" : "all";
  }

  if (source === "tickets" && !canFetchTickets) {
    return canFetchSales ? "sales" : "all";
  }

  if (source === "all" && !canFetchSales && canFetchTickets) {
    return "tickets";
  }

  if (source === "all" && canFetchSales && !canFetchTickets) {
    return "sales";
  }

  return source;
}

function InvoiceGalleryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const permissions = usePermissions();
  const { rates } = useExchangeRates();

  const canFetchSales = permissions.canReadPage("sales");
  const canFetchTickets = permissions.canReadPage("maintenance");

  const [filters, setFilters] = useState<InvoiceGalleryFilters>(() => {
    const parsed = searchParamsToFilters(searchParams);
    return {
      ...DEFAULT_FILTERS,
      ...parsed,
      source: resolveDefaultSource(parsed.source, canFetchSales, canFetchTickets),
    };
  });

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const { items, loading, loadingMore, error, hasMore, refresh, loadMore } =
    useInvoiceGallery({
      filters,
      rates,
      canFetchSales,
      canFetchTickets,
    });

  const activeFilterCount = countActiveGalleryFilters(filters);

  const syncUrl = useCallback(
    (nextFilters: InvoiceGalleryFilters) => {
      const params = filtersToSearchParams(nextFilters);
      const query = params.toString();
      router.replace(query ? `/invoices?${query}` : "/invoices", { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    const parsed = searchParamsToFilters(searchParams);
    setFilters({
      ...DEFAULT_FILTERS,
      ...parsed,
      source: resolveDefaultSource(parsed.source, canFetchSales, canFetchTickets),
    });
  }, [searchParams, canFetchSales, canFetchTickets]);

  const updateFilters = useCallback(
    (patch: Partial<InvoiceGalleryFilters>) => {
      setFilters((prev) => {
        const next = { ...prev, ...patch };
        syncUrl(next);
        return next;
      });
    },
    [syncUrl],
  );

  const resetFilters = useCallback(() => {
    const next: InvoiceGalleryFilters = {
      ...DEFAULT_FILTERS,
      source: resolveDefaultSource("all", canFetchSales, canFetchTickets),
    };
    setFilters(next);
    syncUrl(next);
  }, [canFetchSales, canFetchTickets, syncUrl]);

  const openViewerAt = useCallback((index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  }, []);

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (filters.source !== "all") {
      parts.push(filters.source === "sales" ? "Sales only" : "Tickets only");
    }
    if (filters.date_from || filters.date_to) {
      parts.push(
        `${filters.date_from ?? "…"} → ${filters.date_to ?? "…"}`,
      );
    }
    if (filters.search) parts.push(`"${filters.search}"`);
    return parts.join(" · ");
  }, [filters]);

  return (
    <PageShell>
      <PageHero
        eyebrow="Billing review"
        title="Invoice Gallery"
        subtitle="Browse sales and ticket invoices in one place. Click a card to flip through them like photos, filter by date, and open or export any invoice quickly."
        actions={
          <ActionButton
            type="button"
            variant="outline"
            tone="default"
            size="sm"
            className="gap-1.5"
            disabled={loading}
            onClick={refresh}
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Refresh
          </ActionButton>
        }
      />

      <div className="space-y-5">
        <InvoiceGalleryFiltersPanel
          filters={filters}
          onChange={updateFilters}
          onReset={resetFilters}
          canFilterSales={canFetchSales}
          canFilterTickets={canFetchTickets}
        />

        {activeFilterCount > 0 ? (
          <SurfaceCard className="px-4 py-3">
            <p className="text-sm text-on-surface-variant">
              <span className="font-medium text-on-surface">
                {activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}
              </span>
              {filterSummary ? ` — ${filterSummary}` : null}
            </p>
          </SurfaceCard>
        ) : null}

        {error ? (
          <InlineMessage tone="danger">
            <p className="font-medium">Could not load invoices</p>
            <p className="mt-1">{error}</p>
            <div className="mt-3">
              <ActionButton type="button" size="sm" onClick={refresh}>
                Try again
              </ActionButton>
            </div>
          </InlineMessage>
        ) : null}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-[1.5rem] border border-outline-variant/10 bg-surface-container-low"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No invoices match these filters"
            description="Try widening the date range, clearing search, or switching the invoice source."
            action={
              activeFilterCount > 0 ? (
                <ActionButton type="button" variant="outline" onClick={resetFilters}>
                  Clear filters
                </ActionButton>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-on-surface-variant">
                {items.length} invoice{items.length === 1 ? "" : "s"} loaded
              </p>
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <PhotoIcon className="h-4 w-4" aria-hidden="true" />
                Click a card to browse fullscreen
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item, index) => (
                <InvoiceGalleryCard
                  key={item.key}
                  item={item}
                  onOpen={() => openViewerAt(index)}
                />
              ))}
            </div>

            {hasMore ? (
              <div className="flex justify-center pt-2">
                <ActionButton
                  type="button"
                  variant="outline"
                  disabled={loadingMore}
                  onClick={loadMore}
                >
                  {loadingMore ? "Loading more…" : "Load more invoices"}
                </ActionButton>
              </div>
            ) : null}
          </>
        )}
      </div>

      <InvoiceGalleryViewer
        items={items}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </PageShell>
  );
}

export default function InvoiceGalleryPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="h-40 animate-pulse rounded-[1.75rem] bg-surface-container-low" />
        </PageShell>
      }
    >
      <InvoiceGalleryPageContent />
    </Suspense>
  );
}
