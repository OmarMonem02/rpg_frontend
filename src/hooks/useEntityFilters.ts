import { useState, useCallback } from "react";

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
};

export type FilterState = EntityFilters & {
  page: number;
};

export function useEntityFilters(initialFilters?: EntityFilters) {
  const [filters, setFilters] = useState<EntityFilters>(initialFilters || {});
  const [page, setPage] = useState(1);

  // Search filter
  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined }));
    setPage(1); // Reset to first page when filtering
  }, []);

  // Category filter
  const setCategory = useCallback((category_id: number | "") => {
    setFilters((prev) => ({ ...prev, category_id: category_id || undefined }));
    setPage(1);
  }, []);

  // Brand filter
  const setBrand = useCallback((brand_id: number | "") => {
    setFilters((prev) => ({ ...prev, brand_id: brand_id || undefined }));
    setPage(1);
  }, []);

  // Bike Blueprint filter
  const setBlueprint = useCallback((blueprint_id: number | "") => {
    setFilters((prev) => ({
      ...prev,
      blueprint_id: blueprint_id || undefined,
    }));
    setPage(1);
  }, []);

  // Spare-part compatibility (Bike Brand/Model/Year) filter
  const setBikeCompatibility = useCallback(
    (compat: { bike_brand_id?: number; bike_model?: string; bike_year?: number }) => {
      setFilters((prev) => ({
        ...prev,
        bike_brand_id: compat.bike_brand_id,
        bike_model: compat.bike_model,
        bike_year: compat.bike_year,
      }));
      setPage(1);
    },
    [],
  );

  // Maintenance Service Sector filter
  const setSector = useCallback((sector_id: number | "") => {
    setFilters((prev) => ({
      ...prev,
      sector_id: sector_id || undefined,
    }));
    setPage(1);
  }, []);

  // Price range filters
  const setPriceRange = useCallback(
    (min?: number, max?: number) => {
      setFilters((prev) => ({
        ...prev,
        price_min: min && min > 0 ? min : undefined,
        price_max: max && max > 0 ? max : undefined,
      }));
      setPage(1);
    },
    [],
  );

  const setPriceMin = useCallback((price_min: number | "") => {
    setFilters((prev) => ({
      ...prev,
      price_min: price_min && typeof price_min === "number" ? price_min : undefined,
    }));
    setPage(1);
  }, []);

  const setPriceMax = useCallback((price_max: number | "") => {
    setFilters((prev) => ({
      ...prev,
      price_max: price_max && typeof price_max === "number" ? price_max : undefined,
    }));
    setPage(1);
  }, []);

  // Currency filter
  const setCurrency = useCallback((currency: string) => {
    setFilters((prev) => ({
      ...prev,
      currency:
        currency && currency !== "all" ? currency : undefined,
    }));
    setPage(1);
  }, []);

  // Status filter
  const setStatus = useCallback((status: string) => {
    setFilters((prev) => ({ ...prev, status: status || undefined }));
    setPage(1);
  }, []);

  // Type filter
  const setType = useCallback((type: string) => {
    setFilters((prev) => ({ ...prev, type: type || undefined }));
    setPage(1);
  }, []);

  const setLowStock = useCallback((lowStock: boolean) => {
    setFilters((prev) => ({ ...prev, low_stock: lowStock ? true : undefined }));
    setPage(1);
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  // Get clean filter object for API with price_range transformation
  const getCleanFilters = useCallback((): Record<string, unknown> => {
    const cleaned: Record<string, unknown> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        cleaned[key] = value;
      }
    });

    // Transform price_min and price_max into price_range format if both exist
    if (cleaned.price_min || cleaned.price_max) {
      const min = cleaned.price_min || 0;
      const max = cleaned.price_max || 0;
      if (min || max) {
        cleaned.price_range = `${min}:${max}`;
      }
      delete cleaned.price_min;
      delete cleaned.price_max;
    }

    return cleaned;
  }, [filters]);

  // Log current filters (for debugging)
  const logFilters = useCallback(() => {
    console.log("[Filters] Current state:", filters);
    console.log("[Filters] Clean filters for API:", getCleanFilters());
    console.log("[Filters] Current page:", page);
  }, [filters, getCleanFilters, page]);

  return {
    // State
    filters,
    page,
    getCleanFilters,

    // Setters
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
    setPage,
    resetFilters,

    // Utilities
    logFilters,
  };
}
