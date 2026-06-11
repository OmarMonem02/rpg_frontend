"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import { getAuthToken } from "@/lib/auth-session";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useGlobalDataRefresh } from "@/hooks/useGlobalDataRefresh";
import { isPricingLoss } from "@/lib/catalog-pricing";
import { formatCatalogPriceInEGP, toPricingCurrency } from "@/lib/currencies";
import {
  listBikes,
  listBikeBlueprints,
  listBrands,
  deleteBike,
  patchBike,
  type BikeRecord,
  type BikeBlueprintRecord,
  type BrandRecord,
  type BikeQuickEditFields,
  fetchAllPages,
} from "@/lib/crud-api";
import {
  QuickEditActions,
  QuickEditInput,
  combineValidators,
  useQuickEditRow,
  validateNonNegativeIntegers,
  validateNonNegativeNumbers,
  type QuickEditDraft,
} from "@/components/inventory/quick-edit";
import {
  InventoryItemThumbnail,
  InventoryListTable,
  InventoryListTableBody,
  InventoryListTableElement,
  InventoryListTableError,
  InventoryListTableHead,
  InventoryListTableRow,
  InventoryListTableScroll,
  InventoryListTableTd,
  InventoryListTableTh,
  InventoryListTableToolbar,
  InventoryTableActionDivider,
  InventoryTableActionLink,
  InventoryTableSecondaryActions,
} from "@/components/inventory/list-table";
import { AdvancedFilters } from "@/components/advanced-filters";
import {
  ActionButton,
  EmptyState,
  FilterBar,
  InputGroup,
  PageHero,
  PageShell,
  PaginationControls,
  SearchableSelect,
  StatusBadge,
  SurfaceCard,
} from "@/components/ops-ui";

const STATUSES = [
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
  { value: "maintenance", label: "Under Maintenance" },
  { value: "reserved", label: "Reserved" },
];

const BIKE_QUICK_EDIT_KEYS = [
  "cost_price",
  "sale_price",
  "mileage",
] as const;

function parseBikeQuickEditChanges(changes: QuickEditDraft): BikeQuickEditFields {
  const payload: BikeQuickEditFields = {};
  if ("cost_price" in changes) payload.cost_price = Number(changes.cost_price);
  if ("sale_price" in changes) payload.sale_price = Number(changes.sale_price);
  if ("mileage" in changes) payload.mileage = Number(changes.mileage);
  return payload;
}

export default function BikesPage() {
  const router = useRouter();
  const permissions = usePermissions();
  const { rates } = useExchangeRates();
  const canUpdateBikes = permissions.canUpdate("bikes");
  const canDeleteBikes = permissions.canDelete("bikes");
  const [bikes, setBikes] = useState<BikeRecord[]>([]);
  const [blueprints, setBlueprints] = useState<BikeBlueprintRecord[]>([]);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use custom filter hook
  const { filters, page, setPage, getCleanFilters, setSearch, setStatus, setBlueprint, setBrand, setPriceMin, setPriceMax, setCurrency, logFilters } = useEntityFilters();

  const quickEdit = useQuickEditRow();
  const validateBikeQuickEdit = combineValidators(
    (draft) => validateNonNegativeNumbers(draft, ["cost_price", "sale_price"]),
    (draft) => validateNonNegativeIntegers(draft, ["mileage"]),
  );

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
      setBrands(brandsRes);
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

  const handleSaveBikeQuickEdit = async (bike: BikeRecord) => {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required");

    await quickEdit.saveEdit(
      [...BIKE_QUICK_EDIT_KEYS],
      validateBikeQuickEdit,
      async (changes) => {
        const updated = await patchBike(
          token,
          bike.id,
          parseBikeQuickEditChanges(changes),
        );
        setBikes((prev) =>
          prev.map((row) => (row.id === bike.id ? updated : row)),
        );
      },
    );
  };

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
            <SearchableSelect
              value={filters.blueprint_id || ""}
              onChange={(value) => setBlueprint(value ? parseInt(value) : "")}
              placeholder="All Blueprints"
              options={blueprints.map((b) => ({
                value: b.id,
                label: `${b.model} ${b.year}`,
              }))}
              className="form-input-base"
            />
          </InputGroup>
          <InputGroup label="Brand" className="md:col-span-3">
            <SearchableSelect
              value={filters.brand_id || ""}
              onChange={(value) => setBrand(value ? parseInt(value) : "")}
              placeholder="All Brands"
              options={brands.map((b) => ({
                value: b.id,
                label: b.name,
              }))}
              className="form-input-base"
            />
          </InputGroup>
          <InputGroup label="Status" className="md:col-span-3">
            <SearchableSelect
              value={filters.status || ""}
              onChange={setStatus}
              placeholder="All Statuses"
              options={STATUSES.map((s) => ({
                value: s.value,
                label: s.label,
              }))}
              className="form-input-base"
            />
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
          <InventoryListTable>
            <InventoryListTableToolbar label="Showroom listings" count={bikes.length} />
            <InventoryListTableScroll>
              <InventoryListTableElement minWidth="960px">
                <InventoryListTableHead>
                  <tr>
                    <InventoryListTableTh>Blueprint</InventoryListTableTh>
                    <InventoryListTableTh>VIN</InventoryListTableTh>
                    <InventoryListTableTh align="right">Sale Price</InventoryListTableTh>
                    <InventoryListTableTh align="right">Cost Price</InventoryListTableTh>
                    <InventoryListTableTh align="center">Mileage (km)</InventoryListTableTh>
                    <InventoryListTableTh>Status</InventoryListTableTh>
                    <InventoryListTableTh>Discount</InventoryListTableTh>
                    <InventoryListTableTh align="center">Actions</InventoryListTableTh>
                  </tr>
                </InventoryListTableHead>
                <InventoryListTableBody>
                {bikes.map((bike) => {
                  const editing = quickEdit.isEditing(bike.id);
                  return (
                    <InventoryListTableRow key={bike.id} editing={editing}>
                      <InventoryListTableTd variant="name">
                        <div className="flex items-center gap-3">
                          <InventoryItemThumbnail
                            image={bike.image}
                            name={getBlueprintLabel(bike.bike_blueprint_id)}
                          />
                          <span>{getBlueprintLabel(bike.bike_blueprint_id)}</span>
                        </div>
                      </InventoryListTableTd>
                      <InventoryListTableTd variant="mono">{bike.vin}</InventoryListTableTd>
                      <InventoryListTableTd align="right" variant="primary">
                        {editing ? (
                          <QuickEditInput
                            value={quickEdit.draft.sale_price ?? ""}
                            onChange={(value) =>
                              quickEdit.updateField("sale_price", value)
                            }
                            type="number"
                            min={0}
                            step="any"
                            align="right"
                            aria-label="Sale price"
                          />
                        ) : (
                          <span className="inline-flex items-center justify-end gap-2">
                            {formatCatalogPriceInEGP(
                              bike.sale_price,
                              toPricingCurrency(
                                bike.sale_currency ?? bike.currency_pricing,
                              ),
                              rates,
                            )}
                            {rates &&
                            isPricingLoss(
                              {
                                cost_price: bike.cost_price,
                                cost_currency: toPricingCurrency(
                                  bike.cost_currency ?? bike.currency_pricing,
                                ),
                                sale_price: bike.sale_price,
                                sale_currency: toPricingCurrency(
                                  bike.sale_currency ?? bike.currency_pricing,
                                ),
                              },
                              rates,
                            ) ? (
                              <span className="rounded-full bg-error/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-error">
                                Loss
                              </span>
                            ) : null}
                          </span>
                        )}
                      </InventoryListTableTd>
                      <InventoryListTableTd align="right" variant="mono">
                        {editing ? (
                          <QuickEditInput
                            value={quickEdit.draft.cost_price ?? ""}
                            onChange={(value) =>
                              quickEdit.updateField("cost_price", value)
                            }
                            type="number"
                            min={0}
                            step="any"
                            align="right"
                            aria-label="Cost price"
                          />
                        ) : (
                          formatCatalogPriceInEGP(
                            bike.cost_price,
                            toPricingCurrency(
                              bike.cost_currency ?? bike.currency_pricing,
                            ),
                            rates,
                          )
                        )}
                      </InventoryListTableTd>
                      <InventoryListTableTd align="center" variant="mono">
                        {editing ? (
                          <QuickEditInput
                            value={quickEdit.draft.mileage ?? ""}
                            onChange={(value) =>
                              quickEdit.updateField("mileage", value)
                            }
                            type="number"
                            min={0}
                            step={1}
                            align="center"
                            aria-label="Mileage"
                          />
                        ) : (
                          bike.mileage.toLocaleString()
                        )}
                      </InventoryListTableTd>
                      <InventoryListTableTd>{getStatusBadge(bike.status)}</InventoryListTableTd>
                      <InventoryListTableTd variant="muted">
                        {bike.max_discount_type === "percentage"
                          ? `${bike.max_discount_value}%`
                          : formatCatalogPriceInEGP(
                              bike.max_discount_value,
                              toPricingCurrency(bike.currency_pricing),
                              rates,
                            )}
                      </InventoryListTableTd>
                      <InventoryListTableTd align="right" className="whitespace-nowrap">
                        <QuickEditActions
                          isEditing={editing}
                          saving={quickEdit.saving}
                          canSave={quickEdit.hasChanges([...BIKE_QUICK_EDIT_KEYS])}
                          showQuickEdit={canUpdateBikes}
                          onStartEdit={() =>
                            quickEdit.startEdit(bike.id, {
                              cost_price: bike.cost_price,
                              sale_price: bike.sale_price,
                              mileage: bike.mileage,
                            })
                          }
                          onSave={() => handleSaveBikeQuickEdit(bike)}
                          onCancel={quickEdit.cancelEdit}
                        >
                          <InventoryTableSecondaryActions>
                            <InventoryTableActionLink
                              onClick={() =>
                                router.push(`/inventory/bikes/edit/${bike.id}`)
                              }
                              hidden={!canUpdateBikes}
                            >
                              Edit
                            </InventoryTableActionLink>
                            <InventoryTableActionDivider />
                            <InventoryTableActionLink
                              tone="danger"
                              onClick={() => handleDelete(bike.id)}
                              hidden={!canDeleteBikes}
                            >
                              Delete
                            </InventoryTableActionLink>
                          </InventoryTableSecondaryActions>
                        </QuickEditActions>
                        {editing && quickEdit.rowError ? (
                          <InventoryListTableError message={quickEdit.rowError} />
                        ) : null}
                      </InventoryListTableTd>
                    </InventoryListTableRow>
                  );
                })}
                </InventoryListTableBody>
              </InventoryListTableElement>
            </InventoryListTableScroll>
          </InventoryListTable>
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
