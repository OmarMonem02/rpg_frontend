"use client";

import { ApiError } from "@/lib/auth-api";
import { getApiUrl } from "@/lib/config";
import type { PricingCurrency } from "@/lib/currencies";
import { REPORTING_CURRENCY, toPricingCurrency } from "@/lib/currencies";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  if (value && typeof value === "object") return value as UnknownRecord;
  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      message?: string;
      errors?: Record<string, string[]>;
    };

    if (payload.errors) {
      return Object.entries(payload.errors)
        .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
        .join("; ");
    }

    if (payload.message) return payload.message;
  } catch {
    // Ignore parsing failure and fall through to status-based copy.
  }

  if (response.status === 401) return "Your session expired. Please log in again.";
  if (response.status === 403) return "You do not have permission to access financial reporting.";
  if (response.status === 422) return "Please review the selected filters and try again.";
  return "Request failed. Please try again.";
}

async function authorizedFetch<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export type ReportingCurrency = PricingCurrency;
export type ExpensePaymentStatus = "paid" | "unpaid";
export type ExpenseCategory =
  | "rent"
  | "salaries"
  | "utilities"
  | "marketing"
  | "transport"
  | "maintenance"
  | "other";

export type ReportingFilters = {
  date_from?: string;
  date_to?: string;
  year?: number;
  currency?: ReportingCurrency | "";
  payment_status?: ExpensePaymentStatus | "";
  category?: ExpenseCategory | "";
};

export type ProfitLossCurrencySection = {
  revenue: number;
  cogs: number;
  gross_profit: number;
  operating_expenses: number;
  net_profit: number;
  revenue_by_type: Record<string, number>;
  revenue_by_channel: Record<string, number>;
  expense_categories: Record<string, number>;
};

export type ProfitLossReport = {
  filters: ReportingFilters;
  currencies: Partial<Record<ReportingCurrency, ProfitLossCurrencySection>>;
};

export type BalanceSheetCurrencySection = {
  assets: {
    cash_equivalents: {
      total: number;
      payment_methods: Record<string, number>;
    };
    inventory: {
      products: number;
      spare_parts: number;
      bikes: number;
      total: number;
    };
    accounts_receivable: number;
    total_assets: number;
  };
  liabilities: {
    unpaid_expenses: number;
    expense_categories: Record<string, number>;
    total_liabilities: number;
  };
  equity: number;
};

export type BalanceSheetReport = {
  filters: ReportingFilters;
  currencies: Partial<Record<ReportingCurrency, BalanceSheetCurrencySection>>;
};

export type AnnualMonthRow = {
  month: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
};

export type AnnualSummaryCurrencySection = {
  monthly: AnnualMonthRow[];
  totals: {
    revenue: number;
    cogs: number;
    gross_profit: number;
    expenses: number;
    net_profit: number;
  };
  revenue_mix: Record<string, number>;
  expense_categories: Record<string, number>;
  maintenance_revenue: number;
  non_maintenance_revenue: number;
  margin_percent: number;
};

export type AnnualSummaryReport = {
  filters: ReportingFilters;
  year: number;
  currencies: Partial<Record<ReportingCurrency, AnnualSummaryCurrencySection>>;
};

export type ExpenseRecord = {
  id: number;
  title: string;
  image?: string;
  image_public_id?: string;
  category: ExpenseCategory;
  amount: number;
  currency: ReportingCurrency;
  payment_status: ExpensePaymentStatus;
  incurred_on?: string;
  due_date?: string;
  paid_at?: string;
  notes?: string;
  created_at?: string;
};

export type ExpensesReport = {
  filters: ReportingFilters;
  summary: Partial<
    Record<
      ReportingCurrency,
      {
        total: number;
        categories: Record<string, number>;
      }
    >
  >;
  data: ExpenseRecord[];
  current_page: number;
  last_page: number;
  total: number;
};

export type ExpensePayload = {
  title: string;
  image?: string;
  image_public_id?: string;
  category: ExpenseCategory;
  amount: number;
  currency: ReportingCurrency;
  payment_status: ExpensePaymentStatus;
  incurred_on: string;
  due_date?: string;
  paid_at?: string;
  notes?: string;
};

function buildQuery(filters: ReportingFilters = {}): string {
  const query = new URLSearchParams();

  if (filters.date_from) query.append("date_from", filters.date_from);
  if (filters.date_to) query.append("date_to", filters.date_to);
  if (filters.year) query.append("year", String(filters.year));
  query.append("currency", REPORTING_CURRENCY);
  if (filters.payment_status) query.append("payment_status", filters.payment_status);
  if (filters.category) query.append("category", filters.category);

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

function normalizeNumericMap(raw: unknown): Record<string, number> {
  return Object.entries(asRecord(raw)).reduce<Record<string, number>>((acc, [key, value]) => {
    acc[key] = toNumber(value);
    return acc;
  }, {});
}

function normalizeProfitLoss(raw: unknown): ProfitLossCurrencySection {
  const record = asRecord(raw);
  return {
    revenue: toNumber(record.revenue),
    cogs: toNumber(record.cogs),
    gross_profit: toNumber(record.gross_profit),
    operating_expenses: toNumber(record.operating_expenses),
    net_profit: toNumber(record.net_profit),
    revenue_by_type: normalizeNumericMap(record.revenue_by_type),
    revenue_by_channel: normalizeNumericMap(record.revenue_by_channel),
    expense_categories: normalizeNumericMap(record.expense_categories),
  };
}

function normalizeBalanceSheet(raw: unknown): BalanceSheetCurrencySection {
  const record = asRecord(raw);
  const assets = asRecord(record.assets);
  const cashEquivalents = asRecord(assets.cash_equivalents);
  const inventory = asRecord(assets.inventory);
  const liabilities = asRecord(record.liabilities);

  return {
    assets: {
      cash_equivalents: {
        total: toNumber(cashEquivalents.total),
        payment_methods: normalizeNumericMap(cashEquivalents.payment_methods),
      },
      inventory: {
        products: toNumber(inventory.products),
        spare_parts: toNumber(inventory.spare_parts),
        bikes: toNumber(inventory.bikes),
        total: toNumber(inventory.total),
      },
      accounts_receivable: toNumber(assets.accounts_receivable),
      total_assets: toNumber(assets.total_assets),
    },
    liabilities: {
      unpaid_expenses: toNumber(liabilities.unpaid_expenses),
      expense_categories: normalizeNumericMap(liabilities.expense_categories),
      total_liabilities: toNumber(liabilities.total_liabilities),
    },
    equity: toNumber(record.equity),
  };
}

function normalizeAnnualSummary(raw: unknown): AnnualSummaryCurrencySection {
  const record = asRecord(raw);
  return {
    monthly: asArray(record.monthly).map((row) => {
      const month = asRecord(row);
      return {
        month: toText(month.month),
        revenue: toNumber(month.revenue),
        cogs: toNumber(month.cogs),
        gross_profit: toNumber(month.gross_profit),
        expenses: toNumber(month.expenses),
        net_profit: toNumber(month.net_profit),
      };
    }),
    totals: {
      revenue: toNumber(asRecord(record.totals).revenue),
      cogs: toNumber(asRecord(record.totals).cogs),
      gross_profit: toNumber(asRecord(record.totals).gross_profit),
      expenses: toNumber(asRecord(record.totals).expenses),
      net_profit: toNumber(asRecord(record.totals).net_profit),
    },
    revenue_mix: normalizeNumericMap(record.revenue_mix),
    expense_categories: normalizeNumericMap(record.expense_categories),
    maintenance_revenue: toNumber(record.maintenance_revenue),
    non_maintenance_revenue: toNumber(record.non_maintenance_revenue),
    margin_percent: toNumber(record.margin_percent),
  };
}

function normalizeExpense(raw: unknown): ExpenseRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    title: toText(record.title),
    image: toText(record.image) || undefined,
    image_public_id: toText(record.image_public_id) || undefined,
    category: toText(record.category) as ExpenseCategory,
    amount: toNumber(record.amount),
    currency: toPricingCurrency(record.currency),
    payment_status: toText(record.payment_status) as ExpensePaymentStatus,
    incurred_on: toText(record.incurred_on) || undefined,
    due_date: toText(record.due_date) || undefined,
    paid_at: toText(record.paid_at) || undefined,
    notes: toText(record.notes) || undefined,
    created_at: toText(record.created_at) || undefined,
  };
}

export async function getProfitLossReport(
  token: string,
  filters: ReportingFilters = {},
): Promise<ProfitLossReport> {
  const payload = await authorizedFetch<unknown>(`/reporting/profit-loss${buildQuery(filters)}`, token);
  const record = asRecord(payload);
  const currencies = asRecord(record.currencies);

  const result: ProfitLossReport = { filters, currencies: {} };
  const raw = currencies[REPORTING_CURRENCY];
  if (raw) {
    result.currencies[REPORTING_CURRENCY] = normalizeProfitLoss(raw);
  }

  return result;
}

export async function getBalanceSheetReport(
  token: string,
  filters: ReportingFilters = {},
): Promise<BalanceSheetReport> {
  const payload = await authorizedFetch<unknown>(`/reporting/balance-sheet${buildQuery(filters)}`, token);
  const record = asRecord(payload);
  const currencies = asRecord(record.currencies);

  const result: BalanceSheetReport = { filters, currencies: {} };
  const raw = currencies[REPORTING_CURRENCY];
  if (raw) {
    result.currencies[REPORTING_CURRENCY] = normalizeBalanceSheet(raw);
  }

  return result;
}

export async function getAnnualSummaryReport(
  token: string,
  filters: ReportingFilters = {},
): Promise<AnnualSummaryReport> {
  const payload = await authorizedFetch<unknown>(`/reporting/annual-summary${buildQuery(filters)}`, token);
  const record = asRecord(payload);
  const currencies = asRecord(record.currencies);

  const result: AnnualSummaryReport = {
    filters,
    year: toNumber(record.year),
    currencies: {},
  };

  for (const code of [REPORTING_CURRENCY] as const) {
    const raw = currencies[code];
    if (raw) {
      result.currencies[code] = normalizeAnnualSummary(raw);
    }
  }

  return result;
}

export async function getExpensesReport(
  token: string,
  filters: ReportingFilters = {},
): Promise<ExpensesReport> {
  const payload = await authorizedFetch<unknown>(`/reporting/expenses${buildQuery(filters)}`, token);
  const record = asRecord(payload);
  const rawSummary = asRecord(record.summary);

  const summary: ExpensesReport["summary"] = {};
  const entry = rawSummary[REPORTING_CURRENCY];
  if (entry) {
    const r = asRecord(entry);
    summary[REPORTING_CURRENCY] = {
      total: toNumber(r.total),
      categories: normalizeNumericMap(r.categories),
    };
  }

  return {
    filters,
    summary,
    data: asArray(record.data).map(normalizeExpense),
    current_page: toNumber(record.current_page),
    last_page: toNumber(record.last_page),
    total: toNumber(record.total),
  };
}

export async function listExpenses(
  token: string,
  filters: ReportingFilters & { page?: number } = {},
): Promise<ExpensesReport> {
  const query = new URLSearchParams();
  if (filters.page) query.append("page", String(filters.page));
  if (filters.date_from) query.append("date_from", filters.date_from);
  if (filters.date_to) query.append("date_to", filters.date_to);
  query.append("currency", REPORTING_CURRENCY);
  if (filters.payment_status) query.append("payment_status", filters.payment_status);
  if (filters.category) query.append("category", filters.category);
  const suffix = query.toString() ? `?${query.toString()}` : "";

  const payload = await authorizedFetch<unknown>(`/expenses${suffix}`, token);
  const record = asRecord(payload);

  return {
    filters,
    summary: {},
    data: asArray(record.data).map(normalizeExpense),
    current_page: toNumber(record.current_page),
    last_page: toNumber(record.last_page),
    total: toNumber(record.total),
  };
}

export async function createExpense(token: string, payload: ExpensePayload): Promise<ExpenseRecord> {
  const result = await authorizedFetch<unknown>("/expenses", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return normalizeExpense(result);
}

export async function updateExpense(
  token: string,
  id: number,
  payload: Partial<ExpensePayload>,
): Promise<ExpenseRecord> {
  const result = await authorizedFetch<unknown>(`/expenses/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return normalizeExpense(result);
}

export async function deleteExpense(token: string, id: number): Promise<void> {
  await authorizedFetch<void>(`/expenses/${id}`, token, { method: "DELETE" });
}

export type ReportingExportType =
  | "overview"
  | "profit-loss"
  | "balance-sheet"
  | "annual-summary"
  | "expenses";

const REPORTING_EXPORT_PATHS: Record<ReportingExportType, string> = {
  overview: "/reporting/overview/export",
  "profit-loss": "/reporting/profit-loss/export",
  "balance-sheet": "/reporting/balance-sheet/export",
  "annual-summary": "/reporting/annual-summary/export",
  expenses: "/reporting/expenses/export",
};

export async function exportReportingReport(
  token: string,
  type: ReportingExportType,
  format: "xlsx" | "csv",
  filters: ReportingFilters = {},
): Promise<void> {
  const { downloadFile } = await import("@/lib/api/import-export");
  const query = buildQuery(filters);
  const separator = query.includes("?") ? "&" : "?";
  const path = `${REPORTING_EXPORT_PATHS[type]}${query}${separator}format=${format}`;
  const extension = format === "csv" ? "csv" : "xlsx";
  const filename = `${type}-${new Date().toISOString().slice(0, 10)}.${extension}`;
  await downloadFile(path, token, filename);
}
