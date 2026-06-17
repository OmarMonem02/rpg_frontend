"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { StatusBadge } from "@/components/ops-ui";
import type { ImportExportEntity } from "@/types/import-export";
import {
  ArrowDownTrayIcon,
  ArrowRightIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CubeIcon,
  RectangleStackIcon,
  TagIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";


function EntityIcon({ slug }: { slug: string }) {
  if (slug === "products") return <CubeIcon className="h-6 w-6" />;
  if (slug === "maintenance_services") return <Cog6ToothIcon className="h-6 w-6" />;
  if (slug.includes("category") || slug.includes("sector") || slug === "brands") {
    return <RectangleStackIcon className="h-6 w-6" />;
  }
  if (slug.includes("brand")) return <TagIcon className="h-6 w-6" />;
  if (slug.includes("part") || slug.includes("maintenance")) {
    return <WrenchScrewdriverIcon className="h-6 w-6" />;
  }
  return <ClipboardDocumentListIcon className="h-6 w-6" />;
}

type EntityCardProps = {
  entity: ImportExportEntity;
  dragHandle?: ReactNode;
  isDragging?: boolean;
};

export function EntityCard({ entity, dragHandle, isDragging = false }: EntityCardProps) {
  const { requiredCount, previewColumns, remainingCount } = useMemo(() => {
    const required = entity.columns.filter((column) => column.required);
    const optional = entity.columns.filter((column) => !column.required);
    const ordered = [...required, ...optional];
    const preview = ordered.slice(0, 4);

    return {
      requiredCount: required.length,
      previewColumns: preview,
      remainingCount: Math.max(ordered.length - preview.length, 0),
    };
  }, [entity.columns]);

  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-lowest p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-ambient ${
        isDragging ? "opacity-60 shadow-ambient" : ""
      }`}
    >
      {dragHandle ? (
        <div className="absolute right-4 top-4 z-10">{dragHandle}</div>
      ) : null}

      <Link
        href={`/data/import-export/${entity.slug}`}
        className="flex min-h-0 flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          aria-hidden
        />

        <div className={`mb-4 flex items-start justify-between gap-3 ${dragHandle ? "pr-10" : ""}`}>
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary transition-colors group-hover:border-primary/25 group-hover:bg-primary/10">
              <EntityIcon slug={entity.slug} />
            </div>
            <div className="min-w-0">
              <h3 className="mt-1 text-lg font-semibold leading-tight text-on-surface group-hover:text-primary">
                {entity.label}
              </h3>
              <p className="mono-data mt-1 truncate text-xs text-on-surface-variant/80">{entity.slug}</p>
            </div>
          </div>
          <StatusBadge tone="primary" className="shrink-0">
            {entity.columns.length} fields
          </StatusBadge>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-outline-variant/10 bg-surface px-3 py-2.5">
            <p className="label-caps text-on-surface-variant">Required</p>
            <p className="mono-data mt-1 text-base font-semibold text-on-surface">{requiredCount}</p>
          </div>
          <div className="rounded-xl border border-outline-variant/10 bg-surface px-3 py-2.5">
            <p className="label-caps text-on-surface-variant">Template</p>
            <p className="mt-1 flex items-center gap-1 font-semibold text-on-surface">
              <ArrowDownTrayIcon className="h-3.5 w-3.5 text-primary" />
              XLSX / CSV
            </p>
          </div>
        </div>

        <div className="mb-5 flex-grow">
          <p className="label-caps mb-2 text-on-surface-variant">Key fields</p>
          <div className="flex flex-wrap gap-1.5">
            {previewColumns.map((column) => (
              <span
                key={column.key}
                className={`rounded-lg border px-2 py-1 text-xs ${
                  column.required
                    ? "border-error/20 bg-error/5 text-on-surface"
                    : "border-outline-variant/10 bg-surface text-on-surface-variant"
                }`}
              >
                {column.label}
                {column.required ? <span className="ml-1 font-bold text-error">*</span> : null}
              </span>
            ))}
            {remainingCount > 0 ? (
              <span className="rounded-lg px-2 py-1 text-xs font-semibold text-on-surface-variant">
                +{remainingCount} more
              </span>
            ) : null}
          </div>
        </div>

        <span className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary shadow-md shadow-primary/15 transition-all duration-200 group-hover:-translate-y-px group-hover:shadow-lg group-hover:shadow-primary/25">
          Open workflow
          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </div>
  );
}
