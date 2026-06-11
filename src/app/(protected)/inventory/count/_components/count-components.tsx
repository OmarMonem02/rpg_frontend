"use client";

import {
  ArrowPathIcon,
  ArrowsUpDownIcon,
  CheckCircleIcon,
  ClockIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  ActionButton,
  DataTableCard,
  SearchableSelect,
  StatusBadge,
} from "@/components/ops-ui";
import { getLookupItemKindLabel } from "@/lib/item-lookup";
import {
  computeVariance,
  getDiscrepancyStatus,
  type CountItemType,
  type CountLine,
  type CountSortKey,
  type CountWorkflowStep,
} from "@/lib/stocktake";
import type { CountSessionLastScan } from "@/lib/stocktake-session";
import type { ProductRecord, SparePartRecord } from "@/lib/crud-api";

const WORKFLOW_STEPS: Array<{ id: CountWorkflowStep; label: string; hint: string }> = [
  { id: "scan", label: "Scan", hint: "Add items to the count" },
  { id: "review", label: "Review", hint: "Verify counted quantities" },
  { id: "export", label: "Export", hint: "Download discrepancy report" },
];

export const statusTone = {
  match: "success",
  shortage: "danger",
  surplus: "warning",
} as const;

export const statusLabel = {
  match: "Match",
  shortage: "Shortage",
  surplus: "Surplus",
} as const;

export function lineKey(type: CountItemType, id: number): string {
  return `${type}:${id}`;
}

export function CountItemThumbnail({
  image,
  name,
  size = "md",
}: {
  image?: string;
  name: string;
  size?: "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "h-14 w-14 text-sm" : "h-10 w-10 text-xs";

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        className={`${sizeClass} flex-none rounded-xl border border-outline-variant/15 object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex flex-none items-center justify-center rounded-xl border border-outline-variant/15 bg-surface-container font-semibold text-on-surface-variant`}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function WorkflowStrip({ activeStep }: { activeStep: CountWorkflowStep }) {
  const activeIndex = WORKFLOW_STEPS.findIndex((step) => step.id === activeStep);

  return (
    <div className="rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest p-4 sm:p-5">
      <ol className="grid gap-3 sm:grid-cols-3">
        {WORKFLOW_STEPS.map((step, index) => {
          const isActive = step.id === activeStep;
          const isComplete = index < activeIndex;

          return (
            <li
              key={step.id}
              className={`rounded-xl border px-4 py-3 transition-colors ${
                isActive
                  ? "border-primary/25 bg-primary/5"
                  : isComplete
                    ? "border-success/20 bg-success/5"
                    : "border-outline-variant/12 bg-surface"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-bold ${
                    isActive
                      ? "bg-primary text-on-primary"
                      : isComplete
                        ? "bg-success text-on-primary"
                        : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircleIcon className="h-5 w-5" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-on-surface">{step.label}</p>
                  <p className="text-xs text-on-surface-variant">{step.hint}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function MatchRateBar({
  rate,
  itemsCounted,
}: {
  rate: number;
  itemsCounted: number;
}) {
  if (itemsCounted === 0) return null;

  return (
    <div className="rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-lowest p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="label-caps text-on-surface-variant">Match rate</p>
        <p className="mono-data text-sm font-semibold text-on-surface">{rate}%</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-high">
        <div
          className="h-full rounded-full bg-success transition-all duration-300"
          style={{ width: `${rate}%` }}
          role="progressbar"
          aria-valuenow={rate}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Inventory count match rate"
        />
      </div>
    </div>
  );
}

export function LastScanCard({ scan }: { scan: CountSessionLastScan }) {
  const variance = scan.counted - scan.systemQty;
  const status = getDiscrepancyStatus(variance);

  return (
    <article className="animate-fade-in rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-sm sm:p-5">
      <p className="label-caps text-on-surface-variant">Last added</p>
      <div className="mt-3 flex flex-wrap items-start gap-4">
        <CountItemThumbnail image={scan.image} name={scan.name} size="lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <span className="form-chip bg-primary/8 text-primary border-primary/15">
            {getLookupItemKindLabel(scan.type)}
          </span>
          <h3 className="text-lg font-semibold text-on-surface">{scan.name}</h3>
          <p className="mono-data text-xs text-on-surface-variant">{scan.sku}</p>
        </div>
        <StatusBadge tone={statusTone[status]}>{statusLabel[status]}</StatusBadge>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low/60 px-4 py-3">
          <dt className="label-caps text-on-surface-variant">Counted</dt>
          <dd className="mono-data mt-1 text-xl font-semibold text-on-surface">
            {scan.counted}
          </dd>
        </div>
        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low/60 px-4 py-3">
          <dt className="label-caps text-on-surface-variant">System</dt>
          <dd className="mono-data mt-1 text-xl font-semibold text-on-surface">
            {scan.systemQty}
          </dd>
        </div>
        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low/60 px-4 py-3">
          <dt className="label-caps text-on-surface-variant">Variance</dt>
          <dd
            className={`mono-data mt-1 text-xl font-semibold ${
              variance < 0
                ? "text-error"
                : variance > 0
                  ? "text-on-warning-container"
                  : "text-on-surface"
            }`}
          >
            {variance > 0 ? `+${variance}` : variance}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function QuantityStepper({
  value,
  onChange,
  label,
  centered = false,
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
  centered?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1 ${centered ? "justify-center" : "ml-auto w-fit"}`}
    >
      <ActionButton
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        aria-label={`Decrease ${label}`}
      >
        <MinusIcon className="h-3.5 w-3.5" aria-hidden />
      </ActionButton>
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === "" ? 0 : event.target.valueAsNumber);
        }}
        onWheel={(event) => {
          event.currentTarget.blur();
        }}
        className="form-input-base w-16 px-2 py-1.5 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label={label}
      />
      <ActionButton
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange(value + 1)}
        aria-label={`Increase ${label}`}
      >
        <PlusIcon className="h-3.5 w-3.5" aria-hidden />
      </ActionButton>
    </div>
  );
}

export function CountLineCard({
  line,
  isHighlighted,
  onUpdateCounted,
  onSetSystemQty,
  onRemove,
}: {
  line: CountLine;
  isHighlighted: boolean;
  onUpdateCounted: (value: number) => void;
  onSetSystemQty: () => void;
  onRemove: () => void;
}) {
  const variance = computeVariance(line);
  const status = getDiscrepancyStatus(variance);
  const rowTint =
    variance < 0
      ? "border-error/20 bg-error-container/20"
      : variance > 0
        ? "border-warning/20 bg-warning-container/20"
        : "border-outline-variant/15 bg-surface-container-lowest";

  return (
    <article
      className={`animate-fade-in rounded-[1.25rem] border p-4 ${rowTint} ${
        isHighlighted ? "ring-2 ring-primary/25" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <CountItemThumbnail image={line.image} name={line.name} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-on-surface">{line.name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="form-chip bg-primary/8 text-primary border-primary/15">
              {getLookupItemKindLabel(line.type)}
            </span>
            <StatusBadge tone={statusTone[status]}>{statusLabel[status]}</StatusBadge>
          </div>
          <p className="mono-data mt-2 text-xs text-on-surface-variant">
            {line.sku}
            {line.partNumber ? ` / ${line.partNumber}` : ""}
          </p>
        </div>
        <ActionButton
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label={`Remove ${line.name}`}
        >
          <TrashIcon className="h-4 w-4" aria-hidden />
        </ActionButton>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-outline-variant/10 bg-surface/80 px-3 py-3 text-center">
          <p className="label-caps text-[0.65rem] text-on-surface-variant">System</p>
          <p className="mono-data mt-1 text-lg font-semibold">{line.systemQty}</p>
        </div>
        <div className="rounded-xl border border-outline-variant/10 bg-surface/80 px-3 py-3 text-center">
          <p className="label-caps text-[0.65rem] text-on-surface-variant">Variance</p>
          <p
            className={`mono-data mt-1 text-lg font-semibold ${
              variance < 0
                ? "text-error"
                : variance > 0
                  ? "text-on-warning-container"
                  : "text-on-surface-variant"
            }`}
          >
            {variance > 0 ? `+${variance}` : variance}
          </p>
        </div>
        <div className="col-span-2 rounded-xl border border-outline-variant/10 bg-surface/80 px-3 py-3 sm:col-span-1">
          <p className="label-caps text-center text-[0.65rem] text-on-surface-variant">
            Counted
          </p>
          <div className="mt-2 flex justify-center">
            <QuantityStepper
              value={line.counted}
              onChange={onUpdateCounted}
              label={`Counted quantity for ${line.name}`}
              centered
            />
          </div>
        </div>
      </div>

      {variance !== 0 ? (
        <div className="mt-3 flex justify-end">
          <ActionButton
            type="button"
            variant="outline"
            size="sm"
            onClick={onSetSystemQty}
          >
            <ArrowPathIcon className="h-3.5 w-3.5" aria-hidden />
            Use system qty ({line.systemQty})
          </ActionButton>
        </div>
      ) : null}
    </article>
  );
}

export function CountLinesTable({
  lines,
  lastTouchedKey,
  onUpdateCounted,
  onSetSystemQty,
  onRemove,
}: {
  lines: CountLine[];
  lastTouchedKey: string | null;
  onUpdateCounted: (type: CountItemType, id: number, value: number) => void;
  onSetSystemQty: (type: CountItemType, id: number) => void;
  onRemove: (type: CountItemType, id: number) => void;
}) {
  return (
    <DataTableCard className="hidden overflow-hidden border-outline-variant/10 md:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm text-on-surface">
          <thead className="sticky top-0 z-10 border-b border-outline-variant/20 bg-surface-container-low text-on-surface-variant">
            <tr>
              <th className="label-caps px-4 py-4 md:px-6">Item</th>
              <th className="label-caps px-4 py-4 md:px-6">SKU</th>
              <th className="label-caps px-4 py-4 text-center md:px-6">System qty</th>
              <th className="label-caps px-4 py-4 text-center md:px-6">Counted qty</th>
              <th className="label-caps px-4 py-4 text-center md:px-6">Variance</th>
              <th className="label-caps px-4 py-4 md:px-6">Status</th>
              <th className="label-caps px-4 py-4 text-right md:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5 bg-surface">
            {lines.map((line) => {
              const key = lineKey(line.type, line.id);
              const variance = computeVariance(line);
              const status = getDiscrepancyStatus(variance);
              const rowTint =
                variance < 0
                  ? "bg-error-container/25"
                  : variance > 0
                    ? "bg-warning-container/25"
                    : "";
              const isHighlighted = lastTouchedKey === key;

              return (
                <tr
                  key={key}
                  className={`data-row group ${rowTint} ${
                    isHighlighted ? "ring-1 ring-inset ring-primary/30" : ""
                  }`.trim()}
                >
                  <td className="px-4 py-4 md:px-6">
                    <div className="flex items-center gap-3">
                      <CountItemThumbnail image={line.image} name={line.name} />
                      <div className="min-w-0">
                        <p className="font-medium text-on-surface">{line.name}</p>
                        <span className="form-chip mt-1.5 bg-primary/8 text-primary border-primary/15">
                          {getLookupItemKindLabel(line.type)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="mono-data px-4 py-4 text-xs text-on-surface-variant md:px-6">
                    {line.sku}
                    {line.partNumber ? ` / ${line.partNumber}` : ""}
                  </td>
                  <td className="mono-data px-4 py-4 text-center font-semibold md:px-6">
                    {line.systemQty}
                  </td>
                  <td className="px-4 py-4 md:px-6">
                    <QuantityStepper
                      value={line.counted}
                      onChange={(next) => onUpdateCounted(line.type, line.id, next)}
                      label={`Counted quantity for ${line.name}`}
                    />
                  </td>
                  <td
                    className={`mono-data px-4 py-4 text-center font-semibold md:px-6 ${
                      variance < 0
                        ? "text-error"
                        : variance > 0
                          ? "text-on-warning-container"
                          : "text-on-surface-variant"
                    }`}
                  >
                    {variance > 0 ? `+${variance}` : variance}
                  </td>
                  <td className="px-4 py-4 md:px-6">
                    <StatusBadge tone={statusTone[status]}>
                      {statusLabel[status]}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-4 text-right md:px-6">
                    <div className="flex items-center justify-end gap-1">
                      {variance !== 0 ? (
                        <ActionButton
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onSetSystemQty(line.type, line.id)}
                          title={`Set counted to system qty (${line.systemQty})`}
                        >
                          <ArrowPathIcon className="h-3.5 w-3.5" aria-hidden />
                        </ActionButton>
                      ) : null}
                      <ActionButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(line.type, line.id)}
                        aria-label={`Remove ${line.name}`}
                      >
                        <TrashIcon className="h-4 w-4" aria-hidden />
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DataTableCard>
  );
}

// ══════════════════════════════════════════════════════
// NEW COMPONENTS
// ══════════════════════════════════════════════════════

/** Sort control dropdown for the count list */
export function SortControl({
  sortKey,
  options,
  onChange,
}: {
  sortKey: CountSortKey;
  options: Array<{ id: CountSortKey; label: string }>;
  onChange: (key: CountSortKey) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <ArrowsUpDownIcon className="h-4 w-4 text-on-surface-variant" aria-hidden />
      <SearchableSelect
        value={sortKey}
        onChange={(value) => onChange(value as CountSortKey)}
        options={options.map((opt) => ({ value: opt.id, label: opt.label }))}
        className="form-input-base py-1.5 pl-2 pr-2 text-xs font-semibold"
        aria-label="Sort items by"
      />
    </div>
  );
}

/** Batch actions bar shown when items are in the count */
export function BatchActionsBar({
  lineCount,
  matchCount,
  discrepancyCount,
  refreshing,
  applying,
  onRefreshStock,
  onSetAllToSystem,
  onResetAllCounted,
  onRemoveMatches,
  onApplyDiscrepancies,
}: {
  lineCount: number;
  matchCount: number;
  discrepancyCount: number;
  refreshing: boolean;
  applying?: boolean;
  onRefreshStock: () => void;
  onSetAllToSystem: () => void;
  onResetAllCounted: () => void;
  onRemoveMatches: () => void;
  onApplyDiscrepancies?: () => void;
}) {
  if (lineCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-lowest px-4 py-3">
      <p className="mr-auto text-xs font-semibold text-on-surface-variant">
        Batch actions
      </p>
      {onApplyDiscrepancies ? (
        <ActionButton
          type="button"
          tone="primary"
          size="sm"
          onClick={onApplyDiscrepancies}
          disabled={discrepancyCount === 0 || applying}
          title="Apply current counts directly to system stock"
        >
          {applying ? (
            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden />
          )}
          {applying ? "Applying…" : "Apply count"}
        </ActionButton>
      ) : null}
      <ActionButton
        type="button"
        variant="outline"
        size="sm"
        onClick={onRefreshStock}
        disabled={refreshing}
        title="Refresh all system quantities from the server"
      >
        <ArrowPathIcon
          className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          aria-hidden
        />
        {refreshing ? "Refreshing…" : "Refresh stock"}
      </ActionButton>
      <ActionButton
        type="button"
        variant="outline"
        size="sm"
        onClick={onSetAllToSystem}
        disabled={discrepancyCount === 0}
        title="Set all counted quantities to their system values"
      >
        Set all = system
      </ActionButton>
      <ActionButton
        type="button"
        variant="outline"
        size="sm"
        onClick={onResetAllCounted}
        title="Reset all counted quantities to zero"
      >
        Reset all to 0
      </ActionButton>
      {matchCount > 0 ? (
        <ActionButton
          type="button"
          variant="outline"
          size="sm"
          onClick={onRemoveMatches}
          title="Remove all items that match system stock"
        >
          Remove {matchCount} match{matchCount !== 1 ? "es" : ""}
        </ActionButton>
      ) : null}
    </div>
  );
}

/** Scan history panel showing recent scans */
export function ScanHistoryPanel({
  history,
  onRescan,
  scanBusy,
}: {
  history: CountSessionLastScan[];
  onRescan: (scan: CountSessionLastScan) => void;
  scanBusy: boolean;
}) {
  if (history.length === 0) return null;

  return (
    <div className="rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-lowest p-4">
      <div className="mb-3 flex items-center gap-2">
        <ClockIcon className="h-4 w-4 text-on-surface-variant" aria-hidden />
        <p className="label-caps text-on-surface-variant">Recent scans</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {history.slice(0, 5).map((scan) => {
          const variance = scan.counted - scan.systemQty;
          const status = getDiscrepancyStatus(variance);
          return (
            <button
              key={scan.key}
              type="button"
              disabled={scanBusy}
              onClick={() => onRescan(scan)}
              className={`group flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-all hover:shadow-sm ${
                status === "match"
                  ? "border-success/20 bg-success/5 hover:bg-success/10"
                  : status === "shortage"
                    ? "border-error/20 bg-error/5 hover:bg-error/10"
                    : "border-warning/20 bg-warning/5 hover:bg-warning/10"
              }`}
              title={`Re-scan "${scan.name}" (${scan.sku})`}
            >
              <CountItemThumbnail image={scan.image} name={scan.name} />
              <div className="min-w-0">
                <p className="truncate font-medium text-on-surface">{scan.name}</p>
                <p className="mono-data text-on-surface-variant">{scan.sku}</p>
              </div>
              <span className="ml-auto shrink-0">
                <StatusBadge tone={statusTone[status]}>
                  {scan.counted}/{scan.systemQty}
                </StatusBadge>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Bulk Recap Table for listing all products/spare parts */
export function BulkRecapTable({
  type,
  records,
  lines,
  onToggleInclusion,
  onUpdateCounted,
}: {
  type: CountItemType;
  records: Array<ProductRecord | SparePartRecord>;
  lines: CountLine[];
  onToggleInclusion: (type: CountItemType, record: ProductRecord | SparePartRecord, include: boolean) => void;
  onUpdateCounted: (type: CountItemType, record: ProductRecord | SparePartRecord, value: number) => void;
}) {
  return (
    <DataTableCard className="overflow-hidden border-outline-variant/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm text-on-surface">
          <thead className="sticky top-0 z-10 border-b border-outline-variant/20 bg-surface-container-low text-on-surface-variant">
            <tr>
              <th className="label-caps px-4 py-4 md:px-6 w-16 text-center">Include</th>
              <th className="label-caps px-4 py-4 md:px-6">Item</th>
              <th className="label-caps px-4 py-4 md:px-6">SKU</th>
              <th className="label-caps px-4 py-4 text-center md:px-6">System Qty</th>
              <th className="label-caps px-4 py-4 text-center md:px-6">Real Qty</th>
              <th className="label-caps px-4 py-4 md:px-6 text-center">Variance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5 bg-surface">
            {records.map((record) => {
              const lineKeyStr = lineKey(type, record.id);
              const line = lines.find((l) => lineKey(l.type, l.id) === lineKeyStr);
              const isIncluded = !!line;
              const counted = line?.counted ?? 0;
              const variance = isIncluded ? counted - record.stock_quantity : 0;
              const status = getDiscrepancyStatus(variance);
              const rowTint = isIncluded
                ? variance < 0
                  ? "bg-error-container/15"
                  : variance > 0
                    ? "bg-warning-container/15"
                    : "bg-success-container/10"
                : "";

              return (
                <tr key={record.id} className={`data-row ${rowTint}`.trim()}>
                  <td className="px-4 py-4 md:px-6 text-center">
                    <input
                      type="checkbox"
                      checked={isIncluded}
                      onChange={(e) => onToggleInclusion(type, record, e.target.checked)}
                      className="h-4 w-4 rounded border-outline-variant/30 text-primary focus:ring-primary cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-4 md:px-6">
                    <div className="flex items-center gap-3">
                      <CountItemThumbnail image={record.image || undefined} name={record.name} />
                      <div className="min-w-0">
                        <p className="font-medium text-on-surface">{record.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="mono-data px-4 py-4 text-xs text-on-surface-variant md:px-6">
                    {record.sku}
                  </td>
                  <td className="mono-data px-4 py-4 text-center font-semibold md:px-6">
                    {record.stock_quantity}
                  </td>
                  <td className="px-4 py-4 text-center md:px-6">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={isIncluded ? counted : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val !== "") {
                           onUpdateCounted(type, record, e.target.valueAsNumber);
                        } else {
                           onUpdateCounted(type, record, 0);
                        }
                      }}
                      placeholder={String(record.stock_quantity)}
                      className="form-input-base w-24 px-3 py-2 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none mx-auto"
                    />
                  </td>
                  <td className="px-4 py-4 text-center md:px-6">
                    {isIncluded ? (
                      <StatusBadge tone={statusTone[status]}>
                        {variance > 0 ? `+${variance}` : variance}
                      </StatusBadge>
                    ) : (
                      <span className="text-on-surface-variant">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DataTableCard>
  );
}
