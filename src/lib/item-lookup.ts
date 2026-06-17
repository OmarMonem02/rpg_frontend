import type { BikeBlueprintRecord } from "@/lib/api/bikes";
import {
  formatCatalogPriceInEGP,
  type ExchangeRates,
  type PricingCurrency,
} from "@/lib/currencies";
import type {
  MaintenancePartRecord,
  ProductRecord,
  SparePartRecord,
} from "@/lib/api/inventory";

export type LookupItemKind = "product" | "spare_part" | "maintenance_part";

export type LookupItem =
  | { kind: "product"; record: ProductRecord }
  | { kind: "spare_part"; record: SparePartRecord }
  | { kind: "maintenance_part"; record: MaintenancePartRecord };

export type DiscountDisplayItem = {
  max_discount_type: "fixed" | "percentage";
  max_discount_value: number;
  sale_currency: PricingCurrency;
};

function findCatalogMatch<T extends { sku?: string; part_number?: string }>(
  code: string,
  items: T[],
): T | null {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;

  return (
    items.find(
      (item) =>
        item.sku?.toLowerCase() === normalized ||
        item.part_number?.toLowerCase() === normalized,
    ) ?? null
  );
}

export function findExactSkuOrPartNumberMatch(
  code: string,
  products: ProductRecord[],
  spareParts: SparePartRecord[],
  maintenanceParts: MaintenancePartRecord[] = [],
): LookupItem | null {
  const productMatch = findCatalogMatch(code, products);
  if (productMatch) {
    return { kind: "product", record: productMatch };
  }

  const spareMatch = findCatalogMatch(code, spareParts);
  if (spareMatch) {
    return { kind: "spare_part", record: spareMatch };
  }

  const maintenanceMatch = findCatalogMatch(code, maintenanceParts);
  if (maintenanceMatch) {
    return { kind: "maintenance_part", record: maintenanceMatch };
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
    item.sale_currency,
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
  record: ProductRecord | SparePartRecord | MaintenancePartRecord,
): LookupItem {
  if (kind === "product") {
    return { kind: "product", record: record as ProductRecord };
  }
  if (kind === "maintenance_part") {
    return { kind: "maintenance_part", record: record as MaintenancePartRecord };
  }
  return { kind: "spare_part", record: record as SparePartRecord };
}

export function getLookupItemKindLabel(kind: LookupItemKind): string {
  if (kind === "product") return "Product";
  if (kind === "maintenance_part") return "Maintenance Part";
  return "Spare Part";
}
