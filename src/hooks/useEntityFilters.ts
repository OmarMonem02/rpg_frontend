import { useState, useCallback } from "react";
import type { InventoryModuleId } from "@/lib/inventory-filter-config";

export type EntityFilters = {
  search?: string;
  category_id?: number;
  brand_id?: number;
  blueprint_id?: number;
  sector_id?: number;
  price_min?: number;
  price_max?: number;
  currency?: string;
  status?: string;
  type?: string;
  low_stock?: boolean;
  bike_brand_id?: number;
  bike_model?: string;
  bike_year?: number;
  tags?: string[];
  cost_price_min?: number;
  cost_price_max?: number;
  stock_min?: number;
  stock_max?: number;
  item_status?: string;
  size?: string;
  color?: string;
  universal?: boolean | "";
  max_discount_min?: number;
  max_discount_max?: number;
  profit_min?: number;
  profit_max?: number;
  profit_percent_min?: number;
  profit_percent_max?: number;
  mileage_min?: number;
  mileage_max?: number;
  created_from?: string;
  created_to?: string;
  have_commission?: boolean;
  stock_alert_level?: string;
  customer_id?: number;
  customer_name?: string;
  payment_method_id?: number;
  is_maintenance?: boolean;
  sale_type?: string;
  date_from?: string;
  date_to?: string;
  total_min?: number;
  total_max?: number;
  item_type?: string;
  delivery_status?: string;
  has_unstored_items?: boolean;
};

export type FilterState = EntityFilters & {
  page: number;
};

function appendRange(
  cleaned: Record<string, unknown>,
  minKey: string,
  maxKey: string,
  rangeKey: string,
  min?: number,
  max?: number,
) {
  const minVal = min ?? 0;
  const maxVal = max ?? 0;
  if (min !== undefined || max !== undefined) {
    if (minVal || maxVal) {
      cleaned[rangeKey] = `${minVal}:${maxVal}`;
    }
  }
  delete cleaned[minKey];
  delete cleaned[maxKey];
}

function buildApiParams(
  filters: EntityFilters,
  module?: InventoryModuleId,
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      cleaned[key] = value;
    }
  });

  appendRange(cleaned, "price_min", "price_max", "price_range", filters.price_min, filters.price_max);
  appendRange(
    cleaned,
    "cost_price_min",
    "cost_price_max",
    "cost_price_range",
    filters.cost_price_min,
    filters.cost_price_max,
  );

  if (Array.isArray(cleaned.tags)) {
    const tags = cleaned.tags.filter(
      (tag): tag is string => typeof tag === "string" && tag.trim() !== "",
    );
    if (tags.length > 0) {
      cleaned.tags = tags;
    } else {
      delete cleaned.tags;
    }
  }

  if (cleaned.currency === "all") delete cleaned.currency;
  if (cleaned.universal === "") delete cleaned.universal;
  if (cleaned.stock_alert_level === "all") delete cleaned.stock_alert_level;
  if (!cleaned.have_commission) delete cleaned.have_commission;
  if (!cleaned.low_stock) delete cleaned.low_stock;
  if (!cleaned.is_maintenance) delete cleaned.is_maintenance;

  if (module === "sales" || module === "delivery_orders") {
    if (filters.sale_type) {
      cleaned.type = filters.sale_type;
      delete cleaned.sale_type;
    }
    if (module === "delivery_orders") {
      cleaned.remote_only = true;
    }
  }

  return cleaned;
}

export function useEntityFilters(initialFilters?: EntityFilters) {
  const [filters, setFilters] = useState<EntityFilters>(initialFilters || {});
  const [page, setPage] = useState(1);

  const updateFilters = useCallback((patch: Partial<EntityFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          delete next[key as keyof EntityFilters];
        }
      });
      return next;
    });
    setPage(1);
  }, []);

  const setSearch = useCallback((search: string) => {
    updateFilters({ search: search || undefined });
  }, [updateFilters]);

  const setCategory = useCallback((category_id: number | "") => {
    updateFilters({ category_id: category_id || undefined });
  }, [updateFilters]);

  const setBrand = useCallback((brand_id: number | "") => {
    updateFilters({ brand_id: brand_id || undefined });
  }, [updateFilters]);

  const setBlueprint = useCallback((blueprint_id: number | "") => {
    updateFilters({ blueprint_id: blueprint_id || undefined });
  }, [updateFilters]);

  const setBikeCompatibility = useCallback(
    (compat: { bike_brand_id?: number; bike_model?: string; bike_year?: number }) => {
      updateFilters({
        bike_brand_id: compat.bike_brand_id,
        bike_model: compat.bike_model,
        bike_year: compat.bike_year,
      });
    },
    [updateFilters],
  );

  const setSector = useCallback((sector_id: number | "") => {
    updateFilters({ sector_id: sector_id || undefined });
  }, [updateFilters]);

  const setPriceRange = useCallback(
    (min?: number, max?: number) => {
      updateFilters({
        price_min: min && min > 0 ? min : undefined,
        price_max: max && max > 0 ? max : undefined,
      });
    },
    [updateFilters],
  );

  const setPriceMin = useCallback((price_min: number | "") => {
    updateFilters({
      price_min: price_min && typeof price_min === "number" ? price_min : undefined,
    });
  }, [updateFilters]);

  const setPriceMax = useCallback((price_max: number | "") => {
    updateFilters({
      price_max: price_max && typeof price_max === "number" ? price_max : undefined,
    });
  }, [updateFilters]);

  const setCurrency = useCallback((currency: string) => {
    updateFilters({
      currency: currency && currency !== "all" ? currency : undefined,
    });
  }, [updateFilters]);

  const setStatus = useCallback((status: string) => {
    updateFilters({ status: status || undefined });
  }, [updateFilters]);

  const setType = useCallback((type: string) => {
    updateFilters({ type: type || undefined });
  }, [updateFilters]);

  const setLowStock = useCallback((lowStock: boolean) => {
    updateFilters({ low_stock: lowStock ? true : undefined });
  }, [updateFilters]);

  const setTags = useCallback((tags: string[]) => {
    updateFilters({ tags: tags.length > 0 ? tags : undefined });
  }, [updateFilters]);

  const setFilter = useCallback(
    <K extends keyof EntityFilters>(key: K, value: EntityFilters[K]) => {
      updateFilters({ [key]: value } as Partial<EntityFilters>);
    },
    [updateFilters],
  );

  const resetFilters = useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  const getCleanFilters = useCallback((): Record<string, unknown> => {
    return buildApiParams(filters);
  }, [filters]);

  const getModuleApiParams = useCallback(
    (module: InventoryModuleId): Record<string, unknown> => {
      return buildApiParams(filters, module);
    },
    [filters],
  );

  const logFilters = useCallback(() => {
    console.log("[Filters] Current state:", filters);
    console.log("[Filters] Clean filters for API:", getCleanFilters());
    console.log("[Filters] Current page:", page);
  }, [filters, getCleanFilters, page]);

  return {
    filters,
    page,
    getCleanFilters,
    getModuleApiParams,
    setSearch,
    setCategory,
    setBrand,
    setBlueprint,
    setBikeCompatibility,
    setSector,
    setPriceRange,
    setPriceMin,
    setPriceMax,
    setCurrency,
    setStatus,
    setType,
    setLowStock,
    setTags,
    setFilter,
    setPage,
    resetFilters,
    logFilters,
  };
}

// Alias for plan compatibility
export const useModuleFilters = useEntityFilters;
