"use client";

import type { HistoryChangeEntry } from "@/lib/api/history";

export function HistoryChangeDiff({ changes }: { changes: HistoryChangeEntry[] }) {
  if (changes.length === 0) {
    return (
      <p className="text-sm text-on-surface-variant">
        No structured field changes were captured for this event.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {changes.map((change) => (
        <div
          key={`${change.field}-${change.before}-${change.after}`}
          className="rounded-xl border border-outline-variant/12 bg-surface overflow-hidden"
        >
          <div className="border-b border-outline-variant/10 bg-surface-container-low px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              {change.label}
            </p>
          </div>
          <div className="grid gap-px bg-outline-variant/10 md:grid-cols-2">
            <div className="bg-error-container/30 px-3 py-2.5">
              <p className="label-caps">
                Before
              </p>
              <p className="mono-data mt-1 text-sm text-on-surface break-words">{change.before}</p>
            </div>
            <div className="bg-primary-container/40 px-3 py-2.5">
              <p className="label-caps">
                After
              </p>
              <p className="mono-data mt-1 text-sm text-on-surface break-words">{change.after}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
