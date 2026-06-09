import type { BikeBlueprintRecord } from "@/lib/api/bikes";
import {
  formatCatalogPriceInEGP,
  type ExchangeRates,
  type PricingCurrency,
} from "@/lib/currencies";
import type { ProductRecord, SparePartRecord } from "@/lib/api/inventory";

export type LookupItemKind = "product" | "spare_part";

export type LookupItem =
  | { kind: "product"; record: ProductRecord }
  | { kind: "spare_part"; record: SparePartRecord };

export type DiscountDisplayItem = {
  max_discount_type: "fixed" | "percentage";
  max_discount_value: number;
  currency_pricing: PricingCurrency;
};

export function findExactSkuOrPartNumberMatch(
  code: string,
  products: ProductRecord[],
  spareParts: SparePartRecord[],
): LookupItem | null {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;

  const productMatch =
    products.find(
      (item) =>
        item.sku?.toLowerCase() === normalized ||
        item.part_number?.toLowerCase() === normalized,
    ) ?? null;

  if (productMatch) {
    return { kind: "product", record: productMatch };
  }

  const spareMatch =
    spareParts.find(
      (item) =>
        item.sku?.toLowerCase() === normalized ||
        item.part_number?.toLowerCase() === normalized,
    ) ?? null;

  if (spareMatch) {
    return { kind: "spare_part", record: spareMatch };
  }

  return null;
}

export function formatMaxDiscount(
  item: DiscountDisplayItem,
  rates: ExchangeRates,
): string {
  if (item.max_discount_value <= 0) {
    return "None";
  }

  if (item.max_discount_type === "percentage") {
    return `${item.max_discount_value}%`;
  }

  return formatCatalogPriceInEGP(
    item.max_discount_value,
    item.currency_pricing,
    rates,
  );
}

export function resolveCompatibleBikeLabels(
  blueprintIds: number[] | undefined,
  blueprints: BikeBlueprintRecord[],
  brandNameById: Map<number, string>,
): string[] {
  if (!blueprintIds?.length) return [];

  const blueprintById = new Map(blueprints.map((bp) => [bp.id, bp]));

  return blueprintIds
    .map((id) => {
      const blueprint = blueprintById.get(id);
      if (!blueprint) return null;
      const brandName = brandNameById.get(blueprint.brand_id) ?? "Unknown";
      return `${brandName} · ${blueprint.model} · ${blueprint.year}`;
    })
    .filter((label): label is string => Boolean(label));
}

export function lookupItemSortKey(item: LookupItem): string {
  return item.record.name.toLowerCase();
}

export function toLookupItem(
  kind: LookupItemKind,
  record: ProductRecord | SparePartRecord,
): LookupItem {
  return kind === "product"
    ? { kind: "product", record: record as ProductRecord }
    : { kind: "spare_part", record: record as SparePartRecord };
}

export function getLookupItemKindLabel(kind: LookupItemKind): string {
  return kind === "product" ? "Product" : "Spare Part";
}
