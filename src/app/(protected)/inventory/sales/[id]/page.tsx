"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import { usePermissions } from "@/components/permission-provider";
import { deleteSale, getSale, type SaleRecord } from "@/lib/crud-api";
import { saleLineItemTypeLabel } from "@/lib/api/sales";
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
import { printInvoiceElement } from "@/lib/pdf-export";
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
import { money } from "./sale-item-utils";
import {
  computeSaleTotalsBreakdown,
  lineDiscountTotal,
  lineNetAmount,
} from "@/lib/sale-line-pricing";
import { titleCase } from "@/lib/delivery-orders/utils";

function getStatusTone(
  status: string,
): "success" | "warning" | "danger" | "default" {
  const s = status.toLowerCase();
  if (s === "completed") return "success";
  if (s === "pending" || s === "partial") return "warning";
  if (s === "cancelled" || s === "returned") return "danger";
  return "default";
}

function getItemTypeTone(
  type: string,
): "primary" | "success" | "warning" | "danger" | "default" {
  const t = type.toLowerCase();
  if (t === "products") return "primary";
  if (t === "spare_parts") return "warning";
  if (t === "bikes") return "success";
  if (t === "maintenance_services") return "danger";
  if (t === "unstored") return "default";
  return "default";
}

export default function SaleDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const saleId = Number(params?.id);
  const permissions = usePermissions();
  const canDeleteSales = permissions.canDelete("sales");
  const canUpdateSales = permissions.canUpdate("sales");
  const canExportSales = permissions.canExport("sales");
  const canViewCustomerWorkspace =
    permissions.canReadPage("sales") ||
    permissions.canReadPage("maintenance");

  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("items");

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
    () => (sale ? computeSaleTotalsBreakdown(sale) : null),
    [sale],
  );

  const handleDelete = async () => {
    if (!permissions.canDelete("sales")) {
      setError("You don't have permission to delete sales.");
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
    if (!sale) return;

    const invoiceElement = document.getElementById("invoice-export-root");
    if (!invoiceElement) {
      setError("Invoice not ready to print.");
      return;
    }

    try {
      printInvoiceElement(
        invoiceElement,
        `Invoice #${String(sale.id).padStart(6, "0")}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to print invoice");
    }
  };

  const handleExportPDF = async () => {
    if (!sale) return;
    try {
      setExporting(true);
      const invoiceElement = document.getElementById("invoice-export-root");
      if (!invoiceElement) throw new Error("Invoice element not found");

      const { exportHtmlElementToPdf } = await import("@/lib/pdf-export");
      const filename = `Invoice-${sale.id}-${new Date().toISOString().split("T")[0]}.pdf`;
      await exportHtmlElementToPdf(invoiceElement, filename);
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

  return (
    <PageShell>
      {/* ── Page Hero ── */}
      <PageHero
        eyebrow={`Order Management for Sale #${sale.id}`}
        title={`Customer: ${sale.customer?.name || `Customer #${sale.customer_id}`}`}
        subtitle={
          <p className="text-sm text-on-surface-variant flex items-center gap-2">
            {'Sale recorded on ' + (sale.created_at ? new Date(sale.created_at).toLocaleDateString() : "N/A")}
            {sale.customer_id > 0 && canViewCustomerWorkspace ? (
              <Link
                href={`/customers/${sale.customer_id}`}
                className="inline-flex text-sm font-semibold text-primary hover:underline"
              >
                View customer history
              </Link>
            ) : null}
          </p>
        }
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
            {canExportSales ? (
              <ActionButton
                variant="outline"
                onClick={handleExportPDF}
                disabled={exporting}
                className="gap-2"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                {exporting ? "Exporting..." : "PDF"}
              </ActionButton>
            ) : null}
            {canDeleteSales ? (
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
            ) : null}
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
          label="Delivery"
          value={titleCase(sale.delivery_status)}
          tone={getStatusTone(sale.delivery_status)}
          hint={sale.payment_method_name || "Payment method not set"}
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
          hint={
            totals
              ? `${totals.units} units | Sub: EGP ${money(totals.netSubtotal)}`
              : undefined
          }
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
        activeTabId={activeTab}
        onTabChange={setActiveTab}
        keepMountedTabIds={["invoice"]}
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
                            {row.is_unstored && row.custom_description ? (
                              <div className="text-xs text-on-surface-variant mt-0.5">
                                {row.custom_description}
                              </div>
                            ) : null}
                            {row.is_unstored && row.cost_price != null ? (
                              <div className="text-xs text-on-surface-variant mt-0.5">
                                Cost: EGP {money(row.cost_price)}
                              </div>
                            ) : (
                              <div className="text-xs text-on-surface-variant">
                                Row ID: {row.id}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge
                              tone={getItemTypeTone(row.sellable_type)}
                            >
                              {saleLineItemTypeLabel(
                                row.sellable_type,
                                row.unstored_type,
                              )}
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
                            {`EGP ${money(lineDiscountTotal(row))}`}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-primary tabular-nums">
                            EGP {money(lineNetAmount(row))}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              {canUpdateSales ? (
                                <>
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
                                </>
                              ) : null}
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
              <div
                id="invoice-export-root"
                className={`mx-auto w-full min-w-0 max-w-[210mm] overflow-x-auto rounded-sm bg-surface-container-lowest shadow-ambient${
                  activeTab === "invoice" ? " a4-sheet-preview" : ""
                }`}
              >
                <InvoiceTemplate sale={sale} />
              </div>
            ),
          },
        ]}
      />
    </PageShell>
  );
}
