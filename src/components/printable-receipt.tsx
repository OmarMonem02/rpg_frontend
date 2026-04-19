"use client";

import { SaleRecord } from "@/lib/crud-api";

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

  return (
    <div className="w-80 bg-white text-on-surface font-mono text-xs print:w-full print:max-w-none">
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .receipt-container {
            width: 80mm;
            margin: 0 auto;
            padding: 0;
            background: white;
            box-shadow: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="receipt-container p-4 print:p-2 space-y-3">
        {/* Header */}
        <div className="text-center border-b border-on-surface/20 pb-3">
          <p className="font-bold text-sm mb-1">{companyName}</p>
          <p className="text-[10px] text-on-surface-variant">{companyEmail}</p>
          <p className="text-[10px] text-on-surface-variant">{companyPhone}</p>
        </div>

        {/* Receipt Number & Date */}
        <div className="text-center border-b border-on-surface/20 pb-2 space-y-1 text-[10px]">
          <p>Receipt #{sale.id}</p>
          <p>{new Date(sale.created_at || "").toLocaleDateString()}</p>
          <p>{new Date(sale.created_at || "").toLocaleTimeString()}</p>
        </div>

        {/* Customer Info */}
        <div className="text-[10px] space-y-1 pb-2 border-b border-on-surface/20">
          <p>Customer: #{sale.customer_id}</p>
          <p>Seller: #{sale.seller_id}</p>
          <p className="uppercase">Status: {sale.status}</p>
        </div>

        {/* Items */}
        <div className="space-y-1 text-[10px] pb-2 border-b border-on-surface/20">
          {sale.line_items && sale.line_items.length > 0 ? (
            sale.line_items.map((item) => (
              <div key={item.id}>
                <div className="flex justify-between">
                  <span className="flex-1 truncate">{item.item_label || `Item ${item.id}`}</span>
                  <span className="ml-1 flex-shrink-0">${calculateLineItemSubtotal(item.quantity, item.selling_price, item.discount_amount)}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant text-[9px]">
                  <span>{item.sellable_type} x{item.quantity}</span>
                  <span>@${item.selling_price.toFixed(2)}</span>
                </div>
                {item.discount_amount > 0 && (
                  <div className="flex justify-between text-red-600 text-[9px] ml-2">
                    <span>Discount</span>
                    <span>-${item.discount_amount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-on-surface-variant">No items</p>
          )}
        </div>

        {/* Totals */}
        <div className="space-y-1 text-[10px] border-b border-on-surface/20 pb-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${itemsSubtotal}</span>
          </div>
          {Number(shippingFee) > 0 && (
            <div className="flex justify-between">
              <span>Shipping:</span>
              <span>${shippingFee}</span>
            </div>
          )}
          {Number(saleDiscount) > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount:</span>
              <span>-${saleDiscount}</span>
            </div>
          )}
          <div className="flex justify-between font-bold pt-1 border-t border-on-surface/20">
            <span>TOTAL:</span>
            <span>${totalAmount}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="text-center text-[10px] text-on-surface-variant space-y-1">
          <p>Payment: Method #{sale.payment_method_id}</p>
          <p className="capitalize">Delivery: {sale.delivery_status}</p>
          {sale.is_maintenance && (
            <p className="text-primary">⚙️ Maintenance Service</p>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[9px] text-on-surface-variant border-t border-on-surface/20 pt-2 space-y-1">
          <p>Thank you for your purchase!</p>
          <p className="text-[8px]">{new Date().toLocaleString()}</p>
          <p className="text-[8px]">Please retain this receipt</p>
        </div>

        {/* QR Code Placeholder */}
        <div className="text-center pt-2 border-t border-on-surface/20">
          <div className="inline-block p-2 border border-on-surface/20 rounded">
            <div className="w-16 h-16 flex items-center justify-center text-[8px] text-on-surface-variant">
              [QR: #{sale.id}]
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
