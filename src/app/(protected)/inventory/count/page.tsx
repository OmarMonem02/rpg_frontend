"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  QrCodeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import {
  ActionButton,
  ConfirmDialog,
  EmptyState,
  FilterBar,
  InlineMessage,
  InputGroup,
  InputGroupCard,
  PageHero,
  PageShell,
  SectionHeading,
  StatCard,
  StatGrid,
} from "@/components/ops-ui";
import { CatalogPickerModal } from "@/components/catalog-picker-modal";
import type { ProductRecord, SparePartRecord } from "@/lib/crud-api";
import { formatSessionSavedAt } from "@/lib/stocktake-session";
import type { CountListTab } from "@/lib/stocktake";
import {
  BatchActionsBar,
  CountLineCard,
  CountLinesTable,
  LastScanCard,
  lineKey,
  MatchRateBar,
  ScanHistoryPanel,
  SortControl,
  WorkflowStrip,
  BulkRecapTable,
} from "./_components/count-components";
import { useInventoryCount } from "./_components/useInventoryCount";
import { ExportColumnPicker } from "@/components/export/ExportColumnPicker";
import { useExportColumns } from "@/hooks/useExportColumns";
import { fetchExportColumnCatalog, toExportColumnDefs } from "@/lib/api/export-columns";
import { getAuthToken } from "@/lib/auth-session";

const EMPTY_STATE_COPY = {
  all: {
    title: "No items counted yet",
    description:
      "Scan a barcode or browse the catalog to start counting. Each scanned item is added to the list and repeated scans increase the counted quantity.",
  },
  matches: {
    title: "No matching items",
    description: "Items where the physical count equals system stock will appear here.",
  },
  discrepancies: {
    title: "No discrepancies found",
    description:
      "When a counted quantity differs from system stock, it will show up in this tab and can be exported to Excel.",
  },
} as const;

export default function InventoryCountPage() {
  const {
    scanInputRef,
    hydrated,
    lines,
    scanValue,
    setScanValue,
    setScanError,
    scanBusy,
    scanError,
    lastScan,
    lastTouchedKey,
    restoredAt,
    dismissRestoreNotice,
    pickerType,
    setPickerType,
    exporting,
    exportError,
    clearConfirmOpen,
    setClearConfirmOpen,
    listTab,
    setListTab,
    listSearch,
    setListSearch,
    summary,
    workflowStep,
    visibleLines,
    listTabOptions,
    handleScan,
    handlePickerAdd,
    updateCounted,
    setToSystemQty,
    removeLine,
    clearAll,
    handleExport,
    // ── NEW ──
    sortKey,
    setSortKey,
    sortOptions,
    scanHistory,
    refreshing,
    refreshError,
    refreshSystemStock,
    batchConfirmOpen,
    setBatchConfirmOpen,
    setAllToSystemQty,
    resetAllCounted,
    removeAllMatches,
    rescanFromHistory,
    countMode,
    setCountMode,
    bulkCatalog,
    isBulkLoading,
    loadBulkCatalog,
    toggleLineInclusion,
    updateLineFromBulk,
    applyConfirmOpen,
    setApplyConfirmOpen,
    applying,
    applyError,
    applyDiscrepancies,
  } = useInventoryCount();

  const [stocktakeExportColumns, setStocktakeExportColumns] = useState(
    () => [] as ReturnType<typeof toExportColumnDefs>,
  );

  const stocktakeColumnState = useExportColumns("export-cols:stocktake", stocktakeExportColumns);

  useEffect(() => {
    const loadColumns = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const catalog = await fetchExportColumnCatalog(token);
        setStocktakeExportColumns(toExportColumnDefs(catalog.stocktake.columns));
      } catch {
        // Keep empty defaults until catalog loads.
      }
    };
    void loadColumns();
  }, []);

  const exportWithColumns = useCallback(() => {
    handleExport(stocktakeColumnState.columnsParam());
  }, [handleExport, stocktakeColumnState]);

  const [bulkTab, setBulkTab] = useState<"products" | "spare_parts">("products");

  useEffect(() => {
    if (countMode === "bulk") {
      void loadBulkCatalog();
    }
  }, [countMode, loadBulkCatalog]);

  const handleScanSubmit = (event: FormEvent) => {
    event.preventDefault();
    void handleScan();
  };

  const handleScanKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleScan();
    }
  };

  if (!hydrated) {
    return (
      <PageShell>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary" />
        </div>
      </PageShell>
    );
  }

  const activeEmpty = EMPTY_STATE_COPY[listTab];
  const hasListSearch = listSearch.trim().length > 0;

  return (
    <PageShell className="pb-24 lg:pb-6">
      <PageHero
        eyebrow="Inventory Hub"
        title="Inventory Count"
        subtitle={
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            Scan a barcode/SKU or pick items by name, enter the physical count for
            each, and review discrepancies against system stock. Press{" "}
            <kbd className="rounded-md border border-outline-variant/20 bg-surface-container px-1.5 py-0.5 font-mono text-xs">
              /
            </kbd>{" "}
            anytime to focus the scanner. Your count is saved locally and survives
            refresh.
          </p>
        }
        meta={
          lines.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <span className="form-chip bg-primary/8 text-primary border-primary/15">
                {lines.length} {lines.length === 1 ? "item" : "items"} in session
              </span>
              <span className="form-chip bg-surface-container-high text-on-surface-variant">
                Saved locally
              </span>
              {summary.netVariance !== 0 ? (
                <span
                  className={`form-chip ${
                    summary.netVariance < 0
                      ? "bg-error/8 text-error border-error/15"
                      : "bg-warning/8 text-on-warning-container border-warning/15"
                  }`}
                >
                  Net variance: {summary.netVariance > 0 ? "+" : ""}
                  {summary.netVariance}
                </span>
              ) : null}
            </div>
          ) : null
        }
        actions={
          <>
            <ActionButton
              type="button"
              variant="outline"
              onClick={() => setClearConfirmOpen(true)}
              disabled={lines.length === 0 || exporting}
            >
              Clear count
            </ActionButton>
            <ActionButton
              type="button"
              tone="primary"
              onClick={exportWithColumns}
              disabled={summary.discrepancies === 0 || exporting}
            >
              <ArrowDownTrayIcon className="h-4 w-4" aria-hidden />
              {exporting ? "Generating..." : "Generate Excel report"}
            </ActionButton>
          </>
        }
      />

      {stocktakeExportColumns.length > 0 ? (
        <div className="mb-6">
          <ExportColumnPicker
            allColumns={stocktakeExportColumns}
            orderedKeys={stocktakeColumnState.orderedKeys}
            isVisible={stocktakeColumnState.isVisible}
            onToggle={stocktakeColumnState.toggle}
            onMove={stocktakeColumnState.move}
            onReset={stocktakeColumnState.reset}
          />
        </div>
      ) : null}

      {restoredAt ? (
        <InlineMessage tone="primary">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Restored your previous count from{" "}
              <span className="mono-data">{formatSessionSavedAt(restoredAt)}</span> (
              {lines.length} {lines.length === 1 ? "item" : "items"}).
            </span>
            <ActionButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={dismissRestoreNotice}
            >
              Dismiss
            </ActionButton>
          </div>
        </InlineMessage>
      ) : null}

      <WorkflowStrip activeStep={workflowStep} />

      {/* ── Enhanced Stats Grid with totals ── */}
      <StatGrid>
        <StatCard label="Items counted" value={String(summary.itemsCounted)} />
        <StatCard label="Matches" value={String(summary.matches)} tone="success" />
        <StatCard
          label="Shortages"
          value={String(summary.shortages)}
          tone={summary.shortages > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Surpluses"
          value={String(summary.surpluses)}
          tone={summary.surpluses > 0 ? "warning" : "default"}
        />
      </StatGrid>

      {/* ── NEW: Secondary stats row ── */}
      {lines.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-lowest px-4 py-3">
            <p className="label-caps text-on-surface-variant">Total system stock</p>
            <p className="mono-data mt-1 text-xl font-semibold text-on-surface">
              {summary.totalSystemStock}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-lowest px-4 py-3">
            <p className="label-caps text-on-surface-variant">Total counted</p>
            <p className="mono-data mt-1 text-xl font-semibold text-on-surface">
              {summary.totalCounted}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-lowest px-4 py-3">
            <p className="label-caps text-on-surface-variant">Net variance</p>
            <p
              className={`mono-data mt-1 text-xl font-semibold ${
                summary.netVariance < 0
                  ? "text-error"
                  : summary.netVariance > 0
                    ? "text-on-warning-container"
                    : "text-on-surface"
              }`}
            >
              {summary.netVariance > 0 ? "+" : ""}
              {summary.netVariance}
            </p>
          </div>
        </div>
      ) : null}

      {lines.length > 0 ? (
        <MatchRateBar rate={summary.matchRate} itemsCounted={summary.itemsCounted} />
      ) : null}

      {/* ── Mode Selector ── */}
      <div className="mb-6 flex gap-2 rounded-xl border border-outline-variant/15 bg-surface-container-low p-1 w-fit">
        <button
          type="button"
          onClick={() => setCountMode("scan")}
          className={`flex-none rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            countMode === "scan"
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          }`}
        >
          Scan Mode
        </button>
        <button
          type="button"
          onClick={() => setCountMode("bulk")}
          className={`flex-none rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            countMode === "bulk"
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          }`}
        >
          Bulk Recap
        </button>
      </div>

      {countMode === "scan" ? (
        /* ── Scan & Add section ── */
        <section className="space-y-4">
          <SectionHeading
            title="Scan & add"
            description="Use a barcode scanner or type an exact SKU / part number. Press Enter to add the item to your count."
          />

          <InputGroupCard
            label="Scanner ready"
            hint="Focus here and scan, or press / from anywhere on the page."
            tone="default"
          >
            <form onSubmit={handleScanSubmit}>
              <FilterBar className="md:grid-cols-12">
                <InputGroup label="Barcode / SKU" className="md:col-span-9">
                  <div className="relative">
                    <QrCodeIcon
                      className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant/70"
                      aria-hidden
                    />
                    <input
                      ref={scanInputRef}
                      type="text"
                      inputMode="text"
                      autoFocus
                      autoComplete="off"
                      value={scanValue}
                      onChange={(event) => {
                        setScanValue(event.target.value);
                        setScanError(null);
                      }}
                      onKeyDown={handleScanKeyDown}
                      placeholder="Scan or type SKU / part number, then press Enter"
                      className="form-input-base indent-6 placeholder:text-on-surface-variant read-only:opacity-80"
                      readOnly={scanBusy}
                      aria-busy={scanBusy}
                      aria-label="Barcode or SKU"
                    />
                    {scanBusy ? (
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-outline-variant/30 border-t-primary" />
                      </div>
                    ) : null}
                  </div>
                </InputGroup>
                <div className="flex items-end md:col-span-3">
                  <ActionButton
                    type="submit"
                    tone="primary"
                    className="w-full h-13"
                    disabled={scanBusy || !scanValue.trim()}
                  >
                    {scanBusy ? "Searching..." : "Add to count"}
                  </ActionButton>
                </div>
              </FilterBar>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-current/10 pt-4">
                <ActionButton
                  type="button"
                  variant="outline"
                  onClick={() => setPickerType("products")}
                >
                  <PlusIcon className="h-4 w-4" aria-hidden />
                  Browse products
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="outline"
                  onClick={() => setPickerType("spare_parts")}
                >
                  <PlusIcon className="h-4 w-4" aria-hidden />
                  Browse spare parts
                </ActionButton>
              </div>

              {scanError ? (
                <p className="mt-3 text-sm text-error" role="alert">
                  {scanError}
                </p>
              ) : null}
            </form>
          </InputGroupCard>

          {lastScan ? <LastScanCard scan={lastScan} /> : null}

          {/* ── Scan history panel ── */}
          <ScanHistoryPanel
            history={scanHistory}
            onRescan={rescanFromHistory}
            scanBusy={scanBusy}
          />

          {exportError ? <InlineMessage tone="danger">{exportError}</InlineMessage> : null}
          {refreshError ? (
            <InlineMessage tone={refreshError.includes("up to date") ? "success" : "danger"}>
              {refreshError}
            </InlineMessage>
          ) : null}
        </section>
      ) : (
        /* ── Bulk Recap section ── */
        <section className="space-y-4">
          <SectionHeading
            title="Bulk Recap"
            description="Quickly enter counts for all items in the catalog. Checking the box includes the item in this session."
          />
          <div className="flex gap-1 border-b border-outline-variant/15 mb-4">
            <button
              type="button"
              onClick={() => setBulkTab("products")}
              className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                bulkTab === "products"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Products ({bulkCatalog.products.length})
            </button>
            <button
              type="button"
              onClick={() => setBulkTab("spare_parts")}
              className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                bulkTab === "spare_parts"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Spare Parts ({bulkCatalog.spareParts.length})
            </button>
          </div>
          {isBulkLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-outline-variant/30 border-t-primary" />
            </div>
          ) : (
            <BulkRecapTable
              type={bulkTab === "products" ? "product" : "spare_part"}
              records={bulkTab === "products" ? bulkCatalog.products : bulkCatalog.spareParts}
              lines={lines}
              onToggleInclusion={toggleLineInclusion}
              onUpdateCounted={updateLineFromBulk}
            />
          )}
        </section>
      )}

      {/* ── Count List section ── */}
      <section className="space-y-4">
        <SectionHeading
          title="Count list"
          description="Edit counted quantities, filter by status, and review variance before exporting discrepancies."
          actions={
            summary.discrepancies > 0 ? (
              <ActionButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setListTab("discrepancies")}
              >
                Show discrepancies only
              </ActionButton>
            ) : null
          }
        />

        {/* ── NEW: Batch actions bar ── */}
        <BatchActionsBar
          lineCount={lines.length}
          matchCount={summary.matches}
          discrepancyCount={summary.discrepancies}
          refreshing={refreshing}
          applying={applying}
          onRefreshStock={refreshSystemStock}
          onSetAllToSystem={() => setBatchConfirmOpen("setAllSystem")}
          onResetAllCounted={() => setBatchConfirmOpen("resetAll")}
          onRemoveMatches={() => setBatchConfirmOpen("removeMatches")}
          onApplyDiscrepancies={() => setApplyConfirmOpen(true)}
        />

        {lines.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {/* Tab bar */}
              <div className="no-scrollbar flex flex-1 gap-1 overflow-x-auto rounded-2xl border border-outline-variant/15 bg-surface-container-low p-1.5">
                {listTabOptions.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setListTab(tab.id as CountListTab)}
                    className={`flex-none rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                      listTab === tab.id
                        ? "bg-primary text-on-primary shadow-sm"
                        : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── NEW: Sort control ── */}
              <SortControl
                sortKey={sortKey}
                options={sortOptions}
                onChange={setSortKey}
              />
            </div>

            <div className="rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest p-4 sm:p-5">
              <FilterBar className="md:grid-cols-12">
                <InputGroup label="Search counted items" className="md:col-span-12">
                  <div className="relative">
                    <MagnifyingGlassIcon
                      className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant/70"
                      aria-hidden
                    />
                    <input
                      type="text"
                      value={listSearch}
                      onChange={(event) => setListSearch(event.target.value)}
                      placeholder="Filter by name, SKU, or part number..."
                      className="form-input-base indent-6 pl-10 pr-10"
                      aria-label="Search counted items"
                    />
                    {hasListSearch ? (
                      <button
                        type="button"
                        onClick={() => setListSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                        aria-label="Clear search"
                      >
                        <XMarkIcon className="h-4 w-4" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </InputGroup>
              </FilterBar>
            </div>

            {summary.discrepancies > 0 ? (
              <InlineMessage tone="warning">
                {summary.discrepancies}{" "}
                {summary.discrepancies === 1 ? "discrepancy" : "discrepancies"}{" "}
                found ({summary.shortages} shortage
                {summary.shortages === 1 ? "" : "s"}, {summary.surpluses} surplus
                {summary.surpluses === 1 ? "" : "es"}). Generate the Excel report when
                your count is complete.
              </InlineMessage>
            ) : (
              <InlineMessage tone="success">
                All counted items match system stock so far.
              </InlineMessage>
            )}
          </>
        ) : null}

        {lines.length === 0 ? (
          <EmptyState
            title={activeEmpty.title}
            description={activeEmpty.description}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <ActionButton
                  type="button"
                  tone="primary"
                  onClick={() => scanInputRef.current?.focus()}
                >
                  Start scanning
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="outline"
                  onClick={() => setPickerType("products")}
                >
                  Browse products
                </ActionButton>
              </div>
            }
          />
        ) : visibleLines.length === 0 ? (
          <EmptyState
            title={hasListSearch ? "No items match this view" : activeEmpty.title}
            description={
              hasListSearch
                ? "Try another tab or adjust your search filter."
                : activeEmpty.description
            }
            action={
              hasListSearch ? (
                <ActionButton
                  type="button"
                  variant="outline"
                  onClick={() => setListSearch("")}
                >
                  Clear search
                </ActionButton>
              ) : listTab !== "all" ? (
                <ActionButton
                  type="button"
                  variant="outline"
                  onClick={() => setListTab("all")}
                >
                  Show all items
                </ActionButton>
              ) : undefined
            }
          />
        ) : (
          <>
            <p className="label-caps text-on-surface-variant">
              {visibleLines.length}{" "}
              {visibleLines.length === 1 ? "item" : "items"}
              {hasListSearch ? " matching filter" : ""}
            </p>

            <div className="grid gap-3 md:hidden">
              {visibleLines.map((line) => {
                const key = lineKey(line.type, line.id);
                return (
                  <CountLineCard
                    key={key}
                    line={line}
                    isHighlighted={lastTouchedKey === key}
                    onUpdateCounted={(value) =>
                      updateCounted(line.type, line.id, value)
                    }
                    onSetSystemQty={() => setToSystemQty(line.type, line.id)}
                    onRemove={() => removeLine(line.type, line.id)}
                  />
                );
              })}
            </div>

            <CountLinesTable
              lines={visibleLines}
              lastTouchedKey={lastTouchedKey}
              onUpdateCounted={updateCounted}
              onSetSystemQty={setToSystemQty}
              onRemove={removeLine}
            />
          </>
        )}
      </section>

      {/* ── Mobile sticky export footer ── */}
      {summary.discrepancies > 0 ? (
        <div className="tracking-footer-safe fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant/15 bg-surface-container-low/95 p-3 backdrop-blur-sm lg:hidden">
          <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3 px-2">
            <div>
              <p className="text-sm font-semibold text-on-surface">
                {summary.discrepancies} discrepanc
                {summary.discrepancies === 1 ? "y" : "ies"}
              </p>
              <p className="text-xs text-on-surface-variant">Ready to export</p>
            </div>
            <ActionButton
              type="button"
              tone="primary"
              onClick={exportWithColumns}
              disabled={exporting}
            >
              <ArrowDownTrayIcon className="h-4 w-4" aria-hidden />
              {exporting ? "Exporting..." : "Excel report"}
            </ActionButton>
          </div>
        </div>
      ) : null}

      {/* ── Catalog picker modal ── */}
      {pickerType ? (
        <CatalogPickerModal
          isOpen
          onClose={() => setPickerType(null)}
          catalogType={pickerType}
          onAddItems={(items) =>
            handlePickerAdd(items as Array<ProductRecord | SparePartRecord>)
          }
        />
      ) : null}

      {/* ── Clear count confirmation dialog ── */}
      <ConfirmDialog
        isOpen={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        title="Clear this count session?"
        confirmLabel="Clear count"
        confirmTone="danger"
        onConfirm={clearAll}
      >
        <p className="text-sm text-on-surface-variant">
          This removes all counted items from the current session. Stock levels in
          the system are not changed.
        </p>
      </ConfirmDialog>

      {/* ── NEW: Batch operation confirmation dialogs ── */}
      <ConfirmDialog
        isOpen={batchConfirmOpen === "setAllSystem"}
        onClose={() => setBatchConfirmOpen(null)}
        title="Set all counted = system?"
        confirmLabel="Set all"
        confirmTone="primary"
        onConfirm={setAllToSystemQty}
      >
        <p className="text-sm text-on-surface-variant">
          This will set every counted quantity to its corresponding system stock
          value, resolving all discrepancies. This action can be undone by manually
          editing individual items.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={batchConfirmOpen === "resetAll"}
        onClose={() => setBatchConfirmOpen(null)}
        title="Reset all counts to zero?"
        confirmLabel="Reset to zero"
        confirmTone="danger"
        onConfirm={resetAllCounted}
      >
        <p className="text-sm text-on-surface-variant">
          This will set every counted quantity to <strong>0</strong>. All items will
          remain in the list so you can re-count them.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={batchConfirmOpen === "removeMatches"}
        onClose={() => setBatchConfirmOpen(null)}
        title="Remove all matched items?"
        confirmLabel="Remove matches"
        confirmTone="warning"
        onConfirm={removeAllMatches}
      >
        <p className="text-sm text-on-surface-variant">
          This removes <strong>{summary.matches}</strong> item
          {summary.matches !== 1 ? "s" : ""} where the counted quantity equals the
          system stock. Only discrepant items will remain.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={applyConfirmOpen}
        onClose={() => setApplyConfirmOpen(false)}
        title="Apply count to system stock?"
        confirmLabel={applying ? "Applying..." : "Apply Count"}
        confirmTone="primary"
        onConfirm={applyDiscrepancies}
      >
        <p className="text-sm text-on-surface-variant">
          You are about to change the live system stock for <strong>{summary.discrepancies}</strong> item
          {summary.discrepancies !== 1 ? "s" : ""}. This will overwrite the current stock values with your counted quantities. This action cannot be undone.
        </p>
      </ConfirmDialog>
    </PageShell>
  );
}
