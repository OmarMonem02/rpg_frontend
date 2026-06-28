"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/auth-api";
import { getAuthToken } from "@/lib/auth-session";
import {
  getBalanceSheetReport,
  type BalanceSheetReport,
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
  formatMoney,
  reportingStatTone,
} from "@/components/reporting/finance-utils";
import { InlineMessage, PageShell, SurfaceCard } from "@/components/ops-ui";
import { ReportingExportActions } from "@/components/reporting/ReportingExportActions";

export default function BalanceSheetPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
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
        const result = await getBalanceSheetReport(token, {
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
            : "Failed to load balance sheet.",
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
        title="Balance Sheet"
        description=""
        active="balance-sheet"
        actions={
          <ReportingExportActions
            reportType="balance-sheet"
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
        <FinanceLoadingCard label="Mapping assets, liabilities, and residual equity" />
      ) : !section ? (
        <EmptyFinanceState
          title="No balance sheet data is available for this selection"
          description="Inventory, completed sales, open receivables, or unpaid expenses are needed before this sheet has signal."
        />
      ) : (
        <section className="space-y-4">
          <FinanceSectionTitle
            title="EGP financial position"
            description="Assets collect cash, receivables, and stock value. Liabilities currently track unpaid expenses only."
          />

          <MoneyStatGrid
            items={[
              {
                label: "Total Assets",
                value: section.assets.total_assets,
                currency,
                tone: "default",
                hint: "Cash, receivables, and inventory.",
              },
              {
                label: "Liabilities",
                value: section.liabilities.total_liabilities,
                currency,
                tone: reportingStatTone(
                  "Liabilities",
                  section.liabilities.total_liabilities,
                ),
                hint: "Unpaid expense obligations.",
              },
              {
                label: "Equity",
                value: section.equity,
                currency,
                tone: reportingStatTone("Equity", section.equity),
                hint: "Assets minus liabilities.",
              },
              {
                label: "Receivables",
                value: section.assets.accounts_receivable,
                currency,
                tone: "default",
                hint: "Open sales not yet recognized.",
              },
            ]}
          />

          <div className="grid gap-4 xl:grid-cols-3">
            <SurfaceCard className="transition-transform duration-300 ease-out hover:-translate-y-0.5">
              <h3 className="text-base font-semibold text-on-surface">
                Asset Breakdown
              </h3>
              <div className="mt-4 space-y-3">
                {[
                  ["Cash equivalents", section.assets.cash_equivalents.total],
                  ["Inventory", section.assets.inventory.total],
                  ["Accounts receivable", section.assets.accounts_receivable],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3"
                  >
                    <span className="text-sm font-medium text-on-surface">
                      {label}
                    </span>
                    <span className="text-sm font-semibold text-on-surface">
                      {formatMoney(value as number, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            <BreakdownList
              title="Collected by Payment Method"
              values={section.assets.cash_equivalents.payment_methods}
              currency={currency}
            />

            <BreakdownList
              title="Unpaid Expense Liabilities"
              values={section.liabilities.expense_categories}
              currency={currency}
            />
          </div>

          <SurfaceCard className="shadow-ambient">
            <h3 className="text-base font-semibold text-on-surface">
              Inventory Valuation
            </h3>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
              Current stock value uses the present cost basis stored for
              products, spare parts, and unsold bikes.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                ["Products", section.assets.inventory.products],
                ["Spare parts", section.assets.inventory.spare_parts],
                ["Bikes", section.assets.inventory.bikes],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-outline-variant/10 bg-surface px-4 py-4 transition-transform duration-300 ease-out hover:-translate-y-0.5"
                >
                  <p className="text-sm text-on-surface-variant">{label}</p>
                  <p className="mt-2 text-xl font-semibold text-on-surface">
                    {formatMoney(value as number, currency)}
                  </p>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </section>
      )}
    </PageShell>
  );
}
