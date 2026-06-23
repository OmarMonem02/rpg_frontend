import type { EntityFilters } from "@/hooks/useEntityFilters";
import type { ModuleFilterOptions } from "@/lib/inventory-filter-config";

export type ActiveFilterChip = {
  key: string;
  label: string;
  onClear: () => void;
};

function labelForSelect(
  value: string | number | undefined,
  options?: { value: string | number; label: string }[],
): string {
  if (value === undefined || value === "") return "";
  const match = options?.find((opt) => String(opt.value) === String(value));
  return match?.label ?? String(value);
}

export function buildActiveFilterChips(
  filters: EntityFilters,
  options: {
    onClear: (key: keyof EntityFilters | "bike_compat") => void;
    selectOptions?: ModuleFilterOptions;
    extraChips?: ActiveFilterChip[];
  },
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  const { selectOptions, onClear, extraChips = [] } = options;

  if (filters.search?.trim()) {
    chips.push({
      key: "search",
      label: `Search: ${filters.search}`,
      onClear: () => onClear("search"),
    });
  }
  if (filters.category_id) {
    chips.push({
      key: "category_id",
      label: `Category: ${labelForSelect(filters.category_id, selectOptions?.categories)}`,
      onClear: () => onClear("category_id"),
    });
  }
  if (filters.brand_id) {
    chips.push({
      key: "brand_id",
      label: `Brand: ${labelForSelect(filters.brand_id, selectOptions?.brands)}`,
      onClear: () => onClear("brand_id"),
    });
  }
  if (filters.blueprint_id) {
    chips.push({
      key: "blueprint_id",
      label: `Blueprint: ${labelForSelect(filters.blueprint_id, selectOptions?.blueprints)}`,
      onClear: () => onClear("blueprint_id"),
    });
  }
  if (filters.sector_id) {
    chips.push({
      key: "sector_id",
      label: `Sector: ${labelForSelect(filters.sector_id, selectOptions?.sectors)}`,
      onClear: () => onClear("sector_id"),
    });
  }
  if (filters.status) {
    chips.push({
      key: "status",
      label: `Status: ${labelForSelect(filters.status, selectOptions?.statuses)}`,
      onClear: () => onClear("status"),
    });
  }
  if (filters.item_status) {
    chips.push({
      key: "item_status",
      label: `Condition: ${labelForSelect(filters.item_status, selectOptions?.itemStatuses)}`,
      onClear: () => onClear("item_status"),
    });
  }
  if (filters.type) {
    chips.push({
      key: "type",
      label: `Type: ${labelForSelect(filters.type, selectOptions?.brandTypes)}`,
      onClear: () => onClear("type"),
    });
  }
  if (filters.currency) {
    chips.push({
      key: "currency",
      label: `Currency: ${filters.currency}`,
      onClear: () => onClear("currency"),
    });
  }
  if (filters.tags?.length) {
    chips.push({
      key: "tags",
      label: `Tags: ${filters.tags.join(", ")}`,
      onClear: () => onClear("tags"),
    });
  }
  if (filters.price_min !== undefined || filters.price_max !== undefined) {
    chips.push({
      key: "price",
      label: `Sale price: ${filters.price_min ?? 0}–${filters.price_max ?? "∞"}`,
      onClear: () => {
        onClear("price_min");
        onClear("price_max");
      },
    });
  }
  if (filters.cost_price_min !== undefined || filters.cost_price_max !== undefined) {
    chips.push({
      key: "cost_price",
      label: `Cost: ${filters.cost_price_min ?? 0}–${filters.cost_price_max ?? "∞"}`,
      onClear: () => {
        onClear("cost_price_min");
        onClear("cost_price_max");
      },
    });
  }
  if (filters.stock_min !== undefined || filters.stock_max !== undefined) {
    chips.push({
      key: "stock",
      label: `Stock: ${filters.stock_min ?? 0}–${filters.stock_max ?? "∞"}`,
      onClear: () => {
        onClear("stock_min");
        onClear("stock_max");
      },
    });
  }
  if (filters.low_stock) {
    chips.push({ key: "low_stock", label: "Low stock", onClear: () => onClear("low_stock") });
  }
  if (filters.size) {
    chips.push({ key: "size", label: `Size: ${filters.size}`, onClear: () => onClear("size") });
  }
  if (filters.color) {
    chips.push({ key: "color", label: `Color: ${filters.color}`, onClear: () => onClear("color") });
  }
  if (filters.universal === true || filters.universal === false) {
    chips.push({
      key: "universal",
      label: filters.universal ? "Universal only" : "Not universal",
      onClear: () => onClear("universal"),
    });
  }
  if (
    filters.bike_brand_id ||
    filters.bike_model ||
    filters.bike_year
  ) {
    const parts = [
      labelForSelect(filters.bike_brand_id, selectOptions?.bikeBrands),
      filters.bike_model,
      filters.bike_year,
    ].filter(Boolean);
    chips.push({
      key: "bike_compat",
      label: `Bike: ${parts.join(" ")}`,
      onClear: () => onClear("bike_compat"),
    });
  }
  if (filters.delivery_status) {
    chips.push({
      key: "delivery_status",
      label: `Delivery: ${labelForSelect(filters.delivery_status, selectOptions?.deliveryStatuses)}`,
      onClear: () => onClear("delivery_status"),
    });
  }
  if (filters.sale_type) {
    chips.push({
      key: "sale_type",
      label: `Channel: ${labelForSelect(filters.sale_type, selectOptions?.saleTypes)}`,
      onClear: () => onClear("sale_type"),
    });
  }
  if (filters.item_type) {
    chips.push({
      key: "item_type",
      label: `Item: ${labelForSelect(filters.item_type, selectOptions?.itemTypes)}`,
      onClear: () => onClear("item_type"),
    });
  }
  if (filters.customer_name) {
    chips.push({
      key: "customer_name",
      label: `Customer: ${filters.customer_name}`,
      onClear: () => onClear("customer_name"),
    });
  }
  if (filters.payment_method_id) {
    chips.push({
      key: "payment_method_id",
      label: `Payment: ${labelForSelect(filters.payment_method_id, selectOptions?.paymentMethods)}`,
      onClear: () => onClear("payment_method_id"),
    });
  }
  if (filters.is_maintenance) {
    chips.push({
      key: "is_maintenance",
      label: "Maintenance sale",
      onClear: () => onClear("is_maintenance"),
    });
  }
  if (filters.has_unstored_items) {
    chips.push({
      key: "has_unstored_items",
      label: "Has unstored items",
      onClear: () => onClear("has_unstored_items"),
    });
  }
  if (filters.date_from || filters.date_to) {
    chips.push({
      key: "date",
      label: `Date: ${filters.date_from ?? "…"} – ${filters.date_to ?? "…"}`,
      onClear: () => {
        onClear("date_from");
        onClear("date_to");
      },
    });
  }
  if (filters.total_min !== undefined || filters.total_max !== undefined) {
    chips.push({
      key: "total",
      label: `Total: ${filters.total_min ?? 0}–${filters.total_max ?? "∞"}`,
      onClear: () => {
        onClear("total_min");
        onClear("total_max");
      },
    });
  }

  return [...chips, ...extraChips];
}

export function countActiveFilters(filters: EntityFilters): number {
  let n = 0;
  if (filters.search?.trim()) n++;
  if (filters.category_id) n++;
  if (filters.brand_id) n++;
  if (filters.blueprint_id) n++;
  if (filters.sector_id) n++;
  if (filters.status) n++;
  if (filters.item_status) n++;
  if (filters.type) n++;
  if (filters.currency) n++;
  if (filters.tags?.length) n++;
  if (filters.price_min !== undefined || filters.price_max !== undefined) n++;
  if (filters.cost_price_min !== undefined || filters.cost_price_max !== undefined) n++;
  if (filters.stock_min !== undefined || filters.stock_max !== undefined) n++;
  if (filters.low_stock) n++;
  if (filters.size) n++;
  if (filters.color) n++;
  if (filters.universal === true || filters.universal === false) n++;
  if (filters.max_discount_min !== undefined || filters.max_discount_max !== undefined) n++;
  if (filters.profit_min !== undefined || filters.profit_max !== undefined) n++;
  if (filters.profit_percent_min !== undefined || filters.profit_percent_max !== undefined) n++;
  if (filters.mileage_min !== undefined || filters.mileage_max !== undefined) n++;
  if (filters.created_from || filters.created_to) n++;
  if (filters.have_commission) n++;
  if (filters.bike_brand_id || filters.bike_model || filters.bike_year) n++;
  if (filters.delivery_status) n++;
  if (filters.sale_type) n++;
  if (filters.item_type) n++;
  if (filters.customer_name) n++;
  if (filters.payment_method_id) n++;
  if (filters.is_maintenance) n++;
  if (filters.has_unstored_items) n++;
  if (filters.date_from || filters.date_to) n++;
  if (filters.total_min !== undefined || filters.total_max !== undefined) n++;
  if (filters.stock_alert_level && filters.stock_alert_level !== "all") n++;
  return n;
}
