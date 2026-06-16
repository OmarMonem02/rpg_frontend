"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import { fetchAllPages } from "@/lib/api/core";
import { listBrands, type BrandRecord } from "@/lib/crud-api";
import {
  listBikeBlueprints,
  type BikeBlueprintRecord,
} from "@/lib/api/bikes";
import { BikeCompatibilityFilter } from "@/components/BikeCompatibilityFilter";
import { InputGroup } from "@/components/ops-ui";

type BlueprintFilters = {
  bike_brand_id?: number;
  bike_model?: string;
  bike_year?: number;
};

export function CustomerBikeBlueprintPicker({
  selectedBlueprint,
  onSelectBlueprint,
  onError,
  loading,
}: {
  selectedBlueprint: BikeBlueprintRecord | null;
  onSelectBlueprint: (bp: BikeBlueprintRecord | null) => void;
  onError: (message: string) => void;
  loading: boolean;
}) {
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [filters, setFilters] = useState<BlueprintFilters>({});

  useEffect(() => {
    let cancelled = false;

    const loadBrands = async () => {
      try {
        setBrandsLoading(true);
        const token = getAuthToken();
        if (!token) return;
        const result = await fetchAllPages((page) =>
          listBrands(token, page, { type: "bikes" }),
        );
        if (!cancelled) {
          setBrands(result);
        }
      } catch {
        if (!cancelled) {
          setBrands([]);
        }
      } finally {
        if (!cancelled) {
          setBrandsLoading(false);
        }
      }
    };

    void loadBrands();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const brandId = filters.bike_brand_id;
    const model = filters.bike_model?.trim();
    const year = filters.bike_year;

    if (!brandId || !model || !year) {
      onSelectBlueprint(null);
      return;
    }

    let cancelled = false;

    const resolveBlueprint = async () => {
      try {
        setResolving(true);
        onError("");
        const token = getAuthToken();
        if (!token) throw new Error("Authentication required");

        const res = await listBikeBlueprints(token, 1, {
          brand_id: brandId,
          model,
          year,
        });

        if (cancelled) return;

        const match = res.items[0] ?? null;
        onSelectBlueprint(match);
        if (!match) {
          onError("No bike model found for this selection.");
        }
      } catch (err: unknown) {
        if (cancelled) return;
        onSelectBlueprint(null);
        onError(
          err instanceof Error ? err.message : "Failed to load bike model",
        );
      } finally {
        if (!cancelled) {
          setResolving(false);
        }
      }
    };

    void resolveBlueprint();

    return () => {
      cancelled = true;
    };
  }, [
    filters.bike_brand_id,
    filters.bike_model,
    filters.bike_year,
    onError,
    onSelectBlueprint,
  ]);

  const handleFilterChange = (next: BlueprintFilters) => {
    setFilters(next);
    onSelectBlueprint(null);
  };

  const brandName =
    brands.find((brand) => brand.id === filters.bike_brand_id)?.name ?? "";

  return (
    <InputGroup label="Select model (blueprint)">
      <p className="mb-3 text-xs text-on-surface-variant">
        Choose brand, model, and year to register the bike.
      </p>

      <BikeCompatibilityFilter
        brands={brands}
        selectedBrandId={filters.bike_brand_id}
        selectedModel={filters.bike_model}
        selectedYear={filters.bike_year}
        onFilterChange={handleFilterChange}
        isLoading={loading || brandsLoading || resolving}
      />

      {selectedBlueprint ? (
        <p className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
          {brandName || selectedBlueprint.brand?.name}{" "}
          {selectedBlueprint.model} ({selectedBlueprint.year})
        </p>
      ) : null}
    </InputGroup>
  );
}
