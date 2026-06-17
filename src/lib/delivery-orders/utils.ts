import type { SaleRecord } from "@/lib/crud-api";

export const REMOTE_SALE_TYPES = ["online", "delivery"] as const;

export type RemoteSaleType = (typeof REMOTE_SALE_TYPES)[number];
export type DeliveryStatus = "pending" | "in-transit" | "delivered";

export const DELIVERY_STATUS_OPTIONS: Array<{
  value: DeliveryStatus;
  label: string;
}> = [
  { value: "pending", label: "Pending" },
  { value: "in-transit", label: "In transit" },
  { value: "delivered", label: "Delivered" },
];

export function isRemoteSale(sale: { sale_type?: string }): boolean {
  const type = sale.sale_type?.toLowerCase() ?? "";
  return REMOTE_SALE_TYPES.includes(type as RemoteSaleType);
}

export function getDeliveryTone(
  status: string,
): "success" | "warning" | "danger" | "default" {
  switch (status.toLowerCase()) {
    case "delivered":
      return "success";
    case "in-transit":
      return "warning";
    case "pending":
      return "default";
    default:
      return "default";
  }
}

export function getChannelLabel(saleType?: string): string {
  const type = saleType?.toLowerCase() ?? "";
  if (type === "online") return "Online";
  if (type === "delivery") return "Delivery";
  return titleCase(saleType);
}

export function titleCase(value?: string): string {
  if (!value) return "Not set";
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function humanizeDeliveryStatus(status: string): string {
  const normalized = status.toLowerCase().replace(/_/g, " ");
  if (normalized === "in transit" || normalized === "in-transit") {
    return "In transit";
  }
  return titleCase(normalized);
}

export function formatMoney(value: number): string {
  return `EGP ${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

export function formatDate(value?: string): string {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function summarizeDeliveryOrders(sales: SaleRecord[]) {
  const revenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const activeQueue = sales.filter(
    (sale) => sale.delivery_status?.toLowerCase() !== "delivered",
  ).length;
  const inTransit = sales.filter(
    (sale) => sale.delivery_status?.toLowerCase() === "in-transit",
  ).length;
  const delivered = sales.filter(
    (sale) => sale.delivery_status?.toLowerCase() === "delivered",
  ).length;

  return { revenue, activeQueue, inTransit, delivered };
}

export function nextDeliveryStatus(
  current: string,
): DeliveryStatus | null {
  const normalized = current.toLowerCase();
  if (normalized === "pending") return "in-transit";
  if (normalized === "in-transit") return "delivered";
  return null;
}
