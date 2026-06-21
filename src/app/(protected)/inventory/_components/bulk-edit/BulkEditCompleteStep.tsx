"use client";

import Link from "next/link";
import { ActionButton, SurfaceCard } from "@/components/ops-ui";

type BulkEditCompleteStepProps = {
  successUpdated: number;
  listHref: string;
};

export function BulkEditCompleteStep({ successUpdated, listHref }: BulkEditCompleteStepProps) {
  return (
    <SurfaceCard className="animate-scale-in p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary-container">
        <svg
          className="h-7 w-7 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="font-display text-xl font-bold text-on-surface">Bulk edit applied</h2>
      <p className="mt-2 text-sm text-on-surface-variant">
        Updated <span className="mono-data font-medium text-on-surface">{successUpdated}</span>{" "}
        items successfully.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href={listHref}>
          <ActionButton tone="primary">Back to list</ActionButton>
        </Link>
      </div>
    </SurfaceCard>
  );
}
