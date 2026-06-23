export type InventoryModuleId =
  | "products"
  | "spare_parts"
  | "maintenance_parts"
  | "bikes"
  | "maintenance_services"
  | "sales"
  | "delivery_orders"
  | "brands"
  | "item_lookup";

export type FilterVisibility = "list" | "picker" | "both";

export type FilterFieldType =
  | "search"
  | "select"
  | "text"
  | "number"
  | "numberRange"
  | "currency"
  | "tags"
  | "toggle"
  | "triState"
  | "date"
  | "dateRange"
  | "bikeCompatibility"
  | "sectorTabs";

export type FilterFieldDef = {
  id: string;
  label: string;
  type: FilterFieldType;
  apiKey?: string | string[];
  apiKeyMin?: string;
  apiKeyMax?: string;
  visibleIn?: FilterVisibility;
  section?: "primary" | "advanced" | "more";
  placeholder?: string;
  colSpan?: number;
};

export type SelectOption = {
  value: string | number;
  label: string;
};

export type ModuleFilterOptions = {
  brands?: SelectOption[];
  bikeBrands?: SelectOption[];
  categories?: SelectOption[];
  blueprints?: SelectOption[];
  sectors?: SelectOption[];
  statuses?: SelectOption[];
  itemStatuses?: SelectOption[];
  paymentMethods?: SelectOption[];
  sellers?: SelectOption[];
  saleTypes?: SelectOption[];
  itemTypes?: SelectOption[];
  deliveryStatuses?: SelectOption[];
  saleStatuses?: SelectOption[];
  stockAlertLevels?: SelectOption[];
  brandTypes?: SelectOption[];
  universalOptions?: SelectOption[];
};

const CATALOG_MORE_FIELDS: FilterFieldDef[] = [
  { id: "cost_price", label: "Cost Price", type: "numberRange", apiKeyMin: "cost_price_min", apiKeyMax: "cost_price_max", section: "more" },
  { id: "stock", label: "Stock", type: "numberRange", apiKeyMin: "stock_min", apiKeyMax: "stock_max", section: "more" },
  { id: "low_stock", label: "Low Stock Only", type: "toggle", apiKey: "low_stock", section: "more" },
  { id: "size", label: "Size", type: "text", apiKey: "size", section: "more", placeholder: "e.g. L" },
  { id: "color", label: "Color", type: "text", apiKey: "color", section: "more", placeholder: "e.g. Black" },
  { id: "item_status", label: "Status", type: "select", apiKey: "item_status", section: "more" },
  { id: "universal", label: "Universal", type: "triState", apiKey: "universal", section: "more" },
  { id: "max_discount", label: "Max Discount", type: "numberRange", apiKeyMin: "max_discount_min", apiKeyMax: "max_discount_max", section: "more" },
  { id: "profit", label: "Profit", type: "numberRange", apiKeyMin: "profit_min", apiKeyMax: "profit_max", section: "more" },
  { id: "profit_percent", label: "Profit %", type: "numberRange", apiKeyMin: "profit_percent_min", apiKeyMax: "profit_percent_max", section: "more" },
];

const CATALOG_PRIMARY: FilterFieldDef[] = [
  { id: "search", label: "Search", type: "search", apiKey: "search", section: "primary", placeholder: "Name, SKU, part number…" },
  { id: "category_id", label: "Category", type: "select", apiKey: "category_id", section: "primary" },
  { id: "brand_id", label: "Brand", type: "select", apiKey: "brand_id", section: "primary" },
];

const CATALOG_ADVANCED: FilterFieldDef[] = [
  { id: "tags", label: "Tags", type: "tags", apiKey: "tags", section: "advanced" },
  { id: "price", label: "Sale Price", type: "numberRange", apiKeyMin: "price_min", apiKeyMax: "price_max", section: "advanced" },
  { id: "currency", label: "Currency", type: "currency", apiKey: "currency", section: "advanced" },
  { id: "bike_compatibility", label: "Compatible Bike", type: "bikeCompatibility", apiKey: ["bike_brand_id", "bike_model", "bike_year"], section: "advanced" },
];

export const MODULE_FILTER_FIELDS: Record<InventoryModuleId, FilterFieldDef[]> = {
  products: [
    ...CATALOG_PRIMARY,
    ...CATALOG_ADVANCED,
    ...CATALOG_MORE_FIELDS,
  ],
  spare_parts: [
    ...CATALOG_PRIMARY,
    ...CATALOG_ADVANCED,
    ...CATALOG_MORE_FIELDS,
  ],
  maintenance_parts: [
    ...CATALOG_PRIMARY,
    ...CATALOG_ADVANCED,
    ...CATALOG_MORE_FIELDS,
  ],
  bikes: [
    { id: "search", label: "Search", type: "search", apiKey: "search", section: "primary", placeholder: "VIN, model, brand…" },
    { id: "blueprint_id", label: "Blueprint", type: "select", apiKey: "blueprint_id", section: "primary" },
    { id: "brand_id", label: "Brand", type: "select", apiKey: "brand_id", section: "primary" },
    { id: "status", label: "Status", type: "select", apiKey: "status", section: "primary" },
    { id: "price", label: "Sale Price", type: "numberRange", apiKeyMin: "price_min", apiKeyMax: "price_max", section: "advanced" },
    { id: "cost_price", label: "Cost Price", type: "numberRange", apiKeyMin: "cost_price_min", apiKeyMax: "cost_price_max", section: "more" },
    { id: "currency", label: "Currency", type: "currency", apiKey: "currency", section: "advanced" },
    { id: "mileage", label: "Mileage (km)", type: "numberRange", apiKeyMin: "mileage_min", apiKeyMax: "mileage_max", section: "more" },
    { id: "max_discount", label: "Max Discount", type: "numberRange", apiKeyMin: "max_discount_min", apiKeyMax: "max_discount_max", section: "more" },
    { id: "profit", label: "Profit", type: "numberRange", apiKeyMin: "profit_min", apiKeyMax: "profit_max", section: "more" },
    { id: "profit_percent", label: "Profit %", type: "numberRange", apiKeyMin: "profit_percent_min", apiKeyMax: "profit_percent_max", section: "more" },
  ],
  maintenance_services: [
    { id: "search", label: "Search", type: "search", apiKey: "search", section: "primary", placeholder: "Service name…" },
    { id: "sector_id", label: "Sector", type: "select", apiKey: "sector_id", section: "primary" },
    { id: "price", label: "Price", type: "numberRange", apiKeyMin: "price_min", apiKeyMax: "price_max", section: "advanced" },
    { id: "currency", label: "Currency", type: "currency", apiKey: "currency", section: "advanced" },
    { id: "max_discount", label: "Max Discount", type: "numberRange", apiKeyMin: "max_discount_min", apiKeyMax: "max_discount_max", section: "more" },
    { id: "created", label: "Created", type: "dateRange", apiKeyMin: "created_from", apiKeyMax: "created_to", section: "more" },
    { id: "have_commission", label: "Has Commission", type: "toggle", apiKey: "have_commission", section: "more" },
  ],
  sales: [
    { id: "search", label: "Search", type: "search", apiKey: "search", section: "primary", placeholder: "Invoice #, customer…" },
    { id: "date", label: "Date Range", type: "dateRange", apiKeyMin: "date_from", apiKeyMax: "date_to", section: "primary" },
    { id: "delivery_status", label: "Delivery", type: "select", apiKey: "delivery_status", section: "more" },
    { id: "sale_type", label: "Channel", type: "select", apiKey: "sale_type", section: "more" },
    { id: "status", label: "Status", type: "select", apiKey: "status", section: "more" },
    { id: "item_type", label: "Item Type", type: "select", apiKey: "item_type", section: "more" },
    { id: "customer_name", label: "Customer", type: "text", apiKey: "customer_name", section: "more", placeholder: "Customer name" },
    { id: "payment_method_id", label: "Payment Method", type: "select", apiKey: "payment_method_id", section: "more" },
    { id: "is_maintenance", label: "Maintenance Sale", type: "toggle", apiKey: "is_maintenance", section: "more" },
    { id: "has_unstored_items", label: "Has Unstored Items", type: "toggle", apiKey: "has_unstored_items", section: "more" },
    { id: "total", label: "Total", type: "numberRange", apiKeyMin: "total_min", apiKeyMax: "total_max", section: "more" },
  ],
  delivery_orders: [
    { id: "search", label: "Search", type: "search", apiKey: "search", section: "primary", placeholder: "Order #, customer…" },
    { id: "date", label: "Date Range", type: "dateRange", apiKeyMin: "date_from", apiKeyMax: "date_to", section: "primary" },
    { id: "delivery_status", label: "Delivery", type: "select", apiKey: "delivery_status", section: "primary" },
    { id: "customer_name", label: "Customer", type: "text", apiKey: "customer_name", section: "more", placeholder: "Customer name" },
    { id: "total", label: "Total", type: "numberRange", apiKeyMin: "total_min", apiKeyMax: "total_max", section: "more" },
  ],
  brands: [
    { id: "search", label: "Search", type: "search", apiKey: "search", section: "primary", placeholder: "Brand name…" },
    { id: "type", label: "Type", type: "select", apiKey: "type", section: "primary" },
    { id: "created", label: "Created", type: "dateRange", apiKeyMin: "created_from", apiKeyMax: "created_to", section: "more" },
  ],
  item_lookup: [
    { id: "search", label: "Name Search", type: "search", apiKey: "search", section: "primary", placeholder: "Name, SKU…" },
    { id: "category_id", label: "Category", type: "select", apiKey: "category_id", section: "primary" },
    { id: "brand_id", label: "Brand", type: "select", apiKey: "brand_id", section: "primary" },
    { id: "price", label: "Sale Price", type: "numberRange", apiKeyMin: "price_min", apiKeyMax: "price_max", section: "more" },
    { id: "stock", label: "Stock", type: "numberRange", apiKeyMin: "stock_min", apiKeyMax: "stock_max", section: "more" },
    { id: "item_status", label: "Status", type: "select", apiKey: "item_status", section: "more" },
    { id: "universal", label: "Universal", type: "triState", apiKey: "universal", section: "more" },
    { id: "bike_compatibility", label: "Compatible Bike", type: "bikeCompatibility", apiKey: ["bike_brand_id", "bike_model", "bike_year"], section: "advanced" },
  ],
};

export function getModuleFilterFields(
  module: InventoryModuleId,
  visibility: FilterVisibility = "both",
): FilterFieldDef[] {
  return MODULE_FILTER_FIELDS[module].filter(
    (field) => !field.visibleIn || field.visibleIn === visibility || field.visibleIn === "both",
  );
}

export function getFieldsBySection(
  module: InventoryModuleId,
  section: FilterFieldDef["section"],
): FilterFieldDef[] {
  return MODULE_FILTER_FIELDS[module].filter((field) => field.section === section);
}

export const DEFAULT_ITEM_STATUS_OPTIONS: SelectOption[] = [
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
];

export const DEFAULT_UNIVERSAL_OPTIONS: SelectOption[] = [
  { value: "", label: "All" },
  { value: "true", label: "Universal only" },
  { value: "false", label: "Not universal" },
];

export const DEFAULT_BIKE_STATUS_OPTIONS: SelectOption[] = [
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
  { value: "maintenance", label: "Under Maintenance" },
  { value: "reserved", label: "Reserved" },
];

export const DEFAULT_STOCK_ALERT_OPTIONS: SelectOption[] = [
  { value: "all", label: "All alerts" },
  { value: "out", label: "Out of stock" },
  { value: "low", label: "Low stock" },
];

export const DEFAULT_BRAND_TYPE_OPTIONS: SelectOption[] = [
  { value: "products", label: "Products" },
  { value: "spare_parts", label: "Spare Parts" },
  { value: "maintenance_parts", label: "Maintenance Parts" },
  { value: "bikes", label: "Bikes" },
];
