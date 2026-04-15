"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import {
  listBikes,
  listBikeBlueprints,
  createBike,
  updateBike,
  deleteBike,
  type BikeRecord,
  type CreateBikePayload,
  type BikeBlueprintRecord,
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
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use custom filter hook
  const { filters, page, setPage, getCleanFilters, setSearch, setStatus, setBlueprint, setPriceMin, setPriceMax, setCurrency, logFilters } = useEntityFilters();

  const loadBikes = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      console.log("[Bikes] Applying filters:", filters, "Page:", page);
      logFilters();

      const cleanFilters = getCleanFilters();
      const result = await listBikes(token, page, cleanFilters as any);
      setBikes(result.items);
      setTotalPages(result.lastPage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bikes");
    } finally {
      setLoading(false);
    }
  }, [page, filters, getCleanFilters, logFilters]);

  const loadBlueprints = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const result = await listBikeBlueprints(token, 1);
      setBlueprints(result.items);
    } catch (err) {
      console.error("Failed to load bike blueprints:", err);
    }
  };

  useEffect(() => {
    loadBlueprints();
  }, []);

  useEffect(() => {
    loadBikes();
  }, [loadBikes]);

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
        description="Manage the live showroom catalog with blueprint identity, mileage, pricing, and sale status in one operational view."
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
        <FilterBar>
          <InputGroup label="Search" className="md:col-span-4">
            <input
              type="text"
              placeholder="Search by model or VIN..."
              value={filters.search || ""}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input-base"
            />
          </InputGroup>
          <InputGroup label="Blueprint" className="md:col-span-4">
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
          <InputGroup label="Status" className="md:col-span-4">
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
          currency={filters.currency_pricing || "all"}
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
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">Blueprint</th>
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">VIN</th>
                  <th className="px-4 py-3 text-right font-semibold text-on-surface">Sale Price</th>
                  <th className="px-4 py-3 text-right font-semibold text-on-surface">Cost Price</th>
                  <th className="px-4 py-3 text-center font-semibold text-on-surface">
                    Mileage (km)
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">Discount</th>
                  <th className="px-4 py-3 text-right font-semibold text-on-surface">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bikes.map((bike) => (
                  <tr
                    key={bike.id}
                    className="border-b border-outline-variant/10 hover:bg-surface-container-low"
                  >
                    <td className="px-4 py-3 text-on-surface font-medium">
                      {getBlueprintLabel(bike.bike_blueprint_id)}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant font-mono text-xs">
                      {bike.vin}
                    </td>
                    <td className="px-4 py-3 text-right text-on-surface font-semibold">
                      {bike.sale_price} {bike.currency_pricing}
                    </td>
                    <td className="px-4 py-3 text-right text-on-surface-variant">
                      {bike.cost_price} {bike.currency_pricing}
                    </td>
                    <td className="px-4 py-3 text-center text-on-surface">
                      {bike.mileage.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(bike.status)}</td>
                    <td className="px-4 py-3 text-on-surface text-xs">
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
        onPrevious={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />
    </PageShell>
  );
}
