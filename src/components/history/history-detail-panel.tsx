"use client";

import { useEffect } from "react";
import type { HistoryRecord } from "@/lib/api/history";
import { ActionButton, StatusBadge } from "@/components/ops-ui";
import { HistoryChangeDiff } from "@/components/history/history-change-diff";
import {
  actionLabel,
  actionTone,
  formatRelativeTime,
  formatTimestamp,
} from "@/components/history/history-utils";

export function HistoryDetailPanel({
  record,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: {
  record: HistoryRecord;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowUp" && hasPrevious) onPrevious?.();
      if (event.key === "ArrowDown" && hasNext) onNext?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasNext, hasPrevious, onClose, onNext, onPrevious]);

  return (
    <>
      <button
        type="button"
        aria-label="Close history details"
        className="form-modal-overlay fixed inset-0 z-40"
        onClick={onClose}
      />
      <aside className="animate-slide-in-right fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-outline-variant/20 bg-surface-container-lowest shadow-[var(--shadow-ambient)]">
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/15 px-5 py-4">
          <div className="min-w-0">
            <p className="label-caps">Audit event #{record.id}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-semibold text-on-surface">
                {record.entity_label}
              </h2>
              <StatusBadge tone={actionTone(record.action)}>
                {actionLabel(record.action)}
              </StatusBadge>
            </div>
            <p className="mono-data mt-1 text-sm text-on-surface-variant">
              Record #{record.model_id}
              {record.changes_count > 0 ? ` · ${record.changes_count} field(s)` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-outline-variant/20 bg-surface px-3 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container"
          >
            Close
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-outline-variant/10 px-5 py-2">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!hasPrevious}
              onClick={onPrevious}
              className="rounded-lg border border-outline-variant/20 px-3 py-1.5 text-xs font-semibold text-on-surface disabled:opacity-40 hover:bg-surface-container"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={onNext}
              className="rounded-lg border border-outline-variant/20 px-3 py-1.5 text-xs font-semibold text-on-surface disabled:opacity-40 hover:bg-surface-container"
            >
              Next
            </button>
          </div>
          <p className="text-xs text-on-surface-variant">↑↓ navigate · Esc close</p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="grid gap-3 rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-low p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-on-surface-variant">When</span>
              <span className="text-right">
                <span className="block font-medium text-on-surface">
                  {formatRelativeTime(record.created_at)}
                </span>
                <span className="mono-data text-xs text-on-surface-variant">
                  {formatTimestamp(record.created_at)}
                </span>
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-on-surface-variant">User</span>
              <span className="text-right text-on-surface">
                {record.user?.name ?? "System"}
                {record.user?.email ? (
                  <span className="block mono-data text-xs text-on-surface-variant">
                    {record.user.email}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-on-surface-variant">IP</span>
              <span className="mono-data text-on-surface">{record.ip_address ?? "—"}</span>
            </div>
          </div>

          {record.entity_path ? (
            <ActionButton href={record.entity_path} tone="primary">
              Open {record.entity_label}
            </ActionButton>
          ) : null}

          <section>
            <h3 className="label-caps">Field changes</h3>
            <div className="mt-3">
              <HistoryChangeDiff changes={record.changes} />
            </div>
          </section>

          {record.summary.length > 0 ? (
            <section>
              <h3 className="label-caps">Summary lines</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface">
                {record.summary.map((line) => (
                  <li
                    key={line}
                    className="rounded-xl border border-outline-variant/12 bg-surface px-3 py-2"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <details className="rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-low">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-on-surface">
              Raw JSON payload
            </summary>
            <div className="space-y-3 border-t border-outline-variant/10 px-4 py-4">
              <div>
                <p className="label-caps">Before</p>
                <pre className="mono-data mt-2 overflow-x-auto rounded-xl bg-surface-container p-3 text-xs text-on-surface">
                  {JSON.stringify(record.before, null, 2) ?? "null"}
                </pre>
              </div>
              <div>
                <p className="label-caps">After</p>
                <pre className="mono-data mt-2 overflow-x-auto rounded-xl bg-surface-container p-3 text-xs text-on-surface">
                  {JSON.stringify(record.after, null, 2) ?? "null"}
                </pre>
              </div>
            </div>
          </details>
        </div>
      </aside>
    </>
  );
}
