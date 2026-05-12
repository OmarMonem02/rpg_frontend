"use client";

import { useMemo } from "react";
import type { BrandRecord } from "@/lib/crud-api";
import { useGetBikeModels, useGetBikeYears } from "@/hooks/api/useSpareParts";

interface BikeCompatibilityFilterProps {
  brands: BrandRecord[];
  onFilterChange: (filters: {
    bike_brand_id?: number;
    bike_model?: string;
    bike_year?: number;
  }) => void;
  selectedBrandId?: number;
  selectedModel?: string;
  selectedYear?: number;
  isLoading?: boolean;
}

export function BikeCompatibilityFilter({
  brands,
  onFilterChange,
  selectedBrandId,
  selectedModel,
  selectedYear,
  isLoading = false,
}: BikeCompatibilityFilterProps) {
  const bikeBrands = useMemo(
    () => brands.filter((b) => b.type === "bikes"),
    [brands],
  );

  const { data: models, isLoading: modelsLoading } = useGetBikeModels(selectedBrandId);
  const { data: years, isLoading: yearsLoading } = useGetBikeYears(selectedBrandId, selectedModel);

  const handleBrandChange = (brandId: string) => {
    const id = brandId ? Number(brandId) : undefined;
    onFilterChange({
      bike_brand_id: id,
      bike_model: undefined,
      bike_year: undefined,
    });
  };

  const handleModelChange = (model: string) => {
    onFilterChange({
      bike_brand_id: selectedBrandId,
      bike_model: model || undefined,
      bike_year: undefined,
    });
  };

  const handleYearChange = (year: string) => {
    onFilterChange({
      bike_brand_id: selectedBrandId,
      bike_model: selectedModel,
      bike_year: year ? Number(year) : undefined,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <label htmlFor="bike-brand" className="block text-sm font-medium text-foreground">
          Bike Brand
        </label>
        <select
          id="bike-brand"
          value={selectedBrandId || ""}
          onChange={(e) => handleBrandChange(e.target.value)}
          disabled={isLoading}
          className="mt-1 w-full rounded border border-outline bg-surface px-3 py-2 text-sm text-foreground disabled:opacity-50"
        >
          <option value="">Select a brand</option>
          {bikeBrands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="bike-model" className="block text-sm font-medium text-foreground">
          Model
        </label>
        <select
          id="bike-model"
          value={selectedModel || ""}
          onChange={(e) => handleModelChange(e.target.value)}
          disabled={!selectedBrandId || modelsLoading || isLoading}
          className="mt-1 w-full rounded border border-outline bg-surface px-3 py-2 text-sm text-foreground disabled:opacity-50"
        >
          <option value="">Select a model</option>
          {models?.map((model: { value: string; label: string }) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="bike-year" className="block text-sm font-medium text-foreground">
          Year
        </label>
        <select
          id="bike-year"
          value={selectedYear || ""}
          onChange={(e) => handleYearChange(e.target.value)}
          disabled={!selectedBrandId || !selectedModel || yearsLoading || isLoading}
          className="mt-1 w-full rounded border border-outline bg-surface px-3 py-2 text-sm text-foreground disabled:opacity-50"
        >
          <option value="">Select a year</option>
          {years?.map((year: { value: number; label: string }) => (
            <option key={year.value} value={year.value}>
              {year.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
