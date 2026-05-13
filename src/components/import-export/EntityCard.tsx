"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/ops-ui";
import type { ImportExportEntity } from "@/types/import-export";
import {
  ArrowDownTrayIcon,
  ArrowRightIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  TagIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";

function EntityIcon({ slug }: { slug: string }) {
  if (slug.includes("product")) return <CubeIcon className="h-6 w-6" />;
  if (slug.includes("part") || slug.includes("maintenance")) return <WrenchScrewdriverIcon className="h-6 w-6" />;
  if (slug.includes("brand")) return <TagIcon className="h-6 w-6" />;
  return <ClipboardDocumentListIcon className="h-6 w-6" />;
}

export function EntityCard({ entity }: { entity: ImportExportEntity }) {
  const requiredCount = entity.columns.filter((column) => column.required).length;

  return (
    <div className="group flex h-full flex-col rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-lowest p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-ambient">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary">
            <EntityIcon slug={entity.slug} />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-on-surface">{entity.label}</h3>
            <p className="mono-data mt-1 text-on-surface-variant">{entity.slug}</p>
          </div>
        </div>
        <StatusBadge tone="primary">{entity.columns.length} fields</StatusBadge>
      </div>

      <div className="mb-5 flex-grow">
        <p className="text-sm leading-6 text-on-surface-variant">
          Preview, validate, import, export, and download guided templates for this dataset.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {entity.columns.slice(0, 5).map((column) => (
            <span
              key={column.key}
              className="rounded-lg border border-outline-variant/10 bg-surface px-2 py-1 text-xs text-on-surface-variant"
            >
              {column.label}
              {column.required ? <span className="ml-1 text-error">*</span> : null}
            </span>
          ))}
          {entity.columns.length > 5 ? (
            <span className="rounded-lg px-2 py-1 text-xs font-semibold text-on-surface-variant">
              +{entity.columns.length - 5}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 text-xs text-on-surface-variant">
        <div className="rounded-xl bg-surface p-3">
          <p className="label-caps">Required</p>
          <p className="mono-data mt-1 text-on-surface">{requiredCount}</p>
        </div>
        <div className="rounded-xl bg-surface p-3">
          <p className="label-caps">Template</p>
          <p className="mt-1 flex items-center gap-1 font-semibold text-on-surface">
            <ArrowDownTrayIcon className="h-4 w-4" />
            Guided
          </p>
        </div>
      </div>

      <Link
        href={`/data/import-export/${entity.slug}`}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary shadow-md shadow-primary/15 transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-primary/25"
      >
        Open workflow
        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
