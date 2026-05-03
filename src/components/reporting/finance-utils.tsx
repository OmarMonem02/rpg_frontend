"use client";

import Link from "next/link";
import {
  ActionButton,
  FilterBar,
  InputGroup,
  SurfaceCard,
  StatCard,
  StatGrid,
  StatusBadge,
} from "@/components/ops-ui";
import type {
  ExpenseCategory,
  ExpensePaymentStatus,
  ReportingCurrency,
} from "@/lib/api/reporting";

const financeNavItems = [
  { href: "/reporting", label: "Overview", key: "overview" },
  {
    href: "/reporting/profit-loss",
    label: "Profit & Loss",
    key: "profit-loss",
  },
  {
    href: "/reporting/balance-sheet",
    label: "Balance Sheet",
    key: "balance-sheet",
  },
  { href: "/reporting/annual", label: "Annual Statement", key: "annual" },
  { href: "/reporting/expenses", label: "Expenses", key: "expenses" },
] as const;

export const EXPENSE_CATEGORY_OPTIONS: Array<{
  value: ExpenseCategory;
  label: string;
}> = [
  { value: "rent", label: "Rent" },
  { value: "salaries", label: "Salaries" },
  { value: "utilities", label: "Utilities" },
  { value: "marketing", label: "Marketing" },
  { value: "transport", label: "Transport" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

export function getExpenseCategoryLabel(category: string): string {
  return (
    EXPENSE_CATEGORY_OPTIONS.find((option) => option.value === category)
      ?.label ?? category.replace(/_/g, " ")
  );
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function FinanceHero({
  title,
  description,
  active,
}: {
  title: string;
  description: string;
  active: "overview" | "profit-loss" | "balance-sheet" | "annual" | "expenses";
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-emerald-900/5 bg-emerald-900/5 p-5 text-white shadow-2xl md:p-7">
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute right-[-4rem] top-[-5rem] h-40 w-40 rounded-full border border-white/10 bg-white/5 blur-2xl" />

      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between">
          <h1 className="mt-2 font-display text-4xl font-bold leading-[1.5] tracking-tight text-black md:text-5xl lg:text-6xl animate-app-shell-enter">
            <span className="inline-block bg-gradient-to-b from-slate-950 via-black to-black/70 bg-clip-text text-transparent">
              {title}
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center justify-evenly gap-2 rounded-[1.6rem] border border-black/10 bg-black/5 p-2 backdrop-blur-xl">
          {financeNavItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active === item.key ? "page" : undefined}
              className={[
                "rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/70",
                active === item.key
                  ? "bg-white text-slate-950 shadow-lg shadow-black/15"
                  : "border border-black/10 bg-transparent text-black/90 hover:-translate-y-0.5 hover:bg-black/14 hover:text-black",
              ].join(" ")}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinanceFilterBar({
  dateFrom,
  dateTo,
  currency,
  onDateFromChange,
  onDateToChange,
  onCurrencyChange,
  extra,
}: {
  dateFrom: string;
  dateTo: string;
  currency: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  extra?: React.ReactNode;
}) {
  return (
    <FilterBar className="border-emerald-500/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(240,253,244,0.92))] shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="md:col-span-12 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
            Statement Filters
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Narrow the reporting window without changing the currency-separation
            rule.
          </p>
        </div>
      </div>
      <InputGroup label="From" className="md:col-span-3">
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => onDateFromChange(event.target.value)}
          className="form-input-base"
        />
      </InputGroup>
      <InputGroup label="To" className="md:col-span-3">
        <input
          type="date"
          value={dateTo}
          onChange={(event) => onDateToChange(event.target.value)}
          className="form-input-base"
        />
      </InputGroup>
      <InputGroup label="Currency" className="md:col-span-3">
        <select
          value={currency}
          onChange={(event) => onCurrencyChange(event.target.value)}
          className="form-input-base"
        >
          <option value="">All currencies</option>
          <option value="EGP">EGP</option>
          <option value="USD">USD</option>
        </select>
      </InputGroup>
      <div className="md:col-span-3">{extra}</div>
    </FilterBar>
  );
}

export function FinanceSectionTitle({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-on-surface md:text-2xl">
          {title}
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-on-surface-variant">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function CurrencyChip({ currency }: { currency: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
      {currency}
    </span>
  );
}

export function MoneyStatGrid({
  items,
}: {
  items: Array<{
    label: string;
    value: number;
    currency: string;
    hint?: string;
    tone?: "default" | "primary" | "success" | "warning" | "danger";
  }>;
}) {
  return (
    <StatGrid>
      {items.map((item) => (
        <StatCard
          key={`${item.currency}-${item.label}`}
          label={item.label}
          value={formatMoney(item.value, item.currency)}
          hint={item.hint}
          tone={item.tone ?? "default"}
        />
      ))}
    </StatGrid>
  );
}

export function BreakdownList({
  title,
  values,
  currency,
}: {
  title: string;
  values: Record<string, number>;
  currency: string;
}) {
  const rows = Object.entries(values).filter(([, amount]) => amount > 0);

  return (
    <SurfaceCard className="border-emerald-500/10 bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition-transform duration-300 ease-out hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-on-surface">{title}</h3>
        <CurrencyChip currency={currency} />
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-on-surface-variant">
          No values in the selected window.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map(([key, amount], index) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3 transition-transform duration-300 ease-out hover:translate-x-1"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className="text-sm font-medium capitalize text-on-surface">
                {key.replace(/_/g, " ")}
              </span>
              <span className="text-sm font-semibold text-on-surface">
                {formatMoney(amount, currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </SurfaceCard>
  );
}

export function FinanceLoadingCard({
  label = "Refreshing statement",
}: {
  label?: string;
}) {
  return (
    <SurfaceCard className="relative flex min-h-[280px] items-center justify-center overflow-hidden border-emerald-500/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,253,244,0.88))]">
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(16,185,129,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="relative flex flex-col items-center gap-4 text-center">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/15" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-emerald-600 border-r-emerald-400" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
            Finance Engine
          </p>
          <p className="mt-2 text-base font-semibold text-on-surface">
            {label}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Pulling sales, expenses, inventory, and receivable state together.
          </p>
        </div>
      </div>
    </SurfaceCard>
  );
}

export function PaymentStatusBadge({ value }: { value: ExpensePaymentStatus }) {
  return value === "paid" ? (
    <StatusBadge tone="success">Paid</StatusBadge>
  ) : (
    <StatusBadge tone="warning">Unpaid</StatusBadge>
  );
}

export function YearPicker({
  year,
  onChange,
}: {
  year: number;
  onChange: (year: number) => void;
}) {
  return (
    <InputGroup label="Year">
      <input
        type="number"
        min="2000"
        max="2100"
        value={year}
        onChange={(event) => onChange(Number(event.target.value) || year)}
        className="form-input-base"
      />
    </InputGroup>
  );
}

export function EmptyFinanceState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <SurfaceCard className="border-dashed border-outline-variant/25 text-center">
      <h3 className="font-display text-2xl font-semibold text-on-surface">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <div className="mt-5 flex justify-center">
          <ActionButton href={actionHref} tone="primary">
            {actionLabel}
          </ActionButton>
        </div>
      ) : null}
    </SurfaceCard>
  );
}

export function CurrencySelector({
  value,
  onChange,
  label = "Currency",
}: {
  value: string;
  onChange: (value: ReportingCurrency | "") => void;
  label?: string;
}) {
  return (
    <InputGroup label={label}>
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value as ReportingCurrency | "")
        }
        className="form-input-base"
      >
        <option value="">All currencies</option>
        <option value="EGP">EGP</option>
        <option value="USD">USD</option>
      </select>
    </InputGroup>
  );
}
