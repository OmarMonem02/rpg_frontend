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
import { getAuthToken } from "@/lib/auth-session";
import { ApiError } from "@/lib/auth-api";
import {
  EmptyFinanceState,
  FinanceHero,
  FinanceInsightBand,
  FinanceLoadingCard,
  FinanceSectionTitle,
  formatMoney,
  CurrencyChip,
} from "@/components/reporting/finance-utils";
import {
  ActionButton,
  InlineMessage,
  PageShell,
  SurfaceCard,
  StatCard,
  StatGrid,
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

  const currencies = ["EGP", "USD"] as const;

  return (
    <PageShell>
      <FinanceHero
        title="Financial Overview"
        description=""
        active="overview"
      />

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

      {loading ? (
        <FinanceLoadingCard label="Assembling the reporting overview" />
      ) : !profitLoss || !balanceSheet || !annualSummary || !expenses ? (
        <EmptyFinanceState
          title="Reporting data is not available yet"
          description="Create expenses and complete sales first, then come back here for the statement overview."
          actionLabel="Open Expenses"
          actionHref="/reporting/expenses"
        />
      ) : (
        <>
          <FinanceInsightBand
            title="This room is best for directional financial decisions."
            copy="Recognized revenue comes only from completed sales, receivables stay separate, and unpaid expenses drive liabilities. Use the dedicated sheets when you need drill-down context before acting."
          />

          {currencies.map((currency) => {
            const pnl = profitLoss.currencies[currency];
            const balance = balanceSheet.currencies[currency];
            const annual = annualSummary.currencies[currency];
            const expenseSummary = expenses.summary[currency];

            if (!pnl && !balance && !annual && !expenseSummary) return null;

            return (
              <section key={currency} className="space-y-4">
                <FinanceSectionTitle
                  title={`${currency} management snapshot`}
                  description="Fast readouts for earnings power, statement health, and current cost pressure."
                  actions={<CurrencyChip currency={currency} />}
                />

                <StatGrid>
                  <StatCard
                    label="Net Profit"
                    value={formatMoney(pnl?.net_profit ?? 0, currency)}
                    hint="Gross profit minus manual operating expenses."
                    tone={(pnl?.net_profit ?? 0) >= 0 ? "success" : "danger"}
                  />
                  <StatCard
                    label="Total Assets"
                    value={formatMoney(
                      balance?.assets.total_assets ?? 0,
                      currency,
                    )}
                    hint="Cash-equivalent collections, receivables, and inventory valuation."
                    tone="primary"
                  />
                  <StatCard
                    label="Liabilities"
                    value={formatMoney(
                      balance?.liabilities.total_liabilities ?? 0,
                      currency,
                    )}
                    hint="Unpaid manual expenses in the current finance MVP."
                    tone="warning"
                  />
                  <StatCard
                    label="Annual Margin"
                    value={`${annual?.margin_percent ?? 0}%`}
                    hint="Net profit as a share of annual recognized revenue."
                    tone="default"
                  />
                </StatGrid>

                <div className="grid gap-4 xl:grid-cols-3">
                  <SurfaceCard className="border-emerald-500/10 bg-[linear-gradient(180deg,rgba(236,253,245,0.75),rgba(255,255,255,0.98))] shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition-transform duration-300 ease-out hover:-translate-y-0.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
                      Revenue Mix
                    </p>
                    <div className="mt-4 space-y-3">
                      {Object.entries(pnl?.revenue_by_type ?? {}).map(
                        ([type, amount]) => (
                          <div
                            key={type}
                            className="rounded-2xl border border-outline-variant/10 bg-white/85 px-4 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-medium capitalize text-on-surface">
                                {type}
                              </span>
                              <span className="text-sm font-semibold text-on-surface">
                                {formatMoney(amount, currency)}
                              </span>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </SurfaceCard>

                  <SurfaceCard className="border-emerald-500/10 bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition-transform duration-300 ease-out hover:-translate-y-0.5">
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

                  <SurfaceCard className="border-amber-500/15 bg-[linear-gradient(180deg,rgba(255,251,235,0.8),rgba(255,255,255,0.98))] shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition-transform duration-300 ease-out hover:-translate-y-0.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
                      Expense Pressure
                    </p>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-outline-variant/10 bg-white/85 px-4 py-3">
                        <p className="text-sm text-on-surface-variant">
                          Total expenses
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-on-surface">
                          {formatMoney(expenseSummary?.total ?? 0, currency)}
                        </p>
                      </div>
                      {Object.entries(expenseSummary?.categories ?? {})
                        .slice(0, 3)
                        .map(([category, amount]) => (
                          <div
                            key={category}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/10 bg-white/85 px-4 py-3"
                          >
                            <span className="text-sm font-medium capitalize text-on-surface">
                              {category.replace(/_/g, " ")}
                            </span>
                            <span className="text-sm font-semibold text-on-surface">
                              {formatMoney(amount, currency)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </SurfaceCard>
                </div>
              </section>
            );
          })}
        </>
      )}
    </PageShell>
  );
}
