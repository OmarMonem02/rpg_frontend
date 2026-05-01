"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { usePermissions } from "@/components/permission-provider";
import { getAuthToken } from "@/lib/auth-session";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import {
  listBikeBlueprints,
  listBrands,
  deleteBikeBlueprint,
  type BikeBlueprintRecord,
  type BrandRecord,
  fetchAllPages,
} from "@/lib/crud-api";
import { AdvancedFilters } from "@/components/advanced-filters";
import {
  ActionButton,
  EmptyState,
  FilterBar,
  InputGroup,
  PageHero,
  PageShell,
  PaginationControls,
  SurfaceCard,
} from "@/components/ops-ui";

type BikeBlueprintFilters = {
  search?: string;
  brand_id?: number;
  price_range?: string;
  currency?: string;
};

export default function BikeBlueprintsPage() {
  const router = useRouter();
  const permissions = usePermissions();
  const [blueprints, setBlueprints] = useState<BikeBlueprintRecord[]>([]);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canCreateBlueprints = permissions.canCreate("bike-blueprints");
  const canUpdateBlueprints = permissions.canUpdate("bike-blueprints");
  const canDeleteBlueprints = permissions.canDelete("bike-blueprints");

  // Use custom filter hook
  const { filters, page, setPage, getCleanFilters, setSearch, setBrand, setPriceMin, setPriceMax, setCurrency, logFilters } = useEntityFilters();

  const loadBlueprints = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      console.log("[BikeBlueprintsPage] Applying filters:", filters, "Page:", page);
      logFilters();

      const cleanFilters = getCleanFilters() as BikeBlueprintFilters;
      const result = await listBikeBlueprints(token, page, cleanFilters);
      setBlueprints(result.items);
      setTotalPages(result.lastPage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load blueprints");
    } finally {
      setLoading(false);
    }
  }, [getCleanFilters, logFilters, page, filters]);

  const loadBrands = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await fetchAllPages((p) => listBrands(token, p, "bikes"));
      setBrands(result.filter((b) => b.type === "bikes"));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  useEffect(() => {
    loadBlueprints();
  }, [loadBlueprints]);

  const handleDelete = async (id: number) => {
    if (!canDeleteBlueprints) {
      setError("You do not have permission to delete bike blueprints.");
      return;
    }
    if (!confirm("Are you sure you want to delete this blueprint?")) return;

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await deleteBikeBlueprint(token, id);
      await loadBlueprints();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete blueprint");
    }
  };

  const getBrandName = (brandId: number): string => {
    return brands.find((b) => b.id === brandId)?.name || "Unknown";
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="Master Data"
        title="Bike Blueprints"
        description="Define models and years, then jump directly into linked spare-parts management for each blueprint."
        actions={
          canCreateBlueprints ? (
            <ActionButton
              tone="primary"
              onClick={() => router.push("/data/bike-blueprints/create")}
            >
              Add Blueprint
            </ActionButton>
          ) : null
        }
      />

      {error && <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error">{error}</div>}

      <SurfaceCard>
        <FilterBar className="md:grid-cols-12">
          <InputGroup label="Search by model" className="md:col-span-6">
            <input
              type="text"
              placeholder="Search by model..."
              value={filters.search || ""}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input-base"
            />
          </InputGroup>
          <InputGroup label="Brand" className="md:col-span-6">
            <select
              value={filters.brand_id || ""}
              onChange={(e) => setBrand(e.target.value ? parseInt(e.target.value) : "")}
              className="form-input-base"
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </InputGroup>
        </FilterBar>

        <AdvancedFilters
          priceMin={filters.price_min}
          setPriceMin={setPriceMin}
          priceMax={filters.price_max}
          setPriceMax={setPriceMax}
          currency={filters.currency || "all"}
          setCurrency={setCurrency}
          showPriceFilters={true}
          showCurrencyFilter={true}
        />

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"></div>
          </div>
        ) : blueprints.length === 0 ? (
          <EmptyState
          title="No blueprints found"
          description="Create the first bike blueprint so parts and bikes can be grouped around a proper model definition."
          action={
              canCreateBlueprints ? (
                <ActionButton
                  tone="primary"
                  onClick={() => router.push("/data/bike-blueprints/create")}
                >
                  Create Blueprint
                </ActionButton>
              ) : undefined
          }
        />
        ) : (
          <div className="overflow-x-auto rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">Brand</th>
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">Model</th>
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">Year</th>
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">Created</th>
                  <th className="px-4 py-3 text-right font-semibold text-on-surface">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blueprints.map((blueprint) => (
                  <tr key={blueprint.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low">
                    <td className="px-4 py-3 text-on-surface">{getBrandName(blueprint.brand_id)}</td>
                    <td className="px-4 py-3 text-on-surface">{blueprint.model}</td>
                    <td className="px-4 py-3 text-on-surface">{blueprint.year}</td>
                    <td className="px-4 py-3 text-on-surface-variant text-xs">
                      {blueprint.created_at ? new Date(blueprint.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canUpdateBlueprints && (
                        <ActionButton
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/data/bike-blueprints/${blueprint.id}/spare-parts`)}
                          className="text-primary"
                        >
                          Manage Parts
                        </ActionButton>
                      )}
                      {canUpdateBlueprints && canDeleteBlueprints && (
                        <span className="mx-2 text-on-surface-variant">•</span>
                      )}
                      {canUpdateBlueprints && (
                        <button
                          onClick={() => router.push(`/data/bike-blueprints/edit/${blueprint.id}`)}
                          className="text-primary hover:underline text-xs font-medium"
                        >
                          Edit
                        </button>
                      )}
                      {(canUpdateBlueprints || canDeleteBlueprints) && canDeleteBlueprints && canUpdateBlueprints && (
                        <span className="mx-2 text-on-surface-variant">•</span>
                      )}
                      {canDeleteBlueprints && (
                        <button
                          onClick={() => handleDelete(blueprint.id)}
                          className="text-error hover:underline text-xs font-medium"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SurfaceCard>

      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPrevious={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />
    </PageShell>
  );
}
