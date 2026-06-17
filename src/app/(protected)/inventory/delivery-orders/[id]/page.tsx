"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import { usePermissions } from "@/components/permission-provider";
import { DeliveryAddressCard } from "@/components/delivery-orders/delivery-address-card";
import { DeliveryStatusPanel } from "@/components/delivery-orders/delivery-status-panel";
import { InvoiceTemplate } from "@/components/invoice-template";
import {
  formatDate,
  formatMoney,
  getChannelLabel,
  getDeliveryTone,
  humanizeDeliveryStatus,
  isRemoteSale,
  titleCase,
} from "@/lib/delivery-orders/utils";
import { getSale, type SaleRecord } from "@/lib/crud-api";
import { printInvoiceElement } from "@/lib/pdf-export";
import {
  labelOf,
  money,
} from "@/app/(protected)/inventory/sales/[id]/sale-item-utils";
import {
  ActionButton,
  PageHero,
  PageShell,
  StatCard,
  StatGrid,
  StatusBadge,
  SurfaceCard,
  TabsWrapper,
} from "@/components/ops-ui";
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";

function getItemTypeTone(
  type: string,
): "primary" | "success" | "warning" | "danger" | "default" {
  const value = type.toLowerCase();
  if (value === "products") return "primary";
  if (value === "spare_parts") return "warning";
  if (value === "bikes") return "success";
  if (value === "maintenance_services") return "danger";
  return "default";
}

export default function DeliveryOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const saleId = Number(params?.id);
  const permissions = usePermissions();
  const canUpdateSales = permissions.canUpdate("sales");
  const canExportSales = permissions.canExport("sales");
  const canViewCustomerWorkspace =
    permissions.canReadPage("sales") ||
    permissions.canReadPage("maintenance");

  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("fulfillment");

  const loadSale = useCallback(async () => {
    try {
      if (!saleId) throw new Error("Order ID not found");
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      setLoading(true);
      setSale(await getSale(token, saleId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [saleId]);

  useEffect(() => {
    void loadSale();
  }, [loadSale]);

  const items = useMemo(() => sale?.line_items ?? [], [sale?.line_items]);

  const handlePanelError = (message: string) => {
    setError(message || null);
  };

  const handlePrint = () => {
    if (!sale) return;
    const invoiceElement = document.getElementById("delivery-invoice-export-root");
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
      const invoiceElement = document.getElementById("delivery-invoice-export-root");
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

  if (loading) {
    return (
      <PageShell>
        <div className="flex h-96 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  if (!sale) {
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl rounded-2xl border border-error/30 bg-error/10 p-6 text-error">
          {error || "Delivery order not found"}
        </div>
      </PageShell>
    );
  }

  if (!isRemoteSale(sale)) {
    return (
      <PageShell>
        <SurfaceCard className="mx-auto max-w-2xl p-6">
          <h1 className="text-xl font-semibold text-on-surface">
            Not a remote delivery order
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Sale INV-{sale.id} is an in-store order. Open it from the sales
            workspace instead.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton
              variant="outline"
              onClick={() => router.push("/inventory/delivery-orders")}
            >
              Back to delivery orders
            </ActionButton>
            <ActionButton
              tone="primary"
              onClick={() => router.push(`/inventory/sales/${sale.id}`)}
            >
              View sale
            </ActionButton>
          </div>
        </SurfaceCard>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHero
        eyebrow={`Delivery order INV-${sale.id}`}
        title={sale.customer?.name || `Customer #${sale.customer_id}`}
        subtitle={
          <p className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            <span>{getChannelLabel(sale.sale_type)} order</span>
            <span>·</span>
            <span>Created {formatDate(sale.created_at)}</span>
            {sale.customer_id > 0 && canViewCustomerWorkspace ? (
              <Link
                href={`/customers/${sale.customer_id}`}
                className="inline-flex text-sm font-semibold text-primary hover:underline"
              >
                Customer workspace
              </Link>
            ) : null}
          </p>
        }
        actions={
          <>
            <ActionButton
              variant="outline"
              onClick={() => router.push("/inventory/delivery-orders")}
              className="gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Queue
            </ActionButton>
            <ActionButton
              variant="outline"
              onClick={() => router.push(`/inventory/sales/${sale.id}`)}
              className="gap-2"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              Full sale
            </ActionButton>
            <ActionButton variant="outline" onClick={handlePrint} className="gap-2">
              <PrinterIcon className="h-4 w-4" />
              Print
            </ActionButton>
            {canExportSales ? (
              <ActionButton
                variant="outline"
                onClick={() => void handleExportPDF()}
                disabled={exporting}
                className="gap-2"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                {exporting ? "Exporting..." : "PDF"}
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

      <StatGrid>
        <StatCard
          label="Delivery status"
          value={humanizeDeliveryStatus(sale.delivery_status)}
          tone={getDeliveryTone(sale.delivery_status)}
          hint="Fulfillment progress"
        />
        <StatCard
          label="Payment method"
          value={sale.payment_method_name || "Not set"}
          tone="default"
          hint={titleCase(sale.sale_type)}
        />
        <StatCard
          label="Order total"
          value={formatMoney(sale.total || 0)}
          tone="primary"
          hint={`${items.length} line items`}
        />
        <StatCard
          label="Shipping fee"
          value={formatMoney(sale.shipping_fee || 0)}
          tone="default"
          hint="Handling & delivery"
        />
      </StatGrid>

      <TabsWrapper
        defaultTabId="fulfillment"
        activeTabId={activeTab}
        onTabChange={setActiveTab}
        keepMountedTabIds={["invoice"]}
        tabs={[
          {
            id: "fulfillment",
            label: "Fulfillment",
            content: (
              <div className="grid gap-4 xl:grid-cols-2">
                <DeliveryStatusPanel
                  sale={sale}
                  canUpdate={canUpdateSales}
                  onUpdated={setSale}
                  onError={handlePanelError}
                />
                <DeliveryAddressCard
                  sale={sale}
                  canUpdate={canUpdateSales}
                  onUpdated={setSale}
                  onError={handlePanelError}
                />
              </div>
            ),
          },
          {
            id: "items",
            label: "Line items",
            content: (
              <SurfaceCard className="overflow-hidden p-0 shadow-ambient">
                <div className="border-b border-outline-variant/10 p-5">
                  <h2 className="text-xl font-semibold text-on-surface">
                    Order items
                  </h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Read-only summary. Returns and exchanges are managed from
                    the full sale page.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant/15 bg-surface-container-low text-left text-xs uppercase tracking-wider text-on-surface-variant">
                        <th className="px-6 py-4 font-bold">Item</th>
                        <th className="px-6 py-4 font-bold">Type</th>
                        <th className="px-6 py-4 text-right font-bold">Qty</th>
                        <th className="px-6 py-4 text-right font-bold">Price</th>
                        <th className="px-6 py-4 text-right font-bold">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {items.map((row) => (
                        <tr key={row.id} className="hover:bg-surface-container-lowest">
                          <td className="px-6 py-4 font-medium text-on-surface">
                            {row.item_name || row.item_label}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge tone={getItemTypeTone(row.sellable_type)}>
                              {labelOf(row.sellable_type)}
                            </StatusBadge>
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums">
                            {row.remaining_qty}
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums">
                            EGP {money(row.selling_price)}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-primary tabular-nums">
                            EGP{" "}
                            {money(
                              row.remaining_qty * row.selling_price -
                                (row.discount_amount / row.quantity) *
                                  row.remaining_qty,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-outline-variant/10 p-5">
                  <ActionButton
                    variant="outline"
                    onClick={() => router.push(`/inventory/sales/${sale.id}`)}
                    className="gap-2"
                  >
                    <ShoppingBagIcon className="h-4 w-4" />
                    Manage returns on sale page
                  </ActionButton>
                </div>
              </SurfaceCard>
            ),
          },
          {
            id: "invoice",
            label: "Invoice",
            content: (
              <div
                id="delivery-invoice-export-root"
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
