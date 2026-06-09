"use client";

import { useCallback, useEffect, useRef } from "react";
import { ItemInlineDiscountEditor } from "@/components/item-inline-discount-editor";
import { useItemDiscountApproval } from "@/hooks/use-item-discount-approval";
import { getItemCostPrice } from "@/lib/item-discount-display";
import { buildItemApprovalSnapshot } from "@/lib/item-discount-approval-snapshot";
import {
  createTicketItemDiscountApprovalRequest,
  getApprovalRequest,
  type CreateTicketItemDiscountApprovalPayload,
} from "@/lib/api/approval-requests";
import { getAuthToken } from "@/lib/auth-session";
import type { ExchangeRates, PricingCurrency } from "@/lib/currencies";
import { getTicketItemCatalogDiscount } from "@/lib/ticket-item-discount";
import type { TicketItem } from "@/lib/tickets-api";

type TicketLineItemDiscountCellProps = {
  item: TicketItem;
  isAdmin: boolean;
  disabled?: boolean;
  ticketId: number;
  taskId: number;
  customerName?: string | null;
  rates: ExchangeRates;
  currency?: PricingCurrency;
  storedRequestId?: number;
  onApply: (
    unitDiscount: number,
    approvalRequestId?: number,
  ) => void | Promise<void>;
  onPersistPendingRequest?: (itemId: number, requestId: number) => void;
  onClearStoredRequest?: (itemId: number) => void;
};

function readCostPrice(item: TicketItem): number | null {
  const catalog =
    item.product ?? item.spare_part ?? item.maintenance_service ?? null;
  return getItemCostPrice(catalog as { cost_price?: number } | null);
}

export function TicketLineItemDiscountCell({
  item,
  isAdmin,
  disabled = false,
  ticketId,
  taskId,
  customerName,
  rates,
  currency = "EGP",
  storedRequestId,
  onApply,
  onPersistPendingRequest,
  onClearStoredRequest,
}: TicketLineItemDiscountCellProps) {
  const catalog = getTicketItemCatalogDiscount(item);
  const unitPrice = Number(item.price_snapshot) || 0;
  const qty = Math.max(1, Number(item.qty) || 1);
  const sellableType = item.product_id
    ? "products"
    : item.spare_part_id
      ? "spare_parts"
      : "maintenance_services";
  const sellableId =
    item.product_id ?? item.spare_part_id ?? item.maintenance_service_id ?? 0;
  const itemName =
    item.product?.name ??
    item.spare_part?.name ??
    item.maintenance_service?.name ??
    "Item";
  const unitDiscount = Number(item.discount) || 0;

  const approvalComparableSignature = buildItemApprovalSnapshot({
    ticket_item_id: item.id,
    quantity: qty,
    unit_price: unitPrice,
  });

  const clearStoredRequest = useCallback(() => {
    onClearStoredRequest?.(item.id);
  }, [item.id, onClearStoredRequest]);

  const approval = useItemDiscountApproval({
    approvalComparableSignature,
    buildApprovalPayload: (requestedUnitDiscount) => {
      const lineTotal =
        Math.round(
          Math.max(0, unitPrice - requestedUnitDiscount) * qty * 100,
        ) / 100;

      const payload: CreateTicketItemDiscountApprovalPayload = {
        type: "ticket_item_discount",
        requested_discount_amount: requestedUnitDiscount,
        discount_input_type: "fixed",
        discount_input_value: requestedUnitDiscount,
        cart_subtotal: unitPrice,
        payload: {
          cart_items: [
            {
              sellable_type: sellableType,
              sellable_id: sellableId,
              item_name: itemName,
              selling_price: unitPrice,
              discount_amount: requestedUnitDiscount,
              quantity: qty,
              currency: "EGP",
              line_total: lineTotal,
            },
          ],
          item_context: {
            sellable_type: sellableType,
            sellable_id: sellableId,
            item_name: itemName,
            unit_price: unitPrice,
            quantity: qty,
            currency: "EGP",
            catalog_max_discount_type: catalog.max_discount_type || null,
            catalog_max_discount_value: catalog.max_discount_value,
            cost_price: readCostPrice(item),
            ticket_id: ticketId,
            task_id: taskId,
            ticket_item_id: item.id,
          },
          ticket_context: {
            ticket_id: ticketId,
            customer_name: customerName ?? null,
          },
        },
      };

      return payload;
    },
    createApprovalRequest: async (token, payload) => {
      const record = await createTicketItemDiscountApprovalRequest(
        token,
        payload as CreateTicketItemDiscountApprovalPayload,
      );
      return { id: record.id };
    },
    onRequestCancelled: clearStoredRequest,
  });

  const hydratedRequestIdRef = useRef<number | null>(null);

  const {
    requestId,
    bindApprovedRequest,
    syncItemSignature,
    markAppliedLocally,
    reset,
  } = approval;

  useEffect(() => {
    if (!storedRequestId) {
      hydratedRequestIdRef.current = null;
    }
  }, [storedRequestId]);

  useEffect(() => {
    if (!storedRequestId || storedRequestId <= 0 || requestId) return;
    if (hydratedRequestIdRef.current === storedRequestId) return;

    const token = getAuthToken();
    if (!token) return;

    hydratedRequestIdRef.current = storedRequestId;

    void getApprovalRequest(token, storedRequestId).then((record) => {
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
    markAppliedLocally,
    requestId,
    reset,
    storedRequestId,
    syncItemSignature,
    unitDiscount,
  ]);

  return (
    <ItemInlineDiscountEditor
      mode="ticket"
      isAdmin={isAdmin}
      disabled={disabled}
      unitPrice={unitPrice}
      quantity={qty}
      currency={currency}
      unitDiscount={unitDiscount}
      catalogMaxDiscountType={catalog.max_discount_type}
      catalogMaxDiscountValue={catalog.max_discount_value}
      costPrice={readCostPrice(item)}
      exchangeRates={rates}
      approval={approval}
      hasStoredApproval={Boolean(storedRequestId)}
      onRequestSubmitted={(requestId) => {
        onPersistPendingRequest?.(item.id, requestId);
      }}
      onApply={async (nextUnitDiscount, approvalRequestId) => {
        await onApply(nextUnitDiscount, approvalRequestId);
        if (approvalRequestId) {
          approval.syncItemSignature();
          approval.markAppliedLocally();
          clearStoredRequest();
          hydratedRequestIdRef.current = approvalRequestId;
          return;
        }
        approval.reset();
        hydratedRequestIdRef.current = null;
      }}
    />
  );
}
