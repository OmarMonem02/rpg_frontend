import { StatusBadge } from "@/components/ops-ui";
import {
  getStockBadgeShortLabel,
  getStockBadgeTone,
  type StockTrackedItem,
} from "@/lib/inventory-stock";

export type StockBadgeProps = StockTrackedItem & {
  className?: string;
};

export function StockBadge({
  stock_quantity,
  low_stock_alarm,
  className = "",
}: StockBadgeProps) {
  if (stock_quantity <= 0) {
    return (
      <StatusBadge tone="danger" className={`gap-1 ${className}`.trim()}>
        <span className="mono-data">0</span>
        <span>Out</span>
      </StatusBadge>
    );
  }

  const item = { stock_quantity, low_stock_alarm };
  const tone = getStockBadgeTone(item);
  const label = getStockBadgeShortLabel(item);

  return (
    <StatusBadge tone={tone} className={`gap-1 ${className}`.trim()}>
      <span>{label}</span>
      <span className="mono-data">{stock_quantity}</span>
    </StatusBadge>
  );
}
