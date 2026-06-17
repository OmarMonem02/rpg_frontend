"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/components/permission-provider";
import {
  ActionButton,
  DataTableCard,
  EmptyState,
  FilterBar,
  InputGroup,
  InlineMessage,
  SearchableSelect,
  SectionHeading,
  StatCard,
  StatGrid,
  StatusBadge,
} from "@/components/ops-ui";
import { getAuthToken } from "@/lib/auth-session";
import {
  applyPricingAlarms,
  listPricingAlarms,
  type PricingAlarmItem,
} from "@/lib/api/pricing-alarms";
import { formatEgp } from "@/lib/currencies";

type EntityFilter = "all" | PricingAlarmItem["item_type"];

function editHref(item: PricingAlarmItem): string {
  if (item.item_type === "product") {
    return `/inventory/products/edit/${item.id}`;
  }
  if (item.item_type === "bike") {
    return `/inventory/bikes/edit/${item.id}`;
  }
  return `/inventory/spare-parts/edit/${item.id}`;
}

function itemTypeLabel(type: PricingAlarmItem["item_type"]): string {
  if (type === "product") return "Product";
  if (type === "bike") return "Bike";
  return "Spare part";
}

function formatNativePrice(amount: number, currency: string): string {
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export function PricingLossPanel() {
  const permissions = usePermissions();
  const canApply =
    permissions.canUpdate("spare-parts") ||
    permissions.canUpdate("products") ||
    permissions.canUpdate("bikes");

  const [items, setItems] = useState<PricingAlarmItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<EntityFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      const result = await listPricingAlarms(token);
      setItems(result.items);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load pricing alarms",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (entityFilter !== "all" && item.item_type !== entityFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
      );
    });
  }, [items, search, entityFilter]);

  const stats = useMemo(() => {
    const totalLoss = filtered.reduce((sum, item) => sum + item.loss_amount_egp, 0);
    const byType = {
      spare_part: filtered.filter((i) => i.item_type === "spare_part").length,
      product: filtered.filter((i) => i.item_type === "product").length,
      bike: filtered.filter((i) => i.item_type === "bike").length,
    };
    return { totalLoss, count: filtered.length, byType };
  }, [filtered]);

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(
      new Set(filtered.map((item) => `${item.item_type}:${item.id}`)),
    );
  };

  const toggleOne = (item: PricingAlarmItem, checked: boolean) => {
    const key = `${item.item_type}:${item.id}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleApply = async () => {
    if (!canApply || selected.size === 0) return;
    try {
      setApplying(true);
      setApplyMessage(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const selections = [...selected].map((key) => {
        const [item_type, id] = key.split(":");
        return {
          item_type: item_type as PricingAlarmItem["item_type"],
          id: Number(id),
        };
      });

      const result = await applyPricingAlarms(token, selections);
      setApplyMessage(`Updated sale price for ${result.updated} item(s).`);
      setSelected(new Set());
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply prices");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-on-surface-variant">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="font-medium">Loading pricing loss alarms…</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {error ? (
        <InlineMessage tone="danger">{error}</InlineMessage>
      ) : null}
      {applyMessage ? (
        <InlineMessage tone="success">{applyMessage}</InlineMessage>
      ) : null}

      <StatGrid>
        <StatCard
          label="At-risk items"
          value={String(stats.count)}
          hint="Cost exceeds sale in EGP"
          tone="danger"
        />
        <StatCard
          label="Total loss exposure"
          value={formatEgp(stats.totalLoss)}
          hint="Sum of EGP shortfall"
          tone="warning"
        />
        <StatCard
          label="Spare parts"
          value={String(stats.byType.spare_part)}
          hint="In current view"
        />
        <StatCard
          label="Products / Bikes"
          value={`${stats.byType.product} / ${stats.byType.bike}`}
          hint="In current view"
          tone="primary"
        />
      </StatGrid>

      <FilterBar className="md:grid-cols-12">
        <InputGroup label="Search" className="md:col-span-8">
          <input
            type="search"
            placeholder="Search by name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input-base"
          />
        </InputGroup>
        <InputGroup label="Catalog" className="md:col-span-4">
          <SearchableSelect
            value={entityFilter}
            onChange={(value) => setEntityFilter(value as EntityFilter)}
            options={[
              { value: "all", label: "All types" },
              { value: "spare_part", label: "Spare parts" },
              { value: "product", label: "Products" },
              { value: "bike", label: "Bikes" },
            ]}
            className="form-input-base"
          />
        </InputGroup>
      </FilterBar>

      <SectionHeading
        title="Pricing loss items"
        description="These items sell below their EGP cost at current exchange rates. Apply suggested prices to restore margin, or edit individually."
        actions={
          canApply ? (
            <ActionButton
              type="button"
              tone="primary"
              size="sm"
              disabled={selected.size === 0 || applying}
              onClick={() => void handleApply()}
            >
              {applying
                ? "Applying…"
                : `Apply suggested (${selected.size})`}
            </ActionButton>
          ) : null
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No pricing loss alerts"
          description="All catalog items have sale prices above their EGP cost at current exchange rates."
        />
      ) : (
        <DataTableCard className="overflow-hidden border-outline-variant/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm text-on-surface">
              <thead className="border-b border-outline-variant/20 bg-surface-container-low text-on-surface-variant">
                <tr>
                  {canApply ? (
                    <th className="px-4 py-4 md:px-6">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-outline-variant/40"
                        checked={
                          filtered.length > 0 &&
                          filtered.every((item) =>
                            selected.has(`${item.item_type}:${item.id}`),
                          )
                        }
                        onChange={(e) => toggleAll(e.target.checked)}
                        aria-label="Select all visible items"
                      />
                    </th>
                  ) : null}
                  <th className="label-caps px-4 py-4 md:px-6">Item</th>
                  <th className="label-caps px-4 py-4 md:px-6">Type</th>
                  <th className="label-caps px-4 py-4 md:px-6">Cost</th>
                  <th className="label-caps px-4 py-4 md:px-6">Sale</th>
                  <th className="label-caps px-4 py-4 text-right md:px-6">
                    Loss (EGP)
                  </th>
                  <th className="label-caps px-4 py-4 text-right md:px-6">
                    Suggested
                  </th>
                  <th className="label-caps px-4 py-4 text-right md:px-6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5 bg-surface">
                {filtered.map((item) => {
                  const key = `${item.item_type}:${item.id}`;
                  return (
                    <tr key={key} className="data-row group">
                      {canApply ? (
                        <td className="px-4 py-4 md:px-6">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-outline-variant/40"
                            checked={selected.has(key)}
                            onChange={(e) => toggleOne(item, e.target.checked)}
                            aria-label={`Select ${item.name}`}
                          />
                        </td>
                      ) : null}
                      <td className="px-4 py-4 md:px-6">
                        <p className="font-medium text-on-surface">{item.name}</p>
                        <p className="mt-0.5 mono-data text-xs text-on-surface-variant">
                          {item.sku}
                        </p>
                      </td>
                      <td className="px-4 py-4 md:px-6">
                        <StatusBadge tone="default">
                          {itemTypeLabel(item.item_type)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-4 md:px-6">
                        <p className="mono-data font-medium">
                          {formatNativePrice(item.cost_price, item.cost_currency)}
                        </p>
                        <p className="mt-0.5 text-xs text-on-surface-variant">
                          {formatEgp(item.cost_egp)} EGP
                        </p>
                      </td>
                      <td className="px-4 py-4 md:px-6">
                        <p className="mono-data font-medium">
                          {formatNativePrice(item.sale_price, item.sale_currency)}
                        </p>
                        <p className="mt-0.5 text-xs text-on-surface-variant">
                          {formatEgp(item.sale_egp)} EGP
                        </p>
                      </td>
                      <td className="mono-data px-4 py-4 text-right font-semibold text-error md:px-6">
                        {formatEgp(item.loss_amount_egp)}
                      </td>
                      <td className="mono-data px-4 py-4 text-right font-semibold text-primary md:px-6">
                        {formatEgp(item.suggested_sale_price)}
                      </td>
                      <td className="px-4 py-4 text-right md:px-6">
                        <Link
                          href={editHref(item)}
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
      )}
    </div>
  );
}
