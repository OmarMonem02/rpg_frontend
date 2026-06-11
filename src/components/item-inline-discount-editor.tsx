"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton, InlineMessage } from "@/components/ops-ui";
import {
  formatItemDiscountMarginHints,
} from "@/lib/item-discount-display";
import {
  clampRawDiscountValue,
  clampResolvedDiscount,
  convertDiscountBetweenTypes,
  resolveDiscountAmount,
  type DiscountInputType,
} from "@/lib/discount-input";
import { calculateMaxLineDiscount } from "@/lib/max-discount";
import type { PricingCurrency } from "@/lib/currencies";
import type { ExchangeRates } from "@/lib/currencies";
import type { useItemDiscountApproval } from "@/hooks/use-item-discount-approval";
import { ArrowPathIcon, CheckIcon } from "@heroicons/react/24/outline";

type ItemDiscountApproval = ReturnType<typeof useItemDiscountApproval>;

export type ItemInlineDiscountEditorProps = {
  mode: "sale" | "ticket";
  isAdmin: boolean;
  disabled?: boolean;
  unitPrice: number;
  quantity: number;
  currency: PricingCurrency;
  unitDiscount: number;
  catalogMaxDiscountType?: string;
  catalogMaxDiscountValue?: number;
  costPrice?: number | null;
  exchangeRates?: ExchangeRates;
  approval: ItemDiscountApproval;
  onApply: (unitDiscount: number, approvalRequestId?: number) => void;
  hasStoredApproval?: boolean;
  onDiscountEditStart?: () => void;
  onRequestSubmitted?: (requestId: number) => void;
};

function normalizeUnitDiscount(value: number) {
  return Math.round(value * 100) / 100;
}

export function ItemInlineDiscountEditor({
  mode,
  isAdmin,
  disabled = false,
  unitPrice,
  quantity,
  currency,
  unitDiscount,
  catalogMaxDiscountType,
  catalogMaxDiscountValue,
  costPrice = null,
  exchangeRates = { usdToEgp: 1, eurToEgp: 1 },
  approval,
  onApply,
  hasStoredApproval = false,
  onDiscountEditStart,
  onRequestSubmitted,
}: ItemInlineDiscountEditorProps) {
  const [draft, setDraft] = useState(unitDiscount);
  const [draftType, setDraftType] = useState<DiscountInputType>("fixed");

  useEffect(() => {
    setDraft(unitDiscount);
    setDraftType("fixed");
  }, [unitDiscount]);

  const lineBase = unitPrice * quantity;
  const catalogMaxUnit = calculateMaxLineDiscount(
    unitPrice,
    catalogMaxDiscountType,
    catalogMaxDiscountValue,
  );
  const staffMaxUnit = isAdmin ? unitPrice : catalogMaxUnit;
  const staffMaxLine = staffMaxUnit * quantity;

  const resolvedUnitDiscount = useMemo(() => {
    if (mode === "ticket" || draftType === "fixed") {
      return normalizeUnitDiscount(
        Math.max(0, Math.min(draft, unitPrice)),
      );
    }

    const lineDiscount = resolveDiscountAmount(draftType, draft, lineBase);
    const clampedLine = clampResolvedDiscount(
      lineDiscount,
      unitPrice,
      lineBase,
    );
    return normalizeUnitDiscount(clampedLine / Math.max(quantity, 1));
  }, [draft, draftType, lineBase, mode, quantity, unitPrice]);

  const effectiveUnitDiscount =
    mode === "ticket" || draftType === "fixed"
      ? normalizeUnitDiscount(draft)
      : resolvedUnitDiscount;

  const draftExceedsStaffCap =
    !isAdmin && effectiveUnitDiscount > staffMaxUnit + 0.0001;

  const marginHints = isAdmin
    ? formatItemDiscountMarginHints({
        unitPrice,
        catalog: {
          max_discount_type: catalogMaxDiscountType,
          max_discount_value: catalogMaxDiscountValue,
        },
        costPrice,
        rates: exchangeRates,
        currency,
        unitDiscount: resolvedUnitDiscount,
      })
    : [];

  const staffMaxHint =
    !isAdmin
      ? mode === "ticket"
        ? catalogMaxUnit > 0
          ? `Max without approval: ${staffMaxUnit.toFixed(2)} ${currency}`
          : "Approval required for any discount"
        : catalogMaxUnit > 0
          ? `Max without approval: ${staffMaxUnit.toFixed(2)} ${currency}/unit (${staffMaxLine.toFixed(2)} line)`
          : "Approval required for any discount"
      : null;

  const handleApplyWithinCap = () => {
    const amount = mode === "ticket" || draftType === "fixed"
      ? normalizeUnitDiscount(Math.min(draft, isAdmin ? unitPrice : staffMaxUnit))
      : resolvedUnitDiscount;

    if (!isAdmin && amount > staffMaxUnit + 0.0001) {
      return;
    }

    onApply(amount);
  };

  const handleRequestApproval = async () => {
    const requestedUnit = effectiveUnitDiscount;
    if (requestedUnit <= staffMaxUnit + 0.0001) {
      handleApplyWithinCap();
      return;
    }

    const id = await approval.submitRequest(requestedUnit);
    if (id) {
      setDraft(requestedUnit);
      onRequestSubmitted?.(id);
    }
  };

  const handleApplyApproved = () => {
    if (approval.approvedAmount == null || !approval.requestId) return;
    onApply(approval.approvedAmount, approval.requestId);
  };

  const isDraftDirty = Math.abs(effectiveUnitDiscount - unitDiscount) > 0.001;
  const showActions = isDraftDirty || (approval.isApproved && !approval.appliedLocally) || (!isAdmin && approval.requestId && !approval.appliedLocally);

  return (
    <div className="flex max-w-[15rem] min-w-[8rem] flex-col items-end gap-1">
      <div className="relative flex w-full items-center overflow-hidden rounded-md border border-outline-variant/30 bg-surface transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
        {mode === "sale" && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              const nextType = draftType === "fixed" ? "percentage" : "fixed";
              const converted = convertDiscountBetweenTypes(
                draftType,
                nextType,
                draft,
                lineBase,
              );
              setDraftType(nextType);
              setDraft(
                nextType === "fixed"
                  ? Math.max(0, Math.min(converted, unitPrice))
                  : clampRawDiscountValue(
                      nextType,
                      converted,
                      unitPrice,
                      lineBase,
                    ),
              );
            }}
            className="flex-none border-r border-outline-variant/30 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50"
            title="Toggle discount type"
          >
            {draftType === "fixed" ? currency : "%"}
          </button>
        )}
        <input
          type="number"
          disabled={disabled || approval.isPending}
          onWheel={(event) => {
            event.currentTarget.blur();
          }}
          value={draft}
          onChange={(e) => {
            const raw = Number(e.target.value);
            if (Number.isNaN(raw)) return;

            const nextDraft =
              mode === "ticket" || draftType === "fixed"
                ? Math.max(0, Math.min(raw, unitPrice))
                : clampRawDiscountValue(draftType, raw, unitPrice, lineBase);

            if (
              (hasStoredApproval || approval.appliedLocally) &&
              Math.abs(nextDraft - unitDiscount) > 0.01
            ) {
              onDiscountEditStart?.();
            }

            setDraft(nextDraft);
          }}
          className="mono-data w-full min-w-0 bg-transparent px-2 py-1.5 text-right text-sm outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label={
            mode === "ticket" || draftType === "fixed"
              ? "Item discount amount"
              : "Item discount percentage"
          }
        />
        {mode === "ticket" && (
          <span className="flex-none px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            {currency}
          </span>
        )}
      </div>

      {mode === "sale" && draftType === "percentage" && resolvedUnitDiscount > 0 ? (
        <span className="text-[10px] text-on-surface-variant">
          = {(resolvedUnitDiscount * quantity).toFixed(2)} {currency} line
        </span>
      ) : null}

      {isAdmin
        ? marginHints.map((hint) => (
            <span key={hint} className="text-[10px] text-on-surface-variant">
              {hint}
            </span>
          ))
        : staffMaxHint ? (
            <span className="text-[10px] text-on-surface-variant">
              {staffMaxHint}
            </span>
          ) : null}

      {showActions && (
        <div className="flex flex-wrap items-center justify-end gap-1 mt-0.5">
          {isAdmin ? (
            <ActionButton
              type="button"
              size="sm"
              tone="primary"
              variant="outline"
              disabled={disabled || !isDraftDirty}
              onClick={handleApplyWithinCap}
              className="py-1 px-2 text-[11px] min-h-0 h-auto rounded-md"
            >
              Apply
            </ActionButton>
          ) : approval.isApproved ? (
            <ActionButton
              type="button"
              size="sm"
              tone="success"
              variant="outline"
              disabled={disabled || approval.busy}
              onClick={handleApplyApproved}
              className="py-1 px-2 text-[11px] min-h-0 h-auto rounded-md"
            >
              Apply approved
            </ActionButton>
          ) : draftExceedsStaffCap ? (
            <ActionButton
              type="button"
              size="sm"
              tone="primary"
              variant="outline"
              disabled={disabled || approval.busy || !isDraftDirty}
              onClick={() => void handleRequestApproval()}
              className="py-1 px-2 text-[11px] min-h-0 h-auto rounded-md"
            >
              Request approval
            </ActionButton>
          ) : (
            <ActionButton
              type="button"
              size="sm"
              tone="primary"
              variant="outline"
              disabled={disabled || !isDraftDirty}
              onClick={handleApplyWithinCap}
              className="py-1 px-2 text-[11px] min-h-0 h-auto rounded-md"
            >
              Apply
            </ActionButton>
          )}

          {!isAdmin && approval.requestId && !approval.appliedLocally ? (
            <ActionButton
              type="button"
              size="sm"
              variant="outline"
              disabled={approval.busy}
              onClick={() => void approval.refreshStatus()}
              className="py-1 px-1.5 min-h-0 h-auto rounded-md"
            >
              <ArrowPathIcon className="h-3 w-3" aria-hidden />
            </ActionButton>
          ) : null}
        </div>
      )}

      {!isAdmin && approval.isPending ? (
        <span className="inline-flex items-center gap-1 rounded-md border border-warning/25 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-on-warning-container">
          Pending approval
        </span>
      ) : null}

      {!isAdmin && approval.appliedLocally && unitDiscount > 0 && !isDraftDirty ? (
        <span className="inline-flex items-center gap-1 rounded-md border border-success/25 bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-on-success-container">
          <CheckIcon className="h-3 w-3" aria-hidden />
          Approved applied
        </span>
      ) : null}

      {approval.notice ? (
        <div className="mt-1 w-full">
          <InlineMessage tone="primary">{approval.notice}</InlineMessage>
        </div>
      ) : null}
    </div>
  );
}
