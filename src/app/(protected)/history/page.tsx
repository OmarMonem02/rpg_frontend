"use client";

import { Fragment, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HistoryActiveFilters } from "@/components/history/history-active-filters";
import { HistoryDetailPanel } from "@/components/history/history-detail-panel";
import {
  actionLabel,
  actionTone,
  filtersToSearchParams,
  formatRelativeTime,
  formatTimestamp,
  groupRecordsByDay,
  isoDateDaysAgo,
  isoDateToday,
  searchParamsToFilters,
} from "@/components/history/history-utils";
import {
  ActionButton,
  DataTableCard,
  EmptyState,
  FilterBar,
  InlineMessage,
  InputGroup,
  PageHero,
  PageShell,
  PaginationControls,
  SearchableSelect,
  StatCard,
  StatGrid,
  StatusBadge,
} from "@/components/ops-ui";
import { useGlobalDataRefresh } from "@/hooks/useGlobalDataRefresh";
import { useExportColumns } from "@/hooks/useExportColumns";
import { fetchExportColumnCatalog, toExportColumnDefs } from "@/lib/api/export-columns";
import { fetchAllPages } from "@/lib/api/core";
import { ApiError } from "@/lib/auth-api";
import { getAuthToken } from "@/lib/auth-session";
import {
  exportHistoryCsv,
  listHistory,
  type HistoryEntityOption,
  type HistoryFilters,
  type HistoryRecord,
  type HistorySummary,
} from "@/lib/api/history";
import { listUsers, type UserRecord } from "@/lib/api/users";
import { ExportColumnPicker } from "@/components/export/ExportColumnPicker";

type DraftFilters = {
  entity_type: string;
  action: string;
  user_id: string;
  model_id: string;
  date_from: string;
  date_to: string;
  search: string;
};

const emptyDraft: DraftFilters = {
  entity_type: "",
  action: "",
  user_id: "",
  model_id: "",
  date_from: "",
  date_to: "",
  search: "",
};

function draftFromApplied(filters: HistoryFilters): DraftFilters {
  return {
    entity_type: filters.entity_type ?? "",
    action: filters.action ?? "",
    user_id: filters.user_id ? String(filters.user_id) : "",
    model_id: filters.model_id ? String(filters.model_id) : "",
    date_from: filters.date_from ?? "",
    date_to: filters.date_to ?? "",
    search: filters.search ?? "",
  };
}

function buildAppliedFilters(draft: DraftFilters): HistoryFilters {
  const userId = Number(draft.user_id);
  const modelId = Number(draft.model_id);

  return {
    entity_type: draft.entity_type || undefined,
    action: draft.action || undefined,
    user_id: userId > 0 ? userId : undefined,
    model_id: modelId > 0 ? modelId : undefined,
    date_from: draft.date_from || undefined,
    date_to: draft.date_to || undefined,
    search: draft.search.trim() || undefined,
    per_page: 20,
  };
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="flex h-48 items-center justify-center text-on-surface-variant">
            Loading audit log…
          </div>
        </PageShell>
      }
    >
      <HistoryPageContent />
    </Suspense>
  );
}

function HistoryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { page: urlPage, filters: urlFilters } = searchParamsToFilters(searchParams);

  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [summary, setSummary] = useState<HistorySummary>({
    total: 0,
    creates: 0,
    updates: 0,
    deletes: 0,
  });
  const [entityOptions, setEntityOptions] = useState<HistoryEntityOption[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [page, setPage] = useState(urlPage);
  const [lastPage, setLastPage] = useState(1);
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(() => draftFromApplied(urlFilters));
  const [appliedFilters, setAppliedFilters] = useState<HistoryFilters>(urlFilters);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const [historyExportColumns, setHistoryExportColumns] = useState(
    () => [] as ReturnType<typeof toExportColumnDefs>,
  );

  const historyColumnState = useExportColumns("export-cols:history", historyExportColumns);

  useEffect(() => {
    const loadColumns = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const catalog = await fetchExportColumnCatalog(token);
        setHistoryExportColumns(toExportColumnDefs(catalog.history.columns));
      } catch {
        // Keep empty defaults until catalog loads.
      }
    };
    void loadColumns();
  }, []);

  const selected = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId],
  );

  const selectedIndex = useMemo(
    () => records.findIndex((record) => record.id === selectedId),
    [records, selectedId],
  );

  const groupedRecords = useMemo(() => groupRecordsByDay(records), [records]);

  const selectedUserLabel = useMemo(() => {
    if (!appliedFilters.user_id) return undefined;
    return users.find((user) => user.id === appliedFilters.user_id)?.name;
  }, [appliedFilters.user_id, users]);

  const syncUrl = useCallback(
    (nextFilters: HistoryFilters, nextPage: number) => {
      const query = filtersToSearchParams(nextFilters, nextPage).toString();
      router.replace(query ? `/history?${query}` : "/history");
    },
    [router],
  );

  const loadHistory = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError("Authentication required.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await listHistory(token, page, appliedFilters);
      setRecords(result.items);
      setSummary(result.summary);
      setLastPage(result.lastPage);
      if (result.entities.length > 0) {
        setEntityOptions(result.entities);
      }
      if (result.currentPage !== page) {
        setPage(result.currentPage);
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load system history.";
      setError(message);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => {
    const parsed = searchParamsToFilters(searchParams);
    setPage(parsed.page);
    setAppliedFilters(parsed.filters);
    setDraftFilters(draftFromApplied(parsed.filters));
  }, [searchParams]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useGlobalDataRefresh(loadHistory);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    void fetchAllPages((nextPage) => listUsers(token, nextPage)).then(setUsers)
      .catch(() => {
        setUsers([]);
      });
  }, []);

  const applyFilters = (nextDraft: DraftFilters = draftFilters, nextPage = 1) => {
    const nextFilters = buildAppliedFilters(nextDraft);
    setAppliedFilters(nextFilters);
    setDraftFilters(nextDraft);
    setPage(nextPage);
    setSelectedId(null);
    syncUrl(nextFilters, nextPage);
  };

  const clearFilters = () => {
    applyFilters(emptyDraft, 1);
  };

  const removeFilter = (key: keyof HistoryFilters) => {
    const nextDraft = { ...draftFilters };
    if (key === "entity_type") nextDraft.entity_type = "";
    if (key === "action") nextDraft.action = "";
    if (key === "user_id") nextDraft.user_id = "";
    if (key === "model_id") nextDraft.model_id = "";
    if (key === "date_from") nextDraft.date_from = "";
    if (key === "date_to") nextDraft.date_to = "";
    if (key === "search") nextDraft.search = "";
    applyFilters(nextDraft, 1);
  };

  const applyPreset = (preset: "today" | "7d" | "30d" | "creates" | "updates" | "deletes") => {
    const nextDraft = { ...draftFilters };
    if (preset === "today") {
      nextDraft.date_from = isoDateToday();
      nextDraft.date_to = isoDateToday();
      nextDraft.action = "";
    } else if (preset === "7d") {
      nextDraft.date_from = isoDateDaysAgo(7);
      nextDraft.date_to = isoDateToday();
      nextDraft.action = "";
    } else if (preset === "30d") {
      nextDraft.date_from = isoDateDaysAgo(30);
      nextDraft.date_to = isoDateToday();
      nextDraft.action = "";
    } else {
      nextDraft.action = preset === "creates" ? "create" : preset === "updates" ? "update" : "delete";
    }
    applyFilters(nextDraft, 1);
  };

  const handleExport = async () => {
    const token = getAuthToken();
    if (!token) return;

    setIsExporting(true);
    setError("");

    try {
      const blob = await exportHistoryCsv(token, appliedFilters, historyColumnState.columnsParam());
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `system-history-${isoDateToday()}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export history.");
    } finally {
      setIsExporting(false);
    }
  };

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    setSelectedId(null);
    syncUrl(appliedFilters, nextPage);
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="Admin"
        title="System History"
        subtitle="Audit trail for every create, update, and delete across tickets, sales, inventory, customers, and configuration."
        actions={
          <ActionButton tone="primary" onClick={() => void handleExport()} disabled={isExporting}>
            {isExporting ? "Exporting…" : "Export CSV"}
          </ActionButton>
        }
        meta={
          <StatGrid>
            <StatCard
              label="Matching events"
              value={summary.total.toLocaleString()}
              hint={`Page ${page} of ${lastPage}`}
            />
            <StatCard
              label="Creates"
              value={summary.creates.toLocaleString()}
              tone="primary"
              hint="Filtered total"
            />
            <StatCard
              label="Updates"
              value={summary.updates.toLocaleString()}
              tone="primary"
              hint="Filtered total"
            />
            <StatCard
              label="Deletes"
              value={summary.deletes.toLocaleString()}
              tone="danger"
              hint="Filtered total"
            />
          </StatGrid>
        }
      />

      {historyExportColumns.length > 0 ? (
        <div className="mb-6">
          <ExportColumnPicker
            allColumns={historyExportColumns}
            orderedKeys={historyColumnState.orderedKeys}
            isVisible={historyColumnState.isVisible}
            onToggle={historyColumnState.toggle}
            onMove={historyColumnState.move}
            onReset={historyColumnState.reset}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["today", "Today"],
            ["7d", "Last 7 days"],
            ["30d", "Last 30 days"],
            ["creates", "Creates only"],
            ["updates", "Updates only"],
            ["deletes", "Deletes only"],
          ] as const
        ).map(([preset, label]) => (
          <button
            key={preset}
            type="button"
            onClick={() => applyPreset(preset)}
            className="rounded-full border border-outline-variant/20 bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition-colors hover:border-primary/30 hover:bg-primary-container hover:text-on-primary-container"
          >
            {label}
          </button>
        ))}
      </div>

      <FilterBar>
        <InputGroup label="Entity" className="md:col-span-3">
          <SearchableSelect
            className="form-input-base"
            value={draftFilters.entity_type}
            onChange={(value) =>
              setDraftFilters((current) => ({
                ...current,
                entity_type: value,
              }))
            }
            placeholder="All entities"
            options={entityOptions.map((option) => ({
              value: option.key,
              label: option.label,
            }))}
          />
        </InputGroup>

        <InputGroup label="Action" className="md:col-span-2">
          <SearchableSelect
            className="form-input-base"
            value={draftFilters.action}
            onChange={(value) =>
              setDraftFilters((current) => ({
                ...current,
                action: value,
              }))
            }
            placeholder="All actions"
            options={[
              { value: "create", label: "Create" },
              { value: "update", label: "Update" },
              { value: "delete", label: "Delete" },
            ]}
          />
        </InputGroup>

        <InputGroup label="User" className="md:col-span-3">
          <SearchableSelect
            className="form-input-base"
            value={draftFilters.user_id}
            onChange={(value) =>
              setDraftFilters((current) => ({
                ...current,
                user_id: value,
              }))
            }
            placeholder="All users"
            options={users.map((user) => ({
              value: user.id,
              label: `${user.name} (${user.email})`,
            }))}
          />
        </InputGroup>

        <InputGroup label="Record ID" className="md:col-span-2">
          <input
            className="form-input-base mono-data"
            inputMode="numeric"
            placeholder="e.g. 1042"
            value={draftFilters.model_id}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                model_id: event.target.value,
              }))
            }
          />
        </InputGroup>

        <InputGroup label="From" className="md:col-span-2">
          <input
            type="date"
            className="form-input-base"
            value={draftFilters.date_from}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                date_from: event.target.value,
              }))
            }
          />
        </InputGroup>

        <InputGroup label="To" className="md:col-span-2">
          <input
            type="date"
            className="form-input-base"
            value={draftFilters.date_to}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                date_to: event.target.value,
              }))
            }
          />
        </InputGroup>

        <InputGroup label="Search" className="md:col-span-4">
          <input
            className="form-input-base"
            placeholder="User name, email, or record ID"
            value={draftFilters.search}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") applyFilters();
            }}
          />
        </InputGroup>

        <div className="flex flex-wrap items-end gap-2 md:col-span-12">
          <ActionButton tone="primary" onClick={() => applyFilters()}>
            Apply filters
          </ActionButton>
          <ActionButton onClick={clearFilters}>Clear</ActionButton>
        </div>
      </FilterBar>

      <HistoryActiveFilters
        filters={appliedFilters}
        userLabel={selectedUserLabel}
        onRemove={removeFilter}
        onClearAll={clearFilters}
      />

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

      {isLoading ? (
        <div className="flex h-48 flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-low text-on-surface-variant">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium">Loading audit log…</p>
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          title="No history found"
          description="Try widening the date range or clearing filters. New activity will appear here as users work in the system."
        />
      ) : (
        <DataTableCard>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-container-low label-caps">
                <tr>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Entity</th>
                  <th className="px-6 py-4">Record</th>
                  <th className="px-6 py-4">Changes</th>
                  <th className="px-6 py-4">Summary</th>
                </tr>
              </thead>
              <tbody>
                {groupedRecords.map((group) => (
                  <Fragment key={group.label}>
                    <tr className="bg-surface-container">
                      <td colSpan={7} className="px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                        {group.label}
                      </td>
                    </tr>
                    {group.records.map((record) => {
                      const isSelected = selectedId === record.id;
                      return (
                        <tr
                          key={record.id}
                          className={`data-row cursor-pointer ${isSelected ? "bg-primary-container/35" : ""}`}
                          onClick={() => setSelectedId(record.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className="font-medium text-on-surface"
                              title={formatTimestamp(record.created_at)}
                            >
                              {formatRelativeTime(record.created_at)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-on-surface">
                              {record.user?.name ?? "System"}
                            </p>
                            {record.user?.email ? (
                              <p className="mono-data text-xs text-on-surface-variant">
                                {record.user.email}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge tone={actionTone(record.action)}>
                              {actionLabel(record.action)}
                            </StatusBadge>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-on-surface">{record.entity_label}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="mono-data text-on-surface">#{record.model_id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full border border-outline-variant/20 bg-surface-container px-2 py-0.5 mono-data text-xs text-on-surface">
                              {record.changes_count}
                            </span>
                          </td>
                          <td className="max-w-md px-6 py-4">
                            <p className="line-clamp-2 text-on-surface-variant">
                              {record.summary[0] ?? "—"}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </DataTableCard>
      )}

      <PaginationControls
        page={page}
        totalPages={lastPage}
        onPrevious={() => goToPage(Math.max(1, page - 1))}
        onNext={() => goToPage(Math.min(lastPage, page + 1))}
      />

      {selected ? (
        <HistoryDetailPanel
          record={selected}
          onClose={() => setSelectedId(null)}
          onPrevious={
            selectedIndex > 0
              ? () => setSelectedId(records[selectedIndex - 1]?.id ?? null)
              : undefined
          }
          onNext={
            selectedIndex >= 0 && selectedIndex < records.length - 1
              ? () => setSelectedId(records[selectedIndex + 1]?.id ?? null)
              : undefined
          }
          hasPrevious={selectedIndex > 0}
          hasNext={selectedIndex >= 0 && selectedIndex < records.length - 1}
        />
      ) : null}
    </PageShell>
  );
}
