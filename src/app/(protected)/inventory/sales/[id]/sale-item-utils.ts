import type {
  BikeRecord,
  CreateSaleLineItemPayload,
  MaintenanceServiceRecord,
  ProductRecord,
  SaleLineItemRecord,
  SparePartRecord,
  MaintenancePartRecord,
} from "@/lib/crud-api";
import type { PricingCurrency } from "@/lib/currencies";
import { egpMultiplierForPricingCurrency, toPricingCurrency } from "@/lib/currencies";

export type CatalogType =
  | "products"
  | "spare_parts"
  | "maintenance_parts"
  | "bikes"
  | "maintenance_services";

export type CatalogItem =
  | ProductRecord
  | SparePartRecord
  | MaintenancePartRecord
  | BikeRecord
  | MaintenanceServiceRecord;

export type PendingExchangeItem = {
  id: string;
  label: string;
  kind: SaleLineItemRecord["sellable_type"];
  payload: CreateSaleLineItemPayload;
  /** Native currency of the catalog item */
  currency: PricingCurrency;
};

export const money = (n: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export { saleLineItemTypeLabel as labelOf } from "@/lib/api/sales";

/**
 * Converts a price to EGP using the provided exchange rate.
 * If the currency is already EGP (or no rate is given), the value is returned as-is.
 */
export function normalizeToEGP(
  price: number,
  currency: PricingCurrency,
  rates: { usdToEgp: number; eurToEgp: number },
): number {
  const m = egpMultiplierForPricingCurrency(currency, rates);
  return Math.round(price * m * 100) / 100;
}

export function buildPayload(item: CatalogItem) {
  if ("service_price" in item) {
    return {
      label: item.name,
      kind: "maintenance_services" as const,
      currency: "EGP" as const,
      payload: {
        maintenance_service_id: item.id,
        selling_price: item.service_price,
        discount: 0,
        qty: 1,
      },
    };
  }

  if ("stock_quantity" in item && "products_category_id" in item) {
    return {
      label: item.name,
      kind: "products" as const,
      currency: toPricingCurrency(item.sale_currency),
      payload: {
        product_id: item.id,
        selling_price: item.sale_price,
        discount: 0,
        qty: 1,
      },
    };
  }

  if ("stock_quantity" in item && "maintenance_parts_category_id" in item) {
    return {
      label: item.name,
      kind: "maintenance_parts" as const,
      currency: toPricingCurrency(item.sale_currency),
      payload: {
        maintenance_part_id: item.id,
        selling_price: item.sale_price,
        discount: 0,
        qty: 1,
      },
    };
  }

  if ("stock_quantity" in item && "spare_parts_category_id" in item) {
    return {
      label: item.name,
      kind: "spare_parts" as const,
      currency: toPricingCurrency(item.sale_currency),
      payload: {
        spare_part_id: item.id,
        selling_price: item.sale_price,
        discount: 0,
        qty: 1,
      },
    };
  }

  return {
    label: "vin" in item && item.vin ? `Bike ${item.vin}` : `Bike #${item.id}`,
    kind: "bikes" as const,
    currency: toPricingCurrency(
      "sale_currency" in item ? item.sale_currency : "EGP",
    ),
    payload: {
      bike_for_sale_id: item.id,
      selling_price: item.sale_price,
      discount: 0,
      qty: 1,
    },
  };
}
