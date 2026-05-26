"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import type { PublicTicketTracking, TrackingTimelineStep } from "@/lib/public-tracking-api";
import { formatMoney } from "@/lib/public-tracking-api";

type TicketStatus = "pending" | "in_progress" | "completed" | "closed" | string;

function statusTone(status: TicketStatus): "default" | "primary" | "accent" | "closed" {
  if (status === "completed") return "primary";
  if (status === "in_progress") return "accent";
  if (status === "closed") return "closed";
  return "default";
}

const statusToneClasses = {
  default:
    "border-outline-variant/20 bg-surface-container text-on-surface-variant",
  primary: "border-primary/20 bg-primary-container text-on-primary-container",
  accent: "border-accent/25 bg-accent/10 text-accent",
  closed: "border-outline-variant/25 bg-surface-container-high text-on-surface-variant",
} as const;

function TrackingCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`tracking-card overflow-hidden ${className}`.trim()}>{children}</section>
  );
}

function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="label-caps">{children}</h2>
      {action}
    </div>
  );
}

export function TrackingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="tracking-page tracking-page-bg min-h-screen text-on-surface">
      <div className="tracking-grid-overlay pointer-events-none fixed inset-0" aria-hidden />
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--color-primary)_18%,transparent)_0%,transparent_65%)] lg:h-96"
        aria-hidden
      />
      <div className="tracking-shell-inner relative z-10 flex min-h-screen flex-col px-4 py-5 pb-[calc(var(--tracking-footer-h)+1.5rem)] sm:px-6 sm:py-7 lg:px-8 lg:pb-10">
        {children}
      </div>
    </div>
  );
}

export function TrackingVerifyLayout({ children }: { children: React.ReactNode }) {
  return <div className="tracking-verify-grid tracking-stagger">{children}</div>;
}

export function TrackingDashboardLayout({
  main,
  aside,
}: {
  main: ReactNode;
  aside: ReactNode;
}) {
  return (
    <div className="tracking-dashboard-grid tracking-stagger">
      <div className="tracking-dashboard-main min-w-0">{main}</div>
      <aside className="tracking-dashboard-aside">{aside}</aside>
    </div>
  );
}

export function TrackingLoadingState() {
  return (
    <div className="grid flex-1 gap-4 py-8 lg:grid-cols-2">
      <div className="tracking-card h-36 animate-pulse bg-surface-container-low" />
      <div className="tracking-card h-28 animate-pulse bg-surface-container-low lg:col-span-2" />
      <div className="tracking-card h-48 animate-pulse bg-surface-container-low lg:col-span-2" />
      <p className="text-center text-sm text-on-surface-variant lg:col-span-2">Loading your ticket…</p>
    </div>
  );
}

export function TrackingErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 animate-fade-in">
      <TrackingCard className="w-full max-w-md p-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-error/20 bg-error-container text-error">
          <svg aria-hidden viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-on-surface">Link unavailable</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-on-surface-variant">{message}</p>
        <p className="mt-6 text-xs text-on-surface-variant/80">
          If you received this link by WhatsApp, ask the shop to send a new one.
        </p>
      </TrackingCard>
    </div>
  );
}

export function TrackingClosedBanner() {
  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-high/80 px-4 py-3.5 backdrop-blur-sm"
      role="status"
    >
      <LockClosedIcon className="mt-0.5 h-5 w-5 shrink-0 text-on-surface-variant" aria-hidden />
      <div>
        <p className="text-sm font-semibold text-on-surface">Ticket closed</p>
        <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
          You can still view progress and message history. New messages are disabled.
        </p>
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
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface shadow-sm ring-2 ring-primary/5">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo URL is configurable
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
    <header className="mb-5 animate-app-shell-enter">
      <TrackingCard>
        <div className="relative overflow-hidden border-b border-outline-variant/10 bg-gradient-to-br from-primary/8 via-surface-container-lowest to-surface-container-lowest px-5 py-5 sm:px-6">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
            aria-hidden
          />
          <div className="relative flex items-start gap-4">
            <ShopLogo name={shopName} logoUrl={logoUrl} />
            <div className="min-w-0 flex-1">
              <p className="label-caps text-primary">Service tracking</p>
              <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-on-surface sm:text-[1.65rem]">
                {shopName}
              </h1>
              {tagline ? (
                <p className="mt-1 text-sm leading-snug text-on-surface-variant">{tagline}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="label-caps">Ticket</p>
            <p className=" mt-1 text-2xl font-bold tracking-tight text-on-surface lg:text-xl">
              #{ticketNumber}
            </p>
            {updatedAtHuman ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-on-surface-variant">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/60" aria-hidden />
                Updated {updatedAtHuman}
              </p>
            ) : null}
          </div>
          <StatusPill status={status} label={statusLabel} tone={tone} />
        </div>
      </TrackingCard>
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
  tone?: "default" | "primary" | "accent" | "closed";
}) {
  const resolvedTone = tone ?? statusTone(status);
  const display = label ?? status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-bold capitalize shadow-sm before:mr-2 before:inline-block before:h-2 before:w-2 before:rounded-full before:bg-current ${statusToneClasses[resolvedTone]}`}
    >
      {display}
    </span>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg className="h-[5.25rem] w-[5.25rem] shrink-0" viewBox="0 0 88 88" aria-hidden>
      <circle
        cx="44"
        cy="44"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        className="text-surface-container"
      />
      <circle
        cx="44"
        cy="44"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        className="tracking-progress-ring text-primary transition-[stroke-dashoffset] duration-700 ease-out"
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: offset,
        }}
      />
    </svg>
  );
}

export function TrackingStatusSummary({ data }: { data: PublicTicketTracking }) {
  const { ticket, progress } = data;
  const tone = statusTone(ticket.status);

  return (
    <TrackingCard className="mb-2 p-2 lg:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:gap-2">
        <div className="relative mx-auto flex shrink-0 items-center justify-center sm:mx-0">
          <ProgressRing percent={progress.tasks_percent} />
          <span className="absolute font-display text-lg font-extrabold text-primary lg:text-xl">
            {progress.tasks_percent}%
          </span>
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-sm font-semibold text-on-surface lg:text-base">Overall progress</p>
          <p className="mt-0.5 text-xs text-on-surface-variant lg:text-sm">
            {progress.tasks_completed} of {progress.tasks_total} tasks done
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-outline-variant/10 pt-2 lg:mt-2">
        <div className="rounded-xl bg-surface-container-low px-3 py-2.5">
          <p className="label-caps">Tasks</p>
            {progress.tasks_completed}/{progress.tasks_total}
          <p className=" mt-1 text-lg font-bold text-on-surface">
          </p>
        </div>
        <div className="rounded-xl bg-primary/5 px-3 py-2.5 ring-1 ring-primary/10">
          <p className="label-caps text-primary">Est. total</p>
          <p className=" mt-1 text-lg font-bold text-primary">{formatMoney(ticket.total)}</p>
        </div>
      </div>
    </TrackingCard>
  );
}

export function ProgressTimeline({ steps }: { steps: TrackingTimelineStep[] }) {
  return (
    <TrackingCard className="mb-5 p-5">
      <SectionTitle>Service journey</SectionTitle>

      <ol className="hidden gap-1 md:grid md:grid-cols-3">
        {steps.map((step, index) => (
          <TimelineStepHorizontal key={step.key} step={step} index={index} isLast={index === steps.length - 1} />
        ))}
      </ol>

      <ol className="space-y-0 md:hidden">
        {steps.map((step, index) => (
          <TimelineStepVertical key={step.key} step={step} index={index} isLast={index === steps.length - 1} />
        ))}
      </ol>
    </TrackingCard>
  );
}

function stepIndicatorClasses(state: TrackingTimelineStep["state"]): string {
  if (state === "done") {
    return "border-primary bg-primary text-on-primary shadow-sm shadow-primary/20";
  }
  if (state === "current") {
    return "border-accent bg-accent text-on-primary ring-4 ring-accent/15";
  }
  return "border-outline-variant/25 bg-surface-container text-on-surface-variant/45";
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
    <li className="relative flex flex-col items-center px-1 text-center">
      {!isLast ? (
        <span
          className={`absolute left-[calc(50%+1.25rem)] top-4 h-0.5 w-[calc(100%-2.5rem)] ${step.state === "done" ? "bg-primary/50" : "bg-outline-variant/15"
            }`}
          aria-hidden
        />
      ) : null}
      <span
        className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold ${stepIndicatorClasses(step.state)}`}
      >
        {step.state === "done" ? <CheckIcon /> : index + 1}
      </span>
      <p
        className={`mt-3 text-[11px] font-semibold leading-snug ${step.state === "upcoming" ? "text-on-surface-variant/55" : "text-on-surface"
          }`}
      >
        {step.label}
      </p>
      {step.state === "current" ? (
        <p className="label-caps mt-1 text-accent">Now</p>
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
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${stepIndicatorClasses(step.state)}`}
        >
          {step.state === "done" ? <CheckIcon /> : index + 1}
        </span>
        {!isLast ? (
          <span
            className={`my-1 min-h-7 w-0.5 flex-1 rounded-full ${step.state === "done" ? "bg-primary/40" : "bg-outline-variant/15"
              }`}
          />
        ) : null}
      </div>
      <div className="pb-6 pt-1">
        <p
          className={`text-sm font-semibold ${step.state === "upcoming" ? "text-on-surface-variant/55" : "text-on-surface"
            }`}
        >
          {step.label}
        </p>
        {step.state === "current" ? (
          <p className="mt-0.5 text-xs font-semibold text-accent">Current stage</p>
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
    <TrackingCard className="animate-fade-in p-5 sm:p-6">
      <div className="mb-6 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-md shadow-primary/20">
          <ShieldCheckIcon className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold text-on-surface">Verify your phone</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">
            Enter the number on your service record to unlock your ticket, parts list, and live updates.
          </p>
        </div>
      </div>

      <ol className="mb-6 flex gap-2 text-[11px] font-medium text-on-surface-variant">
        <li className="flex flex-1 items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-primary">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-on-primary">
            1
          </span>
          Verify
        </li>
        <li className="flex flex-1 items-center gap-2 rounded-xl bg-surface-container px-3 py-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-container-high text-[10px] font-bold">
            2
          </span>
          View ticket
        </li>
      </ol>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!loading && phone.trim()) onSubmit();
        }}
      >
      <label className="block">
        <span className="label-caps mb-2 block">Mobile number</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="e.g. 01001234567"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          disabled={loading}
          className={`form-input-base text-base ${error ? "form-input-error" : ""}`}
        />
      </label>

      {error ? (
        <p className="mt-3 rounded-xl border border-error/20 bg-error-container px-3 py-2.5 text-sm text-error">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading || !phone.trim()}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25 disabled:pointer-events-none disabled:opacity-50"
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
      </form>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-on-surface-variant/90">
        <LockClosedIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Secure link · Phone must match shop records
      </p>
    </TrackingCard>
  );
}
export function TicketTrackingDashboard({ data }: { data: PublicTicketTracking }) {
  const { customer, bike, tasks, progress } = data;

  return (
    <>
      {(customer.name || bike) ? (
        <TrackingCard className="mb-5 p-5">
          <SectionTitle>Your service</SectionTitle>
          {customer.name ? (
            <p className="text-lg font-bold text-on-surface">{customer.name}</p>
          ) : null}
          {bike ? (
            <div className="mt-3 flex items-st  art gap-3 rounded-xl bg-surface-container-low p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant">
                <WrenchScrewdriverIcon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-on-surface">
                  {[bike.brand, bike.model, bike.year].filter(Boolean).join(" · ") || "Your bike"}
                </p>
                {bike.vin ? (
                  <p className=" mt-1 text-xs text-on-surface-variant">VIN {bike.vin}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </TrackingCard>
      ) : null}

      <div className="mb-5">
        <SectionTitle
          action={
            <span className="form-chip py-0.5">
              {progress.tasks_completed}/{progress.tasks_total}
            </span>
          }
        >
          Work &amp; parts
        </SectionTitle>

        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant/25 bg-surface-container-low/50 px-6 py-10 text-center">
            <WrenchScrewdriverIcon className="mx-auto h-8 w-8 text-on-surface-variant/40" aria-hidden />
            <p className="mt-3 text-sm text-on-surface-variant">No work items listed yet.</p>
            <p className="mt-1 text-xs text-on-surface-variant/70">Check back after the shop updates your ticket.</p>
          </div>
        ) : (
          <div className="tracking-tasks-grid">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>

      <TrackingTotalFooter total={data.ticket.total} className="lg:hidden" />
    </>
  );
}

function TaskCard({ task }: { task: PublicTicketTracking["tasks"][number] }) {
  const isDone = task.status === "completed";

  return (
    <article className="tracking-card overflow-hidden transition-shadow hover:shadow-[0_16px_40px_rgba(44,52,55,0.08)]">
      <div className="flex items-center justify-between gap-3 border-b border-outline-variant/10 bg-gradient-to-r from-surface-container-low to-surface-container-lowest px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold ${isDone
              ? "border-primary/30 bg-primary text-on-primary"
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
        <span className=" shrink-0 rounded-lg bg-surface-container px-2 py-1 text-sm font-bold text-on-surface">
          {formatMoney(task.subtotal)}
        </span>
      </div>

      {task.items.length > 0 ? (
        <ul className="divide-y divide-outline-variant/8">
          {task.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-on-surface">{item.label}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant">
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${item.type === "part"
                      ? "bg-accent/10 text-accent"
                      : "bg-primary/10 text-primary"
                      }`}
                  >
                    {item.type}
                  </span>
                  <span>×{item.qty}</span>
                  {item.discount > 0 ? <span>−{formatMoney(item.discount)}</span> : null}
                </p>
              </div>
              <span className=" shrink-0 font-semibold text-on-surface">
                {formatMoney(item.subtotal)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-xs text-on-surface-variant">No parts or services on this task yet.</p>
      )}
    </article>
  );
}

export function TrackingTotalInline({ total }: { total: number }) {
  return (
    <TrackingCard className="p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="label-caps">Estimated total</p>
          <p className="mt-1 text-m text-on-surface-variant">All listed work &amp; parts</p>
        </div>
        <span className="text-xl font-extrabold tracking-tight text-primary">
          {formatMoney(total)}
        </span>
      </div>
    </TrackingCard>
  );
}

function TrackingTotalFooter({ total, className = "" }: { total: number; className?: string }) {
  return (
    <footer
      className={`tracking-footer-safe fixed bottom-0 left-0 right-0 z-20 border-t border-outline-variant/15 glass ${className}`.trim()}
    >
      <div className="tracking-shell-inner flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div>
          <p className="label-caps">Estimated total</p>
          <p className="mt-0.5 text-[11px] text-on-surface-variant">All listed work &amp; parts</p>
        </div>
        <span className=" text-2xl font-extrabold tracking-tight text-primary">
          {formatMoney(total)}
        </span>
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
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant/12 bg-surface-container-lowest/90 px-3 py-2.5 backdrop-blur-sm">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-on-surface">
          {autoEnabled ? `Auto-refresh · every ${autoRefreshMinutes} min` : "Tap refresh for latest updates"}
        </p>
        {lastRefreshedAt ? (
          <p className="mt-0.5 text-[11px] text-on-surface-variant">
            Last checked {formatLastRefreshed(lastRefreshedAt)}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-on-primary shadow-sm shadow-primary/15 transition-all hover:shadow-md disabled:opacity-50"
      >
        <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
        {loading ? "Updating…" : "Refresh"}
      </button>
    </div>
  );
}
