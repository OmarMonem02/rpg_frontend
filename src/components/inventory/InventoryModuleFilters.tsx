"use client";

import { useMemo, useState } from "react";
import type { EntityFilters } from "@/hooks/useEntityFilters";
import { BikeCompatibilityFilter } from "@/components/BikeCompatibilityFilter";
import { TagInput } from "@/components/TagInput";
import { FilterBar, InputGroup, SearchableSelect } from "@/components/ops-ui";
import { SUPPORTED_PRICING_CURRENCIES } from "@/lib/currencies";
import {
  DEFAULT_BIKE_STATUS_OPTIONS,
  DEFAULT_ITEM_STATUS_OPTIONS,
  DEFAULT_UNIVERSAL_OPTIONS,
  getFieldsBySection,
  type InventoryModuleId,
  type ModuleFilterOptions,
} from "@/lib/inventory-filter-config";
import type { BrandRecord } from "@/lib/crud-api";

type FilterSetters = {
  setSearch: (v: string) => void;
  setCategory: (v: number | "") => void;
  setBrand: (v: number | "") => void;
  setBlueprint: (v: number | "") => void;
  setSector: (v: number | "") => void;
  setStatus: (v: string) => void;
  setType: (v: string) => void;
  setPriceMin: (v: number | "") => void;
  setPriceMax: (v: number | "") => void;
  setCurrency: (v: string) => void;
  setLowStock: (v: boolean) => void;
  setTags: (v: string[]) => void;
  setBikeCompatibility: (v: {
    bike_brand_id?: number;
    bike_model?: string;
    bike_year?: number;
  }) => void;
  setFilter: <K extends keyof EntityFilters>(key: K, value: EntityFilters[K]) => void;
};

type InventoryModuleFiltersProps = {
  module: InventoryModuleId;
  filters: EntityFilters;
  setters: FilterSetters;
  options?: ModuleFilterOptions;
  bikeBrands?: BrandRecord[];
  loading?: boolean;
  layout?: "page" | "panel";
  showMoreFilters?: boolean;
  onToggleMore?: () => void;
  sections?: Array<"primary" | "advanced" | "more">;
};

function NumberRangeInput({
  min,
  max,
  onMinChange,
  onMaxChange,
  minPlaceholder = "0",
  maxPlaceholder = "No limit",
}: {
  min?: number;
  max?: number;
  onMinChange: (v: number | "") => void;
  onMaxChange: (v: number | "") => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <input
        type="number"
        onWheel={(e) => e.currentTarget.blur()}
        value={min ?? ""}
        onChange={(e) => onMinChange(e.target.value ? Number(e.target.value) : "")}
        className="form-input-base py-2 text-sm mono-data [&::-webkit-inner-spin-button]:appearance-none"
        placeholder={minPlaceholder}
      />
      <input
        type="number"
        onWheel={(e) => e.currentTarget.blur()}
        value={max ?? ""}
        onChange={(e) => onMaxChange(e.target.value ? Number(e.target.value) : "")}
        className="form-input-base py-2 text-sm mono-data [&::-webkit-inner-spin-button]:appearance-none"
        placeholder={maxPlaceholder}
      />
    </div>
  );
}

export function InventoryModuleFilters({
  module,
  filters,
  setters,
  options = {},
  bikeBrands = [],
  loading = false,
  layout = "page",
  showMoreFilters: controlledShowMore,
  onToggleMore,
  sections = ["primary", "advanced", "more"],
}: InventoryModuleFiltersProps) {
  const [internalShowMore, setInternalShowMore] = useState(false);
  const showMore = controlledShowMore ?? internalShowMore;
  const toggleMore = onToggleMore ?? (() => setInternalShowMore((v) => !v));

  const primaryFields = useMemo(() => getFieldsBySection(module, "primary"), [module]);
  const advancedFields = useMemo(() => getFieldsBySection(module, "advanced"), [module]);
  const moreFields = useMemo(() => getFieldsBySection(module, "more"), [module]);

  const isCatalogModule =
    module === "products" ||
    module === "spare_parts" ||
    module === "maintenance_parts";

  const renderField = (fieldId: string) => {
    switch (fieldId) {
      case "search":
        return (
          <InputGroup key={fieldId} label="Search" className="md:col-span-4">
            <input
              type="text"
              placeholder={
                module === "bikes"
                  ? "Search by model or VIN..."
                  : module === "maintenance_services"
                    ? "Search services..."
                    : "Search by name or SKU..."
              }
              value={filters.search || ""}
              onChange={(e) => setters.setSearch(e.target.value)}
              className="form-input-base"
            />
          </InputGroup>
        );
      case "category_id":
        return (
          <InputGroup key={fieldId} label="Category" className="md:col-span-4">
            <SearchableSelect
              value={filters.category_id || ""}
              onChange={(value) => setters.setCategory(value ? parseInt(value, 10) : "")}
              placeholder="All Categories"
              options={(options.categories ?? []).map((c) => ({
                value: c.value,
                label: c.label,
              }))}
              className="form-input-base"
            />
          </InputGroup>
        );
      case "brand_id":
        return (
          <InputGroup key={fieldId} label="Brand" className="md:col-span-4">
            <SearchableSelect
              value={filters.brand_id || ""}
              onChange={(value) => setters.setBrand(value ? parseInt(value, 10) : "")}
              placeholder="All Brands"
              options={(options.brands ?? []).map((b) => ({
                value: b.value,
                label: b.label,
              }))}
              className="form-input-base"
            />
          </InputGroup>
        );
      case "blueprint_id":
        return (
          <InputGroup key={fieldId} label="Blueprint" className="md:col-span-3">
            <SearchableSelect
              value={filters.blueprint_id || ""}
              onChange={(value) => setters.setBlueprint(value ? parseInt(value, 10) : "")}
              placeholder="All Blueprints"
              options={(options.blueprints ?? []).map((b) => ({
                value: b.value,
                label: b.label,
              }))}
              className="form-input-base"
            />
          </InputGroup>
        );
      case "status":
        return (
          <InputGroup key={fieldId} label="Status" className="md:col-span-3">
            <SearchableSelect
              value={filters.status || ""}
              onChange={setters.setStatus}
              placeholder="All Statuses"
              options={(options.statuses ?? DEFAULT_BIKE_STATUS_OPTIONS).map((s) => ({
                value: s.value,
                label: s.label,
              }))}
              className="form-input-base"
            />
          </InputGroup>
        );
      case "sector_id":
        return (
          <InputGroup key={fieldId} label="Sector" className="md:col-span-4">
            <SearchableSelect
              value={filters.sector_id || ""}
              onChange={(value) => setters.setSector(value ? parseInt(value, 10) : "")}
              placeholder="All Sectors"
              options={(options.sectors ?? []).map((s) => ({
                value: s.value,
                label: s.label,
              }))}
              className="form-input-base"
            />
          </InputGroup>
        );
      case "type":
        return (
          <InputGroup key={fieldId} label="Type" className="md:col-span-4">
            <SearchableSelect
              value={filters.type || ""}
              onChange={setters.setType}
              placeholder="All Types"
              options={(options.brandTypes ?? []).map((t) => ({
                value: t.value,
                label: t.label,
              }))}
              className="form-input-base"
            />
          </InputGroup>
        );
      case "price":
        return (
          <InputGroup key={fieldId} label="Sale Price" className="md:col-span-4">
            <NumberRangeInput
              min={filters.price_min}
              max={filters.price_max}
              onMinChange={setters.setPriceMin}
              onMaxChange={setters.setPriceMax}
            />
          </InputGroup>
        );
      case "cost_price":
        return (
          <InputGroup key={fieldId} label="Cost Price" className="md:col-span-4">
            <NumberRangeInput
              min={filters.cost_price_min}
              max={filters.cost_price_max}
              onMinChange={(v) => setters.setFilter("cost_price_min", v === "" ? undefined : v)}
              onMaxChange={(v) => setters.setFilter("cost_price_max", v === "" ? undefined : v)}
            />
          </InputGroup>
        );
      case "currency":
        return (
          <InputGroup key={fieldId} label="Currency" className="md:col-span-4">
            <SearchableSelect
              value={filters.currency || "all"}
              onChange={setters.setCurrency}
              options={[
                { value: "all", label: "All Currencies" },
                ...SUPPORTED_PRICING_CURRENCIES.map((code) => ({
                  value: code,
                  label: code,
                })),
              ]}
              className="form-input-base py-2 text-sm"
            />
          </InputGroup>
        );
      case "stock":
        return (
          <InputGroup key={fieldId} label="Stock" className="md:col-span-4">
            <NumberRangeInput
              min={filters.stock_min}
              max={filters.stock_max}
              onMinChange={(v) => setters.setFilter("stock_min", v === "" ? undefined : v)}
              onMaxChange={(v) => setters.setFilter("stock_max", v === "" ? undefined : v)}
            />
          </InputGroup>
        );
      case "low_stock":
        return (
          <div key={fieldId} className="flex items-end md:col-span-4">
            <button
              type="button"
              role="switch"
              aria-checked={filters.low_stock === true}
              onClick={() => setters.setLowStock(!filters.low_stock)}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                filters.low_stock
                  ? "border-warning/40 bg-warning/10 text-on-surface"
                  : "border-outline-variant/15 bg-surface-container-lowest"
              }`}
            >
              Low stock only
            </button>
          </div>
        );
      case "size":
        return (
          <InputGroup key={fieldId} label="Size" className="md:col-span-4">
            <input
              type="text"
              value={filters.size || ""}
              onChange={(e) => setters.setFilter("size", e.target.value || undefined)}
              placeholder="e.g. L"
              className="form-input-base"
            />
          </InputGroup>
        );
      case "color":
        return (
          <InputGroup key={fieldId} label="Color" className="md:col-span-4">
            <input
              type="text"
              value={filters.color || ""}
              onChange={(e) => setters.setFilter("color", e.target.value || undefined)}
              placeholder="e.g. Black"
              className="form-input-base"
            />
          </InputGroup>
        );
      case "item_status":
        return (
          <InputGroup key={fieldId} label="Condition" className="md:col-span-4">
            <SearchableSelect
              value={filters.item_status || ""}
              onChange={(v) => setters.setFilter("item_status", v || undefined)}
              placeholder="All"
              options={options.itemStatuses ?? DEFAULT_ITEM_STATUS_OPTIONS}
              className="form-input-base"
            />
          </InputGroup>
        );
      case "universal":
        return (
          <InputGroup key={fieldId} label="Universal" className="md:col-span-4">
            <SearchableSelect
              value={
                filters.universal === true
                  ? "true"
                  : filters.universal === false
                    ? "false"
                    : ""
              }
              onChange={(v) =>
                setters.setFilter(
                  "universal",
                  v === "true" ? true : v === "false" ? false : "",
                )
              }
              options={options.universalOptions ?? DEFAULT_UNIVERSAL_OPTIONS}
              className="form-input-base"
            />
          </InputGroup>
        );
      case "max_discount":
        return (
          <InputGroup key={fieldId} label="Max Discount" className="md:col-span-4">
            <NumberRangeInput
              min={filters.max_discount_min}
              max={filters.max_discount_max}
              onMinChange={(v) => setters.setFilter("max_discount_min", v === "" ? undefined : v)}
              onMaxChange={(v) => setters.setFilter("max_discount_max", v === "" ? undefined : v)}
            />
          </InputGroup>
        );
      case "profit":
        return (
          <InputGroup key={fieldId} label="Profit" className="md:col-span-4">
            <NumberRangeInput
              min={filters.profit_min}
              max={filters.profit_max}
              onMinChange={(v) => setters.setFilter("profit_min", v === "" ? undefined : v)}
              onMaxChange={(v) => setters.setFilter("profit_max", v === "" ? undefined : v)}
            />
          </InputGroup>
        );
      case "profit_percent":
        return (
          <InputGroup key={fieldId} label="Profit %" className="md:col-span-4">
            <NumberRangeInput
              min={filters.profit_percent_min}
              max={filters.profit_percent_max}
              onMinChange={(v) =>
                setters.setFilter("profit_percent_min", v === "" ? undefined : v)
              }
              onMaxChange={(v) =>
                setters.setFilter("profit_percent_max", v === "" ? undefined : v)
              }
            />
          </InputGroup>
        );
      case "mileage":
        return (
          <InputGroup key={fieldId} label="Mileage (km)" className="md:col-span-4">
            <NumberRangeInput
              min={filters.mileage_min}
              max={filters.mileage_max}
              onMinChange={(v) => setters.setFilter("mileage_min", v === "" ? undefined : v)}
              onMaxChange={(v) => setters.setFilter("mileage_max", v === "" ? undefined : v)}
            />
          </InputGroup>
        );
      case "created":
        return (
          <InputGroup key={fieldId} label="Created" className="md:col-span-4">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filters.created_from || ""}
                onChange={(e) => setters.setFilter("created_from", e.target.value || undefined)}
                className="form-input-base py-2 text-sm"
              />
              <input
                type="date"
                value={filters.created_to || ""}
                onChange={(e) => setters.setFilter("created_to", e.target.value || undefined)}
                className="form-input-base py-2 text-sm"
              />
            </div>
          </InputGroup>
        );
      case "have_commission":
        return (
          <div key={fieldId} className="flex items-end md:col-span-4">
            <button
              type="button"
              role="switch"
              aria-checked={filters.have_commission === true}
              onClick={() => setters.setFilter("have_commission", !filters.have_commission)}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                filters.have_commission
                  ? "border-primary/40 bg-primary/10"
                  : "border-outline-variant/15 bg-surface-container-lowest"
              }`}
            >
              Has commission
            </button>
          </div>
        );
      case "delivery_status":
        return (
          <InputGroup key={fieldId} label="Delivery" className="md:col-span-4">
            <SearchableSelect
              value={filters.delivery_status || ""}
              onChange={(v) => setters.setFilter("delivery_status", v || undefined)}
              placeholder="All"
              options={options.deliveryStatuses ?? []}
              className="form-input-base"
            />
          </InputGroup>
        );
      case "sale_type":
        return (
          <InputGroup key={fieldId} label="Channel" className="md:col-span-4">
            <SearchableSelect
              value={filters.sale_type || ""}
              onChange={(v) => setters.setFilter("sale_type", v || undefined)}
              placeholder="All channels"
              options={options.saleTypes ?? []}
              className="form-input-base"
            />
          </InputGroup>
        );
      case "item_type":
        return (
          <InputGroup key={fieldId} label="Item Type" className="md:col-span-4">
            <SearchableSelect
              value={filters.item_type || ""}
              onChange={(v) => setters.setFilter("item_type", v || undefined)}
              placeholder="All items"
              options={options.itemTypes ?? []}
              className="form-input-base"
            />
          </InputGroup>
        );
      case "customer_name":
        return (
          <InputGroup key={fieldId} label="Customer" className="md:col-span-4">
            <input
              type="text"
              value={filters.customer_name || ""}
              onChange={(e) => setters.setFilter("customer_name", e.target.value || undefined)}
              placeholder="Customer name"
              className="form-input-base"
            />
          </InputGroup>
        );
      case "payment_method_id":
        return (
          <InputGroup key={fieldId} label="Payment Method" className="md:col-span-4">
            <SearchableSelect
              value={filters.payment_method_id || ""}
              onChange={(v) =>
                setters.setFilter("payment_method_id", v ? parseInt(v, 10) : undefined)
              }
              placeholder="All methods"
              options={(options.paymentMethods ?? []).map((p) => ({
                value: p.value,
                label: p.label,
              }))}
              className="form-input-base"
            />
          </InputGroup>
        );
      case "is_maintenance":
        return (
          <div key={fieldId} className="flex items-end md:col-span-4">
            <button
              type="button"
              role="switch"
              aria-checked={filters.is_maintenance === true}
              onClick={() => setters.setFilter("is_maintenance", !filters.is_maintenance)}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                filters.is_maintenance
                  ? "border-primary/40 bg-primary/10"
                  : "border-outline-variant/15 bg-surface-container-lowest"
              }`}
            >
              Maintenance sale
            </button>
          </div>
        );
      case "has_unstored_items":
        return (
          <div key={fieldId} className="flex items-end md:col-span-4">
            <button
              type="button"
              role="switch"
              aria-checked={filters.has_unstored_items === true}
              onClick={() =>
                setters.setFilter("has_unstored_items", !filters.has_unstored_items)
              }
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                filters.has_unstored_items
                  ? "border-primary/40 bg-primary/10"
                  : "border-outline-variant/15 bg-surface-container-lowest"
              }`}
            >
              Has unstored items
            </button>
          </div>
        );
      case "total":
        return (
          <InputGroup key={fieldId} label="Total" className="md:col-span-4">
            <NumberRangeInput
              min={filters.total_min}
              max={filters.total_max}
              onMinChange={(v) => setters.setFilter("total_min", v === "" ? undefined : v)}
              onMaxChange={(v) => setters.setFilter("total_max", v === "" ? undefined : v)}
            />
          </InputGroup>
        );
      case "date":
        return (
          <InputGroup key={fieldId} label="Date Range" className="md:col-span-4">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filters.date_from || ""}
                onChange={(e) => setters.setFilter("date_from", e.target.value || undefined)}
                className="form-input-base py-2 text-sm"
              />
              <input
                type="date"
                value={filters.date_to || ""}
                onChange={(e) => setters.setFilter("date_to", e.target.value || undefined)}
                className="form-input-base py-2 text-sm"
              />
            </div>
          </InputGroup>
        );
      default:
        return null;
    }
  };

  const panelClass = layout === "panel" ? "space-y-4" : "space-y-4";

  return (
    <div className={panelClass}>
      {sections.includes("primary") && primaryFields.length > 0 ? (
        <FilterBar className="md:grid-cols-12">
          {primaryFields.map((field) => renderField(field.id))}
        </FilterBar>
      ) : null}

      {sections.includes("advanced") && advancedFields.length > 0 ? (
        <div className="space-y-4">
          {advancedFields.some((f) => f.id === "tags") ? (
            <div className="rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest p-4">
              <TagInput
                label="Tags"
                value={filters.tags ?? []}
                onChange={setters.setTags}
                placeholder="e.g., Black"
                addButtonLabel="Add tag"
                description="Items must match every tag."
              />
            </div>
          ) : null}

          <FilterBar className="md:grid-cols-12">
            {advancedFields
              .filter((f) => f.id !== "tags" && f.id !== "bike_compatibility")
              .map((field) => renderField(field.id))}
          </FilterBar>

          {advancedFields.some((f) => f.id === "bike_compatibility") && bikeBrands.length > 0 ? (
            <div className="rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest p-4">
              <div className="mb-3">
                <p className="label-caps text-on-surface-variant">Compatible Bike</p>
                <p className="mt-1 text-xs text-on-surface-variant/80">
                  Filter by bike brand, model, and year.
                  {isCatalogModule ? " Universal items remain visible." : ""}
                </p>
              </div>
              <BikeCompatibilityFilter
                brands={bikeBrands}
                selectedBrandId={filters.bike_brand_id}
                selectedModel={filters.bike_model}
                selectedYear={filters.bike_year}
                isLoading={loading}
                onFilterChange={setters.setBikeCompatibility}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {sections.includes("more") && moreFields.length > 0 ? (
        <>
          {layout === "page" ? (
            <button
              type="button"
              onClick={toggleMore}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {showMore ? "Hide" : "Show"} more filters
            </button>
          ) : null}
          {(layout === "panel" || showMore) && (
            <FilterBar className="md:grid-cols-12">
              {moreFields.map((field) => renderField(field.id))}
            </FilterBar>
          )}
        </>
      ) : null}
    </div>
  );
}
