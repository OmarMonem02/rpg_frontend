"use client";

import { useState } from "react";
import type { PublicTicketTracking, TrackingTimelineStep } from "@/lib/public-tracking-api";
import { formatMoney } from "@/lib/public-tracking-api";

type TicketStatus = "pending" | "in_progress" | "completed" | string;

function statusTone(status: TicketStatus): "default" | "primary" | "accent" {
  if (status === "completed") return "primary";
  if (status === "in_progress") return "accent";
  return "default";
}

const statusToneClasses = {
  default:
    "border-outline-variant/20 bg-surface-container text-on-surface-variant",
  primary: "border-primary/20 bg-primary-container text-on-primary-container",
  accent: "border-accent/25 bg-accent/10 text-accent",
} as const;

export function TrackingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="tracking-page min-h-screen bg-background text-on-surface">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--color-primary)_14%,transparent)_0%,transparent_68%)]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-6 pb-32 sm:px-6 sm:py-8">
        {children}
      </div>
    </div>
  );
}

export function TrackingLoadingState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24">
      <span
        className="h-10 w-10 animate-spin rounded-full border-2 border-outline-variant/30 border-t-primary"
        aria-hidden
      />
      <p className="text-sm text-on-surface-variant">Loading your ticket…</p>
    </div>
  );
}

export function TrackingErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 animate-fade-in">
      <div className="w-full max-w-md rounded-[1.5rem] border border-dashed border-outline-variant/25 bg-surface-container p-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-error/20 bg-error-container text-error">
          <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-semibold text-on-surface">Link unavailable</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-on-surface-variant">{message}</p>
      </div>
    </div>
  );
}

function shopInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ShopLogo({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(logoUrl) && !failed;

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo URL is configurable (relative or external)
        <img
          src={logoUrl!}
          alt={`${name} logo`}
          className="h-full w-full object-contain p-1.5"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="font-display text-lg font-extrabold text-primary" aria-hidden>
          {shopInitials(name) || "RPG"}
        </span>
      )}
    </div>
  );
}

export function TrackingHeader({
  shopName,
  tagline,
  logoUrl,
  ticketNumber,
  status,
  statusLabel,
  updatedAtHuman,
}: {
  shopName: string;
  tagline: string;
  logoUrl?: string | null;
  ticketNumber: string;
  status: string;
  statusLabel?: string;
  updatedAtHuman?: string | null;
}) {
  const tone = statusTone(status);

  return (
    <header className="mb-6 animate-app-shell-enter">
      <div className="overflow-hidden rounded-[1.75rem] border border-outline-variant/15 bg-surface-container-lowest shadow-[var(--shadow-ambient)]">
        <div className="border-b border-outline-variant/10 bg-primary/5 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-4">
            <ShopLogo name={shopName} logoUrl={logoUrl} />
            <div className="min-w-0 flex-1">
              <p className="label-caps text-primary">Maintenance tracking</p>
              <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
                {shopName}
              </h1>
              <p className="mt-1 text-sm text-on-surface-variant">{tagline}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
          <div>
            <p className="label-caps">Ticket number</p>
            <p className="mono-data mt-1 text-2xl font-bold text-on-surface">#{ticketNumber}</p>
            {updatedAtHuman ? (
              <p className="mt-1 text-xs text-on-surface-variant">Updated {updatedAtHuman}</p>
            ) : null}
          </div>
          <StatusPill status={status} label={statusLabel} tone={tone} />
        </div>
      </div>
    </header>
  );
}

export function StatusPill({
  status,
  label,
  tone,
}: {
  status: string;
  label?: string;
  tone?: "default" | "primary" | "accent";
}) {
  const resolvedTone = tone ?? statusTone(status);
  const display = label ?? status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold capitalize before:mr-2 before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:bg-current ${statusToneClasses[resolvedTone]}`}
    >
      {display}
    </span>
  );
}

export function TasksProgressBar({
  completed,
  total,
  percent,
}: {
  completed: number;
  total: number;
  percent: number;
}) {
  return (
    <section className="mb-6 rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-[var(--shadow-ambient)]">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-on-surface">Work progress</h2>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            {completed} of {total} tasks completed
          </p>
        </div>
        <span className="mono-data rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-on-primary">
          {percent}%
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-surface-container"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </section>
  );
}

export function ProgressTimeline({ steps }: { steps: TrackingTimelineStep[] }) {
  return (
    <section className="mb-6 rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-lowest p-5 shadow-[var(--shadow-ambient)]">
      <h2 className="label-caps mb-5">Service status</h2>

      <ol className="hidden gap-2 sm:grid sm:grid-cols-3">
        {steps.map((step, index) => (
          <TimelineStepHorizontal key={step.key} step={step} index={index} isLast={index === steps.length - 1} />
        ))}
      </ol>

      <ol className="space-y-0 sm:hidden">
        {steps.map((step, index) => (
          <TimelineStepVertical key={step.key} step={step} index={index} isLast={index === steps.length - 1} />
        ))}
      </ol>
    </section>
  );
}

function stepIndicatorClasses(state: TrackingTimelineStep["state"]): string {
  if (state === "done") {
    return "border-primary bg-primary text-on-primary";
  }
  if (state === "current") {
    return "border-accent bg-accent/15 text-accent ring-4 ring-accent/10";
  }
  return "border-outline-variant/25 bg-surface-container text-on-surface-variant/50";
}

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M3 8.5 6.5 12 13 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TimelineStepHorizontal({
  step,
  index,
  isLast,
}: {
  step: TrackingTimelineStep;
  index: number;
  isLast: boolean;
}) {
  return (
    <li className="relative flex flex-col items-center text-center">
      {!isLast ? (
        <span
          className={`absolute left-[calc(50%+1.25rem)] top-4 h-0.5 w-[calc(100%-2.5rem)] ${
            step.state === "done" ? "bg-primary/40" : "bg-outline-variant/20"
          }`}
          aria-hidden
        />
      ) : null}
      <span
        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${stepIndicatorClasses(step.state)}`}
      >
        {step.state === "done" ? <CheckIcon /> : index + 1}
      </span>
      <p
        className={`mt-3 text-xs font-semibold leading-snug ${
          step.state === "upcoming" ? "text-on-surface-variant/60" : "text-on-surface"
        }`}
      >
        {step.label}
      </p>
      {step.state === "current" ? (
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-accent">Current</p>
      ) : null}
    </li>
  );
}

function TimelineStepVertical({
  step,
  index,
  isLast,
}: {
  step: TrackingTimelineStep;
  index: number;
  isLast: boolean;
}) {
  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${stepIndicatorClasses(step.state)}`}
        >
          {step.state === "done" ? <CheckIcon /> : index + 1}
        </span>
        {!isLast ? (
          <span
            className={`my-1 min-h-6 w-0.5 flex-1 ${
              step.state === "done" ? "bg-primary/35" : "bg-outline-variant/20"
            }`}
          />
        ) : null}
      </div>
      <div className="pb-5 pt-0.5">
        <p
          className={`text-sm font-semibold ${
            step.state === "upcoming" ? "text-on-surface-variant/55" : "text-on-surface"
          }`}
        >
          {step.label}
        </p>
        {step.state === "current" ? (
          <p className="mt-0.5 text-xs font-medium text-accent">Current stage</p>
        ) : null}
      </div>
    </li>
  );
}

export function PhoneVerificationCard({
  phone,
  onPhoneChange,
  onSubmit,
  loading,
  error,
}: {
  phone: string;
  onPhoneChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string;
}) {
  return (
    <section className="form-section-card animate-fade-in shadow-[var(--shadow-ambient)]">
      <div className="form-section-header">
        <div>
          <h2 className="text-lg font-semibold text-on-surface">Verify your phone</h2>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">
            Enter the phone number on your service record to view parts, services, and totals.
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary">
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      <label className="block">
        <span className="label-caps mb-2 block">Phone number</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="e.g. 01001234567"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          className={`form-input-base ${error ? "form-input-error" : ""}`}
        />
      </label>

      {error ? (
        <p className="mt-3 rounded-xl border border-error/20 bg-error-container px-3 py-2 text-sm text-error">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading || !phone.trim()}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-on-primary shadow-md shadow-primary/15 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-primary/20 disabled:pointer-events-none disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
            Verifying…
          </>
        ) : (
          "View my ticket"
        )}
      </button>
    </section>
  );
}

export function TicketTrackingDashboard({ data }: { data: PublicTicketTracking }) {
  const { ticket, customer, bike, tasks, progress } = data;

  return (
    <>
      <TasksProgressBar
        completed={progress.tasks_completed}
        total={progress.tasks_total}
        percent={progress.tasks_percent}
      />

      <ProgressTimeline steps={progress.timeline} />

      {(customer.name || bike) && (
        <section className="mb-6 rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-lowest p-5 shadow-[var(--shadow-ambient)]">
          <h2 className="label-caps mb-4">Service details</h2>
          {customer.name ? (
            <p className="text-base font-semibold text-on-surface">{customer.name}</p>
          ) : null}
          {bike ? (
            <p className="mt-2 text-sm text-on-surface-variant">
              {[bike.brand, bike.model, bike.year].filter(Boolean).join(" · ")}
              {bike.vin ? (
                <span className="mono-data mt-2 block text-xs text-on-surface-variant/80">
                  VIN {bike.vin}
                </span>
              ) : null}
            </p>
          ) : null}
        </section>
      )}

      {ticket.customer_notes ? (
        <section className="mb-6 rounded-[1.25rem] border border-accent/20 bg-accent/5 p-4">
          <p className="label-caps text-accent">Shop note</p>
          <p className="mt-2 text-sm leading-6 text-on-surface">{ticket.customer_notes}</p>
        </section>
      ) : null}

      <section className="mb-6">
        <div className="divider mb-4 flex items-center justify-between gap-3 pb-4">
          <h2 className="text-sm font-semibold text-on-surface">Work &amp; items</h2>
          <span className="form-chip">
            {progress.tasks_completed}/{progress.tasks_total} tasks
          </span>
        </div>

        {tasks.length === 0 ? (
          <p className="rounded-[1.25rem] border border-dashed border-outline-variant/25 bg-surface-container p-6 text-center text-sm text-on-surface-variant">
            No work items listed yet.
          </p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>

      <TrackingTotalFooter total={ticket.total} />
    </>
  );
}

function TaskCard({ task }: { task: PublicTicketTracking["tasks"][number] }) {
  const isDone = task.status === "completed";

  return (
    <article className="overflow-hidden rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-lowest shadow-[var(--shadow-ambient)]">
      <div className="flex items-center justify-between gap-3 border-b border-outline-variant/10 bg-surface-container-low px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
              isDone
                ? "border-primary/25 bg-primary-container text-on-primary-container"
                : "border-outline-variant/20 bg-surface-container text-on-surface-variant"
            }`}
          >
            {isDone ? <CheckIcon /> : "·"}
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-on-surface">{task.name}</h3>
            <p className="text-xs text-on-surface-variant">{task.status_label}</p>
          </div>
        </div>
        <span className="mono-data shrink-0 text-sm font-semibold text-on-surface">
          {formatMoney(task.subtotal)}
        </span>
      </div>

      {task.items.length > 0 ? (
        <ul>
          {task.items.map((item) => (
            <li key={item.id} className="data-row flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-on-surface">{item.label}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant">
                  <span className="form-chip py-0.5 uppercase">{item.type}</span>
                  <span>Qty {item.qty}</span>
                  {item.discount > 0 ? <span>Disc. {formatMoney(item.discount)}</span> : null}
                </p>
              </div>
              <span className="mono-data shrink-0 font-semibold text-on-surface">
                {formatMoney(item.subtotal)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-xs text-on-surface-variant">No parts or services yet.</p>
      )}
    </article>
  );
}

function TrackingTotalFooter({ total }: { total: number }) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-outline-variant/15 glass px-4 py-4 shadow-[var(--shadow-ambient)]">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
        <div>
          <p className="label-caps">Estimated total</p>
          <p className="mt-0.5 text-xs text-on-surface-variant">Includes all listed work</p>
        </div>
        <span className="mono-data text-2xl font-bold text-primary">{formatMoney(total)}</span>
      </div>
    </footer>
  );
}

function formatLastRefreshed(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function TrackingRefreshBar({
  onRefresh,
  loading,
  autoRefreshMinutes,
  lastRefreshedAt,
}: {
  onRefresh: () => void;
  loading: boolean;
  autoRefreshMinutes: number;
  lastRefreshedAt?: Date | null;
}) {
  const autoEnabled = autoRefreshMinutes > 0;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-on-surface-variant">
        {autoEnabled ? (
          <>Auto-updates every {autoRefreshMinutes} min</>
        ) : (
          <>Manual refresh only</>
        )}
        {lastRefreshedAt ? (
          <span className="text-on-surface-variant/70"> · Last checked {formatLastRefreshed(lastRefreshedAt)}</span>
        ) : null}
      </p>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-xs font-semibold text-on-surface-variant transition-colors hover:border-primary/25 hover:bg-surface-container hover:text-on-surface disabled:opacity-50"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
          <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {loading ? "Refreshing…" : "Refresh now"}
      </button>
    </div>
  );
}
