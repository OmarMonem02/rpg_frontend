import type {
  SaleAdjustmentRecord,
  SaleAuditItemSnapshot,
} from "@/lib/api/sales";

export type SaleChangeRow = {
  id: string;
  who: string;
  when: string;
  what: string;
  from: string;
  to: string;
};

const EMPTY = "—";

/** Only user-facing sale actions shown in the changes table. */
const DISPLAYED_ACTION_TYPES = new Set([
  "item_returned",
  "item_exchanged",
]);

const ACTION_LABELS: Record<string, string> = {
  item_returned: "Return",
  item_exchanged: "Exchange",
};

function formatValue(value: unknown): string {
  if (value == null || value === "") return EMPTY;
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
}

function resolveWho(
  user?: { name?: string | null } | null,
  userId?: number,
): string {
  if (user?.name?.trim()) return user.name.trim();
  if (userId && userId > 0) return `User #${userId}`;
  return "System";
}

function itemLabel(item: SaleAuditItemSnapshot): string {
  return item.item_label?.trim() || `Item #${item.id}`;
}

function findItemSnapshot(
  adjustment: SaleAdjustmentRecord,
  snapshot: "before_snapshot" | "after_snapshot",
): SaleAuditItemSnapshot | undefined {
  const saleItemId = toSaleItemId(adjustment.meta);
  if (!saleItemId) return undefined;

  return adjustment[snapshot]?.items?.find((item) => item.id === saleItemId);
}

function toSaleItemId(meta: SaleAdjustmentRecord["meta"]): number | null {
  if (!meta || typeof meta !== "object") return null;
  const raw = meta.sale_item_id;
  const id = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function remainingQty(item: SaleAuditItemSnapshot): number {
  const qty = item.qty ?? 0;
  const returned = item.returned_qty ?? 0;
  return Math.max(0, qty - returned);
}

function formatItemState(item: SaleAuditItemSnapshot): string {
  const parts = [
    itemLabel(item),
    `Sold ${formatValue(item.qty)}`,
    `Returned ${formatValue(item.returned_qty)}`,
    `Remaining ${formatValue(remainingQty(item))}`,
  ];
  if (item.status) parts.push(formatValue(item.status));
  return parts.join(" · ");
}

function formatMoney(amount: number): string | null {
  if (!amount || amount <= 0) return null;
  return `EGP ${amount.toFixed(2)}`;
}

function rowFromReturn(adjustment: SaleAdjustmentRecord): SaleChangeRow {
  const who = resolveWho(adjustment.user, adjustment.user_id);
  const when = adjustment.created_at ?? "";
  const beforeItem = findItemSnapshot(adjustment, "before_snapshot");
  const afterItem = findItemSnapshot(adjustment, "after_snapshot");
  const returnedQty =
    typeof adjustment.meta?.returned_qty === "number"
      ? adjustment.meta.returned_qty
      : Number(adjustment.meta?.returned_qty) || null;

  const itemName = afterItem
    ? itemLabel(afterItem)
    : beforeItem
      ? itemLabel(beforeItem)
      : "Item";

  const from = beforeItem
    ? formatItemState(beforeItem)
    : EMPTY;

  const toParts: string[] = [];
  if (afterItem) {
    toParts.push(formatItemState(afterItem));
  } else if (returnedQty) {
    toParts.push(`Returned ${returnedQty} × ${itemName}`);
  } else {
    toParts.push(adjustment.summary.trim() || "Return processed");
  }

  const refund = formatMoney(adjustment.refund_amount);
  if (refund) toParts.push(`Refund ${refund}`);

  return {
    id: `return-${adjustment.id}`,
    who,
    when,
    what: `${ACTION_LABELS.item_returned} · ${itemName}${
      returnedQty ? ` (${returnedQty} unit${returnedQty === 1 ? "" : "s"})` : ""
    }`,
    from,
    to: toParts.join(" · "),
  };
}

function rowFromExchange(adjustment: SaleAdjustmentRecord): SaleChangeRow {
  const who = resolveWho(adjustment.user, adjustment.user_id);
  const when = adjustment.created_at ?? "";
  const beforeItem = findItemSnapshot(adjustment, "before_snapshot");
  const afterItem = findItemSnapshot(adjustment, "after_snapshot");
  const exchangeQty =
    typeof adjustment.meta?.exchange_qty === "number"
      ? adjustment.meta.exchange_qty
      : Number(adjustment.meta?.exchange_qty) || null;
  const replacementsAdded =
    typeof adjustment.meta?.replacements_added === "number"
      ? adjustment.meta.replacements_added
      : Number(adjustment.meta?.replacements_added) || 0;

  const itemName = beforeItem
    ? itemLabel(beforeItem)
    : afterItem
      ? itemLabel(afterItem)
      : "Item";

  const from = beforeItem
    ? `${formatItemState(beforeItem)}${
        exchangeQty ? ` · Exchanged ${exchangeQty}` : ""
      }`
    : exchangeQty
      ? `${itemName} · Exchanged ${exchangeQty}`
      : EMPTY;

  const toParts: string[] = [];
  if (replacementsAdded > 0) {
    toParts.push(
      `${replacementsAdded} replacement${replacementsAdded === 1 ? "" : "s"} added`,
    );
  }
  if (afterItem) {
    toParts.push(formatItemState(afterItem));
  }

  const refund = formatMoney(adjustment.refund_amount);
  const extraDue = formatMoney(adjustment.extra_amount_due);
  if (refund) toParts.push(`Customer refund ${refund}`);
  if (extraDue) toParts.push(`Customer pays ${extraDue}`);

  if (toParts.length === 0) {
    toParts.push(adjustment.summary.trim() || "Exchange processed");
  }

  return {
    id: `exchange-${adjustment.id}`,
    who,
    when,
    what: `${ACTION_LABELS.item_exchanged} · ${itemName}${
      exchangeQty ? ` (${exchangeQty} unit${exchangeQty === 1 ? "" : "s"})` : ""
    }`,
    from,
    to: toParts.join(" · "),
  };
}

function rowsFromAdjustment(adjustment: SaleAdjustmentRecord): SaleChangeRow[] {
  if (!DISPLAYED_ACTION_TYPES.has(adjustment.action_type)) {
    return [];
  }

  if (adjustment.action_type === "item_returned") {
    return [rowFromReturn(adjustment)];
  }

  if (adjustment.action_type === "item_exchanged") {
    return [rowFromExchange(adjustment)];
  }

  return [];
}

export function rowsFromAdjustments(
  adjustments: SaleAdjustmentRecord[] | undefined,
): SaleChangeRow[] {
  if (!adjustments?.length) return [];

  return adjustments
    .flatMap(rowsFromAdjustment)
    .sort((a, b) => {
      const aTime = new Date(a.when).getTime();
      const bTime = new Date(b.when).getTime();
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
      if (Number.isNaN(aTime)) return 1;
      if (Number.isNaN(bTime)) return -1;
      return bTime - aTime;
    });
}
