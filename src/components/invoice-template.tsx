"use client";

import { SaleRecord } from "@/lib/crud-api";

interface InvoiceTemplateProps {
  sale: SaleRecord;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
}

export function InvoiceTemplate({
  sale,
  companyName = "Real Performance Garage",
  companyEmail = "Crafting the Ultimate Ride",
}: InvoiceTemplateProps) {
  const itemsSubtotal =
    sale.line_items?.reduce(
      (sum, item) => sum + item.remaining_qty * item.selling_price,
      0,
    ) || 0;
  const shippingFee = sale.shipping_fee || 0;
  const saleDiscount = sale.sale_discount || 0;
  const netTotal = sale.total || 0;

  const getStatusTone = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "delivered":
        return "bcomp";
      case "pending":
      case "in-transit":
        return "bpend";
      case "returned":
        return "breturn";
      case "partial":
        return "bpartial";
      case "cancelled":
        return "breturn";
      default:
        return "bpend";
    }
  };

  const padId = (id: number) => String(id).padStart(6, "0");

  const dateObj = sale.created_at ? new Date(sale.created_at) : new Date();
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const formattedTime = dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="receipt-wrapper invoice-template pdf-capture-safe">
      <div className="receipt-page">
        <div className="h-1 bg-accent" aria-hidden="true" />
        <div className="ri">
          <div className="receipt-header">
            <div className="brand-section">
              <div className="logo-box">
                <img
                  src="/logo.ico"
                  alt="RPG"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    if (e.currentTarget.parentElement)
                      e.currentTarget.parentElement.innerHTML =
                        "<span>RPG</span>";
                  }}
                />
              </div>
              <div className="htext">
                <div className="htitle">{companyName}</div>
                <div className="hsub">{companyEmail}</div>
              </div>
            </div>
            <div className="hmeta">
              <div className="rnum mono-data">
                <span>#</span>
                {padId(sale.id)}
              </div>
              <div className="rdate">
                {formattedDate} — {formattedTime}
              </div>
              <div className="rby">
                Processed by{" "}
                {sale.seller?.name || "Seller #" + sale.seller_id}
              </div>
            </div>
          </div>

          <div className="slabel">Transaction Details</div>
          <div className="mgrid">
            <div className="mcell">
              <div className="mlabel">Customer</div>
              <div className="mvalue">
                {sale.customer?.name || "Walk-in Customer"}
              </div>
            </div>
            <div className="mcell">
              <div className="mlabel">Contact</div>
              <div className="mvalue">{sale.customer?.phone || "N/A"}</div>
            </div>
            <div className="mcell">
              <div className="mlabel">Method</div>
              <div className="mvalue">
                <span className="receipt-badge bcard">
                  {sale.payment_method_name || `ID #${sale.payment_method_id}`}
                </span>
              </div>
            </div>
            <div className="mcell">
              <div className="mlabel">Status</div>
              <div className="mvalue">
                <span
                  className={"receipt-badge " + getStatusTone(sale.status)}
                >
                  {sale.status}
                </span>
              </div>
            </div>
          </div>

          <div className="table-section">
            <div className="slabel">Purchased Items</div>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th className="label-caps">Item</th>
                    <th className="label-caps">Type</th>
                    <th className="label-caps r">Qty</th>
                    <th className="label-caps r">Price</th>
                    <th className="label-caps r">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {!sale.line_items || sale.line_items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-row">
                        No items in this transaction
                      </td>
                    </tr>
                  ) : (
                    sale.line_items.map((item) => (
                      <tr
                        key={item.id}
                        className={
                          item.remaining_qty === 0
                            ? "item-fully-returned"
                            : ""
                        }
                      >
                        <td>
                          <div className="iname">
                            {item.item_name || item.item_label}
                            {item.remaining_qty === 0 && (
                              <span className="returned-tag">RETURNED</span>
                            )}
                          </div>
                        </td>
                        <td className="cell-muted">
                          {item.sellable_type.replace(/_/g, " ")}
                        </td>
                        <td className="r mono-data font-semibold">
                          {item.remaining_qty}
                          {item.returned_qty > 0 && item.remaining_qty > 0 && (
                            <div className="cell-subtle">Of {item.quantity}</div>
                          )}
                        </td>
                        <td className="r mono-data">
                          EGP{" "}
                          {item.selling_price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="r istotal mono-data">
                          EGP{" "}
                          {(
                            item.remaining_qty * item.selling_price -
                            (item.discount_amount / item.quantity) *
                              item.remaining_qty
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                          {item.discount_amount > 0 &&
                            item.remaining_qty > 0 && (
                              <div className="discount-note">
                                -
                                {(
                                  (item.discount_amount / item.quantity) *
                                  item.remaining_qty
                                ).toFixed(2)}
                              </div>
                            )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="totals-area">
            <div className="totals-table">
              <div className="trow">
                <span className="lbl">Subtotal</span>
                <span className="amt mono-data">
                  EGP{" "}
                  {itemsSubtotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              {shippingFee > 0 && (
                <div className="trow">
                  <span className="lbl">Handling & Shipping</span>
                  <span className="amt mono-data">
                    EGP{" "}
                    {shippingFee.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}

              {saleDiscount > 0 && (
                <div className="trow disc">
                  <span className="lbl">Promotional Discount</span>
                  <span className="amt mono-data">
                    −EGP{" "}
                    {saleDiscount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}

              <div className="trow grand">
                <span className="lbl">Total Amount</span>
                <span className="amt mono-data">
                  EGP{" "}
                  {netTotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
          <div className="receipt-footer">
            <div className="footer-l">
              <div>
                Items returnable within 30 days with original receipt.
              </div>
              <div>Warranty void if seal is broken or tampered with.</div>
            </div>
            <div className="footer-r">
              <div className="fthanks">Thank you for Choosing RPG</div>
              <div className="ftagline">
                Crafting the Ultimate Ride — {new Date().getFullYear()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
