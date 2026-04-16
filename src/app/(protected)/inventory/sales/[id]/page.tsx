"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import { getSale, deleteSale, type SaleRecord } from "@/lib/crud-api";
import { PageShell, ActionButton } from "@/components/ops-ui";

export default function SaleDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const saleId = params?.id ? Number(params.id) : null;

  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSale = async () => {
      try {
        if (!saleId) throw new Error("Sale ID not found");
        setLoading(true);
        const token = getAuthToken();
        if (!token) throw new Error("Authentication required");

        const saleData = await getSale(token, saleId);
        setSale(saleData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sale");
      } finally {
        setLoading(false);
      }
    };

    loadSale();
  }, [saleId]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this sale?")) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      if (!saleId) return;
      await deleteSale(token, saleId);
      router.push("/inventory/sales");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete sale");
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-80">
          <p className="text-on-surface-variant">Loading...</p>
        </div>
      </PageShell>
    );
  }

  if (error || !sale) {
    return (
      <PageShell>
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-4xl font-display font-600 text-on-surface">Error</h1>
          <div className="rounded-2xl bg-error/10 border border-error/30 px-5 py-3">
            <p className="text-error text-sm">{error || "Sale not found"}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-medium transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-600 text-on-surface mb-2">
              Sale #{sale.id}
            </h1>
            <p className="text-on-surface-variant">
              Created: {new Date(sale.created_at || "").toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                sale.status === "pending"
                  ? "bg-primary/10 text-primary"
                  : "bg-surface-container text-on-surface"
              }`}
            >
              {sale.status}
            </span>
          </div>
        </div>

        {/* Main Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sale Info */}
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6">
            <h2 className="font-display font-600 text-lg text-on-surface mb-4">
              Information
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-on-surface-variant">Customer ID</p>
                <p className="font-medium text-on-surface">{sale.customer_id}</p>
              </div>
              <div>
                <p className="text-on-surface-variant">Seller ID</p>
                <p className="font-medium text-on-surface">{sale.seller_id}</p>
              </div>
              <div>
                <p className="text-on-surface-variant">Sale Type</p>
                <p className="font-medium text-on-surface capitalize">{sale.sale_type}</p>
              </div>
              <div>
                <p className="text-on-surface-variant">Delivery Status</p>
                <p className="font-medium text-on-surface capitalize">{sale.delivery_status}</p>
              </div>
              {sale.is_maintenance && (
                <div className="rounded-lg bg-primary/10 px-3 py-2">
                  <p className="text-primary text-xs font-medium">Marked as Maintenance</p>
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6">
            <h2 className="font-display font-600 text-lg text-on-surface mb-4">
              Totals
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-on-surface-variant text-sm">Shipping Fee</span>
                <span className="font-medium text-on-surface">{sale.shipping_fee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant text-sm">Sale Discount</span>
                <span className="font-medium text-error">-{sale.sale_discount}</span>
              </div>
              <div className="border-t border-outline-variant/15 pt-3 flex justify-between">
                <span className="font-semibold text-on-surface">Total Amount</span>
                <span className="font-display font-600 text-lg text-primary">
                  {sale.total_amount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        {sale.line_items && sale.line_items.length > 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6">
            <h2 className="font-display font-600 text-lg text-on-surface mb-4">
              Line Items ({sale.line_items.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container">
                  <tr className="border-b border-outline-variant/15">
                    <th className="px-4 py-3 text-left font-semibold text-on-surface">ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-on-surface">Type</th>
                    <th className="px-4 py-3 text-right font-semibold text-on-surface">Price</th>
                    <th className="px-4 py-3 text-right font-semibold text-on-surface">Qty</th>
                    <th className="px-4 py-3 text-right font-semibold text-on-surface">Discount</th>
                    <th className="px-4 py-3 text-right font-semibold text-on-surface">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.line_items.map((item) => (
                    <tr key={item.id} className="border-b border-outline-variant/10">
                      <td className="px-4 py-3 text-on-surface">#{item.sellable_id}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {item.sellable_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-on-surface">
                        {item.selling_price}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-on-surface">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-error">
                        -{item.discount_amount}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">
                        {(item.quantity * item.selling_price - item.discount_amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-between">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-medium transition-colors"
          >
            Back
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/inventory/sales/${sale.id}/edit`)}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-medium transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg bg-error/10 hover:bg-error/20 text-error font-medium transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
