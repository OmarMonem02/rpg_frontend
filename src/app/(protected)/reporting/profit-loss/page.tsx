"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/auth-api";
import { getAuthToken } from "@/lib/auth-session";
import { getProfitLossReport, type ProfitLossReport, type ReportingCurrency } from "@/lib/api/reporting";
import {
  BreakdownList,
  EmptyFinanceState,
  FinanceFilterBar,
  FinanceHero,
  FinanceLoadingCard,
  FinanceSectionTitle,
  MoneyStatGrid,
} from "@/components/reporting/finance-utils";
import { InlineMessage, PageShell } from "@/components/ops-ui";

export default function ProfitLossPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currency, setCurrency] = useState<ReportingCurrency | "">("");
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const token = getAuthToken();
        if (!token) throw new Error("Authentication required");
        const result = await getProfitLossReport(token, {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          currency,
        });

        if (!active) return;
        setReport(result);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Failed to load profit and loss.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [dateFrom, dateTo, currency]);

  const currencySections = Object.entries(report?.currencies ?? {}) as Array<
    [string, NonNullable<ProfitLossReport["currencies"][ReportingCurrency]>]
  >;

  return (
    <PageShell>
      <FinanceHero
        title="Profit & Loss Statement"
        description="Read recognized revenue, cost of goods sold, gross profit, manual operating expenses, and net profit without mixing currencies or open sales into realized earnings."
        active="profit-loss"
      />

      <FinanceFilterBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        currency={currency}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onCurrencyChange={(value) => setCurrency(value as ReportingCurrency | "")}
      />

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

      {loading ? (
        <FinanceLoadingCard label="Calculating recognized earnings and operating pressure" />
      ) : currencySections.length === 0 ? (
        <EmptyFinanceState
          title="No recognized earnings in this filter window"
          description="Completed sales are required for recognized revenue. Try widening the date range or switch to the expenses page to add operating costs first."
          actionLabel="Open Expenses"
          actionHref="/reporting/expenses"
        />
      ) : (
        <>

          {currencySections.map(([code, section]) => (
            <section key={code} className="space-y-4">
              <FinanceSectionTitle
                title={`${code} profit snapshot`}
                description="Recognized revenue excludes partial and pending sales, while operating expenses come from the manual expense ledger."
              />

              <MoneyStatGrid
                items={[
                  { label: "Revenue", value: section.revenue, currency: code, tone: "primary", hint: "Recognized sales only." },
                  { label: "COGS", value: section.cogs, currency: code, tone: "warning", hint: "Current item cost basis." },
                  { label: "Gross Profit", value: section.gross_profit, currency: code, tone: "success", hint: "Revenue minus cost of goods sold." },
                  { label: "Operating Expenses", value: section.operating_expenses, currency: code, tone: "danger", hint: "Manual expense ledger total." },
                  { label: "Net Profit", value: section.net_profit, currency: code, tone: section.net_profit >= 0 ? "success" : "danger", hint: "Gross profit after expenses." },
                ]}
              />

              <div className="grid gap-4 xl:grid-cols-3">
                <BreakdownList
                  title="Revenue by Sale Type"
                  values={section.revenue_by_type}
                  currency={code}
                />
                <BreakdownList
                  title="Revenue by Channel"
                  values={section.revenue_by_channel}
                  currency={code}
                />
                <BreakdownList
                  title="Expense Categories"
                  values={section.expense_categories}
                  currency={code}
                />
              </div>
            </section>
          ))}
        </>
      )}
    </PageShell>
  );
}
