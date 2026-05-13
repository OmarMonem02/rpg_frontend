"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/auth-api";
import { getAuthToken } from "@/lib/auth-session";
import { getAnnualSummaryReport, type AnnualSummaryReport, type ReportingCurrency, type AnnualSummaryCurrencySection } from "@/lib/api/reporting";
import { SUPPORTED_PRICING_CURRENCIES } from "@/lib/currencies";
import {
  BreakdownList,
  EmptyFinanceState,
  FinanceHero,
  FinanceLoadingCard,
  FinanceSectionTitle,
  MoneyStatGrid,
  YearPicker,
  formatMoney,
} from "@/components/reporting/finance-utils";
import { FilterBar, InlineMessage, InputGroup, PageShell, SurfaceCard } from "@/components/ops-ui";

export default function AnnualStatementPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [currency, setCurrency] = useState<ReportingCurrency | "">("");
  const [report, setReport] = useState<AnnualSummaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const token = getAuthToken();
        if (!token) throw new Error("Authentication required");
        const result = await getAnnualSummaryReport(token, { year, currency });

        if (!active) return;
        setReport(result);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Failed to load annual statement.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [year, currency]);

  const sections = Object.entries(report?.currencies ?? {}).filter(
    (entry): entry is [string, AnnualSummaryCurrencySection] => entry[1] !== undefined
  );

  return (
    <PageShell>
      <FinanceHero
        title="Annual Statement"
        description="Review the selected year as a management statement: monthly performance, revenue mix, expense concentration, and margin quality without blending currencies."
        active="annual"
      />

      <FilterBar className="border-emerald-500/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(240,253,244,0.92))]">
        <div className="md:col-span-4">
          <YearPicker year={year} onChange={setYear} />
        </div>
        <InputGroup label="Currency" className="md:col-span-4">
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value as ReportingCurrency | "")}
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
      </FilterBar>

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

      {loading ? (
        <FinanceLoadingCard label="Compiling the yearly trend line" />
      ) : sections.length === 0 ? (
        <EmptyFinanceState
          title="No annual activity found for this year"
          description="Completed sales and expense records are needed before the annual sheet can show trends."
        />
      ) : (
        <>

          {sections.map(([code, section]) => (
            <section key={code} className="space-y-4">
              <FinanceSectionTitle
                title={`${year} summary in ${code}`}
                description="A 12-month management view for revenue, margins, expenses, and net result."
              />

              <MoneyStatGrid
                items={[
                  { label: "Annual Revenue", value: section.totals.revenue, currency: code, tone: "primary", hint: "Recognized revenue over the year." },
                  { label: "Gross Profit", value: section.totals.gross_profit, currency: code, tone: "success", hint: "Revenue after direct cost." },
                  { label: "Operating Expenses", value: section.totals.expenses, currency: code, tone: "warning", hint: "Manual expense ledger total." },
                  { label: "Net Profit", value: section.totals.net_profit, currency: code, tone: section.totals.net_profit >= 0 ? "success" : "danger", hint: "Bottom-line result." },
                ]}
              />

              <div className="grid gap-4 xl:grid-cols-3">
                <BreakdownList title="Revenue Mix" values={section.revenue_mix} currency={code} />
                <BreakdownList title="Expense Categories" values={section.expense_categories} currency={code} />
                <SurfaceCard className="border-emerald-500/10 bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition-transform duration-300 ease-out hover:-translate-y-0.5">
                  <h3 className="text-base font-semibold text-on-surface">Channel Balance</h3>
                  <div className="mt-4 space-y-3">
                    {[
                      ["Maintenance revenue", section.maintenance_revenue],
                      ["Non-maintenance revenue", section.non_maintenance_revenue],
                      ["Margin percent", section.margin_percent],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3">
                        <span className="text-sm font-medium text-on-surface">{label}</span>
                        <span className="text-sm font-semibold text-on-surface">
                          {typeof value === "number" && label === "Margin percent"
                            ? `${value}%`
                            : formatMoney(value as number, code)}
                        </span>
                      </div>
                    ))}
                  </div>
                </SurfaceCard>
              </div>

              <SurfaceCard className="overflow-hidden p-0 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <div className="border-b border-outline-variant/12 px-4 py-4 md:px-5">
                  <h3 className="text-base font-semibold text-on-surface">Monthly trend table</h3>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Use this table when you want month-over-month comparisons without opening a spreadsheet.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-surface-container-low">
                      <tr className="border-b border-outline-variant/15">
                        <th className="px-4 py-3 text-left font-semibold text-on-surface">Month</th>
                        <th className="px-4 py-3 text-right font-semibold text-on-surface">Revenue</th>
                        <th className="px-4 py-3 text-right font-semibold text-on-surface">COGS</th>
                        <th className="px-4 py-3 text-right font-semibold text-on-surface">Gross Profit</th>
                        <th className="px-4 py-3 text-right font-semibold text-on-surface">Expenses</th>
                        <th className="px-4 py-3 text-right font-semibold text-on-surface">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.monthly.map((month) => (
                        <tr key={`${code}-${month.month}`} className="border-b border-outline-variant/10 transition-colors hover:bg-surface-container-low/70">
                          <td className="px-4 py-3 font-medium text-on-surface">{month.month}</td>
                          <td className="px-4 py-3 text-right text-on-surface">{formatMoney(month.revenue, code)}</td>
                          <td className="px-4 py-3 text-right text-on-surface">{formatMoney(month.cogs, code)}</td>
                          <td className="px-4 py-3 text-right text-on-surface">{formatMoney(month.gross_profit, code)}</td>
                          <td className="px-4 py-3 text-right text-on-surface">{formatMoney(month.expenses, code)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-on-surface">{formatMoney(month.net_profit, code)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>
            </section>
          ))}
        </>
      )}
    </PageShell>
  );
}
