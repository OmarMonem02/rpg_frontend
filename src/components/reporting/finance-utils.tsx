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
import { SUPPORTED_PRICING_CURRENCIES } from "@/lib/currencies";

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

export function metricToneClass(value: number): string {
  if (value > 0) return "text-positive";
  if (value < 0) return "text-negative";
  return "text-neutral-metric";
}

export function FinanceHero({
  title,
  active,
}: {
  title: string;
  description: string;
  active: "overview" | "profit-loss" | "balance-sheet" | "annual" | "expenses";
}) {
  return (
    <section className="animate-fade-in overflow-hidden rounded-[1.75rem] border border-outline-variant/15 bg-surface-container-low shadow-ambient">
      <div className="flex flex-col gap-6 p-5 md:p-7">
        <h1 className="text-display-lg text-on-surface">{title}</h1>

        <nav
          aria-label="Finance reporting"
          className="flex flex-wrap gap-2 rounded-[1.6rem] border border-outline-variant/15 bg-surface/95 p-2"
        >
          {financeNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active === item.key ? "page" : undefined}
              className={[
                "rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                active === item.key
                  ? "bg-primary text-on-primary shadow-sm"
                  : "border border-outline-variant/15 bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
              ].join(" ")}
            >
              {item.label}
            </Link>
          ))}
        </nav>
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
    <FilterBar>
      <div className="md:col-span-12  flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="label-caps">
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
          aria-label="From"
          type="date"
          value={dateFrom}
          max={dateTo}
          onChange={(event) => onDateFromChange(event.target.value)}
          className="form-input-base"
        />
      </InputGroup>
      <InputGroup label="To" className="md:col-span-3">
        <input
          type="date"
          value={dateTo}
          min={dateFrom}
          max={new Date().toLocaleDateString("en-CA")}
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
          {SUPPORTED_PRICING_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
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
    <span className="label-caps inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-primary">
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
    <SurfaceCard>
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
    <SurfaceCard className="relative flex min-h-[280px] items-center justify-center overflow-hidden">
      <div className="relative flex flex-col items-center gap-4 text-center">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-4 border-primary/15" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary border-r-primary/40" />
        </div>
        <div>
          <p className="label-caps">Finance Engine</p>
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
        {SUPPORTED_PRICING_CURRENCIES.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    </InputGroup>
  );
}
