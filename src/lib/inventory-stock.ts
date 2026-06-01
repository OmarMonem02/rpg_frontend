export type StockAlertBucket = "out" | "low";

export type StockTrackedItem = {
  stock_quantity: number;
  low_stock_alarm: number;
};

export function classifyStockAlert(
  item: StockTrackedItem,
): StockAlertBucket | null {
  if (item.stock_quantity <= 0) {
    return "out";
  }
  if (item.stock_quantity <= item.low_stock_alarm) {
    return "low";
  }
  return null;
}

export function isStockAlert(item: StockTrackedItem): boolean {
  return classifyStockAlert(item) !== null;
}

export type StockBadgeTone = "danger" | "warning" | "success";

export function getStockBadgeTone(item: StockTrackedItem): StockBadgeTone {
  const bucket = classifyStockAlert(item);
  if (bucket === "out") return "danger";
  if (bucket === "low") return "warning";
  return "success";
}

export function getStockAlertLabel(bucket: StockAlertBucket): string {
  return bucket === "out" ? "Out of stock" : "Low stock";
}

export function matchesStockAlertTab(
  item: StockTrackedItem,
  tab: "all" | StockAlertBucket,
): boolean {
  if (tab === "all") return isStockAlert(item);
  return classifyStockAlert(item) === tab;
}

export function getStockBadgeShortLabel(item: StockTrackedItem): string {
  const bucket = classifyStockAlert(item);
  if (bucket === "out") return "Out";
  if (bucket === "low") return "Low";
  return "In";
}
