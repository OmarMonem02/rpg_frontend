import type { ApprovalRequestRecord } from "@/lib/api/approval-requests";

export type ItemApprovalSnapshotInput = {
  sellable_type?: string;
  sellable_id?: number;
  ticket_item_id?: number;
  quantity: number;
  unit_price: number;
};

function normalizePrice(price: number) {
  return Math.round(price * 100) / 100;
}

export function buildItemApprovalSnapshot(
  input: ItemApprovalSnapshotInput,
): string {
  if (input.ticket_item_id != null && input.ticket_item_id > 0) {
    return JSON.stringify({
      ticket_item_id: input.ticket_item_id,
      unit_price: normalizePrice(input.unit_price),
      qty: input.quantity,
    });
  }

  return JSON.stringify({
    sellable_type: input.sellable_type,
    sellable_id: input.sellable_id,
    quantity: input.quantity,
    unit_price: normalizePrice(input.unit_price),
  });
}

export function buildItemApprovalSnapshotFromRecord(
  record: ApprovalRequestRecord,
): string | null {
  const context = record.payload?.item_context;
  if (!context) return null;

  return buildItemApprovalSnapshot({
    sellable_type: context.sellable_type,
    sellable_id: context.sellable_id,
    ticket_item_id: context.ticket_item_id ?? undefined,
    quantity: context.quantity,
    unit_price: context.unit_price,
  });
}
