"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import { YearPicker } from "@/components/reporting/finance-utils";
import {
  ActionButton,
  DataTableCard,
  EmptyState,
  FilterBar,
  InlineMessage,
  PageHero,
  PageShell,
  StatCard,
  StatGrid,
  StatusBadge,
  SurfaceCard,
} from "@/components/ops-ui";
import { ApiError } from "@/lib/auth-api";
import { getAuthToken } from "@/lib/auth-session";
import {
  getSellerMonthlyHistory,
  type SellerMonthlyHistory,
  type SellerMonthlyPeriod,
} from "@/lib/crud-api";

function getSellerInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "S";
}

function formatCommissionRate(value: number): string {
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  })}%`;
}

function formatMoney(value: number): string {
  return `EGP ${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function getMonthDateRange(period: string): { dateFrom: string; dateTo: string } {
  const [yearText, monthText] = period.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const lastDay = new Date(year, month, 0).getDate();

  return {
    dateFrom: `${period}-01`,
    dateTo: `${period}-${String(lastDay).padStart(2, "0")}`,
  };
}

function buildSalesHref(sellerId: number, period: string): string {
  const { dateFrom, dateTo } = getMonthDateRange(period);
  const params = new URLSearchParams({
    seller_id: String(sellerId),
    date_from: dateFrom,
    date_to: dateTo,
    status: "completed",
  });

  return `/inventory/sales?${params.toString()}`;
}

export default function SellerHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const permissions = usePermissions();
  const sellerId = Number(params.id);
  const canReadSales = permissions.canReadPage("sales");

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [history, setHistory] = useState<SellerMonthlyHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError("You are not authenticated. Please sign in again.");
      setIsLoading(false);
      return;
    }

    if (!Number.isFinite(sellerId) || sellerId <= 0) {
      setError("Invalid seller.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await getSellerMonthlyHistory(token, sellerId, { year });
      setHistory(response);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to load seller history at the moment.");
      }
      setHistory(null);
    } finally {
      setIsLoading(false);
    }
  }, [sellerId, year]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const currentMonth = useMemo(
    () => history?.months.find((month) => month.isCurrent) ?? null,
    [history],
  );

  const hasYearActivity = (history?.yearTotals.completedSalesCount ?? 0) > 0;

  return (
    <PageShell>
      <PageHero
        eyebrow="Sellers"
        title={history?.seller.name ?? "Seller history"}
        subtitle={
          <div className="max-w-3xl space-y-2 text-sm leading-6 text-on-surface-variant">
            <p>
              Monthly commission and completed sales. Totals reset at the start of each
              calendar month (Africa/Cairo).
            </p>
            <p className="text-on-surface-variant/80">
              Earned commission uses the seller&apos;s current rate for all periods shown.
            </p>
          </div>
        }
        actions={
          <ActionButton type="button" variant="outline" onClick={() => router.push("/sellers")}>
            Back to sellers
          </ActionButton>
        }
        meta={
          history ? (
            <div className="flex w-full items-center gap-3 rounded-[1.25rem] border border-outline-variant/15 bg-surface px-4 py-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-container font-display text-sm font-bold text-on-primary-container">
                {getSellerInitials(history.seller.name)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-on-surface">{history.seller.name}</p>
                <p className="mono-data mt-0.5 text-xs text-on-surface-variant">
                  ID {history.seller.id}
                  {history.seller.phone?.trim()
                    ? ` · ${history.seller.phone.trim()}`
                    : " · No phone"}
                </p>
              </div>
            </div>
          ) : null
        }
      />

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

      {isLoading ? (
        <SurfaceCard>
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-outline-variant/25 border-t-primary" />
            <div>
              <p className="font-semibold text-on-surface">Loading seller history</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Compiling monthly sales and commission totals.
              </p>
            </div>
          </div>
        </SurfaceCard>
      ) : history ? (
        <>
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="label-caps">Current period</p>
                <h2 className="mt-1 text-xl font-bold text-on-surface">
                  {currentMonth?.label ?? "This month"}
                </h2>
              </div>
              {currentMonth?.isCurrent ? (
                <StatusBadge tone="primary">Resets next month</StatusBadge>
              ) : null}
            </div>
            <StatGrid>
              <StatCard
                label="Completed sales"
                value={String(currentMonth?.completedSalesCount ?? 0)}
                hint="This calendar month"
              />
              <StatCard
                label="Sales base"
                value={formatMoney(currentMonth?.commissionBase ?? 0)}
                hint="Eligible line totals"
              />
              <StatCard
                label="Earned commission"
                value={formatMoney(currentMonth?.commissionAmount ?? 0)}
                tone="primary"
                hint="Current rate applied"
              />
              <StatCard
                label="Commission rate"
                value={formatCommissionRate(history.seller.commissionRate)}
                tone="primary"
              />
            </StatGrid>
          </section>

          <FilterBar>
            <div className="md:col-span-4">
              <YearPicker year={year} onChange={setYear} />
            </div>
          </FilterBar>

          <DataTableCard>
            <div className="border-b border-outline-variant/15 bg-surface-container-low px-4 py-4 md:px-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="label-caps">Monthly ledger</p>
                  <h2 className="mt-1 text-2xl font-bold text-on-surface">{year} overview</h2>
                </div>
                {hasYearActivity ? (
                  <p className="text-sm text-on-surface-variant">
                    {history.yearTotals.completedSalesCount} completed sale
                    {history.yearTotals.completedSalesCount === 1 ? "" : "s"} this year
                  </p>
                ) : null}
              </div>
            </div>

            {!hasYearActivity ? (
              <div className="p-4">
                <EmptyState
                  title="No completed sales for this year"
                  description="This seller has no completed sales recorded in the selected year. Try another year or return once sales are attributed."
                  action={
                    <ActionButton type="button" variant="outline" onClick={() => router.push("/sellers")}>
                      Back to sellers
                    </ActionButton>
                  }
                />
              </div>
            ) : (
              <>
                <div className="grid gap-3 p-3 lg:hidden">
                  {history.months.map((month) => (
                    <MonthCard
                      key={month.period}
                      month={month}
                      sellerId={history.seller.id}
                      canReadSales={canReadSales}
                    />
                  ))}
                  <article className="rounded-[1.25rem] border border-outline-variant/15 bg-surface-container p-4">
                    <p className="label-caps">Year total</p>
                    <div className="mt-3 grid gap-2">
                      <MetricRow label="Sales" value={String(history.yearTotals.completedSalesCount)} />
                      <MetricRow label="Base" value={formatMoney(history.yearTotals.commissionBase)} />
                      <MetricRow
                        label="Earned"
                        value={formatMoney(history.yearTotals.commissionAmount)}
                        emphasize
                      />
                    </div>
                  </article>
                </div>

                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                        <th className="label-caps px-4 py-3">Month</th>
                        <th className="label-caps px-4 py-3">Completed sales</th>
                        <th className="label-caps px-4 py-3">Sales base</th>
                        <th className="label-caps px-4 py-3">Earned</th>
                        <th className="label-caps px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.months.map((month) => (
                        <MonthTableRow
                          key={month.period}
                          month={month}
                          sellerId={history.seller.id}
                          canReadSales={canReadSales}
                        />
                      ))}
                      <tr className="border-t border-outline-variant/15 bg-surface-container-low font-semibold">
                        <td className="px-4 py-4 text-on-surface">Year total</td>
                        <td className="mono-data px-4 py-4 text-on-surface">
                          {history.yearTotals.completedSalesCount}
                        </td>
                        <td className="mono-data px-4 py-4 text-on-surface">
                          {formatMoney(history.yearTotals.commissionBase)}
                        </td>
                        <td className="mono-data px-4 py-4 text-primary">
                          {formatMoney(history.yearTotals.commissionAmount)}
                        </td>
                        <td className="px-4 py-4" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </DataTableCard>
        </>
      ) : null}
    </PageShell>
  );
}

function MetricRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="label-caps">{label}</p>
      <p
        className={`mono-data mt-1 text-sm font-semibold ${
          emphasize ? "text-primary" : "text-on-surface"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MonthCard({
  month,
  sellerId,
  canReadSales,
}: {
  month: SellerMonthlyPeriod;
  sellerId: number;
  canReadSales: boolean;
}) {
  return (
    <article className="rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-lowest p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-on-surface">{month.label}</h3>
        {month.isCurrent ? <StatusBadge tone="primary">Current period</StatusBadge> : null}
      </div>
      <div className="mt-4 grid gap-2 rounded-xl border border-outline-variant/10 bg-surface px-3 py-2">
        <MetricRow label="Completed sales" value={String(month.completedSalesCount)} />
        <MetricRow label="Sales base" value={formatMoney(month.commissionBase)} />
        <MetricRow label="Earned" value={formatMoney(month.commissionAmount)} emphasize />
      </div>
      {canReadSales && month.completedSalesCount > 0 ? (
        <div className="mt-4 border-t border-outline-variant/10 pt-3">
          <Link
            href={buildSalesHref(sellerId, month.period)}
            className="inline-flex items-center justify-center rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all duration-200 hover:bg-primary/15"
          >
            View sales
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function MonthTableRow({
  month,
  sellerId,
  canReadSales,
}: {
  month: SellerMonthlyPeriod;
  sellerId: number;
  canReadSales: boolean;
}) {
  return (
    <tr className={`data-row ${month.isCurrent ? "bg-primary/5" : ""}`.trim()}>
      <td className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-on-surface">{month.label}</span>
          {month.isCurrent ? (
            <StatusBadge tone="primary">Current period</StatusBadge>
          ) : null}
        </div>
      </td>
      <td className="mono-data px-4 py-4 text-on-surface">{month.completedSalesCount}</td>
      <td className="mono-data px-4 py-4 text-on-surface">
        {formatMoney(month.commissionBase)}
      </td>
      <td className="mono-data px-4 py-4 font-semibold text-primary">
        {formatMoney(month.commissionAmount)}
      </td>
      <td className="px-4 py-4 text-right">
        {canReadSales && month.completedSalesCount > 0 ? (
          <Link
            href={buildSalesHref(sellerId, month.period)}
            className="inline-flex items-center justify-center rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all duration-200 hover:bg-primary/15"
          >
            View sales
          </Link>
        ) : (
          <span className="text-xs text-on-surface-variant">—</span>
        )}
      </td>
    </tr>
  );
}
