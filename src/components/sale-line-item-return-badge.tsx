"use client";

import { StatusBadge } from "@/components/ops-ui";
import {
  resolveLineItemReturnStatus,
  type LineItemReturnStatus,
} from "@/lib/sale-line-pricing";
import type { SaleLineItemRecord } from "@/lib/api/sales";

type SaleLineItemReturnBadgeProps = {
  item: Pick<
    SaleLineItemRecord,
    "status" | "quantity" | "returned_qty" | "remaining_qty"
  >;
  className?: string;
};

const BADGE_CONFIG: Record<
  Exclude<LineItemReturnStatus, "active">,
  { label: string; tone: "danger" | "warning" }
> = {
  returned: { label: "Returned", tone: "danger" },
  exchanged: { label: "Exchanged", tone: "warning" },
  partially_returned: { label: "Partial return", tone: "warning" },
};

export function getSaleLineItemRowClassName(
  item: Pick<
    SaleLineItemRecord,
    "status" | "quantity" | "returned_qty" | "remaining_qty"
  >,
): string | undefined {
  const status = resolveLineItemReturnStatus(item);

  if (status === "returned" || status === "exchanged") {
    return "bg-surface-container-low/80 opacity-70";
  }

  if (status === "partially_returned") {
    return "border-l-4 border-l-warning bg-warning/5";
  }

  return undefined;
}

export function SaleLineItemReturnBadge({
  item,
  className = "",
}: SaleLineItemReturnBadgeProps) {
  const status = resolveLineItemReturnStatus(item);

  if (status === "active") {
    return null;
  }

  const config = BADGE_CONFIG[status];

  return (
    <StatusBadge tone={config.tone} className={className}>
      {config.label}
    </StatusBadge>
  );
}

export function saleLineItemReturnTagLabel(
  item: Pick<
    SaleLineItemRecord,
    "status" | "quantity" | "returned_qty" | "remaining_qty"
  >,
): string | null {
  const status = resolveLineItemReturnStatus(item);

  if (status === "active") {
    return null;
  }

  return BADGE_CONFIG[status].label.toUpperCase();
}
