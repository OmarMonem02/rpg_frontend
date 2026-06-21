"use client";

import {
  InventoryItemThumbnail,
  InventoryListTable,
  InventoryListTableBody,
  InventoryListTableHead,
  InventoryListTableRow,
  InventoryListTableTd,
  InventoryListTableTh,
  InventoryListTableToolbar,
} from "@/components/inventory/list-table";
import { ColumnPicker } from "@/components/inventory/ColumnPicker";
import { StockBadge } from "@/components/inventory/stock-badge";
import { ItemStatusBadge } from "@/lib/inventory-item-attributes";
import { formatMaxDiscount } from "@/lib/item-lookup";
import {
  formatCatalogProfitAmount,
  formatCatalogProfitPercent,
  isPricingLoss,
  pricingRecordFromItem,
} from "@/lib/catalog-pricing";
import { formatCatalogPriceInEGP } from "@/lib/currencies";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useTableColumns } from "@/hooks/useTableColumns";
import type { BrandRecord, ProductCategoryRecord, SparePartCategoryRecord } from "@/lib/crud-api";
import {
  getBulkCatalogColumnStorageKey,
  getBulkCatalogColumns,
  type BulkCatalogColumnId,
} from "./catalog-columns";
import {
  getBulkEditCategoryId,
  type BulkEditEntity,
  type BulkInventoryListItem,
} from "./types";

type BulkEditCatalogTableProps = {
  entity: BulkEditEntity;
  items: BulkInventoryListItem[];
  loading: boolean;
  categories: (ProductCategoryRecord | SparePartCategoryRecord)[];
  brands: BrandRecord[];
  selectedIds: Set<number>;
  onToggleId: (id: number) => void;
  onTogglePageAll: () => void;
  pageAllSelected: boolean;
};

function TagsCell({ tags }: { tags?: string[] }) {
  if (!tags || tags.length === 0) {
    return <span className="text-xs text-on-surface-variant">—</span>;
  }
  const visible = tags.slice(0, 1);
  const remaining = tags.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((tag) => (
        <span key={tag} className="form-chip text-xs">
          {tag}
        </span>
      ))}
      {remaining > 0 ? (
        <span className="text-xs text-on-surface-variant">+{remaining} more</span>
      ) : null}
    </div>
  );
}

export function BulkEditCatalogTable({
  entity,
  items,
  loading,
  categories,
  brands,
  selectedIds,
  onToggleId,
  onTogglePageAll,
  pageAllSelected,
}: BulkEditCatalogTableProps) {
  const { rates } = useExchangeRates();
  const columns = getBulkCatalogColumns(entity);
  const { isVisible, toggle, reset, visible } = useTableColumns(
    getBulkCatalogColumnStorageKey(entity),
    columns,
  );

  return (
    <InventoryListTable>
      <InventoryListTableToolbar label="Catalog items" count={items.length}>
        <ColumnPicker
          columns={columns}
          visible={visible}
          onToggle={toggle}
          onReset={reset}
        />
      </InventoryListTableToolbar>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <InventoryListTableHead>
            <tr>
              {isVisible("select") && (
                <InventoryListTableTh className="w-10">
                  <input
                    type="checkbox"
                    checked={pageAllSelected && items.length > 0}
                    onChange={onTogglePageAll}
                    className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary/20"
                    aria-label="Select all on page"
                  />
                </InventoryListTableTh>
              )}
              {isVisible("image") && <InventoryListTableTh>Image</InventoryListTableTh>}
              {isVisible("sku") && <InventoryListTableTh>SKU / Part No.</InventoryListTableTh>}
              {isVisible("name") && <InventoryListTableTh>Name</InventoryListTableTh>}
              {isVisible("stock") && <InventoryListTableTh align="center">Stock</InventoryListTableTh>}
              {isVisible("alarm") && <InventoryListTableTh align="center">Alarm</InventoryListTableTh>}
              {isVisible("cost_price") && <InventoryListTableTh>Cost</InventoryListTableTh>}
              {isVisible("sale_price") && <InventoryListTableTh>Sale</InventoryListTableTh>}
              {isVisible("profit_amount") && <InventoryListTableTh>Profit</InventoryListTableTh>}
              {isVisible("profit_percent") && <InventoryListTableTh>Profit %</InventoryListTableTh>}
              {isVisible("max_discount") && <InventoryListTableTh>Max Discount</InventoryListTableTh>}
              {isVisible("category") && <InventoryListTableTh>Category</InventoryListTableTh>}
              {isVisible("brand") && <InventoryListTableTh>Brand</InventoryListTableTh>}
              {isVisible("size") && <InventoryListTableTh>Size</InventoryListTableTh>}
              {isVisible("color") && <InventoryListTableTh>Color</InventoryListTableTh>}
              {isVisible("status") && <InventoryListTableTh>Status</InventoryListTableTh>}
              {isVisible("tags") && <InventoryListTableTh>Tags</InventoryListTableTh>}
              {isVisible("universal") && <InventoryListTableTh>Universal</InventoryListTableTh>}
              {isVisible("commission") && <InventoryListTableTh>Commission</InventoryListTableTh>}
            </tr>
          </InventoryListTableHead>
          <InventoryListTableBody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.filter((c) => visible.has(c.id)).length}
                  className="px-4 py-8 text-center text-on-surface-variant"
                >
                  Loading items…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.filter((c) => visible.has(c.id)).length}
                  className="px-4 py-8 text-center text-on-surface-variant"
                >
                  No items match your filters.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const profitPricing = pricingRecordFromItem(item);
                const showLoss = isPricingLoss(profitPricing, rates);
                const categoryId = getBulkEditCategoryId(item, entity);

                return (
                  <InventoryListTableRow key={item.id}>
                    {isVisible("select") && (
                      <InventoryListTableTd>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => onToggleId(item.id)}
                          className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary/20"
                        />
                      </InventoryListTableTd>
                    )}
                    {isVisible("image") && (
                      <InventoryListTableTd>
                        <InventoryItemThumbnail
                          image={item.image}
                          images={item.images}
                          name={item.name}
                        />
                      </InventoryListTableTd>
                    )}
                    {isVisible("sku") && (
                      <InventoryListTableTd variant="mono">
                        {item.sku}
                        <br />
                        {item.part_number || "—"}
                      </InventoryListTableTd>
                    )}
                    {isVisible("name") && (
                      <InventoryListTableTd variant="name">{item.name}</InventoryListTableTd>
                    )}
                    {isVisible("stock") && (
                      <InventoryListTableTd align="center">
                        <StockBadge
                          stock_quantity={item.stock_quantity}
                          low_stock_alarm={item.low_stock_alarm}
                        />
                      </InventoryListTableTd>
                    )}
                    {isVisible("alarm") && (
                      <InventoryListTableTd align="center" variant="mono">
                        {item.low_stock_alarm}
                      </InventoryListTableTd>
                    )}
                    {isVisible("cost_price") && (
                      <InventoryListTableTd variant="primary">
                        {formatCatalogPriceInEGP(item.cost_price, item.cost_currency, rates)}
                      </InventoryListTableTd>
                    )}
                    {isVisible("sale_price") && (
                      <InventoryListTableTd variant="primary">
                        {formatCatalogPriceInEGP(item.sale_price, item.sale_currency, rates)}
                      </InventoryListTableTd>
                    )}
                    {isVisible("profit_amount") && (
                      <InventoryListTableTd variant={showLoss ? "primary" : "mono"}>
                        {formatCatalogProfitAmount(profitPricing, rates)}
                      </InventoryListTableTd>
                    )}
                    {isVisible("profit_percent") && (
                      <InventoryListTableTd variant={showLoss ? "primary" : "mono"}>
                        {formatCatalogProfitPercent(profitPricing, rates)}
                      </InventoryListTableTd>
                    )}
                    {isVisible("max_discount") && (
                      <InventoryListTableTd variant="muted">
                        {formatMaxDiscount(item, rates)}
                      </InventoryListTableTd>
                    )}
                    {isVisible("category") && (
                      <InventoryListTableTd>
                        <span className="form-chip">
                          {categories.find((c) => c.id === categoryId)?.name ?? "—"}
                        </span>
                      </InventoryListTableTd>
                    )}
                    {isVisible("brand") && (
                      <InventoryListTableTd>
                        <span className="form-chip">
                          {brands.find((b) => b.id === item.brand_id)?.name ?? "—"}
                        </span>
                      </InventoryListTableTd>
                    )}
                    {isVisible("size") && (
                      <InventoryListTableTd variant="muted">{item.size || "—"}</InventoryListTableTd>
                    )}
                    {isVisible("color") && (
                      <InventoryListTableTd variant="muted">{item.color || "—"}</InventoryListTableTd>
                    )}
                    {isVisible("status") && (
                      <InventoryListTableTd>
                        <ItemStatusBadge status={item.item_status} />
                      </InventoryListTableTd>
                    )}
                    {isVisible("tags") && (
                      <InventoryListTableTd>
                        <TagsCell tags={item.tags} />
                      </InventoryListTableTd>
                    )}
                    {isVisible("universal") && (
                      <InventoryListTableTd>
                        <span className="form-chip bg-primary/8 text-primary border-primary/15">
                          {item.universal ? "Universal" : "Specific"}
                        </span>
                      </InventoryListTableTd>
                    )}
                    {isVisible("commission") && (
                      <InventoryListTableTd variant="muted">
                        {item.have_commission ? "Yes" : "No"}
                      </InventoryListTableTd>
                    )}
                  </InventoryListTableRow>
                );
              })
            )}
          </InventoryListTableBody>
        </table>
      </div>
    </InventoryListTable>
  );
}
