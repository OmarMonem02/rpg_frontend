export type UnstoredItemType =
  | "product"
  | "spare_part"
  | "maintenance_part"
  | "maintenance_service";

export type UnstoredItemDraft = {
  custom_name: string;
  custom_description: string;
  unstored_type: UnstoredItemType;
  qty: number;
  cost_price: number;
  sale_price: number;
};

export const UNSTORED_ITEM_TYPE_OPTIONS: {
  value: UnstoredItemType;
  label: string;
}[] = [
  { value: "product", label: "Product" },
  { value: "maintenance_part", label: "Maintenance Part" },
  { value: "spare_part", label: "Spare Part" },
  { value: "maintenance_service", label: "Maintenance Service" },
];

export function unstoredTypeLabel(type: string | null | undefined): string {
  const found = UNSTORED_ITEM_TYPE_OPTIONS.find((opt) => opt.value === type);
  return found?.label ?? "Unstored";
}

export function unstoredTypeToSellableType(
  type: UnstoredItemType,
): "products" | "spare_parts" | "maintenance_parts" | "maintenance_services" {
  switch (type) {
    case "product":
      return "products";
    case "spare_part":
      return "spare_parts";
    case "maintenance_part":
      return "maintenance_parts";
    case "maintenance_service":
      return "maintenance_services";
  }
}

export function validateUnstoredDraft(
  draft: Partial<UnstoredItemDraft>,
): string | null {
  if (!draft.custom_name?.trim()) return "Name is required.";
  if (!draft.custom_description?.trim()) return "Description is required.";
  if (!draft.unstored_type) return "Item type is required.";
  const qty = Number(draft.qty);
  if (!Number.isFinite(qty) || qty < 1) return "Quantity must be at least 1.";
  const cost = Number(draft.cost_price);
  if (!Number.isFinite(cost) || cost < 0) return "Cost is required (EGP).";
  const salePrice = Number(draft.sale_price);
  if (!Number.isFinite(salePrice) || salePrice < 0) return "Sale price is required (EGP).";
  return null;
}

export function buildSaleUnstoredPayload(draft: UnstoredItemDraft) {
  return {
    is_unstored: true as const,
    custom_name: draft.custom_name.trim(),
    custom_description: draft.custom_description.trim(),
    unstored_type: draft.unstored_type,
    cost_price: Number(draft.cost_price),
    selling_price: Number(draft.sale_price),
    qty: Math.trunc(Number(draft.qty)),
    discount: 0,
  };
}

export function buildTicketUnstoredPayload(draft: UnstoredItemDraft) {
  return {
    is_unstored: true as const,
    custom_name: draft.custom_name.trim(),
    custom_description: draft.custom_description.trim(),
    unstored_type: draft.unstored_type,
    cost_price: Number(draft.cost_price),
    price_snapshot: Number(draft.sale_price),
    qty: Math.trunc(Number(draft.qty)),
    discount: 0,
  };
}

export const EMPTY_UNSTORED_DRAFT: UnstoredItemDraft = {
  custom_name: "",
  custom_description: "",
  unstored_type: "product",
  qty: 1,
  cost_price: 0,
  sale_price: 0,
};

export function createUnstoredCartLineId(counter: number): string {
  return `uncat_${counter}`;
}
