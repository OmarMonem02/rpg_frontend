"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import { useGlobalDataRefresh } from "@/hooks/useGlobalDataRefresh";
import {
  listBikes,
  listBikeBlueprints,
  listBrands,
  deleteBike,
  type BikeRecord,
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
  StatusBadge,
  SurfaceCard,
} from "@/components/ops-ui";

const STATUSES = [
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
  { value: "maintenance", label: "Under Maintenance" },
  { value: "reserved", label: "Reserved" },
];

export default function BikesPage() {
  const router = useRouter();
  const [bikes, setBikes] = useState<BikeRecord[]>([]);
  const [blueprints, setBlueprints] = useState<BikeBlueprintRecord[]>([]);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use custom filter hook
  const { filters, page, setPage, getCleanFilters, setSearch, setStatus, setBlueprint, setBrand, setPriceMin, setPriceMax, setCurrency, logFilters } = useEntityFilters();

  const loadBikes = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      console.log("[Bikes] Applying filters:", filters, "Page:", page);
      logFilters();

      const cleanFilters = getCleanFilters();
      const result = await listBikes(token, page, cleanFilters as Parameters<typeof listBikes>[2]);
      setBikes(result.items);
      setTotalPages(result.lastPage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bikes");
    } finally {
      setLoading(false);
    }
  }, [page, filters, getCleanFilters, logFilters]);

  const loadBlueprints = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const [bpRes, brandsRes] = await Promise.all([
        fetchAllPages((p) => listBikeBlueprints(token, p, {})),
        fetchAllPages((p) => listBrands(token, p, { type: "bikes" })),
      ]);
      setBlueprints(bpRes);
      setBrands(brandsRes.filter((b) => b.type === "bikes"));
    } catch (err) {
      console.error("Failed to load blueprints or brands:", err);
    }
  }, []);

  useEffect(() => {
    loadBlueprints();
  }, [loadBlueprints]);

  useEffect(() => {
    loadBikes();
  }, [loadBikes]);

  useGlobalDataRefresh(loadBikes);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this bike?")) return;

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await deleteBike(token, id);
      await loadBikes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete bike");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, "success" | "default" | "warning" | "primary"> = {
      available: "success",
      sold: "default",
      maintenance: "warning",
      reserved: "primary",
    };
    return (
      <StatusBadge tone={statusConfig[status] || "success"}>
        {STATUSES.find((s) => s.value === status)?.label || status}
      </StatusBadge>
    );
  };

  const getBlueprintLabel = (id: number) => {
    const blueprint = blueprints.find((b) => b.id === id);
    return blueprint ? `${blueprint.model} ${blueprint.year}` : `Blueprint #${id}`;
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="Showroom Inventory"
        title="Bikes For Sale"
        actions={
          <ActionButton tone="primary" onClick={() => router.push("/inventory/bikes/create")}>
            Add Bike
          </ActionButton>
        }
      />

      {error && (
        <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error">
          {error}
        </div>
      )}

      <SurfaceCard>
        <FilterBar className="md:grid-cols-12">
          <InputGroup label="Search" className="md:col-span-3">
            <input
              type="text"
              placeholder="Search by model or VIN..."
              value={filters.search || ""}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input-base"
            />
          </InputGroup>
          <InputGroup label="Blueprint" className="md:col-span-3">
            <select
              value={filters.blueprint_id || ""}
              onChange={(e) => setBlueprint(e.target.value ? parseInt(e.target.value) : "")}
              className="form-input-base"
            >
              <option value="">All Blueprints</option>
              {blueprints.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.model} {b.year}
                </option>
              ))}
            </select>
          </InputGroup>
          <InputGroup label="Brand" className="md:col-span-3">
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
          <InputGroup label="Status" className="md:col-span-3">
            <select
              value={filters.status || ""}
              onChange={(e) => setStatus(e.target.value)}
              className="form-input-base"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
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
        ) : bikes.length === 0 ? (
          <EmptyState
            title="No bikes found"
            description="Create your first showroom bike entry to start tracking listings, pricing, and status."
            action={
              <ActionButton tone="primary" onClick={() => router.push("/inventory/bikes/create")}>
                Create Bike
              </ActionButton>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                  <th className="label-caps px-4 py-3 text-left">Blueprint</th>
                  <th className="label-caps px-4 py-3 text-left">VIN</th>
                  <th className="label-caps px-4 py-3 text-right">Sale Price</th>
                  <th className="label-caps px-4 py-3 text-right">Cost Price</th>
                  <th className="label-caps px-4 py-3 text-center">
                    Mileage (km)
                  </th>
                  <th className="label-caps px-4 py-3 text-left">Status</th>
                  <th className="label-caps px-4 py-3 text-left">Discount</th>
                  <th className="label-caps px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bikes.map((bike) => (
                  <tr
                    key={bike.id}
                    className="data-row"
                  >
                    <td className="px-4 py-3 text-on-surface font-medium">
                      <div className="flex items-center gap-3">
                        {bike.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={bike.image}
                            alt=""
                            className="h-10 w-10 flex-none rounded-xl object-cover"
                          />
                        ) : null}
                        <span>{getBlueprintLabel(bike.bike_blueprint_id)}</span>
                      </div>
                    </td>
                    <td className="mono-data px-4 py-3 text-xs text-on-surface-variant">
                      {bike.vin}
                    </td>
                    <td className="mono-data px-4 py-3 text-right font-semibold text-primary">
                      {bike.sale_price} {bike.currency_pricing}
                    </td>
                    <td className="mono-data px-4 py-3 text-right text-on-surface-variant">
                      {bike.cost_price} {bike.currency_pricing}
                    </td>
                    <td className="mono-data px-4 py-3 text-center text-on-surface">
                      {bike.mileage.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(bike.status)}</td>
                    <td className="mono-data px-4 py-3 text-on-surface text-xs">
                      {bike.max_discount_value}
                      {bike.max_discount_type === "percentage" ? "%" : " " + bike.currency_pricing}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => router.push(`/inventory/bikes/edit/${bike.id}`)}
                        className="text-primary hover:underline text-xs font-medium"
                      >
                        Edit
                      </button>
                      <span className="mx-2 text-on-surface-variant">•</span>
                      <button
                        onClick={() => handleDelete(bike.id)}
                        className="text-error hover:underline text-xs font-medium"
                      >
                        Delete
                      </button>
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
        onPageChange={setPage}
        onPrevious={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />
    </PageShell>
  );
}
