import type { SaleLineItem } from "@/components/cart-line-items-panel";
import type { TicketItem } from "@/lib/tickets-api";

export type DiscountScopeCategory =
  | "spare_parts"
  | "products"
  | "maintenance_services"
  | "bikes";

export type DiscountScope = Record<DiscountScopeCategory, boolean>;

export type DiscountScopeContext = "sale" | "ticket";

export const DISCOUNT_SCOPE_CATEGORIES: DiscountScopeCategory[] = [
  "spare_parts",
  "products",
  "maintenance_services",
  "bikes",
];

export const TICKET_SCOPE_CATEGORIES: DiscountScopeCategory[] = [
  "spare_parts",
  "products",
  "maintenance_services",
];

export const SCOPE_OPTION_LABELS: Record<DiscountScopeCategory, string> = {
  spare_parts: "Spare parts",
  products: "Products",
  maintenance_services: "Maintenance",
  bikes: "Bikes",
};

export function createEmptyScope(): DiscountScope {
  return {
    spare_parts: false,
    products: false,
    maintenance_services: false,
    bikes: false,
  };
}

export function createDefaultScope(
  presentCategories: DiscountScopeCategory[],
): DiscountScope {
  const scope = createEmptyScope();
  for (const category of presentCategories) {
    scope[category] = true;
  }
  return scope;
}

export function getSaleItemCategory(
  item: SaleLineItem,
): DiscountScopeCategory {
  return item.sellable_type as DiscountScopeCategory;
}

export function getTicketItemCategory(item: TicketItem): DiscountScopeCategory {
  if (item.spare_part_id) return "spare_parts";
  if (item.product_id) return "products";
  return "maintenance_services";
}

export function getPresentSaleCategories(
  items: SaleLineItem[],
): DiscountScopeCategory[] {
  const present = new Set<DiscountScopeCategory>();
  for (const item of items) {
    present.add(getSaleItemCategory(item));
  }
  return DISCOUNT_SCOPE_CATEGORIES.filter((category) => present.has(category));
}

export function getPresentTicketCategories(
  items: TicketItem[],
): DiscountScopeCategory[] {
  const present = new Set<DiscountScopeCategory>();
  for (const item of items) {
    present.add(getTicketItemCategory(item));
  }
  return TICKET_SCOPE_CATEGORIES.filter((category) => present.has(category));
}

export function getPresentCategories(
  items: SaleLineItem[] | TicketItem[],
  context: DiscountScopeContext,
): DiscountScopeCategory[] {
  if (context === "sale") {
    return getPresentSaleCategories(items as SaleLineItem[]);
  }
  return getPresentTicketCategories(items as TicketItem[]);
}

export function shouldShowAllOption(
  presentCategories: DiscountScopeCategory[],
): boolean {
  return presentCategories.length >= 2;
}

export function getVisibleScopeOptions(
  presentCategories: DiscountScopeCategory[],
  context: DiscountScopeContext,
): DiscountScopeCategory[] {
  const allowed =
    context === "sale" ? DISCOUNT_SCOPE_CATEGORIES : TICKET_SCOPE_CATEGORIES;
  return allowed.filter((category) => presentCategories.includes(category));
}

export function isAllScopeSelected(
  scope: DiscountScope,
  presentCategories: DiscountScopeCategory[],
): boolean {
  return presentCategories.every((category) => scope[category]);
}

export function isScopeEqual(a: DiscountScope, b: DiscountScope): boolean {
  return DISCOUNT_SCOPE_CATEGORIES.every((category) => a[category] === b[category]);
}

export function scopeIncludesSaleItem(
  item: SaleLineItem,
  scope: DiscountScope,
): boolean {
  return scope[getSaleItemCategory(item)];
}

export function scopeIncludesTicketItem(
  item: TicketItem,
  scope: DiscountScope,
): boolean {
  return scope[getTicketItemCategory(item)];
}

export function normalizeScopeForPresentCategories(
  scope: DiscountScope,
  presentCategories: DiscountScopeCategory[],
): DiscountScope {
  const next = createEmptyScope();
  for (const category of presentCategories) {
    next[category] = scope[category];
  }
  if (!presentCategories.some((category) => next[category])) {
    return createDefaultScope(presentCategories);
  }
  return next;
}

export function toggleScopeCategory(
  scope: DiscountScope,
  category: DiscountScopeCategory,
  presentCategories: DiscountScopeCategory[],
): DiscountScope {
  const next = { ...scope, [category]: !scope[category] };
  const selectedCount = presentCategories.filter((c) => next[c]).length;
  if (selectedCount === 0) {
    return scope;
  }
  return next;
}

export function setAllScopeSelected(
  scope: DiscountScope,
  presentCategories: DiscountScopeCategory[],
  selected: boolean,
): DiscountScope {
  const next = { ...scope };
  for (const category of presentCategories) {
    next[category] = selected;
  }
  if (!selected) {
    const first = presentCategories[0];
    if (first) next[first] = true;
  }
  return next;
}

export function scopeToPayload(
  scope: DiscountScope,
  presentCategories: DiscountScopeCategory[],
): Partial<DiscountScope> {
  const payload: Partial<DiscountScope> = {};
  for (const category of presentCategories) {
    payload[category] = scope[category];
  }
  return payload;
}

export function scopeFromPayload(
  payload: Partial<DiscountScope> | null | undefined,
  presentCategories: DiscountScopeCategory[],
): DiscountScope | null {
  if (!payload) return null;
  const scope = createEmptyScope();
  let hasValue = false;
  for (const category of presentCategories) {
    if (typeof payload[category] === "boolean") {
      scope[category] = payload[category] as boolean;
      hasValue = true;
    }
  }
  return hasValue ? normalizeScopeForPresentCategories(scope, presentCategories) : null;
}

export function legacyScopeFromIncludesMaintenance(
  includesMaintenance: boolean | null | undefined,
  presentCategories: DiscountScopeCategory[],
): DiscountScope {
  if (includesMaintenance === false) {
    const scope = createDefaultScope(presentCategories);
    scope.maintenance_services = false;
    return normalizeScopeForPresentCategories(scope, presentCategories);
  }
  return createDefaultScope(presentCategories);
}

export function resolveScopeFromApprovalContext(
  discountScope: Partial<DiscountScope> | null | undefined,
  discountIncludesMaintenance: boolean | null | undefined,
  presentCategories: DiscountScopeCategory[],
): DiscountScope {
  const fromPayload = scopeFromPayload(discountScope, presentCategories);
  if (fromPayload) return fromPayload;
  return legacyScopeFromIncludesMaintenance(
    discountIncludesMaintenance,
    presentCategories,
  );
}

export function formatScopeLabel(
  scope: DiscountScope,
  presentCategories: DiscountScopeCategory[],
): string {
  if (presentCategories.length === 0) return "—";
  if (isAllScopeSelected(scope, presentCategories)) {
    return "All categories";
  }
  const labels = presentCategories
    .filter((category) => scope[category])
    .map((category) => SCOPE_OPTION_LABELS[category]);
  return labels.length > 0 ? labels.join(", ") : "—";
}

export function formatScopeSummary(
  scope: DiscountScope,
  presentCategories: DiscountScopeCategory[],
): string {
  if (presentCategories.length === 0) {
    return "no categories selected";
  }
  if (isAllScopeSelected(scope, presentCategories)) {
    return "all categories";
  }
  const labels = presentCategories
    .filter((category) => scope[category])
    .map((category) => SCOPE_OPTION_LABELS[category].toLowerCase());
  return labels.length > 0 ? labels.join(", ") : "no categories selected";
}
