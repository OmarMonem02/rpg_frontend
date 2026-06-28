"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/auth-api";
import { getAuthToken } from "@/lib/auth-session";
import {
  getAnnualSummaryReport,
  type AnnualSummaryReport,
} from "@/lib/api/reporting";
import { REPORTING_CURRENCY } from "@/lib/currencies";
import {
  BreakdownList,
  EmptyFinanceState,
  FinanceHero,
  FinanceLoadingCard,
  FinanceSectionTitle,
  MoneyStatGrid,
  YearPicker,
  formatMoney,
  metricToneClass,
  reportingStatTone,
} from "@/components/reporting/finance-utils";
import { ReportingExportActions } from "@/components/reporting/ReportingExportActions";
import {
  FilterBar,
  InlineMessage,
  PageShell,
  SurfaceCard,
} from "@/components/ops-ui";

export default function AnnualStatementPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState<AnnualSummaryReport | null>(null);
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
        const result = await getAnnualSummaryReport(token, { year });

        if (!active) return;
        setReport(result);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : "Failed to load annual statement.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [year]);

  const section = report?.currencies[REPORTING_CURRENCY];
  const currency = REPORTING_CURRENCY;

  return (
    <PageShell>
      <FinanceHero
        title="Annual Statement"
        description=""
        active="annual"
        actions={
          <ReportingExportActions
            reportType="annual-summary"
            filters={{ year }}
            disabled={loading || !section}
            onError={setExportError}
          />
        }
      />

      <FilterBar>
        <div className="md:col-span-12">
          <YearPicker year={year} onChange={setYear} />
        </div>
      </FilterBar>

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
      {exportError ? (
        <InlineMessage tone="danger">{exportError}</InlineMessage>
      ) : null}

      {loading ? (
        <FinanceLoadingCard label="Compiling the yearly trend line" />
      ) : !section ? (
        <EmptyFinanceState
          title="No annual activity found for this year"
          description="Completed sales and expense records are needed before the annual sheet can show trends."
        />
      ) : (
        <section className="space-y-4">
          <FinanceSectionTitle
            title={`${year} summary in EGP`}
            description="A 12-month management view for revenue, margins, expenses, and net result."
          />

          <MoneyStatGrid
            items={[
              {
                label: "Annual Revenue",
                value: section.totals.revenue,
                currency,
                tone: reportingStatTone("Revenue", section.totals.revenue),
                hint: "Recognized revenue over the year.",
              },
              {
                label: "Gross Profit",
                value: section.totals.gross_profit,
                currency,
                tone: reportingStatTone(
                  "Gross Profit",
                  section.totals.gross_profit,
                ),
                hint: "Revenue after direct cost.",
              },
              {
                label: "Operating Expenses",
                value: section.totals.expenses,
                currency,
                tone: reportingStatTone(
                  "Operating Expenses",
                  section.totals.expenses,
                ),
                hint: "Manual expense ledger total.",
              },
              {
                label: "Net Profit",
                value: section.totals.net_profit,
                currency,
                tone: reportingStatTone(
                  "Net Profit",
                  section.totals.net_profit,
                ),
                hint: "Bottom-line result.",
              },
            ]}
          />

          <div className="grid gap-4 xl:grid-cols-3">
            <BreakdownList
              title="Revenue Mix"
              values={section.revenue_mix}
              currency={currency}
            />
            <BreakdownList
              title="Expense Categories"
              values={section.expense_categories}
              currency={currency}
            />
            <SurfaceCard className="transition-transform duration-300 ease-out hover:-translate-y-0.5">
              <h3 className="text-base font-semibold text-on-surface">
                Channel Balance
              </h3>
              <div className="mt-4 space-y-3">
                {[
                  ["Maintenance revenue", section.maintenance_revenue],
                  ["Non-maintenance revenue", section.non_maintenance_revenue],
                  ["Margin percent", section.margin_percent],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3"
                  >
                    <span className="text-sm font-medium text-on-surface">
                      {label}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        label === "Margin percent"
                          ? metricToneClass(value as number)
                          : label === "Maintenance revenue" ||
                              label === "Non-maintenance revenue"
                            ? "text-positive"
                            : "text-on-surface"
                      }`}
                    >
                      {typeof value === "number" && label === "Margin percent"
                        ? `${value}%`
                        : formatMoney(value as number, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </div>

          <SurfaceCard className="overflow-hidden p-0 shadow-ambient">
            <div className="border-b border-outline-variant/12 px-4 py-4 md:px-5">
              <h3 className="text-base font-semibold text-on-surface">
                Monthly trend table
              </h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                Use this table when you want month-over-month comparisons
                without opening a spreadsheet.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-surface-container-low">
                  <tr className="border-b border-outline-variant/15">
                    <th className="px-4 py-3 text-left font-semibold text-on-surface">
                      Month
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-on-surface">
                      Revenue
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-on-surface">
                      COGS
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-on-surface">
                      Gross Profit
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-on-surface">
                      Expenses
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-on-surface">
                      Net Profit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {section.monthly.map((month) => (
                    <tr
                      key={month.month}
                      className="border-b border-outline-variant/10 transition-colors hover:bg-surface-container-low/70"
                    >
                      <td className="px-4 py-3 font-medium text-on-surface">
                        {month.month}
                      </td>
                      <td className="px-4 py-3 text-right text-positive">
                        {formatMoney(month.revenue, currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-negative">
                        {formatMoney(month.cogs, currency)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right ${metricToneClass(month.gross_profit)}`}
                      >
                        {formatMoney(month.gross_profit, currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-negative">
                        {formatMoney(month.expenses, currency)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${metricToneClass(month.net_profit)}`}
                      >
                        {formatMoney(month.net_profit, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SurfaceCard>
        </section>
      )}
    </PageShell>
  );
}
