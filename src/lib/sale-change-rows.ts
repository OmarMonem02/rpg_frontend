import type { HistoryRecord } from "@/lib/api/history";
import type {
  SaleAdjustmentRecord,
  SaleAuditItemSnapshot,
  SaleAuditSnapshot,
} from "@/lib/api/sales";

export type SaleChangeRow = {
  id: string;
  source: "activity" | "audit";
  who: string;
  when: string;
  what: string;
  from: string;
  to: string;
};

const EMPTY = "—";

const ACTION_LABELS: Record<string, string> = {
  created: "Sale created",
  sale_updated: "Sale updated",
  item_added: "Item added",
  item_updated: "Item updated",
  item_removed: "Item removed",
  item_returned: "Item returned",
  item_exchanged: "Item exchanged",
  sale_deleted: "Sale deleted",
};

const SALE_FIELD_LABELS: Record<string, string> = {
  total: "Total",
  discount: "Discount",
  status: "Status",
};

const ITEM_FIELD_LABELS: Record<string, string> = {
  qty: "Quantity",
  returned_qty: "Returned qty",
  status: "Status",
  selling_price: "Selling price",
  discount: "Discount",
};

function formatValue(value: unknown): string {
  if (value == null || value === "") return EMPTY;
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
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

function actionLabel(actionType: string): string {
  return ACTION_LABELS[actionType] ?? actionType.replace(/_/g, " ");
}

function itemLabel(item: SaleAuditItemSnapshot): string {
  return item.item_label?.trim() || `Item #${item.id}`;
}

function pushSaleFieldRows(
  rows: SaleChangeRow[],
  adjustment: SaleAdjustmentRecord,
  before: SaleAuditSnapshot | null,
  after: SaleAuditSnapshot | null,
): void {
  const who = resolveWho(adjustment.user, adjustment.user_id);
  const when = adjustment.created_at ?? "";
  const prefix = actionLabel(adjustment.action_type);

  for (const field of ["total", "discount", "status"] as const) {
    const oldValue = before?.[field];
    const newValue = after?.[field];
    if (oldValue === newValue) continue;
    if (oldValue === undefined && newValue === undefined) continue;

    rows.push({
      id: `activity-${adjustment.id}-sale-${field}`,
      source: "activity",
      who,
      when,
      what: `${prefix} · ${SALE_FIELD_LABELS[field]}`,
      from: formatValue(oldValue),
      to: formatValue(newValue),
    });
  }
}

function pushItemFieldRows(
  rows: SaleChangeRow[],
  adjustment: SaleAdjustmentRecord,
  item: SaleAuditItemSnapshot,
  beforeItem: SaleAuditItemSnapshot | undefined,
  afterItem: SaleAuditItemSnapshot | undefined,
  context: string,
): void {
  const who = resolveWho(adjustment.user, adjustment.user_id);
  const when = adjustment.created_at ?? "";
  const label = itemLabel(item);

  for (const field of [
    "qty",
    "returned_qty",
    "status",
    "selling_price",
    "discount",
  ] as const) {
    const oldValue = beforeItem?.[field];
    const newValue = afterItem?.[field];
    if (oldValue === newValue) continue;
    if (oldValue === undefined && newValue === undefined) continue;

    rows.push({
      id: `activity-${adjustment.id}-item-${item.id}-${field}`,
      source: "activity",
      who,
      when,
      what: `${context} · ${label} · ${ITEM_FIELD_LABELS[field]}`,
      from: formatValue(oldValue),
      to: formatValue(newValue),
    });
  }
}

function rowsFromAdjustment(adjustment: SaleAdjustmentRecord): SaleChangeRow[] {
  const who = resolveWho(adjustment.user, adjustment.user_id);
  const when = adjustment.created_at ?? "";
  const before = adjustment.before_snapshot;
  const after = adjustment.after_snapshot;
  const rows: SaleChangeRow[] = [];
  const action = adjustment.action_type;

  if (action === "created") {
    const itemCount = after?.items?.length ?? 0;
    rows.push({
      id: `activity-${adjustment.id}-created`,
      source: "activity",
      who,
      when,
      what: actionLabel(action),
      from: EMPTY,
      to: `Total ${formatValue(after?.total)} · ${itemCount} item(s)`,
    });
    return rows;
  }

  if (action === "sale_deleted") {
    rows.push({
      id: `activity-${adjustment.id}-deleted`,
      source: "activity",
      who,
      when,
      what: actionLabel(action),
      from: `Total ${formatValue(before?.total)} · ${before?.items?.length ?? 0} item(s)`,
      to: EMPTY,
    });
    return rows;
  }

  pushSaleFieldRows(rows, adjustment, before, after);

  const beforeItems = new Map(
    (before?.items ?? []).map((item) => [item.id, item]),
  );
  const afterItems = new Map(
    (after?.items ?? []).map((item) => [item.id, item]),
  );
  const allItemIds = new Set([...beforeItems.keys(), ...afterItems.keys()]);

  for (const itemId of allItemIds) {
    const beforeItem = beforeItems.get(itemId);
    const afterItem = afterItems.get(itemId);

    if (!beforeItem && afterItem) {
      rows.push({
        id: `activity-${adjustment.id}-added-${itemId}`,
        source: "activity",
        who,
        when,
        what: `${actionLabel("item_added")} · ${itemLabel(afterItem)}`,
        from: EMPTY,
        to: `Qty ${formatValue(afterItem.qty)} · ${formatValue(afterItem.status)}`,
      });
      continue;
    }

    if (beforeItem && !afterItem) {
      rows.push({
        id: `activity-${adjustment.id}-removed-${itemId}`,
        source: "activity",
        who,
        when,
        what: `${actionLabel("item_removed")} · ${itemLabel(beforeItem)}`,
        from: `Qty ${formatValue(beforeItem.qty)} · ${formatValue(beforeItem.status)}`,
        to: EMPTY,
      });
      continue;
    }

    if (beforeItem && afterItem) {
      pushItemFieldRows(
        rows,
        adjustment,
        afterItem,
        beforeItem,
        afterItem,
        actionLabel(action),
      );
    }
  }

  if (rows.length === 0) {
    rows.push({
      id: `activity-${adjustment.id}-summary`,
      source: "activity",
      who,
      when,
      what: adjustment.summary.trim() || actionLabel(action),
      from: EMPTY,
      to: EMPTY,
    });
  }

  return rows;
}

function rowsFromHistoryRecord(record: HistoryRecord): SaleChangeRow[] {
  const who = resolveWho(record.user);
  const when = record.created_at;
  const entityPrefix = record.entity_label?.trim() || "Record";

  if (record.changes.length === 0) {
    return [
      {
        id: `audit-${record.id}-summary`,
        source: "audit",
        who,
        when,
        what: `${entityPrefix} · ${record.action}`,
        from: record.summary[0] ?? EMPTY,
        to: EMPTY,
      },
    ];
  }

  return record.changes.map((change, index) => ({
    id: `audit-${record.id}-${change.field}-${index}`,
    source: "audit" as const,
    who,
    when,
    what: `${entityPrefix} · ${change.label}`,
    from: change.before || EMPTY,
    to: change.after || EMPTY,
  }));
}

export function rowsFromAdjustments(
  adjustments: SaleAdjustmentRecord[] | undefined,
): SaleChangeRow[] {
  if (!adjustments?.length) return [];
  return adjustments.flatMap(rowsFromAdjustment);
}

export function rowsFromAuditHistory(records: HistoryRecord[]): SaleChangeRow[] {
  if (!records.length) return [];
  return records.flatMap(rowsFromHistoryRecord);
}

export function mergeSaleChangeRows(
  activityRows: SaleChangeRow[],
  auditRows: SaleChangeRow[],
): SaleChangeRow[] {
  return [...activityRows, ...auditRows].sort((a, b) => {
    const aTime = new Date(a.when).getTime();
    const bTime = new Date(b.when).getTime();
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;
    return bTime - aTime;
  });
}
