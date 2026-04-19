"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAuthToken, getAuthUser } from "@/lib/auth-session";
import { deleteSale, getSale, type SaleRecord } from "@/lib/crud-api";
import {
  PageShell,
  ActionButton,
  SurfaceCard,
  PageHero,
  StatGrid,
  StatCard,
  DataTableCard,
  TabsWrapper,
  StatusBadge,
} from "@/components/ops-ui";
import { InvoiceTemplate } from "@/components/invoice-template";
import {
  ArrowLeftIcon,
  ArrowPathRoundedSquareIcon,
  ArrowUturnLeftIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  TrashIcon,
  ShoppingBagIcon,
  UserIcon,
  BanknotesIcon,
  HashtagIcon,
} from "@heroicons/react/24/outline";
import { money, labelOf } from "./sale-item-utils";

function getStatusTone(status: string): "success" | "warning" | "danger" | "default" {
  const s = status.toLowerCase();
  if (s === "completed") return "success";
  if (s === "pending" || s === "partial") return "warning";
  if (s === "cancelled" || s === "returned") return "danger";
  return "default";
}

function getItemTypeTone(type: string): "primary" | "success" | "warning" | "danger" | "default" {
  const t = type.toLowerCase();
  if (t === "products") return "primary";
  if (t === "spare_parts") return "warning";
  if (t === "bikes") return "success";
  if (t === "maintenance_services") return "danger";
  return "default";
}

export default function SaleDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const saleId = Number(params?.id);
  const isAdmin = getAuthUser()?.role?.toLowerCase() === "admin";

  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);

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
  const totals = useMemo(
    () => ({
      units: items.reduce((sum, item) => sum + item.remaining_qty, 0),
      subtotal: items.reduce(
        (sum, item) =>
          sum + (item.remaining_qty * item.selling_price) - 
          ((item.discount_amount / item.quantity) * item.remaining_qty),
        0,
      ),
    }),
    [items],
  );

  const handleDelete = async () => {
    if (!isAdmin) {
      setError("Only admin users can delete sales.");
      return;
    }
    if (!confirm("Are you sure you want to delete this sale?")) return;
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      if (!saleId) throw new Error("Sale ID not found");
      setBusy(true);
      await deleteSale(token, saleId);
      router.push("/inventory/sales");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete sale");
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setIsPrinting(false), 500);
    }, 150);
  };

  const handleExportPDF = async () => {
    if (!sale) return;
    try {
      setExporting(true);
      const invoiceElement = document.getElementById("invoice-export-root");
      if (!invoiceElement) throw new Error("Invoice element not found");

      const { default: html2canvas } = await import("html2canvas");
      const jspdf = await import("jspdf").then((m) => m.jsPDF);

      const canvas = await html2canvas(invoiceElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jspdf({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `Invoice-${sale.id}-${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-96">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </PageShell>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────────
  if (!sale) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto rounded-2xl border border-error/30 bg-error/10 p-6 text-error">
          {error || "Sale not found"}
        </div>
      </PageShell>
    );
  }

  // ─── Print Mode — Fullscreen template, no chrome ────────────────────────────
  if (isPrinting) {
    return (
      <div className="bg-white min-h-screen p-8">
        <div id="invoice-export-root">
          <InvoiceTemplate sale={sale} />
        </div>
      </div>
    );
  }

  // ─── Normal Page View ─────────────────────────────────────────────────────────
  return (
    <PageShell>
      {/* ── Page Hero ── */}
      <PageHero
        eyebrow="Order Management"
        title={`Sale #${sale.id}`}
        description={`Customer: ${sale.customer?.name || `Customer #${sale.customer_id}`}. Sale recorded on ${sale.created_at ? new Date(sale.created_at).toLocaleDateString() : "N/A"}.`}
        actions={
          <>
            <ActionButton
              variant="outline"
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back
            </ActionButton>
            <div className="h-6 w-px bg-outline-variant/20 mx-1 hidden sm:block" />
            <ActionButton
              variant="outline"
              onClick={handlePrint}
              className="gap-2"
            >
              <PrinterIcon className="w-4 h-4" />
              Print
            </ActionButton>
            <ActionButton
              variant="outline"
              onClick={handleExportPDF}
              disabled={exporting}
              className="gap-2"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              {exporting ? "Exporting..." : "PDF"}
            </ActionButton>
            {isAdmin && (
              <ActionButton
                variant="outline"
                tone="danger"
                onClick={handleDelete}
                disabled={busy}
                className="gap-2"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </ActionButton>
            )}
          </>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-error/30 bg-error-container p-4 text-sm text-on-error-container">
          {error}
        </div>
      ) : null}

      {/* ── Status Stats ── */}
      <StatGrid>
        <StatCard
          label="Status"
          value={sale.status.toUpperCase()}
          tone={getStatusTone(sale.status)}
          hint={`Delivery: ${sale.delivery_status}`}
        />
        <StatCard
          label="Customer"
          value={sale.customer?.name || `ID: ${sale.customer_id}`}
          hint={sale.customer?.phone || "No phone provided"}
        />
        <StatCard
          label="Total Amount"
          value={`EGP ${money(sale.total || 0)}`}
          tone="primary"
          hint={`${totals.units} units | Sub: EGP ${money(totals.subtotal)}`}
        />
        <StatCard
          label="Order Type"
          value={sale.is_maintenance ? "Maintenance" : "Retail Sale"}
          hint={`Discount: EGP ${money(sale.sale_discount || 0)}`}
        />
      </StatGrid>

      {/* ── Main Content Tabs ── */}
      <TabsWrapper
        defaultTabId="items"
        tabs={[
          {
            id: "items",
            label: "Manage Items",
            content: (
              <SurfaceCard className="p-0 overflow-hidden shadow-ambient">
                <div className="p-5 border-b border-outline-variant/10 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xl font-semibold text-on-surface">
                      Sale Line Items
                    </h2>
                    <p className="text-sm text-on-surface-variant mt-1">
                      Review items, manage returns, and process exchanges.
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-sm table-fixed">
                    <thead>
                      <tr className="border-b border-outline-variant/15 text-xs uppercase tracking-wider text-on-surface-variant bg-surface-container-low">
                        <th className="px-6 py-4 text-left font-bold w-1/3">
                          Item
                        </th>
                        <th className="px-6 py-4 text-left font-bold">Type</th>
                        <th className="px-6 py-4 text-right font-bold w-24">
                          Sold
                        </th>
                        <th className="px-6 py-4 text-right font-bold w-24">
                          Rem
                        </th>
                        <th className="px-6 py-4 text-right font-bold">
                          Price
                        </th>
                        <th className="px-6 py-4 text-right font-bold">
                          Discount
                        </th>
                        <th className="px-6 py-4 text-right font-bold">
                          Net Sub
                        </th>
                        <th className="px-6 py-4 text-right font-bold w-32">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {items.map((row) => (
                        <tr
                          key={row.id}
                          className="hover:bg-surface-container-lowest transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="font-semibold text-on-surface group-hover:text-primary transition-colors">
                              {row.item_name || row.item_label}
                            </div>
                            <div className="text-xs text-on-surface-variant">
                              Row ID: {row.id}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge
                              tone={getItemTypeTone(row.sellable_type)}
                            >
                              {labelOf(row.sellable_type)}
                            </StatusBadge>
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums">
                            {row.quantity}
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums font-bold text-primary">
                            {row.remaining_qty}
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums">
                            {`EGP ${money(row.selling_price)}`}
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums text-error/70">
                            {`EGP ${money((row.discount_amount / row.quantity) * row.remaining_qty)}`}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-primary tabular-nums">
                            EGP{" "}
                            {money(
                              row.remaining_qty * row.selling_price -
                                (row.discount_amount / row.quantity) * row.remaining_qty,
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <ActionButton
                                variant="outline"
                                size="sm"
                                title="Process Return"
                                onClick={() =>
                                  router.push(
                                    `/inventory/sales/${sale.id}/manage?item=${row.id}&mode=return`,
                                  )
                                }
                              >
                                <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                              </ActionButton>
                              <ActionButton
                                variant="outline"
                                size="sm"
                                title="Process Exchange"
                                onClick={() =>
                                  router.push(
                                    `/inventory/sales/${sale.id}/manage?item=${row.id}&mode=exchange`,
                                  )
                                }
                              >
                                <ArrowPathRoundedSquareIcon className="w-3.5 h-3.5" />
                              </ActionButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>
            ),
          },
          {
            id: "invoice",
            label: "Invoice Preview",
            content: (
              <SurfaceCard className="flex flex-col items-center bg-surface-container p-6 md:p-12 overflow-hidden">
                <div className="w-full max-w-[210mm] bg-white shadow-2xl rounded-sm overflow-hidden scale-[0.85] sm:scale-100 origin-top">
                  <div id="invoice-export-root">
                    <InvoiceTemplate sale={sale} />
                  </div>
                </div>
              </SurfaceCard>
            ),
          },
        ]}
      />
    </PageShell>
  );
}
