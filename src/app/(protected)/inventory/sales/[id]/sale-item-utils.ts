import type {
  BikeRecord,
  CreateSaleLineItemPayload,
  MaintenanceServiceRecord,
  ProductRecord,
  SaleLineItemRecord,
  SparePartRecord,
} from "@/lib/crud-api";

export type CatalogType =
  | "products"
  | "spare_parts"
  | "bikes"
  | "maintenance_services";

export type CatalogItem =
  | ProductRecord
  | SparePartRecord
  | BikeRecord
  | MaintenanceServiceRecord;

export type PendingExchangeItem = {
  id: string;
  label: string;
  kind: SaleLineItemRecord["sellable_type"];
  payload: CreateSaleLineItemPayload;
};

export const money = (n: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const labelOf = (t: SaleLineItemRecord["sellable_type"]) =>
  ({
    products: "Product",
    spare_parts: "Spare Part",
    bikes: "Bike",
    maintenance_services: "Service",
  })[t];

export function buildPayload(item: CatalogItem) {
  if ("service_price" in item) {
    return {
      label: item.name,
      kind: "maintenance_services" as const,
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
      payload: {
        product_id: item.id,
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
    payload: {
      bike_for_sale_id: item.id,
      selling_price: item.sale_price,
      discount: 0,
      qty: 1,
    },
  };
}
