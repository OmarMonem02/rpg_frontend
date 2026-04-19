"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import {
  deleteSaleLineItem,
  getSale,
  updateSale,
  updateSaleLineItem,
  type SaleRecord,
} from "@/lib/crud-api";
import {
  ActionButton,
  PageShell,
  SurfaceCard,
  PageHero,
  StatGrid,
  StatCard,
  StatusBadge,
  InputGroup,
  InlineMessage,
} from "@/components/ops-ui";
import {
  ArrowLeftIcon,
  CheckIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { labelOf, money } from "../sale-item-utils";

function getItemTypeTone(type: string): "primary" | "success" | "warning" | "danger" | "default" {
  const t = type.toLowerCase();
  if (t === "products") return "primary";
  if (t === "spare_parts") return "warning";
  if (t === "bikes") return "success";
  if (t === "maintenance_services") return "danger";
  return "default";
}

export default function ReturnSaleItemsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const saleId = Number(params?.id);
  const requestedItemId = Number(searchParams.get("item"));

  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [returnQty, setReturnQty] = useState(1);

  const loadSale = useCallback(async () => {
    try {
      if (!saleId) throw new Error("Sale ID not found");
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      setLoading(true);
      setSale(await getSale(token, saleId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sale");
    } finally {
      setLoading(false);
    }
  }, [saleId]);

  useEffect(() => {
    loadSale();
  }, [loadSale]);

  const items = useMemo(() => sale?.line_items ?? [], [sale?.line_items]);
  const selectedRow =
    items.find((item) => item.id === selectedItemId) ??
    items.find((item) => item.id === requestedItemId) ??
    items[0] ??
    null;

  useEffect(() => {
    if (!selectedRow) return;
    setSelectedItemId(selectedRow.id);
    setReturnQty((current) => Math.max(1, Math.min(selectedRow.quantity, current)));
  }, [selectedRow]);

  const handleReturn = async () => {
    if (!sale || !selectedRow) return;

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const qty = Math.max(1, Math.min(selectedRow.quantity, returnQty));
      setBusy(true);

      if (qty >= selectedRow.quantity) {
        await deleteSaleLineItem(token, sale.id, selectedRow.id);
      } else {
        await updateSaleLineItem(token, sale.id, selectedRow.id, {
          qty: selectedRow.quantity - qty,
        });
      }

      await updateSale(token, sale.id, {
        status: qty >= selectedRow.quantity && items.length === 1 ? "returned" : "partial",
      });

      router.push(`/inventory/sales/${sale.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process return");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-96">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* ── Page Hero ── */}
      <PageHero
        eyebrow="Order Management"
        title="Process Return"
        description={`Select items from Sale #${saleId} to return to inventory. Accurate inventory tracking starts with proper, well-documented returns.`}
        actions={
          <>
            <ActionButton
              variant="outline"
              onClick={() => router.push(`/inventory/sales/${saleId}`)}
              className="gap-2"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Sale
            </ActionButton>
            <ActionButton
              tone="primary"
              variant="filled"
              onClick={handleReturn}
              disabled={busy || !selectedRow}
              className="gap-2"
            >
              <CheckIcon className="w-4 h-4" />
              Confirm Return
            </ActionButton>
          </>
        }
      />

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-6">
        {/* ── Item Selection ── */}
        <SurfaceCard className="p-0 overflow-hidden shadow-ambient self-start">
          <div className="p-5 border-b border-outline-variant/10">
            <h2 className="text-xl font-semibold text-on-surface">
              Sale Line Items
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Select the item you wish to return from the list below.
            </p>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedItemId(item.id);
                  setReturnQty(1);
                }}
                className={`w-full group px-6 py-5 text-left transition-all ${
                  selectedRow?.id === item.id
                    ? "bg-primary/[0.03] ring-1 ring-inset ring-primary/20"
                    : "hover:bg-surface-container-lowest"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div
                      className={`mt-1 p-2 rounded-xl transition-colors ${
                        selectedRow?.id === item.id
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-high text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary"
                      }`}
                    >
                      <ShoppingBagIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div
                        className={`font-semibold transition-colors ${
                          selectedRow?.id === item.id
                            ? "text-primary"
                            : "text-on-surface group-hover:text-primary"
                        }`}
                      >
                        {item.item_label || `Item #${item.sellable_id}`}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <StatusBadge
                          tone={getItemTypeTone(item.sellable_type)}
                          className="px-1.5 py-0.5"
                        >
                          {labelOf(item.sellable_type)}
                        </StatusBadge>
                        <span className="text-xs text-on-surface-variant">
                          Qty sold: {item.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-on-surface">
                      EGP{" "}
                      {money(
                        item.quantity * item.selling_price -
                          item.discount_amount,
                      )}
                    </div>
                    <div className="mt-1 text-xs text-on-surface-variant">
                      Unit: EGP {money(item.selling_price)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {items.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-sm text-on-surface-variant italic">
                  No items found in this sale.
                </p>
              </div>
            )}
          </div>
        </SurfaceCard>

        {/* ── Return Configuration ── */}
        <div className="flex flex-col gap-6">
          <SurfaceCard className="p-5 space-y-6 shadow-ambient">
            <h2 className="text-lg font-semibold text-on-surface">
              Return Summary
            </h2>

            {selectedRow ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low p-5">
                  <div className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Selected for Return
                  </div>
                  <div className="mt-3 font-semibold text-on-surface text-lg">
                    {selectedRow.item_label ||
                      `Item #${selectedRow.sellable_id}`}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-on-surface-variant border-t border-outline-variant/10 pt-2">
                    <span>Available quantity:</span>
                    <span className="font-bold text-on-surface">
                      {selectedRow.quantity} units
                    </span>
                  </div>
                </div>

                <InputGroup label="Quantity To Return">
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max={selectedRow.quantity}
                      value={returnQty}
                      onChange={(e) =>
                        setReturnQty(
                          Math.max(
                            1,
                            Math.min(
                              selectedRow.quantity,
                              Number(e.target.value) || 1,
                            ),
                          ),
                        )
                      }
                      className="w-full rounded-xl border border-outline-variant/30 px-4 py-3 text-lg font-semibold tabular-nums focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-surface"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
                      Units
                    </div>
                  </div>
                </InputGroup>

                <div className="rounded-2xl border border-warning/15 bg-warning/5 p-4 flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0" />
                  <p className="text-xs leading-relaxed text-on-surface-variant italic">
                    This action will{" "}
                    {returnQty >= selectedRow.quantity
                      ? "completely remove this item from the sale record"
                      : `reduce the sold quantity to ${selectedRow.quantity - returnQty} units`}
                    .
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-outline-variant/30 p-12 text-center">
                <p className="text-sm text-on-surface-variant italic text-balance">
                  Select an item from the sale on the left to configure return
                  details.
                </p>
              </div>
            )}
          </SurfaceCard>

          {selectedRow && (
            <StatCard
              label="Estimated Refund Value"
              value={`EGP ${money(
                returnQty * selectedRow.selling_price -
                  (selectedRow.discount_amount / selectedRow.quantity) *
                    returnQty,
              )}`}
              tone="primary"
              hint="Partial refund based on proportional discount"
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}
