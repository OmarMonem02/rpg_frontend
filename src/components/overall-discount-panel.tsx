"use client";

import {
  ArrowPathIcon,
  CheckIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { ActionButton, InlineMessage, SurfaceCard } from "@/components/ops-ui";
import {
  FormDiscountInput,
  formatDiscountAmount,
} from "@/components/form-discount-input";
import { OverallDiscountScopeSelector } from "@/components/overall-discount-scope-selector";
import {
  SaleTotalsSummary,
  type CartTotalsBreakdown,
} from "@/components/sale-totals-summary";
import type { useOverallDiscount } from "@/hooks/use-overall-discount";
import { formatEgp } from "@/lib/currencies";
import type { DiscountScope, DiscountScopeCategory } from "@/lib/discount-scope";

type OverallDiscountController = ReturnType<typeof useOverallDiscount>;

type OverallDiscountPanelProps = {
  id: string;
  label: string;
  context: "sale" | "ticket";
  canEdit?: boolean;
  hasItems: boolean;
  presentCategories: DiscountScopeCategory[];
  computeDiscountBase: (scope: DiscountScope) => number;
  discount: OverallDiscountController;
  emptyItemsHint?: string;
  adminHint?: string;
  staffHint?: string;
  variant?: "embedded" | "card";
  showTotals?: boolean;
  breakdown?: CartTotalsBreakdown;
  saleTotal?: number;
  overallDiscountLabel?: string;
  className?: string;
};

export function OverallDiscountPanel({
  id,
  label,
  context,
  canEdit = true,
  hasItems,
  presentCategories,
  computeDiscountBase,
  discount,
  emptyItemsHint,
  adminHint = "Enter a fixed EGP amount or a percentage of the subtotal (after line discounts).",
  staffHint = "Enter a discount and request admin approval before applying.",
  variant = "embedded",
  showTotals = false,
  breakdown,
  saleTotal = 0,
  overallDiscountLabel,
  className = "",
}: OverallDiscountPanelProps) {
  const {
    isAdmin,
    discountScope,
    setDiscountScope,
    discountDraft,
    setDiscountDraft,
    discountDraftType,
    setDiscountDraftType,
    approvedDiscount,
    discountFieldError,
    discountRequestNotice,
    discountRequestBusy,
    saving,
    discountRequestStatus,
    activeDiscountRequestId,
    discountBaseSubtotal,
    resolvedDiscountDraft,
    submitDiscountAction,
    refreshDiscountRequest,
    clearApprovedDiscount,
    normalizeDiscountAmount,
  } = discount;

  const busy = discountRequestBusy || saving;
  const resolvedDraftAmount = normalizeDiscountAmount(resolvedDiscountDraft);

  const discountHint = !hasItems
    ? (emptyItemsHint ??
      (context === "ticket"
        ? "Add ticket items before applying a discount."
        : "Add cart items before applying a discount."))
    : discountBaseSubtotal <= 0
      ? "Discount base is 0 because no categories are selected."
      : isAdmin
        ? adminHint
        : staffHint;

  const editor = canEdit ? (
    <>
      <div
        className={`grid gap-6 ${
          presentCategories.length > 0 ? "md:grid-cols-2" : "md:grid-cols-1"
        }`}
      >
        <FormDiscountInput
          id={id}
          label={label}
          icon={TagIcon}
          prefix="-"
          value={discountDraft}
          discountType={discountDraftType}
          onChange={setDiscountDraft}
          onTypeChange={setDiscountDraftType}
          onBlur={() => void submitDiscountAction()}
          baseAmount={discountBaseSubtotal}
          maxFixedAmount={discountBaseSubtotal}
          disabled={!hasItems || busy || discountBaseSubtotal <= 0}
          currencySuffix="EGP"
          hint={discountHint}
        />

        {presentCategories.length > 0 ? (
          <OverallDiscountScopeSelector
            presentCategories={presentCategories}
            scope={discountScope}
            context={context}
            discountBaseSubtotal={discountBaseSubtotal}
            discountDraft={discountDraft}
            discountDraftType={discountDraftType}
            computeDiscountBase={computeDiscountBase}
            disabled={busy}
            onScopeChange={(nextScope, nextDraft) => {
              setDiscountScope(nextScope);
              setDiscountDraft(nextDraft);
            }}
          />
        ) : null}
      </div>

      {hasItems ? (
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            type="button"
            size="sm"
            tone="primary"
            variant="outline"
            onClick={() => void submitDiscountAction()}
            disabled={
              busy || (isAdmin && resolvedDraftAmount === approvedDiscount)
            }
          >
            {isAdmin ? "Apply discount" : "Request approval"}
          </ActionButton>

          {!isAdmin && activeDiscountRequestId ? (
            <ActionButton
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void refreshDiscountRequest()}
              disabled={busy}
            >
              <ArrowPathIcon className="h-4 w-4" aria-hidden />
              Refresh status
            </ActionButton>
          ) : null}

          {!isAdmin &&
          discountRequestStatus === "approved" &&
          approvedDiscount > 0 ? (
            <ActionButton
              type="button"
              size="sm"
              tone="success"
              onClick={() => void submitDiscountAction()}
              disabled={busy}
            >
              Apply approved discount
            </ActionButton>
          ) : null}

          {isAdmin && approvedDiscount > 0 ? (
            <>
              <span className="label-caps inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-on-success-container">
                <CheckIcon className="h-3 w-3 shrink-0" aria-hidden />
                Applied · {formatEgp(approvedDiscount)}
                {context === "sale" ? " EGP" : ""}
              </span>
              <button
                type="button"
                onClick={clearApprovedDiscount}
                className="label-caps text-on-surface-variant underline-offset-2 hover:text-error hover:underline"
              >
                Remove
              </button>
            </>
          ) : null}

          {!isAdmin && discountRequestStatus === "pending" ? (
            <span className="label-caps inline-flex items-center gap-1.5 rounded-full border border-warning/25 bg-warning/10 px-2.5 py-1 text-on-warning-container">
              Pending admin approval
            </span>
          ) : null}

          {!isAdmin &&
          discountRequestStatus === "approved" &&
          approvedDiscount > 0 &&
          context === "sale" ? (
            <>
              <span className="label-caps inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-on-success-container">
                <CheckIcon className="h-3 w-3 shrink-0" aria-hidden />
                Approved · {formatEgp(approvedDiscount)} EGP
              </span>
              <button
                type="button"
                onClick={clearApprovedDiscount}
                className="label-caps text-on-surface-variant underline-offset-2 hover:text-error hover:underline"
              >
                Remove
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  ) : null;

  const messages = (
    <>
      {discountFieldError ? (
        variant === "card" ? (
          <InlineMessage tone="danger">{discountFieldError}</InlineMessage>
        ) : (
          <p className="text-xs font-medium text-error">{discountFieldError}</p>
        )
      ) : null}
      {discountRequestNotice ? (
        variant === "card" ? (
          <InlineMessage tone="primary">{discountRequestNotice}</InlineMessage>
        ) : (
          <p className="text-xs font-medium text-on-surface-variant">
            {discountRequestNotice}
          </p>
        )
      ) : null}
    </>
  );

  const totals =
    showTotals && breakdown ? (
      <SaleTotalsSummary
        breakdown={breakdown}
        overallDiscount={approvedDiscount}
        overallDiscountDraft={
          discountRequestStatus === "pending" ? resolvedDraftAmount : null
        }
        saleTotal={saleTotal}
        formatAmount={(amount) => formatDiscountAmount(amount)}
        currencySuffix="EGP"
        overallDiscountLabel={overallDiscountLabel ?? label}
      />
    ) : null;

  if (variant === "card") {
    if (!hasItems) return null;

    return (
      <SurfaceCard className={`p-5 space-y-4 ${className}`.trim()}>
        <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
          Financial adjustments
        </h3>
        {editor}
        {messages}
        {totals}
      </SurfaceCard>
    );
  }

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      {editor}
      {messages}
    </div>
  );
}
