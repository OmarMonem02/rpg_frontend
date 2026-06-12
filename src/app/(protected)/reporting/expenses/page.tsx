"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/auth-api";
import { getAuthToken } from "@/lib/auth-session";
import {
  createExpense,
  deleteExpense,
  getExpensesReport,
  listExpenses,
  updateExpense,
  type ExpenseCategory,
  type ExpensePayload,
  type ExpensePaymentStatus,
  type ExpenseRecord,
  type ExpensesReport,
  type ReportingCurrency,
} from "@/lib/api/reporting";
import { SUPPORTED_PRICING_CURRENCIES } from "@/lib/currencies";
import {
  EmptyFinanceState,
  EXPENSE_CATEGORY_OPTIONS,
  FinanceHero,
  FinanceLoadingCard,
  FinanceSectionTitle,
  PaymentStatusBadge,
  formatDate,
  formatMoney,
  getExpenseCategoryLabel,
} from "@/components/reporting/finance-utils";
import {
  ActionButton,
  InlineMessage,
  InputGroup,
  PageShell,
  PaginationControls,
  SearchableSelect,
  StatCard,
  StatGrid,
  SurfaceCard,
} from "@/components/ops-ui";
import { ImageUpload, type ImageUploadHandle } from "@/components/ui/ImageUpload";
import { resolvePendingImageUpload } from "@/lib/uploadImage";

type ExpenseFormState = {
  title: string;
  image: string;
  image_public_id: string;
  category: ExpenseCategory;
  amount: string;
  currency: ReportingCurrency;
  payment_status: ExpensePaymentStatus;
  incurred_on: string;
  due_date: string;
  paid_at: string;
  notes: string;
};

const initialFormState: ExpenseFormState = {
  title: "",
  image: "",
  image_public_id: "",
  category: "other",
  amount: "",
  currency: "EGP",
  payment_status: "unpaid",
  incurred_on: new Date().toISOString().slice(0, 10),
  due_date: "",
  paid_at: "",
  notes: "",
};

export default function ExpensesPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currency, setCurrency] = useState<ReportingCurrency | "">("");
  const [paymentStatus, setPaymentStatus] = useState<ExpensePaymentStatus | "">(
    "",
  );
  const [category, setCategory] = useState<ExpenseCategory | "">("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<ExpenseFormState>(initialFormState);
  const imageUploadRef = useRef<ImageUploadHandle>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(
    null,
  );
  const [summary, setSummary] = useState<ExpensesReport | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const token = getAuthToken();
        if (!token) throw new Error("Authentication required");

        const filters = {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          currency,
          payment_status: paymentStatus,
          category,
        };

        const [summaryResult, listResult] = await Promise.all([
          getExpensesReport(token, filters),
          listExpenses(token, { ...filters, page }),
        ]);

        if (!active) return;

        setSummary(summaryResult);
        setExpenses(listResult.data);
        setTotalPages(listResult.last_page || 1);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : "Failed to load expenses.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [dateFrom, dateTo, currency, paymentStatus, category, page]);

  function syncForm(expense: ExpenseRecord | null) {
    if (!expense) {
      setForm(initialFormState);
      return;
    }

    setForm({
      title: expense.title,
      image: expense.image ?? "",
      image_public_id: expense.image_public_id ?? "",
      category: expense.category,
      amount: String(expense.amount),
      currency: expense.currency,
      payment_status: expense.payment_status,
      incurred_on: expense.incurred_on?.slice(0, 10) ?? "",
      due_date: expense.due_date?.slice(0, 10) ?? "",
      paid_at: expense.paid_at ? expense.paid_at.slice(0, 10) : "",
      notes: expense.notes ?? "",
    });
  }

  function resetEditor() {
    setEditingExpense(null);
    setFormError(null);
    syncForm(null);
  }

  async function refreshCurrentData() {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required");

    const filters = {
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      currency,
      payment_status: paymentStatus,
      category,
    };

    const [summaryResult, listResult] = await Promise.all([
      getExpensesReport(token, filters),
      listExpenses(token, { ...filters, page }),
    ]);

    setSummary(summaryResult);
    setExpenses(listResult.data);
    setTotalPages(listResult.last_page || 1);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setFormError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      if (!form.title.trim()) throw new Error("Expense title is required.");
      if (!form.amount.trim() || Number(form.amount) <= 0)
        throw new Error("Expense amount must be greater than 0.");
      if (!form.incurred_on) throw new Error("Incurred date is required.");

      const uploadedImage = await resolvePendingImageUpload(imageUploadRef.current, {
        url: form.image || undefined,
        public_id: form.image_public_id || undefined,
      });

      const payload: ExpensePayload = {
        title: form.title.trim(),
        image: uploadedImage.url || undefined,
        image_public_id: uploadedImage.public_id || undefined,
        category: form.category,
        amount: Number(form.amount),
        currency: form.currency,
        payment_status: form.payment_status,
        incurred_on: form.incurred_on,
        due_date: form.due_date || undefined,
        paid_at:
          form.payment_status === "paid"
            ? form.paid_at || undefined
            : undefined,
        notes: form.notes.trim() || undefined,
      };

      if (editingExpense) {
        await updateExpense(token, editingExpense.id, payload);
      } else {
        await createExpense(token, payload);
      }

      await refreshCurrentData();
      resetEditor();
    } catch (err) {
      setFormError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to save expense.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this expense entry?")) return;
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await deleteExpense(token, id);
      await refreshCurrentData();
      if (editingExpense?.id === id) {
        resetEditor();
      }
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to delete expense.",
      );
    }
  }

  const summaryRows = SUPPORTED_PRICING_CURRENCIES.map((code) => ({
    code,
    total: summary?.summary[code as ReportingCurrency]?.total ?? 0,
  }));

  const unpaidCount = expenses.filter(
    (expense) => expense.payment_status === "unpaid",
  ).length;
  const paidCount = expenses.filter(
    (expense) => expense.payment_status === "paid",
  ).length;

  return (
    <PageShell>
      <FinanceHero
        title="Expenses Ledger"
        description="Capture manual operating expenses, mark what is still unpaid, and let every update flow directly into the P&L and balance sheet views."
        active="expenses"
      />

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
      <div>
        <StatGrid>
          {summaryRows.map((item) => (
            <StatCard
              key={item.code}
              label={`${item.code} Expenses`}
              value={formatMoney(item.total, item.code)}
              hint="Live total for the current expense filters."
              tone="primary"
            />
          ))}
          <StatCard
            label="Visible Unpaid"
            value={`${unpaidCount}`}
            hint="Unpaid entries on the current page of results."
            tone="warning"
          />
          <StatCard
            label="Visible Paid"
            value={`${paidCount}`}
            hint="Paid entries on the current page of results."
            tone="success"
          />
        </StatGrid>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard className="xl:sticky xl:top-24 xl:self-start">
          <FinanceSectionTitle
            title={editingExpense ? "Edit expense entry" : "Add expense entry"}
            description="Record what happened, when it happened, and whether it has been paid so the statements stay trustworthy."
            actions={
              editingExpense ? (
                <ActionButton variant="outline" onClick={resetEditor}>
                  Cancel edit
                </ActionButton>
              ) : null
            }
          />

          {formError ? (
            <InlineMessage tone="danger">{formError}</InlineMessage>
          ) : null}

          <form
            onSubmit={handleSubmit}
            className="mt-5 grid gap-4 md:grid-cols-2"
          >
            <InputGroup label="Title" className="md:col-span-2">
              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="form-input-base"
                placeholder="Workshop rent, social ads, utility bill..."
              />
            </InputGroup>

            <div className="md:col-span-2">
              <ImageUpload
                ref={imageUploadRef}
                value={form.image || undefined}
                folder="Receipt or Expense Photo"
                uploadFolder="rpg-system/expenses"
                onChange={(url, publicId) =>
                  setForm((current) => ({
                    ...current,
                    image: url,
                    image_public_id: publicId,
                  }))
                }
                onError={setFormError}
              />
            </div>

            <InputGroup label="Category">
              <SearchableSelect
                value={form.category}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    category: value as ExpenseCategory,
                  }))
                }
                options={EXPENSE_CATEGORY_OPTIONS}
                className="form-input-base"
              />
            </InputGroup>

            <InputGroup label="Amount">
              <input
                type="number"
                min="0"
                step="1"
                value={form.amount}
                onWheel={(event) => {
                  event.currentTarget.blur();
                }}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                className="form-input-base [&::-webkit-inner-spin-button]:appearance-none"
              />
            </InputGroup>

            <InputGroup label="Currency">
              <SearchableSelect
                value={form.currency}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    currency: value as ReportingCurrency,
                  }))
                }
                options={SUPPORTED_PRICING_CURRENCIES.map((code) => ({
                  value: code,
                  label: code,
                }))}
                className="form-input-base"
              />
            </InputGroup>

            <InputGroup label="Payment Status">
              <SearchableSelect
                value={form.payment_status}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    payment_status: value as ExpensePaymentStatus,
                  }))
                }
                options={[
                  { value: "unpaid", label: "Unpaid" },
                  { value: "paid", label: "Paid" },
                ]}
                className="form-input-base"
              />
            </InputGroup>

            <InputGroup label="Incurred On">
              <input
                type="date"
                value={form.incurred_on}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    incurred_on: event.target.value,
                  }))
                }
                className="form-input-base"
              />
            </InputGroup>

            <InputGroup label="Due Date">
              <input
                type="date"
                value={form.due_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    due_date: event.target.value,
                  }))
                }
                className="form-input-base"
              />
            </InputGroup>

            <InputGroup label="Paid At">
              <input
                type="date"
                value={form.paid_at}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    paid_at: event.target.value,
                  }))
                }
                className="form-input-base"
                disabled={form.payment_status !== "paid"}
              />
            </InputGroup>

            <InputGroup label="Notes" className="md:col-span-2">
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                className="form-input-base min-h-28"
                placeholder="Optional context for audits or finance review."
              />
            </InputGroup>

            <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
              <ActionButton
                type="button"
                variant="outline"
                onClick={resetEditor}
              >
                Reset
              </ActionButton>
              <ActionButton type="submit" tone="primary" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingExpense
                    ? "Update Expense"
                    : "Create Expense"}
              </ActionButton>
            </div>
          </form>
        </SurfaceCard>

        <div className="space-y-4">
          <SurfaceCard className="shadow-ambient">
            <FinanceSectionTitle
              title="Filter expenses"
              description="Narrow the ledger by time, currency, payment state, or category when reconciling a specific period."
            />

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InputGroup label="From">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => {
                    setPage(1);
                    setDateFrom(event.target.value);
                  }}
                  className="form-input-base"
                />
              </InputGroup>
              <InputGroup label="To">
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
                    setPage(1);
                    setDateTo(event.target.value);
                  }}
                  className="form-input-base"
                />
              </InputGroup>
              <InputGroup label="Currency">
                <SearchableSelect
                  value={currency}
                  onChange={(value) => {
                    setPage(1);
                    setCurrency(value as ReportingCurrency | "");
                  }}
                  options={[
                    { value: "", label: "All currencies" },
                    ...SUPPORTED_PRICING_CURRENCIES.map((code) => ({
                      value: code,
                      label: code,
                    })),
                  ]}
                  className="form-input-base"
                />
              </InputGroup>
              <InputGroup label="Payment Status">
                <SearchableSelect
                  value={paymentStatus}
                  onChange={(value) => {
                    setPage(1);
                    setPaymentStatus(value as ExpensePaymentStatus | "");
                  }}
                  options={[
                    { value: "", label: "All statuses" },
                    { value: "paid", label: "Paid" },
                    { value: "unpaid", label: "Unpaid" },
                  ]}
                  className="form-input-base"
                />
              </InputGroup>
              <InputGroup label="Category" className="md:col-span-2">
                <SearchableSelect
                  value={category}
                  onChange={(value) => {
                    setPage(1);
                    setCategory(value as ExpenseCategory | "");
                  }}
                  options={[
                    { value: "", label: "All categories" },
                    ...EXPENSE_CATEGORY_OPTIONS,
                  ]}
                  className="form-input-base"
                />
              </InputGroup>
            </div>
          </SurfaceCard>
        </div>
      </div>

      <SurfaceCard className="overflow-hidden p-0">
        <div className="border-b border-outline-variant/15 px-4 py-4 md:px-5">
          <FinanceSectionTitle
            title="Expense entries"
            description="Edit when details change. Delete only when the entry should no longer exist in this finance MVP."
          />
        </div>

        {loading ? (
          <div className="p-5">
            <FinanceLoadingCard label="Refreshing expense entries and statement totals" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-5">
            <EmptyFinanceState
              title="No expenses match the current filters"
              description="Create a new expense entry or widen your filter selection."
            />
          </div>
        ) : (
          <>
            <div className="grid gap-4 p-4 lg:hidden">
              {expenses.map((expense) => (
                <SurfaceCard
                  key={expense.id}
                  className="border-outline-variant/15 bg-surface-container-lowest p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {expense.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={expense.image}
                          alt=""
                          className="h-12 w-12 flex-none rounded-xl object-cover"
                        />
                      ) : null}
                      <div className="min-w-0">
                      <p className="text-sm font-semibold text-on-surface">
                        {expense.title}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-on-surface-variant">
                        {getExpenseCategoryLabel(expense.category)}
                      </p>
                      </div>
                    </div>
                    <PaymentStatusBadge value={expense.payment_status} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-outline-variant/10 bg-surface px-3 py-3">
                      <p className="text-xs text-on-surface-variant">Amount</p>
                      <p className="mt-1 font-semibold text-on-surface">
                        {formatMoney(expense.amount, expense.currency)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-outline-variant/10 bg-surface px-3 py-3">
                      <p className="text-xs text-on-surface-variant">
                        Incurred
                      </p>
                      <p className="mt-1 font-semibold text-on-surface">
                        {formatDate(expense.incurred_on)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <ActionButton
                      variant="outline"
                      onClick={() => {
                        setEditingExpense(expense);
                        syncForm(expense);
                        setFormError(null);
                      }}
                    >
                      Edit
                    </ActionButton>
                    <ActionButton
                      variant="outline"
                      tone="danger"
                      onClick={() => void handleDelete(expense.id)}
                    >
                      Delete
                    </ActionButton>
                  </div>
                </SurfaceCard>
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-surface-container-low">
                  <tr className="border-b border-outline-variant/15">
                    <th className="px-4 py-3 text-left font-semibold text-on-surface">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-on-surface">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-on-surface">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-on-surface">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-on-surface">
                      Incurred
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-on-surface">
                      Due
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-on-surface">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-b border-outline-variant/10"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          {expense.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={expense.image}
                              alt=""
                              className="h-12 w-12 flex-none rounded-xl object-cover"
                            />
                          ) : null}
                          <div>
                          <p className="font-medium text-on-surface">
                            {expense.title}
                          </p>
                          {expense.notes ? (
                            <p className="mt-1 max-w-md text-xs leading-5 text-on-surface-variant">
                              {expense.notes}
                            </p>
                          ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-on-surface">
                        {getExpenseCategoryLabel(expense.category)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-on-surface">
                        {formatMoney(expense.amount, expense.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge value={expense.payment_status} />
                      </td>
                      <td className="px-4 py-3 text-on-surface">
                        {formatDate(expense.incurred_on)}
                      </td>
                      <td className="px-4 py-3 text-on-surface">
                        {formatDate(expense.due_date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <ActionButton
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingExpense(expense);
                              syncForm(expense);
                              setFormError(null);
                            }}
                          >
                            Edit
                          </ActionButton>
                          <ActionButton
                            variant="outline"
                            tone="danger"
                            size="sm"
                            onClick={() => void handleDelete(expense.id)}
                          >
                            Delete
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SurfaceCard>

      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPrevious={() => setPage((value) => Math.max(1, value - 1))}
        onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
      />
    </PageShell>
  );
}
