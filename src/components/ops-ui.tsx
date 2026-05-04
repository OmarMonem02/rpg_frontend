"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

type Tone = "default" | "primary" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  default: "border-outline-variant/15 bg-surface text-on-surface",
  primary: "border-primary/15 bg-primary-container text-on-primary-container",
  success: "border-green-500/20 bg-green-500/10 text-green-700",
  warning: "border-yellow-500/20 bg-yellow-500/10 text-yellow-700",
  danger: "border-error/20 bg-error/10 text-error",
};

export function PageShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto flex w-full max-w-screen-2xl flex-col gap-6 ${className}`.trim()}>{children}</div>;
}

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <section className="animate-fade-in overflow-hidden rounded-[1.75rem] border border-l-4 border-outline-variant/15 border-l-primary bg-surface-container-low shadow-ambient">
      <div className="grid gap-5 p-5 md:p-6 lg:grid-cols-[1.35fr_0.85fr] lg:items-end">
        <div>
          {eyebrow ? (
            <div className="mb-3">
              <span className="label-caps inline-flex items-center rounded-full border border-outline-variant/15 bg-surface px-3 py-1">
                {eyebrow}
              </span>
            </div>
          ) : null}
          <h1 className="font-display text-3xl font-extrabold leading-tight text-on-surface md:text-[2.75rem]">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-on-surface-variant md:text-base">{description}</p>
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          {meta ? <div className="grid w-full gap-3 lg:max-w-md">{meta}</div> : null}
          {actions ? <div className="flex w-full flex-wrap gap-3 lg:justify-end">{actions}</div> : null}
        </div>
      </div>
    </section>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-[1.25rem] border p-4 transition-transform duration-200 hover:-translate-y-0.5 ${
        tone === "primary" || tone === "success"
          ? "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-b-[1.25rem] after:bg-current after:opacity-20"
          : ""
      } ${toneClasses[tone]}`}
    >
      <p className="label-caps opacity-80">{label}</p>
      <p className="mono-data mt-2 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-2 text-sm opacity-80">{hint}</p> : null}
    </div>
  );
}

export function SurfaceCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-low p-4 md:p-5 ${className}`.trim()}>{children}</section>;
}

export function SectionHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="divider mb-2 flex flex-col gap-4 pb-4 md:flex-row md:items-start md:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-on-surface">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function FilterBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`sticky top-14 z-20 grid gap-3 rounded-[1.25rem] border border-outline-variant/12 bg-surface/95 p-3 backdrop-blur-sm transition-shadow duration-200 focus-within:shadow-ambient md:grid-cols-12 ${className}`.trim()}>{children}</div>;
}

export function InputGroup({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className}`.trim()}>
      <span className="label-caps">{label}</span>
      {children}
    </label>
  );
}

export function ActionButton({
  children,
  tone = "default",
  variant = "filled",
  size = "md",
  href,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: Tone;
  variant?: "filled" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}) {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
  };

  const sharedClassName = [
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
    sizeClasses[size],
    variant === "filled"
      ? tone === "primary"
        ? "bg-primary text-on-primary shadow-md shadow-primary/15 hover:-translate-y-px hover:shadow-lg hover:shadow-primary/25"
        : tone === "danger"
          ? "bg-error text-white hover:bg-error/90"
          : "border border-outline-variant/20 bg-surface text-on-surface hover:bg-surface-container"
      : variant === "ghost"
        ? "hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface"
        : "border border-outline-variant/20 bg-transparent hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface",
    className,
  ]
    .join(" ")
    .trim();

  if (href) {
    return (
      <Link href={href} className={sharedClassName}>
        {children}
      </Link>
    );
  }

  return (
    <button {...props} className={sharedClassName}>
      {children}
    </button>
  );
}

export function DataTableCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`overflow-hidden rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest shadow-ambient ${className}`.trim()}>{children}</div>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="animate-fade-in rounded-[1.5rem] border border-dashed border-outline-variant/25 bg-surface-container p-10 text-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 160 96"
        className="mx-auto mb-5 h-20 w-32 text-outline-variant/30"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="50" cy="48" r="26" />
        <circle cx="50" cy="48" r="8" />
        <path d="M50 22v16M50 58v16M24 48h16M60 48h16M32 30l11 11M57 55l11 11M68 30 57 41M43 55 32 66" />
        <path d="M93 68 130 31l12 12-37 37-18 6 6-18Z" />
      </svg>
      <h3 className="font-display text-2xl font-semibold text-on-surface">{title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function InlineMessage({
  tone = "default",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  const borderTone = tone === "danger" ? "border-l-error" : tone === "primary" ? "border-l-primary" : tone === "success" ? "border-l-green-600" : tone === "warning" ? "border-l-yellow-600" : "border-l-outline-variant";

  return <div className={`rounded-2xl border border-l-4 px-4 py-3 text-sm ${borderTone} ${toneClasses[tone]}`}>{children}</div>;
}

export function StatusBadge({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium before:mr-1.5 before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:bg-current before:opacity-70 ${toneClasses[tone]} ${className}`.trim()}>{children}</span>;
}

export function PaginationControls({
  page,
  totalPages,
  onPrevious,
  onNext,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  onPageChange?: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const windowStart = Math.max(1, Math.min(page - 2, totalPages - 4));
  const visiblePages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => windowStart + index,
  ).filter((pageNumber) => pageNumber <= totalPages);

  return (
    <div className="pagination-controls flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-low px-4 py-3">
      <p className="text-sm text-on-surface-variant">
        Page <span className="mono-data rounded-lg bg-primary px-2 py-0.5 text-xs text-on-primary">{page}</span> of {totalPages}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <ActionButton onClick={onPrevious} disabled={page === 1} aria-label="Go to previous page">
          Previous
        </ActionButton>
        {onPageChange ? (
          <div className="flex items-center gap-1">
            {windowStart > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => onPageChange(1)}
                  className="mono-data inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-outline-variant/20 bg-surface px-2 text-xs font-bold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                  aria-label="Go to page 1"
                >
                  1
                </button>
                <span className="px-1 text-xs text-on-surface-variant">...</span>
              </>
            ) : null}
            {visiblePages.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => onPageChange(pageNumber)}
                disabled={pageNumber === page}
                className={[
                  "mono-data inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs font-bold transition-colors disabled:pointer-events-none",
                  pageNumber === page
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant/20 bg-surface text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                ].join(" ")}
                aria-label={`Go to page ${pageNumber}`}
                aria-current={pageNumber === page ? "page" : undefined}
              >
                {pageNumber}
              </button>
            ))}
            {visiblePages[visiblePages.length - 1] < totalPages ? (
              <>
                <span className="px-1 text-xs text-on-surface-variant">...</span>
                <button
                  type="button"
                  onClick={() => onPageChange(totalPages)}
                  className="mono-data inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-outline-variant/20 bg-surface px-2 text-xs font-bold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                  aria-label={`Go to page ${totalPages}`}
                >
                  {totalPages}
                </button>
              </>
            ) : null}
          </div>
        ) : null}
        <ActionButton onClick={onNext} disabled={page === totalPages} aria-label="Go to next page">
          Next
        </ActionButton>
      </div>
    </div>
  );
}
export function TabsWrapper({
  tabs,
  defaultTabId,
}: {
  tabs: { id: string; label: string; content: ReactNode }[];
  defaultTabId: string;
}) {
  const [activeTab, setActiveTab] = useState(defaultTabId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1 rounded-2xl border border-outline-variant/15 bg-surface-container-low p-1.5 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-none rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{tabs.find((t) => t.id === activeTab)?.content}</div>
    </div>
  );
}
