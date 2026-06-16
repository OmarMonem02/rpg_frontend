"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import { getAuthToken } from "@/lib/auth-session";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useGlobalDataRefresh } from "@/hooks/useGlobalDataRefresh";
import {
  pricingRecordFromItem,
  resolveMarginQuickEditPricing,
  type SaleMarginType,
  type SalePriceQuickEditStrategy,
} from "@/lib/catalog-pricing";
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
  QuickEditPriceInput,
  QuickEditSalePriceCell,
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
import { useTableColumns, type TableColumnDef } from "@/hooks/useTableColumns";
import { ColumnPicker } from "@/components/inventory/ColumnPicker";
import { useTablePageSize } from "@/hooks/useTablePageSize";
import { PageSizeSelect } from "@/components/inventory/PageSizeSelect";

type BikesColumnId =
  | "blueprint" | "vin" | "sale_price" | "cost_price"
  | "mileage" | "status" | "discount" | "actions";

const BIKES_COLUMNS: readonly TableColumnDef<BikesColumnId>[] = [
  { id: "blueprint", label: "Blueprint" },
  { id: "vin", label: "VIN" },
  { id: "sale_price", label: "Sale Price" },
  { id: "cost_price", label: "Cost Price" },
  { id: "mileage", label: "Mileage (km)" },
  { id: "status", label: "Status" },
  { id: "discount", label: "Discount" },
  { id: "actions", label: "Actions", required: true },
];

const STATUSES = [
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
  { value: "maintenance", label: "Under Maintenance" },
  { value: "reserved", label: "Reserved" },
];

const BIKE_QUICK_EDIT_KEYS = [
  "cost_price",
  "sale_price",
  "sale_margin_type",
  "sale_margin_value",
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

  const { isVisible, toggle: toggleColumn, reset: resetColumns, visible: visibleColumns } = useTableColumns(
    "table-cols:bikes-catalog",
    BIKES_COLUMNS,
  );

  const { pageSize, setPageSize, apiPerPage, isShowAll } = useTablePageSize(
    "table-page-size:bikes-catalog",
  );

  const quickEdit = useQuickEditRow();
  const validateBikeQuickEdit = combineValidators(
    (draft) =>
      validateNonNegativeNumbers(draft, [
        "cost_price",
        "sale_price",
        "sale_margin_value",
      ]),
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
      const result = await listBikes(token, page, { ...(cleanFilters as Parameters<typeof listBikes>[2]), per_page: apiPerPage });
      setBikes(result.items);
      setTotalPages(result.lastPage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bikes");
    } finally {
      setLoading(false);
    }
  }, [page, filters, getCleanFilters, logFilters, apiPerPage]);

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
        let payload = parseBikeQuickEditChanges(changes);

        const marginPricingTouched =
          "sale_price" in changes ||
          "sale_margin_type" in changes ||
          "sale_margin_value" in changes;

        if (marginPricingTouched) {
          const strategy = (quickEdit.draft.sale_price_strategy ===
          "switch_manual"
            ? "switch_manual"
            : "adjust_margin") as SalePriceQuickEditStrategy;
          const draftMarginType = (
            quickEdit.draft.sale_margin_type === "fixed"
              ? "fixed"
              : "percentage"
          ) as SaleMarginType;
          const pricingResult = resolveMarginQuickEditPricing(
            pricingRecordFromItem(bike),
            {
              cost_price: payload.cost_price ?? bike.cost_price,
              sale_price: "sale_price" in changes
                ? (payload.sale_price ??
                    Number(quickEdit.draft.sale_price)) ||
                  bike.sale_price
                : undefined,
              sale_margin_type: draftMarginType,
              sale_margin_value: "sale_margin_value" in changes
                ? Number(quickEdit.draft.sale_margin_value) || 0
                : undefined,
            },
            rates ?? { usdToEgp: 1, eurToEgp: 1 },
            strategy,
          );
          if (!pricingResult.ok) {
            throw new Error(pricingResult.error);
          }
          payload = { ...payload, ...pricingResult.fields };
        }

        const updated = await patchBike(token, bike.id, payload);
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
            <InventoryListTableToolbar label="Showroom listings" count={bikes.length}>
              <PageSizeSelect
                value={pageSize}
                onChange={(size) => { setPageSize(size); setPage(1); }}
              />
              <ColumnPicker
                columns={BIKES_COLUMNS}
                visible={visibleColumns}
                onToggle={toggleColumn}
                onReset={resetColumns}
              />
            </InventoryListTableToolbar>
            <InventoryListTableScroll>
              <InventoryListTableElement minWidth="960px">
                <InventoryListTableHead>
                  <tr>
                    {isVisible("blueprint") && <InventoryListTableTh>Blueprint</InventoryListTableTh>}
                    {isVisible("vin") && <InventoryListTableTh>VIN</InventoryListTableTh>}
                    {isVisible("sale_price") && <InventoryListTableTh align="right">Sale Price</InventoryListTableTh>}
                    {isVisible("cost_price") && <InventoryListTableTh align="right">Cost Price</InventoryListTableTh>}
                    {isVisible("mileage") && <InventoryListTableTh align="center">Mileage (km)</InventoryListTableTh>}
                    {isVisible("status") && <InventoryListTableTh>Status</InventoryListTableTh>}
                    {isVisible("discount") && <InventoryListTableTh>Discount</InventoryListTableTh>}
                    <InventoryListTableTh align="center">Actions</InventoryListTableTh>
                  </tr>
                </InventoryListTableHead>
                <InventoryListTableBody>
                {bikes.map((bike) => {
                  const editing = quickEdit.isEditing(bike.id);
                  return (
                    <InventoryListTableRow key={bike.id} editing={editing}>
                      {isVisible("blueprint") && (
                        <InventoryListTableTd variant="name">
                          <div className="flex items-center gap-3">
                            <InventoryItemThumbnail
                              image={bike.image}
                              images={bike.images}
                              name={getBlueprintLabel(bike.bike_blueprint_id)}
                            />
                            <span>{getBlueprintLabel(bike.bike_blueprint_id)}</span>
                          </div>
                        </InventoryListTableTd>
                      )}
                      {isVisible("vin") && (
                        <InventoryListTableTd variant="mono">{bike.vin}</InventoryListTableTd>
                      )}
                      {isVisible("sale_price") && (
                        <InventoryListTableTd align="right" variant="primary">
                          <QuickEditSalePriceCell
                            editing={editing}
                            pricing={pricingRecordFromItem(bike)}
                            rates={rates}
                            salePriceValue={quickEdit.draft.sale_price ?? ""}
                            salePriceStrategy={
                              quickEdit.draft.sale_price_strategy ===
                              "switch_manual"
                                ? "switch_manual"
                                : "adjust_margin"
                            }
                            saleMarginType={
                              quickEdit.draft.sale_margin_type === "fixed"
                                ? "fixed"
                                : "percentage"
                            }
                            saleMarginValue={
                              quickEdit.draft.sale_margin_value ?? ""
                            }
                            onSalePriceChange={(value) =>
                              quickEdit.updateField("sale_price", value)
                            }
                            onStrategyChange={(strategy) =>
                              quickEdit.updateField("sale_price_strategy", strategy)
                            }
                            onSaleMarginTypeChange={(type) =>
                              quickEdit.updateField("sale_margin_type", type)
                            }
                            onSaleMarginValueChange={(value) =>
                              quickEdit.updateField("sale_margin_value", value)
                            }
                            align="right"
                          />
                        </InventoryListTableTd>
                      )}
                      {isVisible("cost_price") && (
                        <InventoryListTableTd align="right" variant="mono">
                          {editing ? (
                            <QuickEditPriceInput
                              value={quickEdit.draft.cost_price ?? ""}
                              onChange={(value) =>
                                quickEdit.updateField("cost_price", value)
                              }
                              currency={toPricingCurrency(
                                bike.cost_currency,
                              )}
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
                                bike.cost_currency,
                              ),
                              rates,
                            )
                          )}
                        </InventoryListTableTd>
                      )}
                      {isVisible("mileage") && (
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
                      )}
                      {isVisible("status") && (
                        <InventoryListTableTd>{getStatusBadge(bike.status)}</InventoryListTableTd>
                      )}
                      {isVisible("discount") && (
                        <InventoryListTableTd variant="muted">
                          {bike.max_discount_type === "percentage"
                            ? `${bike.max_discount_value}%`
                            : formatCatalogPriceInEGP(
                                bike.max_discount_value,
                                toPricingCurrency(bike.sale_currency),
                                rates,
                              )}
                        </InventoryListTableTd>
                      )}
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
                              sale_price_strategy: "adjust_margin",
                              sale_margin_type:
                                bike.sale_margin_type ?? "percentage",
                              sale_margin_value: bike.sale_margin_value ?? 0,
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

      {!isShowAll && (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onPrevious={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      )}
    </PageShell>
  );
}
