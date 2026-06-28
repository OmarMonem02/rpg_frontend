"use client";

import { useEffect, useState } from "react";
import {
  getAnnualSummaryReport,
  getBalanceSheetReport,
  getExpensesReport,
  getProfitLossReport,
  type AnnualSummaryReport,
  type BalanceSheetReport,
  type ExpensesReport,
  type ProfitLossReport,
} from "@/lib/api/reporting";
import { REPORTING_CURRENCY } from "@/lib/currencies";
import { getAuthToken } from "@/lib/auth-session";
import { ApiError } from "@/lib/auth-api";
import {
  EmptyFinanceState,
  FinanceHero,
  FinanceLoadingCard,
  FinanceSectionTitle,
  formatMoney,
  reportingStatTone,
} from "@/components/reporting/finance-utils";
import { ReportingExportActions } from "@/components/reporting/ReportingExportActions";
import {
  InlineMessage,
  PageShell,
  StatCard,
  StatGrid,
  SurfaceCard,
} from "@/components/ops-ui";

export default function ReportingOverviewPage() {
  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetReport | null>(
    null,
  );
  const [annualSummary, setAnnualSummary] =
    useState<AnnualSummaryReport | null>(null);
  const [expenses, setExpenses] = useState<ExpensesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const token = getAuthToken();
        if (!token) throw new Error("Authentication required");

        const year = new Date().getFullYear();
        const [
          profitLossResult,
          balanceSheetResult,
          annualSummaryResult,
          expensesResult,
        ] = await Promise.all([
          getProfitLossReport(token),
          getBalanceSheetReport(token),
          getAnnualSummaryReport(token, { year }),
          getExpensesReport(token),
        ]);

        if (!active) return;

        setProfitLoss(profitLossResult);
        setBalanceSheet(balanceSheetResult);
        setAnnualSummary(annualSummaryResult);
        setExpenses(expensesResult);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : "Failed to load reporting overview.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const currency = REPORTING_CURRENCY;
  const pnl = profitLoss?.currencies[currency];
  const balance = balanceSheet?.currencies[currency];
  const annual = annualSummary?.currencies[currency];
  const expenseSummary = expenses?.summary[currency];
  const hasData = pnl || balance || annual || expenseSummary;

  return (
    <PageShell>
      <FinanceHero
        title="Financial Overview"
        description=""
        active="overview"
        actions={
          <ReportingExportActions
            reportType="overview"
            filters={{ year: new Date().getFullYear() }}
            disabled={loading || !hasData}
            onError={setExportError}
          />
        }
      />

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
      {exportError ? (
        <InlineMessage tone="danger">{exportError}</InlineMessage>
      ) : null}

      {loading ? (
        <FinanceLoadingCard label="Assembling the reporting overview" />
      ) : !hasData ? (
        <EmptyFinanceState
          title="Reporting data is not available yet"
          description="Create expenses and complete sales first, then come back here for the statement overview."
          actionLabel="Open Expenses"
          actionHref="/reporting/expenses"
        />
      ) : (
        <section className="space-y-4">
          <FinanceSectionTitle
            title="EGP management snapshot"
            description="Fast readouts for earnings power, statement health, and current cost pressure."
          />

          <StatGrid>
            <StatCard
              label="Net Profit"
              value={formatMoney(pnl?.net_profit ?? 0, currency)}
              hint="Gross profit minus manual operating expenses."
              tone={reportingStatTone("Net Profit", pnl?.net_profit ?? 0)}
            />
            <StatCard
              label="Total Assets"
              value={formatMoney(
                balance?.assets.total_assets ?? 0,
                currency,
              )}
              hint="Cash-equivalent collections, receivables, and inventory valuation."
              tone="default"
            />
            <StatCard
              label="Liabilities"
              value={formatMoney(
                balance?.liabilities.total_liabilities ?? 0,
                currency,
              )}
              hint="Unpaid manual expenses in the current finance MVP."
              tone={reportingStatTone("Liabilities", balance?.liabilities.total_liabilities ?? 0)}
            />
            <StatCard
              label="Annual Margin"
              value={`${annual?.margin_percent ?? 0}%`}
              hint="Net profit as a share of annual recognized revenue."
              tone={reportingStatTone("Annual Margin", annual?.margin_percent ?? 0)}
            />
          </StatGrid>

          <div className="grid gap-4 xl:grid-cols-3">
            <SurfaceCard className="transition-transform duration-300 ease-out hover:-translate-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
                Revenue Mix
              </p>
              <div className="mt-4 space-y-3">
                {Object.entries(pnl?.revenue_by_type ?? {}).map(
                  ([type, amount]) => (
                    <div
                      key={type}
                      className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest/85 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium capitalize text-on-surface">
                          {type}
                        </span>
                        <span className="text-sm font-semibold text-positive">
                          {formatMoney(amount, currency)}
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </SurfaceCard>

            <SurfaceCard className="transition-transform duration-300 ease-out hover:-translate-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
                Asset Structure
              </p>
              <div className="mt-4 space-y-3">
                {[
                  [
                    "Cash collected",
                    balance?.assets.cash_equivalents.total ?? 0,
                  ],
                  [
                    "Receivables",
                    balance?.assets.accounts_receivable ?? 0,
                  ],
                  [
                    "Inventory value",
                    balance?.assets.inventory.total ?? 0,
                  ],
                ].map(([label, amount]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3"
                  >
                    <span className="text-sm font-medium text-on-surface">
                      {label}
                    </span>
                    <span className="text-sm font-semibold text-on-surface">
                      {formatMoney(amount as number, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            <SurfaceCard className="transition-transform duration-300 ease-out hover:-translate-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
                Expense Pressure
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest/85 px-4 py-3">
                  <p className="text-sm text-on-surface-variant">
                    Total expenses
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-negative">
                    {formatMoney(expenseSummary?.total ?? 0, currency)}
                  </p>
                </div>
                {Object.entries(expenseSummary?.categories ?? {})
                  .slice(0, 3)
                  .map(([category, amount]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest/85 px-4 py-3"
                    >
                      <span className="text-sm font-medium capitalize text-on-surface">
                        {category.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm font-semibold text-negative">
                        {formatMoney(amount, currency)}
                      </span>
                    </div>
                  ))}
              </div>
            </SurfaceCard>
          </div>
        </section>
      )}
    </PageShell>
  );
}
