"use client";

import { useCallback, useEffect, useRef } from "react";
import { ItemInlineDiscountEditor } from "@/components/item-inline-discount-editor";
import type { SaleLineItem } from "@/components/cart-line-items-panel";
import { useItemDiscountApproval } from "@/hooks/use-item-discount-approval";
import { getItemCostPrice } from "@/lib/item-discount-display";
import { buildItemApprovalSnapshot } from "@/lib/item-discount-approval-snapshot";
import {
  createSaleItemDiscountApprovalRequest,
  getApprovalRequest,
  type CreateSaleItemDiscountApprovalPayload,
} from "@/lib/api/approval-requests";
import { getAuthToken } from "@/lib/auth-session";
import {
  egpMultiplierForPricingCurrency,
  type ExchangeRates,
} from "@/lib/currencies";

type SaleLineItemDiscountCellProps = {
  item: SaleLineItem;
  isAdmin: boolean;
  exchangeRates: ExchangeRates;
  saleContext?: {
    customer_id?: number | null;
    customer_name?: string | null;
    seller_id?: number | null;
    sale_type?: string | null;
  };
  onApply: (
    itemId: string | number,
    discountAmount: number,
    approvalRequestId?: number,
  ) => void;
  onPersistPendingRequest?: (
    itemId: string | number,
    requestId: number,
  ) => void;
  onClearStoredRequest?: (itemId: string | number) => void;
  onApprovalStateChange?: (pending: boolean) => void;
};

export function SaleLineItemDiscountCell({
  item,
  isAdmin,
  exchangeRates,
  saleContext,
  onApply,
  onPersistPendingRequest,
  onClearStoredRequest,
  onApprovalStateChange,
}: SaleLineItemDiscountCellProps) {
  const rowId = item.id || item.sellable_id;
  const qty = Math.max(1, item.quantity);
  const unitDiscount = item.discount_amount / qty;
  const rate = egpMultiplierForPricingCurrency(item.currency, exchangeRates);
  const normalizedUnitPrice =
    Math.round(Number(item.selling_price) * rate * 100) / 100;

  const approvalComparableSignature = buildItemApprovalSnapshot({
    sellable_type: item.sellable_type,
    sellable_id: item.sellable_id,
    quantity: qty,
    unit_price: normalizedUnitPrice,
  });

  const clearStoredRequest = useCallback(() => {
    onClearStoredRequest?.(rowId);
  }, [onClearStoredRequest, rowId]);

  const approval = useItemDiscountApproval({
    approvalComparableSignature,
    buildApprovalPayload: (requestedUnitDiscount) => {
      const normalizedDiscount =
        Math.round(requestedUnitDiscount * rate * 100) / 100;
      const lineTotal =
        Math.round(
          Math.max(0, normalizedUnitPrice - normalizedDiscount) * qty * 100,
        ) / 100;

      const payload: CreateSaleItemDiscountApprovalPayload = {
        type: "sale_item_discount",
        requested_discount_amount: normalizedDiscount,
        discount_input_type: "fixed",
        discount_input_value: normalizedDiscount,
        cart_subtotal: Math.round(normalizedUnitPrice * qty * 100) / 100,
        payload: {
          cart_items: [
            {
              sellable_type: item.sellable_type,
              sellable_id: item.sellable_id,
              item_name: item.item_name,
              selling_price: normalizedUnitPrice,
              discount_amount: normalizedDiscount,
              quantity: qty,
              currency: "EGP",
              line_total: lineTotal,
            },
          ],
          item_context: {
            sellable_type: item.sellable_type,
            sellable_id: item.sellable_id,
            item_name: item.item_name,
            unit_price: normalizedUnitPrice,
            quantity: qty,
            currency: "EGP",
            catalog_max_discount_type:
              item.catalogItem.max_discount_type ?? null,
            catalog_max_discount_value:
              item.catalogItem.max_discount_value ?? null,
            cost_price: getItemCostPrice(item.catalogItem),
          },
          sale_context: saleContext,
        },
      };

      return payload;
    },
    createApprovalRequest: async (token, payload) => {
      const record = await createSaleItemDiscountApprovalRequest(
        token,
        payload as CreateSaleItemDiscountApprovalPayload,
      );
      return { id: record.id };
    },
    onRequestCancelled: clearStoredRequest,
  });

  const onApprovalStateChangeRef = useRef(onApprovalStateChange);
  onApprovalStateChangeRef.current = onApprovalStateChange;

  useEffect(() => {
    onApprovalStateChangeRef.current?.(approval.isPending);
  }, [approval.isPending]);

  const hydratedRequestIdRef = useRef<number | null>(null);
  const clearedForEditRef = useRef(false);

  const {
    requestId,
    bindApprovedRequest,
    syncItemSignature,
    markAppliedLocally,
    reset,
  } = approval;

  const beginDiscountEdit = useCallback(() => {
    if (clearedForEditRef.current) return;
    clearedForEditRef.current = true;
    hydratedRequestIdRef.current = null;
    reset();
    if (item.discount_approval_request_id) {
      onApply(rowId, item.discount_amount);
      clearStoredRequest();
    }
  }, [
    clearStoredRequest,
    item.discount_amount,
    item.discount_approval_request_id,
    onApply,
    reset,
    rowId,
  ]);

  useEffect(() => {
    if (!item.discount_approval_request_id) {
      hydratedRequestIdRef.current = null;
      clearedForEditRef.current = false;
    }
  }, [item.discount_approval_request_id]);

  useEffect(() => {
    const savedRequestId = item.discount_approval_request_id;
    if (!savedRequestId || savedRequestId <= 0 || requestId) return;
    if (clearedForEditRef.current) return;
    if (hydratedRequestIdRef.current === savedRequestId) return;

    const token = getAuthToken();
    if (!token) return;

    hydratedRequestIdRef.current = savedRequestId;

    void getApprovalRequest(token, savedRequestId).then((record) => {
      if (record.status === "cancelled" || record.status === "rejected") {
        clearStoredRequest();
        reset();
        return;
      }

      bindApprovedRequest(record);
      syncItemSignature();

      if (
        record.status === "approved" &&
        record.approved_discount_amount != null
      ) {
        const approvedUnit =
          Math.round(record.approved_discount_amount * 100) / 100;
        const alreadyApplied = Math.abs(unitDiscount - approvedUnit) < 0.01;

        if (alreadyApplied) {
          markAppliedLocally();
        }
      }
    });
  }, [
    bindApprovedRequest,
    clearStoredRequest,
    item.discount_approval_request_id,
    markAppliedLocally,
    requestId,
    reset,
    syncItemSignature,
    unitDiscount,
  ]);

  return (
    <ItemInlineDiscountEditor
      mode="sale"
      isAdmin={isAdmin}
      unitPrice={item.selling_price}
      quantity={qty}
      currency={item.currency}
      unitDiscount={unitDiscount}
      catalogMaxDiscountType={item.catalogItem.max_discount_type}
      catalogMaxDiscountValue={item.catalogItem.max_discount_value}
      costPrice={getItemCostPrice(item.catalogItem)}
      exchangeRates={exchangeRates}
      approval={approval}
      hasStoredApproval={Boolean(item.discount_approval_request_id)}
      onDiscountEditStart={beginDiscountEdit}
      onRequestSubmitted={(requestId) => {
        onPersistPendingRequest?.(rowId, requestId);
      }}
      onApply={(nextUnitDiscount, approvalRequestId) => {
        const lineDiscount = Math.round(nextUnitDiscount * qty * 100) / 100;
        onApply(rowId, lineDiscount, approvalRequestId);
        if (approvalRequestId) {
          approval.syncItemSignature();
          approval.markAppliedLocally();
          clearedForEditRef.current = false;
          hydratedRequestIdRef.current = approvalRequestId;
          return;
        }
        approval.reset();
        clearedForEditRef.current = false;
        hydratedRequestIdRef.current = null;
      }}
    />
  );
}
