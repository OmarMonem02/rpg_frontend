"use client";

import { useCallback, useMemo } from "react";
import { OverallDiscountPanel } from "@/components/overall-discount-panel";
import { createTicketDiscountApprovalRequest } from "@/lib/api/approval-requests";
import {
  getPresentTicketCategories,
  resolveScopeFromApprovalContext,
  scopeToPayload,
  type DiscountScope,
} from "@/lib/discount-scope";
import { useOverallDiscount } from "@/hooks/use-overall-discount";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import {
  buildTicketDiscountCartItems,
  computeTicketDiscountBase,
  computeTicketTotalsBreakdown,
  getTicketItemsSignature,
} from "@/lib/ticket-discount";
import { convertTicketDiscountForDisplay } from "@/lib/ticket-display-pricing";
import {
  ticketsApi,
  type Ticket,
  type TicketItem,
} from "@/lib/tickets-api";

type TicketOverallDiscountPanelProps = {
  ticket: Ticket;
  items: TicketItem[];
  canEdit: boolean;
  onTicketUpdated: (ticket: Ticket) => void;
  onError: (message: string) => void;
};

export function TicketOverallDiscountPanel({
  ticket,
  items,
  canEdit,
  onTicketUpdated,
  onError,
}: TicketOverallDiscountPanelProps) {
  const { rates } = useExchangeRates();
  const presentCategories = useMemo(
    () => getPresentTicketCategories(items),
    [items],
  );
  const breakdown = useMemo(
    () => computeTicketTotalsBreakdown(items, rates),
    [items, rates],
  );
  const cartSubtotal = breakdown.netSubtotal;

  const computeTicketDiscountBaseForScope = useCallback(
    (scope: DiscountScope) => computeTicketDiscountBase(items, rates, scope),
    [items, rates],
  );

  const discount = useOverallDiscount({
    presentCategories,
    computeDiscountBase: computeTicketDiscountBaseForScope,
    getItemsSignature: () => getTicketItemsSignature(items),
    buildApprovalPayload: ({
      amount,
      discountDraft,
      discountDraftType,
      discountScope,
      discountBaseSubtotal,
    }) => ({
      type: "ticket_discount" as const,
      requested_discount_amount: amount,
      discount_input_type: discountDraftType,
      discount_input_value: discountDraft,
      cart_subtotal: discountBaseSubtotal,
      payload: {
        cart_items: buildTicketDiscountCartItems(items, rates),
        ticket_context: {
          ticket_id: ticket.id,
          customer_name: ticket.customer?.name ?? null,
          discount_scope: scopeToPayload(discountScope, presentCategories),
          full_cart_subtotal: cartSubtotal,
        },
      },
    }),
    createApprovalRequest: async (token, payload) => {
      const record = await createTicketDiscountApprovalRequest(
        token,
        payload as Parameters<typeof createTicketDiscountApprovalRequest>[1],
      );
      return { id: record.id };
    },
    resolveScopeFromRecord: (record) =>
      resolveScopeFromApprovalContext(
        record.payload.ticket_context?.discount_scope,
        record.payload.ticket_context?.discount_includes_maintenance,
        presentCategories,
      ),
    persistMode: "immediate",
    onPersistDiscount: async (amount, requestId) => {
      try {
        const updated = await ticketsApi.updateTicketDiscount(ticket.id, {
          discount: amount,
          discount_approval_request_id: requestId,
        });
        onTicketUpdated(updated);
      } catch (err) {
        onError(
          err instanceof Error
            ? err.message
            : "Failed to update ticket discount.",
        );
        throw err;
      }
    },
    savedDiscountAmount: Number(ticket.discount ?? 0),
    getSavedDiscountDraft: () =>
      convertTicketDiscountForDisplay(Number(ticket.discount ?? 0), items, rates),
    itemsChangedNotice:
      "Discount request cancelled because ticket items changed.",
    autoCapExcessDiscount: true,
  });

  const ticketTotal = Math.max(0, cartSubtotal - discount.approvedDiscount);

  return (
    <OverallDiscountPanel
      id="ticket-discount"
      label="Overall discount (whole ticket)"
      context="ticket"
      canEdit={canEdit}
      hasItems={items.length > 0}
      presentCategories={presentCategories}
      computeDiscountBase={computeTicketDiscountBaseForScope}
      discount={discount}
      variant="card"
      showTotals
      breakdown={breakdown}
      saleTotal={ticketTotal}
      overallDiscountLabel="Overall discount (whole ticket)"
    />
  );
}
