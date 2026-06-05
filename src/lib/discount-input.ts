export type DiscountInputType = "fixed" | "percentage";

export function roundDiscountAmount(value: number): number {
  return Math.round(Math.max(0, value) * 100) / 100;
}

/** Convert raw user input to a fixed discount amount against the given base. */
export function resolveDiscountAmount(
  type: DiscountInputType,
  rawValue: number,
  baseAmount: number,
): number {
  const raw = Math.max(0, Number(rawValue) || 0);
  const base = Math.max(0, Number(baseAmount) || 0);

  if (type === "percentage") {
    return roundDiscountAmount((base * raw) / 100);
  }

  return roundDiscountAmount(raw);
}

/** Max allowed raw input for the active discount type. */
export function maxRawDiscountValue(
  type: DiscountInputType,
  maxFixedAmount: number,
  baseAmount: number,
): number {
  const maxFixed = Math.max(0, Number(maxFixedAmount) || 0);
  const base = Math.max(0, Number(baseAmount) || 0);

  if (type === "percentage") {
    if (base <= 0) return 0;
    return roundDiscountAmount(Math.min(100, (maxFixed / base) * 100));
  }

  return roundDiscountAmount(maxFixed);
}

/** Clamp raw user input before resolving to a fixed amount. */
export function clampRawDiscountValue(
  type: DiscountInputType,
  rawValue: number,
  maxFixedAmount: number,
  baseAmount: number,
): number {
  const maxRaw = maxRawDiscountValue(type, maxFixedAmount, baseAmount);
  const raw = Math.max(0, Number(rawValue) || 0);
  return type === "percentage"
    ? roundDiscountAmount(Math.min(raw, maxRaw))
    : roundDiscountAmount(Math.min(raw, maxRaw));
}

/** Preserve equivalent discount when switching between fixed and percentage. */
export function convertDiscountBetweenTypes(
  fromType: DiscountInputType,
  toType: DiscountInputType,
  rawValue: number,
  baseAmount: number,
): number {
  if (fromType === toType) {
    return roundDiscountAmount(rawValue);
  }

  const base = Math.max(0, Number(baseAmount) || 0);
  const fixedAmount = resolveDiscountAmount(fromType, rawValue, base);

  if (toType === "percentage") {
    if (base <= 0) return 0;
    return roundDiscountAmount((fixedAmount / base) * 100);
  }

  return fixedAmount;
}

/** Clamp a resolved fixed discount to catalog/line limits. */
export function clampResolvedDiscount(
  resolvedAmount: number,
  maxFixedAmount: number,
  baseAmount: number,
): number {
  const maxFixed = Math.max(0, Number(maxFixedAmount) || 0);
  const base = Math.max(0, Number(baseAmount) || 0);
  const cap = Math.min(maxFixed, base);
  return roundDiscountAmount(Math.min(Math.max(0, resolvedAmount), cap));
}
