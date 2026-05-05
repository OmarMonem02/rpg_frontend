"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import {
  getSale,
  processSaleReturn,
  processSaleExchange,
  type SaleRecord,
} from "@/lib/crud-api";
import { getSettings } from "@/lib/api/settings";
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
import { CatalogPickerModal } from "@/components/catalog-picker-modal";
import {
  ArrowLeftIcon,
  CheckIcon,
  TrashIcon,
  ShoppingBagIcon,
  PlusIcon,
  ArrowsRightLeftIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import {
  buildPayload,
  labelOf,
  money,
  normalizeToEGP,
  type CatalogItem,
  type CatalogType,
  type PendingExchangeItem,
} from "../sale-item-utils";

function getItemTypeTone(
  type: string,
): "primary" | "success" | "warning" | "danger" | "default" {
  const t = type.toLowerCase();
  if (t === "products") return "primary";
  if (t === "spare_parts") return "warning";
  if (t === "bikes") return "success";
  if (t === "maintenance_services") return "danger";
  return "default";
}

export default function ManageSaleItemsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const saleId = Number(params?.id);
  const requestedItemId = Number(searchParams.get("item"));
  const initialMode =
    (searchParams.get("mode") as "return" | "exchange") || "return";

  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<"return" | "exchange">(
    initialMode,
  );

  // Exchange specific state
  const [exchangeType, setExchangeType] = useState<CatalogType>("products");
  const [exchangeItems, setExchangeItems] = useState<PendingExchangeItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(0);

  const loadSale = useCallback(async () => {
    try {
      if (!saleId) throw new Error("Sale ID not found");
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      setLoading(true);
      const [saleData, settingsData] = await Promise.all([
        getSale(token, saleId),
        getSettings(token),
      ]);
      setSale(saleData);
      setExchangeRate(settingsData.exchange_rate ?? 0);
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
    setQty((current) =>
      Math.max(1, Math.min(selectedRow.remaining_qty, current)),
    );
  }, [selectedRow]);

  const replacementTotal = useMemo(
    () =>
      exchangeItems.reduce(
        (sum, item) =>
          sum +
          (item.payload.qty || 0) * (item.payload.selling_price || 0) -
          (item.payload.discount || 0),
        0,
      ),
    [exchangeItems],
  );

  const refundValue = useMemo(() => {
    if (!selectedRow) return 0;
    return (
      qty * selectedRow.selling_price -
      (selectedRow.discount_amount / selectedRow.quantity) * qty
    );
  }, [selectedRow, qty]);

  const handlePickedItems = (picked: CatalogItem[]) => {
    setExchangeItems((current) => [
      ...current,
      ...picked.map((item, index) => {
        const built = buildPayload(item);
        // Normalize USD prices to EGP immediately so all downstream
        // calculations (replacementTotal, StatCards, API payload) are in EGP.
        const egpPrice = normalizeToEGP(
          built.payload.selling_price,
          built.currency,
          exchangeRate || 1,
        );
        return {
          id: `${Date.now()}_${current.length + index}`,
          label: built.label,
          kind: built.kind,
          currency: built.currency,
          payload: {
            ...built.payload,
            selling_price: egpPrice,
          },
        };
      }),
    ]);
    setPickerOpen(false);
  };

  const handleSubmit = async () => {
    if (!sale || !selectedRow) return;
    if (activeTab === "exchange" && exchangeItems.length === 0) {
      setError("Please add at least one replacement item for exchange.");
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const finalQty = Math.max(1, Math.min(selectedRow.remaining_qty, qty));
      setBusy(true);

      if (activeTab === "return") {
        await processSaleReturn(token, sale.id, {
          sale_item_id: selectedRow.id,
          qty: finalQty,
          notes: `Return of ${selectedRow.item_label || "Selected Item"}`,
        });
      } else {
        await processSaleExchange(token, sale.id, {
          sale_item_id: selectedRow.id,
          qty: finalQty,
          notes: `Exchange of ${selectedRow.item_label || "Selected Item"}`,
          replacements: exchangeItems.map((item) => ({
            ...item.payload,
            qty: item.kind === "bikes" ? 1 : Math.max(1, item.payload.qty || 1),
          })),
        });
      }

      router.push(`/inventory/sales/${sale.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to process ${activeTab}`,
      );
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
        title={`Manage Items for Sale #${saleId}`}
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
              onClick={handleSubmit}
              disabled={
                busy ||
                !selectedRow ||
                (activeTab === "exchange" && exchangeItems.length === 0)
              }
              className="gap-2"
            >
              <CheckIcon className="w-4 h-4" />
              Confirm {activeTab === "return" ? "Return" : "Exchange"}
            </ActionButton>
          </>
        }
      />

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.3fr] gap-6">
        {/* ── Step 1: Selection ── */}
        <div className="space-y-6">
          <SurfaceCard className="p-0 overflow-hidden shadow-ambient self-start">
            <div className="p-5 border-b border-outline-variant/10">
              <h2 className="text-xl font-semibold text-on-surface">
                1. Select Item
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Select the item you want to modify.
              </p>
            </div>
            <div className="divide-y divide-outline-variant/10">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedItemId(item.id);
                    setQty(1);
                  }}
                  className={`w-full group px-6 py-4 text-left transition-all ${
                    selectedRow?.id === item.id
                      ? "bg-primary/[0.03] ring-1 ring-inset ring-primary/20"
                      : "hover:bg-surface-container-lowest"
                  }`}
                >
                  <div className="flex gap-4">
                    <div
                      className={`mt-1 p-2 rounded-xl transition-colors ${
                        selectedRow?.id === item.id
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      <ShoppingBagIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div
                        className={`font-semibold transition-colors ${
                          selectedRow?.id === item.id
                            ? "text-primary"
                            : "text-on-surface"
                        }`}
                      >
                        {item.item_label || `Item #${item.sellable_id}`}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-on-surface-variant">
                        <span>
                          {labelOf(item.sellable_type)} | Sold: {item.quantity}
                          {item.returned_qty > 0 && (
                            <span className="ml-2 text-warning font-bold">
                              (Rem: {item.remaining_qty})
                            </span>
                          )}
                        </span>
                        <span className="font-bold">
                          EGP{" "}
                          {money(
                            item.quantity * item.selling_price -
                              item.discount_amount,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </SurfaceCard>

          {selectedRow && (
            <StatGrid>
              <StatCard
                label={
                  activeTab === "return" ? "Refund Value" : "Credited Amount"
                }
                value={`EGP ${money(refundValue)}`}
                tone="primary"
              />
              {activeTab === "exchange" && (
                <StatCard
                  label="Exchange Balance"
                  value={`EGP ${money(replacementTotal - refundValue)}`}
                  tone={replacementTotal >= refundValue ? "success" : "danger"}
                  hint={
                    replacementTotal >= refundValue
                      ? "Customer pays diff"
                      : "Store owes credit"
                  }
                />
              )}
            </StatGrid>
          )}
        </div>

        {/* ── Step 2: Configuration ── */}
        <SurfaceCard className="p-5 flex flex-col gap-6 shadow-ambient">
          <div className="flex items-center justify-between gap-4 border-b border-outline-variant/10 pb-5">
            <div>
              <h2 className="text-xl font-semibold text-on-surface">
                2. Configure Logic
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Decide whether to return or exchange the item.
              </p>
            </div>
            <div className="flex p-1 bg-surface-container rounded-xl border border-outline-variant/10">
              <button
                onClick={() => setActiveTab("return")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === "return"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Return
              </button>
              <button
                onClick={() => setActiveTab("exchange")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === "exchange"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Exchange
              </button>
            </div>
          </div>

          {selectedRow ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup
                  label={`Qty to ${activeTab === "return" ? "Return" : "Replace"}`}
                >
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max={selectedRow.remaining_qty}
                      value={qty}
                      onChange={(e) =>
                        setQty(
                          Math.max(
                            1,
                            Math.min(
                              selectedRow.remaining_qty,
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

                {activeTab === "exchange" && (
                  <InputGroup label="Replacement Catalog">
                    <select
                      value={exchangeType}
                      onChange={(e) =>
                        setExchangeType(e.target.value as CatalogType)
                      }
                      className="w-full rounded-xl border border-outline-variant/30 px-4 py-3 bg-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all font-semibold"
                    >
                      <option value="products">Products Gallery</option>
                      <option value="spare_parts">Spare Parts Bin</option>
                      <option value="bikes">Bikes Store</option>
                      <option value="maintenance_services">
                        Maintenance Services
                      </option>
                    </select>
                  </InputGroup>
                )}
              </div>

              {activeTab === "return" ? (
                <div className="rounded-2xl border border-warning/15 bg-warning/5 p-6 flex gap-4">
                  <div className="p-2 bg-warning/10 rounded-full shrink-0">
                    <ArrowUturnLeftIcon className="w-6 h-6 text-warning" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-on-surface">
                      Inventory Reintegration
                    </h3>
                    <p className="text-sm leading-relaxed text-on-surface-variant">
                      This item will be returned to stock. The sale will be
                      marked as{" "}
                      <span className="font-bold text-primary">
                        {qty >= selectedRow.quantity && items.length === 1
                          ? "Returned"
                          : "Partially Returned"}
                      </span>
                      .
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                      Replacement Cart
                    </h3>
                    <ActionButton
                      variant="outline"
                      size="sm"
                      onClick={() => setPickerOpen(true)}
                      className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add Items
                    </ActionButton>
                  </div>

                  <div className="grid gap-4">
                    {exchangeItems.map((row) => (
                      <div
                        key={row.id}
                        className="relative group p-4 rounded-2xl border border-outline-variant/15 bg-surface hover:bg-surface-container-lowest transition-all hover:shadow-sm"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          <div className="md:col-span-12 lg:col-span-5">
                            <div className="font-semibold text-on-surface">
                              {row.label}
                            </div>
                            <StatusBadge
                              tone={getItemTypeTone(row.kind)}
                              className="mt-1 px-1.5 py-0.5 text-[10px]"
                            >
                              {labelOf(row.kind)}
                            </StatusBadge>
                          </div>
                          <div className="md:col-span-4 lg:col-span-2">
                            <InputGroup label="Qty">
                              <input
                                type="number"
                                min="1"
                                disabled={row.kind === "bikes"}
                                value={row.payload.qty || 1}
                                onChange={(e) =>
                                  setExchangeItems((current) =>
                                    current.map((item) =>
                                      item.id === row.id
                                        ? {
                                            ...item,
                                            payload: {
                                              ...item.payload,
                                              qty:
                                                row.kind === "bikes"
                                                  ? 1
                                                  : Math.max(
                                                      1,
                                                      Number(e.target.value) ||
                                                        1,
                                                    ),
                                            },
                                          }
                                        : item,
                                    ),
                                  )
                                }
                                className="w-full rounded-xl border border-outline-variant/30 px-3 py-1.5 bg-surface text-center font-bold tabular-nums text-sm"
                              />
                            </InputGroup>
                          </div>
                          <div className="md:col-span-8 lg:col-span-4 grid grid-cols-2 gap-2">
                            <InputGroup label="Price (EGP)">
                              <input
                                type="number"
                                value={row.payload.selling_price || 0}
                                onChange={(e) =>
                                  setExchangeItems((current) =>
                                    current.map((item) =>
                                      item.id === row.id
                                        ? {
                                            ...item,
                                            payload: {
                                              ...item.payload,
                                              selling_price: Math.max(
                                                0,
                                                Number(e.target.value) || 0,
                                              ),
                                            },
                                          }
                                        : item,
                                    ),
                                  )
                                }
                                className="w-full rounded-xl border border-outline-variant/30 px-2 py-1.5 bg-surface text-right tabular-nums font-medium text-sm"
                              />
                            </InputGroup>
                            <InputGroup label="Disc (EGP)">
                              <input
                                type="number"
                                value={row.payload.discount || 0}
                                onChange={(e) =>
                                  setExchangeItems((current) =>
                                    current.map((item) =>
                                      item.id === row.id
                                        ? {
                                            ...item,
                                            payload: {
                                              ...item.payload,
                                              discount: Math.max(
                                                0,
                                                Number(e.target.value) || 0,
                                              ),
                                            },
                                          }
                                        : item,
                                    ),
                                  )
                                }
                                className="w-full rounded-xl border border-outline-variant/30 px-2 py-1.5 bg-surface text-right tabular-nums text-error font-medium text-sm"
                              />
                            </InputGroup>
                          </div>
                          <div className="md:col-span-12 lg:col-span-1 flex items-end justify-end">
                            <button
                              onClick={() =>
                                setExchangeItems((current) =>
                                  current.filter((item) => item.id !== row.id),
                                )
                              }
                              className="p-2 rounded-xl text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-outline-variant/5 flex justify-between items-center bg-surface-container-lowest -mx-4 -mb-4 px-4 py-2 rounded-b-2xl">
                          <span className="text-xs text-on-surface-variant font-medium">
                            Subtotal
                          </span>
                          <span className="font-bold text-primary tabular-nums">
                            EGP{" "}
                            {money(
                              (row.payload.qty || 0) *
                                (row.payload.selling_price || 0) -
                                (row.payload.discount || 0),
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                    {exchangeItems.length === 0 && (
                      <div className="p-12 rounded-[1.5rem] border border-dashed border-outline-variant/30 flex flex-col items-center justify-center gap-3 bg-surface-container-low/30">
                        <p className="text-sm text-on-surface-variant italic">
                          Add items from catalog to proceed with exchange.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-20 text-center">
              <p className="text-sm text-on-surface-variant italic">
                Select an item on the left to start management.
              </p>
            </div>
          )}
        </SurfaceCard>
      </div>

      <CatalogPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        catalogType={exchangeType}
        onAddItems={handlePickedItems}
      />
    </PageShell>
  );
}
