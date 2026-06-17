"use client";

import { SaleRecord, resolveSaleAddress } from "@/lib/crud-api";

interface ReceiptTemplateProps {
  sale: SaleRecord;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
}

export function ReceiptTemplate({
  sale,
  companyName = "RPG Inventory",
  companyEmail = "contact@rpginventory.com",
  companyPhone = "+1 (555) 000-0000",
}: ReceiptTemplateProps) {
  const calculateLineItemSubtotal = (quantity: number, price: number, discount: number) => {
    return (quantity * price - discount).toFixed(2);
  };

  const calculateItemsSubtotal = () => {
    if (!sale?.line_items) return "0.00";
    return sale.line_items.reduce((sum, item) => {
      return sum + (item.quantity * item.selling_price - item.discount_amount);
    }, 0).toFixed(2);
  };

  const itemsSubtotal = calculateItemsSubtotal();
  const shippingFee = (sale.shipping_fee || 0).toFixed(2);
  const saleDiscount = (sale.sale_discount || 0).toFixed(2);
  const totalAmount = (sale.total || 0).toFixed(2);
  const showCommission =
    sale.status === "completed" && (sale.commission_amount ?? 0) > 0;
  const sellerLabel =
    sale.seller?.name ||
    (sale.seller_id > 0 ? `Seller #${sale.seller_id}` : "—");

  return (
    <div className="receipt-template pdf-capture-safe print-body w-80 bg-surface-container-lowest text-on-surface print:w-full print:max-w-none">
      <div className="receipt-container space-y-3 p-4 print:p-2">
        <div className="h-1 bg-accent" aria-hidden="true" />
        {/* Header */}
        <div className="border-b border-outline-variant/20 pb-3 text-center">
          <p className="print-heading mb-1 text-sm">{companyName}</p>
          <p className="text-caption text-on-surface-variant">{companyEmail}</p>
          <p className="text-caption text-on-surface-variant">{companyPhone}</p>
        </div>

        {/* Receipt Number & Date */}
        <div className="text-caption space-y-1 border-b border-outline-variant/20 pb-2 text-center">
          <p className="mono-data">Receipt #{sale.id}</p>
          <p>{new Date(sale.created_at || "").toLocaleDateString()}</p>
          <p>{new Date(sale.created_at || "").toLocaleTimeString()}</p>
        </div>

        {/* Customer Info */}
        <div className="text-caption space-y-1 border-b border-outline-variant/20 pb-2">
          <p>Customer: {sale.customer?.name ?? `#${sale.customer_id}`}</p>
          {resolveSaleAddress(sale) ? (
            <p>Address: {resolveSaleAddress(sale)}</p>
          ) : null}
          <p>Seller: {sellerLabel}</p>
          <p>Payment: {sale.payment_method_name || "—"}</p>
        </div>

        {/* Items */}
        <div className="text-caption space-y-1 border-b border-outline-variant/20 pb-2">
          {sale.line_items && sale.line_items.length > 0 ? (
            sale.line_items.map((item) => (
              <div key={item.id}>
                <div className="flex justify-between">
                  <span className="flex-1 truncate">{item.item_label || `Item ${item.id}`}</span>
                  <span className="mono-data ml-1 shrink-0">${calculateLineItemSubtotal(item.quantity, item.selling_price, item.discount_amount)}</span>
                </div>
                <div className="text-caption flex justify-between text-on-surface-variant">
                  <span>{item.sellable_type} x{item.quantity}</span>
                  <span className="mono-data">@${item.selling_price.toFixed(2)}</span>
                </div>
                {item.discount_amount > 0 && (
                  <div className="text-caption flex justify-between text-negative ml-2">
                    <span>Discount</span>
                    <span>-${item.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                {(item.commission_amount ?? 0) > 0 && (
                  <div className="text-caption flex justify-between text-primary ml-2">
                    <span>Commission</span>
                    <span className="mono-data">${item.commission_amount!.toFixed(2)}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-on-surface-variant">No items</p>
          )}
        </div>

        {/* Totals */}
        <div className="text-caption space-y-1 border-b border-outline-variant/20 pb-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="mono-data">${itemsSubtotal}</span>
          </div>
          {Number(shippingFee) > 0 && (
            <div className="flex justify-between">
              <span>Shipping:</span>
              <span className="mono-data">${shippingFee}</span>
            </div>
          )}
          {Number(saleDiscount) > 0 && (
            <div className="flex justify-between text-negative">
              <span>Discount:</span>
              <span className="mono-data">-${saleDiscount}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-outline-variant/20 pt-1 font-bold">
            <span>TOTAL:</span>
            <span className="mono-data font-bold">${totalAmount}</span>
          </div>
          {showCommission ? (
            <>
              <div className="flex justify-between pt-1">
                <span>Commission base:</span>
                <span className="mono-data">${(sale.commission_base ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-primary">
                <span>Commission amount:</span>
                <span className="mono-data">${(sale.commission_amount ?? 0).toFixed(2)}</span>
              </div>
            </>
          ) : null}
        </div>

        {/* Payment Method */}
        <div className="text-caption space-y-1 text-center text-on-surface-variant">
          <p>Payment: Method #{sale.payment_method_id}</p>
          <p className="capitalize">Delivery: {sale.delivery_status}</p>
          {sale.is_maintenance && (
            <p className="text-primary">Maintenance Service</p>
          )}
        </div>

        {/* Footer */}
        <div className="text-caption space-y-1 border-t border-outline-variant/20 pt-2 text-center text-on-surface-variant">
          <p>Thank you for your purchase!</p>
          <p>{new Date().toLocaleString()}</p>
          <p>Please retain this receipt</p>
        </div>

        {/* QR Code Placeholder */}
        <div className="border-t border-outline-variant/20 pt-2 text-center">
          <div className="inline-block rounded border border-outline-variant/20 p-2">
            <div className="text-caption flex h-16 w-16 items-center justify-center text-on-surface-variant">
              [QR: #{sale.id}]
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
