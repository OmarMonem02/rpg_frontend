import type { ItemStatus } from "@/lib/api/inventory";
import { StatusBadge } from "@/components/ops-ui";

export const ITEM_STATUS_OPTIONS = [
  { value: "new" as const, label: "New" },
  { value: "used" as const, label: "Used" },
] as const;

export function itemStatusLabel(status: ItemStatus | string | undefined): string {
  return status === "used" ? "Used" : "New";
}

export function itemStatusTone(status: ItemStatus | string | undefined): "success" | "warning" {
  return status === "used" ? "warning" : "success";
}

export function formatCatalogItemAttributes(item: {
  size?: string | null;
  color?: string | null;
  item_status?: ItemStatus | string | null;
}): string {
  const parts = [item.size, item.color, item.item_status ? itemStatusLabel(item.item_status) : null].filter(Boolean);
  return parts.join(" · ");
}

export function ItemStatusBadge({ status }: { status: ItemStatus | string | undefined }) {
  return <StatusBadge tone={itemStatusTone(status)}>{itemStatusLabel(status)}</StatusBadge>;
}
