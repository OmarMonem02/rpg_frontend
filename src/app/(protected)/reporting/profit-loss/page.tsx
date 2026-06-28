"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/auth-api";
import { getAuthToken } from "@/lib/auth-session";
import {
  getProfitLossReport,
  type ProfitLossReport,
} from "@/lib/api/reporting";
import { REPORTING_CURRENCY } from "@/lib/currencies";
import {
  BreakdownList,
  EmptyFinanceState,
  FinanceFilterBar,
  FinanceHero,
  FinanceLoadingCard,
  FinanceSectionTitle,
  MoneyStatGrid,
  reportingStatTone,
} from "@/components/reporting/finance-utils";
import { InlineMessage, PageShell } from "@/components/ops-ui";
import { ReportingExportActions } from "@/components/reporting/ReportingExportActions";

export default function ProfitLossPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [report, setReport] = useState<ProfitLossReport | null>(null);
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
        const result = await getProfitLossReport(token, {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        });

        if (!active) return;
        setReport(result);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : "Failed to load profit and loss.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [dateFrom, dateTo]);

  const section = report?.currencies[REPORTING_CURRENCY];
  const currency = REPORTING_CURRENCY;

  return (
    <PageShell>
      <FinanceHero
        title="Profit & Loss Statement"
        description=""
        active="profit-loss"
        actions={
          <ReportingExportActions
            reportType="profit-loss"
            filters={{
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
            }}
            disabled={loading || !section}
            onError={setExportError}
          />
        }
      />
      <FinanceFilterBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
      {exportError ? (
        <InlineMessage tone="danger">{exportError}</InlineMessage>
      ) : null}

      {loading ? (
        <FinanceLoadingCard label="Calculating recognized earnings and operating pressure" />
      ) : !section ? (
        <EmptyFinanceState
          title="No recognized earnings in this filter window"
          description="Completed sales are required for recognized revenue. Try widening the date range or switch to the expenses page to add operating costs first."
          actionLabel="Open Expenses"
          actionHref="/reporting/expenses"
        />
      ) : (
        <section className="space-y-4">
          <FinanceSectionTitle
            title="EGP profit snapshot"
            description="Recognized revenue excludes partial and pending sales, while operating expenses come from the manual expense ledger."
          />

          <MoneyStatGrid
            items={[
              {
                label: "Revenue",
                value: section.revenue,
                currency,
                tone: reportingStatTone("Revenue", section.revenue),
                hint: "Recognized sales only.",
              },
              {
                label: "COGS",
                value: section.cogs,
                currency,
                tone: reportingStatTone("COGS", section.cogs),
                hint: "Current item cost basis.",
              },
              {
                label: "Gross Profit",
                value: section.gross_profit,
                currency,
                tone: reportingStatTone("Gross Profit", section.gross_profit),
                hint: "Revenue minus cost of goods sold.",
              },
              {
                label: "Operating Expenses",
                value: section.operating_expenses,
                currency,
                tone: reportingStatTone(
                  "Operating Expenses",
                  section.operating_expenses,
                ),
                hint: "Manual expense ledger total.",
              },
              {
                label: "Net Profit",
                value: section.net_profit,
                currency,
                tone: reportingStatTone("Net Profit", section.net_profit),
                hint: "Gross profit after expenses.",
              },
            ]}
          />

          <div className="grid gap-4 xl:grid-cols-3">
            <BreakdownList
              title="Revenue by Sale Type"
              values={section.revenue_by_type}
              currency={currency}
            />
            <BreakdownList
              title="Revenue by Channel"
              values={section.revenue_by_channel}
              currency={currency}
            />
            <BreakdownList
              title="Expense Categories"
              values={section.expense_categories}
              currency={currency}
            />
          </div>
        </section>
      )}
    </PageShell>
  );
}
