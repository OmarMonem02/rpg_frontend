"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PricingLossPanel } from "@/app/(protected)/inventory/alarms/pricing-loss-panel";
import {
  InventoryImage,
  InventoryImagePlaceholder,
} from "@/components/inventory/InventoryImage";
import { usePermissions } from "@/components/permission-provider";
import {
  ActionButton,
  DataTableCard,
  EmptyState,
  FilterBar,
  InputGroup,
  PageHero,
  PageShell,
  SearchableSelect,
  SectionHeading,
  StatCard,
  StatGrid,
  StatusBadge,
  TabsWrapper,
} from "@/components/ops-ui";
import { getAuthToken } from "@/lib/auth-session";
import {
  fetchAllPages,
  listProducts,
  listSpareParts,
  listMaintenanceParts,
  type ProductRecord,
  type SparePartRecord,
  type MaintenancePartRecord,
} from "@/lib/crud-api";
import {
  classifyStockAlert,
  getStockBadgeShortLabel,
  getStockBadgeTone,
  matchesStockAlertTab,
  type StockAlertBucket,
} from "@/lib/inventory-stock";

type EntityKind = "spare-part" | "product" | "maintenance-part";

type StockAlertRow = {
  kind: EntityKind;
  id: number;
  name: string;
  sku: string;
  partNumber?: string;
  image?: string;
  stock_quantity: number;
  low_stock_alarm: number;
  sale_price: number;
  sale_currency: string;
  editHref: string;
};

type EntityFilter = "all" | EntityKind;
type AlertTab = "all" | StockAlertBucket;

function toSparePartRow(part: SparePartRecord): StockAlertRow {
  return {
    kind: "spare-part",
    id: part.id,
    name: part.name,
    sku: part.sku,
    partNumber: part.part_number,
    image: part.image,
    stock_quantity: part.stock_quantity,
    low_stock_alarm: part.low_stock_alarm,
    sale_price: part.sale_price,
    sale_currency: part.sale_currency,
    editHref: `/inventory/spare-parts/edit/${part.id}`,
  };
}

function toMaintenancePartRow(part: MaintenancePartRecord): StockAlertRow {
  return {
    kind: "maintenance-part",
    id: part.id,
    name: part.name,
    sku: part.sku,
    partNumber: part.part_number,
    image: part.image,
    stock_quantity: part.stock_quantity,
    low_stock_alarm: part.low_stock_alarm,
    sale_price: part.sale_price,
    sale_currency: part.sale_currency,
    editHref: `/inventory/maintenance-parts/edit/${part.id}`,
  };
}

function toProductRow(product: ProductRecord): StockAlertRow {
  return {
    kind: "product",
    id: product.id,
    name: product.name,
    sku: product.sku,
    partNumber: product.part_number,
    image: product.image,
    stock_quantity: product.stock_quantity,
    low_stock_alarm: product.low_stock_alarm,
    sale_price: product.sale_price,
    sale_currency: product.sale_currency,
    editHref: `/inventory/products/edit/${product.id}`,
  };
}

function matchesSearch(row: StockAlertRow, query: string): boolean {
  if (!query) return true;
  const haystack = [row.name, row.sku, row.partNumber ?? ""]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function AlertTable({
  title,
  description,
  rows,
  emptyTitle,
  emptyDescription,
  createHref,
  createLabel,
}: {
  title: string;
  description: string;
  rows: StockAlertRow[];
  emptyTitle: string;
  emptyDescription: string;
  createHref: string;
  createLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeading title={title} description={description} />
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={
            <ActionButton tone="primary" href={createHref}>
              {createLabel}
            </ActionButton>
          }
        />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <SectionHeading
        title={title}
        description={description}
        actions={
          <ActionButton variant="outline" size="sm" href={createHref}>
            {createLabel}
          </ActionButton>
        }
      />
      <DataTableCard className="overflow-hidden border-outline-variant/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-on-surface">
            <thead className="border-b border-outline-variant/20 bg-surface-container-low text-on-surface-variant">
              <tr>
                <th className="label-caps px-4 py-4 md:px-6">Item</th>
                <th className="label-caps px-4 py-4 md:px-6">SKU</th>
                <th className="label-caps px-4 py-4 text-center md:px-6">
                  On hand
                </th>
                <th className="label-caps px-4 py-4 text-center md:px-6">
                  Alarm at
                </th>
                <th className="label-caps px-4 py-4 md:px-6">Status</th>
                <th className="label-caps px-4 py-4 text-right md:px-6">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5 bg-surface">
              {rows.map((row) => {
                const tone = getStockBadgeTone(row);
                const bucket = classifyStockAlert(row);
                return (
                  <tr key={`${row.kind}-${row.id}`} className="data-row group">
                    <td className="px-4 py-4 md:px-6">
                      <div className="flex items-center gap-3">
                        {row.image ? (
                          <InventoryImage
                            src={row.image}
                            alt=""
                            className="h-10 w-10 flex-none rounded-xl object-cover"
                            fallback={
                              <InventoryImagePlaceholder
                                name={row.name}
                                className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-outline-variant/15 bg-surface-container text-xs font-medium text-on-surface-variant"
                              />
                            }
                          />
                        ) : (
                          <InventoryImagePlaceholder
                            name={row.name}
                            className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-outline-variant/15 bg-surface-container text-xs font-medium text-on-surface-variant"
                          />
                        )}
                        <div>
                          <p className="font-medium text-on-surface">
                            {row.name}
                          </p>
                          <p className="mt-0.5 text-xs text-on-surface-variant">
                            {row.kind === "spare-part"
                              ? "Spare part"
                              : "Product"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="mono-data px-4 py-4 text-xs text-on-surface-variant md:px-6">
                      {row.sku}
                      {row.partNumber ? ` / ${row.partNumber}` : ""}
                    </td>
                    <td className="mono-data px-4 py-4 text-center font-semibold md:px-6">
                      {row.stock_quantity}
                    </td>
                    <td className="mono-data px-4 py-4 text-center text-on-surface-variant md:px-6">
                      {row.low_stock_alarm}
                    </td>
                    <td className="px-4 py-4 md:px-6">
                      <StatusBadge tone={tone}>
                        {getStockBadgeShortLabel(row)}
                        {bucket === "low" ? (
                          <>
                            {" "}
                            <span className="mono-data">
                              {row.stock_quantity}
                            </span>
                          </>
                        ) : null}
                        {bucket === "out" ? (
                          <>
                            {" "}
                            <span className="mono-data">0</span>
                          </>
                        ) : null}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4 text-right md:px-6">
                      <Link
                        href={row.editHref}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DataTableCard>
    </section>
  );
}

function AlertPanels({
  alertTab,
  entityFilter,
  search,
  sparePartRows,
  productRows,
  maintenancePartRows,
  showSpareParts,
  showProducts,
  showMaintenanceParts,
}: {
  alertTab: AlertTab;
  entityFilter: EntityFilter;
  search: string;
  sparePartRows: StockAlertRow[];
  productRows: StockAlertRow[];
  maintenancePartRows: StockAlertRow[];
  showSpareParts: boolean;
  showProducts: boolean;
  showMaintenanceParts: boolean;
}) {
  const query = search.trim().toLowerCase();

  const filterRows = (rows: StockAlertRow[]) =>
    rows.filter(
      (row) =>
        matchesStockAlertTab(row, alertTab) &&
        matchesSearch(row, query),
    );

  const spareFiltered = filterRows(sparePartRows);
  const productFiltered = filterRows(productRows);
  const maintenanceFiltered = filterRows(maintenancePartRows);

  const showSpareSection =
    showSpareParts && (entityFilter === "all" || entityFilter === "spare-part");
  const showProductSection =
    showProducts && (entityFilter === "all" || entityFilter === "product");
  const showMaintenanceSection =
    showMaintenanceParts &&
    (entityFilter === "all" || entityFilter === "maintenance-part");

  if (!showSpareSection && !showProductSection && !showMaintenanceSection) {
    return (
      <EmptyState
        title="No inventory access"
        description="You need read access to spare parts, maintenance parts, or products to view stock alarms."
      />
    );
  }

  const nothingVisible =
    (showSpareSection ? spareFiltered.length === 0 : true) &&
    (showProductSection ? productFiltered.length === 0 : true) &&
    (showMaintenanceSection ? maintenanceFiltered.length === 0 : true);

  if (nothingVisible) {
    return (
      <EmptyState
        title="No alerts in this view"
        description="Nothing matches your filters. Try another tab or clear the search."
      />
    );
  }

  return (
    <div className="space-y-8">
      {showSpareSection ? (
        <AlertTable
          title="Spare parts"
          description="Parts at or below their configured low-stock threshold."
          rows={spareFiltered}
          emptyTitle="No spare part alerts"
          emptyDescription="Spare parts in this view are fully stocked relative to their alarm settings."
          createHref="/inventory/spare-parts/create"
          createLabel="Add spare part"
        />
      ) : null}
      {showProductSection ? (
        <AlertTable
          title="Products"
          description="Products at or below their configured low-stock threshold."
          rows={productFiltered}
          emptyTitle="No product alerts"
          emptyDescription="Products in this view are fully stocked relative to their alarm settings."
          createHref="/inventory/products/create"
          createLabel="Add product"
        />
      ) : null}
      {showMaintenanceSection ? (
        <AlertTable
          title="Maintenance parts"
          description="Maintenance parts at or below their configured low-stock threshold."
          rows={maintenanceFiltered}
          emptyTitle="No maintenance part alerts"
          emptyDescription="Maintenance parts in this view are fully stocked relative to their alarm settings."
          createHref="/inventory/maintenance-parts/create"
          createLabel="Add maintenance part"
        />
      ) : null}
    </div>
  );
}

type MainAlarmTab = "stock" | "pricing";

export default function InventoryAlarmsPage() {
  const searchParams = useSearchParams();
  const permissions = usePermissions();
  const showSpareParts = permissions.canReadPage("spare-parts");
  const showProducts = permissions.canReadPage("products");
  const showMaintenanceParts = permissions.canReadPage("maintenance-parts");
  const initialTab =
    searchParams.get("tab") === "pricing" ? "pricing" : "stock";
  const [mainTab, setMainTab] = useState<MainAlarmTab>(initialTab);

  useEffect(() => {
    setMainTab(searchParams.get("tab") === "pricing" ? "pricing" : "stock");
  }, [searchParams]);

  const [sparePartRows, setSparePartRows] = useState<StockAlertRow[]>([]);
  const [productRows, setProductRows] = useState<StockAlertRow[]>([]);
  const [maintenancePartRows, setMaintenancePartRows] = useState<StockAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<EntityFilter>("all");
  const [alertTab, setAlertTab] = useState<AlertTab>("all");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const [spareParts, products, maintenanceParts] = await Promise.all([
        showSpareParts
          ? fetchAllPages((page) =>
              listSpareParts(token, page, { low_stock: true }),
            )
          : Promise.resolve([]),
        showProducts
          ? fetchAllPages((page) =>
              listProducts(token, page, { low_stock: true }),
            )
          : Promise.resolve([]),
        showMaintenanceParts
          ? fetchAllPages((page) =>
              listMaintenanceParts(token, page, { low_stock: true }),
            )
          : Promise.resolve([]),
      ]);

      setSparePartRows(spareParts.map(toSparePartRow));
      setProductRows(products.map(toProductRow));
      setMaintenancePartRows(maintenanceParts.map(toMaintenancePartRow));
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load stock alarms",
      );
    } finally {
      setLoading(false);
    }
  }, [showSpareParts, showProducts, showMaintenanceParts]);

  useEffect(() => {
    void loadData();
  }, [loadData]);


  const allRows = useMemo(
    () => [...sparePartRows, ...productRows, ...maintenancePartRows],
    [sparePartRows, productRows, maintenancePartRows],
  );

  const stats = useMemo(() => {
    const query = search.trim().toLowerCase();
    const visible = allRows.filter((row) => {
      if (!matchesSearch(row, query)) return false;
      if (entityFilter === "spare-part" && row.kind !== "spare-part") {
        return false;
      }
      if (entityFilter === "product" && row.kind !== "product") {
        return false;
      }
      if (entityFilter === "maintenance-part" && row.kind !== "maintenance-part") {
        return false;
      }
      return true;
    });

    const outCount = visible.filter(
      (row) => classifyStockAlert(row) === "out",
    ).length;
    const lowCount = visible.filter(
      (row) => classifyStockAlert(row) === "low",
    ).length;
    const spareCount = visible.filter((row) => row.kind === "spare-part").length;
    const productCount = visible.filter((row) => row.kind === "product").length;
    const maintenanceCount = visible.filter(
      (row) => row.kind === "maintenance-part",
    ).length;

    return {
      outCount,
      lowCount,
      total: outCount + lowCount,
      spareCount,
      productCount,
      maintenanceCount,
    };
  }, [allRows, search, entityFilter]);

  const tabPanels = (
    <AlertPanels
      alertTab={alertTab}
      entityFilter={entityFilter}
      search={search}
      sparePartRows={sparePartRows}
      productRows={productRows}
      maintenancePartRows={maintenancePartRows}
      showSpareParts={showSpareParts}
      showProducts={showProducts}
      showMaintenanceParts={showMaintenanceParts}
    />
  );

  return (
    <PageShell>
      <PageHero
        eyebrow="Inventory"
        title="Inventory alarms"
        subtitle={
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            {mainTab === "stock"
              ? "Items at or below their low stock alarm threshold."
              : "Items where EGP cost exceeds sale price at current exchange rates."}
          </p>
        }
        meta={
          mainTab === "stock" ? (
            <StatGrid>
              <StatCard
                label="Out of stock"
                value={String(stats.outCount)}
                hint="Zero units on hand"
                tone="danger"
              />
              <StatCard
                label="Low stock"
                value={String(stats.lowCount)}
                hint="Above zero, at or below alarm"
                tone="warning"
              />
              <StatCard
                label="Total alerts"
                value={String(stats.total)}
                hint="Matching current filters"
              />
              <StatCard
                label="By catalog"
                value={`${stats.spareCount} / ${stats.productCount} / ${stats.maintenanceCount}`}
                hint="Spare parts / products / maintenance parts"
                tone="primary"
              />
            </StatGrid>
          ) : null
        }
      />

      <div className="mt-2">
        <TabsWrapper
          variant="pills"
          activeTabId={mainTab}
          onTabChange={(id) => setMainTab(id as MainAlarmTab)}
          tabs={[
            {
              id: "stock",
              label: "Stock alarms",
              content: null,
            },
            {
              id: "pricing",
              label: "Pricing loss",
              content: null,
            },
          ]}
        />
      </div>

      {mainTab === "pricing" ? (
        <PricingLossPanel />
      ) : (
        <div className="mt-6 space-y-6">
          {error ? (
            <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-error">
              {error}
            </div>
          ) : null}

          <FilterBar className="md:grid-cols-12">
            <InputGroup label="Search" className="md:col-span-6">
              <input
                type="search"
                placeholder="Search by name, SKU, or part number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input-base"
              />
            </InputGroup>
            <InputGroup label="Catalog" className="md:col-span-6">
              <SearchableSelect
                value={entityFilter}
                onChange={(value) => setEntityFilter(value as EntityFilter)}
                options={[
                  { value: "all", label: "All catalogs" },
                  ...(showSpareParts
                    ? [{ value: "spare-part", label: "Spare parts only" }]
                    : []),
                  ...(showProducts
                    ? [{ value: "product", label: "Products only" }]
                    : []),
                  ...(showMaintenanceParts
                    ? [
                        {
                          value: "maintenance-part",
                          label: "Maintenance parts only",
                        },
                      ]
                    : []),
                ]}
                className="form-input-base"
              />
            </InputGroup>
          </FilterBar>

          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4 text-on-surface-variant">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="font-medium">Loading stock alarms…</p>
            </div>
          ) : (
            <TabsWrapper
              variant="card"
              activeTabId={alertTab}
              onTabChange={(id) => setAlertTab(id as AlertTab)}
              tabs={[
                {
                  id: "all",
                  label: `All alerts (${stats.total})`,
                  content: tabPanels,
                },
                {
                  id: "out",
                  label: `Out of stock (${stats.outCount})`,
                  content: tabPanels,
                },
                {
                  id: "low",
                  label: `Low stock (${stats.lowCount})`,
                  content: tabPanels,
                },
              ]}
            />
          )}
        </div>
      )}
    </PageShell>
  );
}
