"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  MapPinIcon,
  TagIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { AssetDocumentList } from "@/components/assets/AssetDocumentList";
import { ActionButton, StatusBadge } from "@/components/ops-ui";
import { formatDate } from "@/components/reporting/finance-utils";
import {
  MACHINE_CATEGORY_OPTIONS,
  MACHINE_STATUS_OPTIONS,
  type MachineCategory,
  type MachineRecord,
  type MachineStatus,
} from "@/lib/api/machines";
import { formatEgp } from "@/lib/currencies";

function getCategoryLabel(category: MachineCategory): string {
  return (
    MACHINE_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    category
  );
}

function getStatusLabel(status: MachineStatus): string {
  return (
    MACHINE_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  );
}

function getStatusTone(
  status: MachineStatus,
): "success" | "warning" | "default" {
  if (status === "active") return "success";
  if (status === "inactive") return "warning";
  return "default";
}

function CategoryIcon({
  category,
  className = "h-5 w-5",
}: {
  category: MachineCategory;
  className?: string;
}) {
  switch (category) {
    case "vehicle":
      return <TruckIcon className={className} aria-hidden />;
    case "equipment":
      return <WrenchScrewdriverIcon className={className} aria-hidden />;
    default:
      return <Cog6ToothIcon className={className} aria-hidden />;
  }
}

function formatMachineCost(value?: number): string {
  if (value == null) return "—";
  return formatEgp(value);
}

function documentSummary(documents: MachineRecord["documents"]): string {
  const invoiceCount = (documents ?? []).filter(
    (document) => document.type === "invoice",
  ).length;
  const contractCount = (documents ?? []).filter(
    (document) => document.type === "contract",
  ).length;

  const parts: string[] = [];
  if (invoiceCount > 0) {
    parts.push(`${invoiceCount} Document${invoiceCount === 1 ? "" : "s"}`);
  }
  if (contractCount > 0) {
    parts.push(`${contractCount} Document${contractCount === 1 ? "" : "s"}`);
  }

  return parts.join(" · ");
}

type AssetMachineCardProps = {
  machine: MachineRecord;
  isActive?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function AssetMachineCard({
  machine,
  isActive = false,
  canUpdate = false,
  canDelete = false,
  onEdit,
  onDelete,
}: AssetMachineCardProps) {
  const [documentsExpanded, setDocumentsExpanded] = useState(false);
  const documents = machine.documents ?? [];
  const hasDocuments = documents.length > 0;
  const summary = documentSummary(documents);

  return (
    <article
      className={[
        "relative overflow-hidden rounded-2xl border bg-surface px-4 py-4 transition-colors",
        isActive
          ? "border-primary/30 bg-surface-selected shadow-sm"
          : "border-outline-variant/10 hover:border-outline-variant/20",
      ].join(" ")}
    >
      <span
        className={[
          "absolute inset-y-3 left-0 w-1 rounded-full transition-colors",
          isActive ? "bg-primary" : "bg-transparent",
        ].join(" ")}
        aria-hidden
      />

      <div className="flex flex-col gap-4 pl-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-outline-variant/15 bg-surface-container-low text-on-surface-variant">
                <CategoryIcon category={machine.category} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-semibold text-on-surface">
                    {machine.name}
                  </h3>
                  <StatusBadge tone="default">
                    {getCategoryLabel(machine.category)}
                  </StatusBadge>
                  <StatusBadge tone={getStatusTone(machine.status)}>
                    {getStatusLabel(machine.status)}
                  </StatusBadge>
                </div>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Asset #{machine.id}
                </p>
              </div>
            </div>

            <div className="sm:text-right">
              <p className="label-caps text-on-surface-variant">Purchase cost</p>
              <p className="mono-data mt-1 text-lg font-semibold text-on-surface">
                {formatMachineCost(machine.purchase_cost)}
              </p>
            </div>
          </div>

          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low px-3 py-2.5">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
                <TagIcon className="h-3.5 w-3.5" aria-hidden />
                Serial
              </dt>
              <dd className="mt-1 truncate text-sm font-medium text-on-surface">
                {machine.serial_number || "Not recorded"}
              </dd>
            </div>
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low px-3 py-2.5">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
                <MapPinIcon className="h-3.5 w-3.5" aria-hidden />
                Location
              </dt>
              <dd className="mt-1 truncate text-sm font-medium text-on-surface">
                {machine.location || "Not recorded"}
              </dd>
            </div>
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low px-3 py-2.5">
              <dt className="text-xs font-medium text-on-surface-variant">
                Purchased
              </dt>
              <dd className="mt-1 text-sm font-medium text-on-surface">
                {formatDate(machine.purchase_date)}
              </dd>
            </div>
          </dl>

          {machine.notes ? (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-on-surface-variant">
              {machine.notes}
            </p>
          ) : null}

          <div className="mt-3">
            {hasDocuments ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setDocumentsExpanded((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
                >
                  <DocumentTextIcon className="h-4 w-4 text-on-surface-variant" />
                  <span>{summary}</span>
                  {documentsExpanded ? (
                    <ChevronUpIcon className="h-4 w-4" aria-hidden />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" aria-hidden />
                  )}
                </button>
                {documentsExpanded ? (
                  <AssetDocumentList documents={documents} compact />
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">
                No invoices or contracts attached.
              </p>
            )}
          </div>
        </div>

        {canUpdate || canDelete ? (
          <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
            {canUpdate ? (
              <ActionButton
                variant="outline"
                size="sm"
                onClick={onEdit}
                aria-current={isActive ? "true" : undefined}
              >
                {isActive ? "Editing" : "Edit"}
              </ActionButton>
            ) : null}
            {canDelete ? (
              <ActionButton variant="outline" size="sm" onClick={onDelete}>
                Delete
              </ActionButton>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function AssetListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-outline-variant/10 bg-surface px-4 py-4"
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-surface-container-high" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-4 w-40 animate-pulse rounded-full bg-surface-container-high" />
              <div className="h-3 w-56 animate-pulse rounded-full bg-surface-container-high/70" />
              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((__, cellIndex) => (
                  <div
                    key={cellIndex}
                    className="h-16 animate-pulse rounded-xl bg-surface-container-high/60"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function summarizePageAssetValue(machines: MachineRecord[]): number {
  return machines.reduce(
    (total, machine) => total + (machine.purchase_cost ?? 0),
    0,
  );
}
