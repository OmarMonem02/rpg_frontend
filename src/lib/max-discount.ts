export type MaxDiscountType = "fixed" | "percentage";

/** Maximum per-unit discount allowed for a line at the given unit price. */
export function calculateMaxLineDiscount(
  unitPrice: number,
  maxDiscountType: MaxDiscountType | string | undefined,
  maxDiscountValue: number | undefined,
): number {
  const price = Number(unitPrice) || 0;
  const cap = Number(maxDiscountValue) || 0;
  if (cap <= 0) return 0;
  if (maxDiscountType === "percentage") {
    return (price * cap) / 100;
  }
  return cap;
}

export function clampLineDiscount(
  requested: number,
  unitPrice: number,
  maxDiscountType: MaxDiscountType | string | undefined,
  maxDiscountValue: number | undefined,
): number {
  const maxAllowed = Math.min(
    Number(unitPrice) || 0,
    calculateMaxLineDiscount(unitPrice, maxDiscountType, maxDiscountValue),
  );
  return Math.max(0, Math.min(Number(requested) || 0, maxAllowed));
}
