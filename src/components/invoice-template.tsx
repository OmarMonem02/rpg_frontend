"use client";

import { SaleRecord, saleLineItemTypeLabel, resolveSaleAddress } from "@/lib/crud-api";
import {
  computeSaleTotalsBreakdown,
  lineDiscountTotal,
  lineNetAmount,
} from "@/lib/sale-line-pricing";

export type InvoiceTemplateProps = {
  sale: SaleRecord;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  documentTitle?: string;
  referenceLabel?: string;
};

function padId(id: number) {
  return String(id).padStart(6, "0");
}

function formatEgp(amount: number) {
  return `EGP ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function formatEgpDeduction(amount: number) {
  return `−EGP ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function humanizeSaleType(sale: SaleRecord) {
  if (sale.is_maintenance) return "Maintenance";
  const type = sale.sale_type?.toLowerCase() ?? "";
  if (type === "online") return "Online";
  if (type === "delivery") return "Delivery";
  if (type === "site") return "In-store";
  if (type === "maintenance") return "Maintenance";
  return sale.sale_type?.replace(/_/g, " ") || "Retail";
}

function humanizeDeliveryStatus(status: string) {
  const s = status.toLowerCase().replace(/_/g, " ");
  if (s === "in transit") return "In transit";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getTypeBadgeClass(type: string) {
  switch (type) {
    case "products":
      return "bprod";
    case "spare_parts":
      return "bspare";
    case "bikes":
      return "bbike";
    case "maintenance_services":
      return "bservice";
    default:
      return "bcard";
  }
}

export function InvoiceTemplate({
  sale,
  companyName = "Real Performance Garage",
  companyEmail = "Crafting the Ultimate Ride",
  companyPhone,
  documentTitle,
  referenceLabel,
}: InvoiceTemplateProps) {
  const isMaintenance = sale.is_maintenance;
  const resolvedDocumentTitle =
    documentTitle ?? (isMaintenance ? "Maintenance Invoice" : "Invoice");
  const resolvedReferenceLabel =
    referenceLabel ?? (isMaintenance ? "Ticket #" : "Invoice #");
  const saleAddress = resolveSaleAddress(sale);

  const totals = computeSaleTotalsBreakdown(sale);
  const {
    grossSubtotal: itemsSubtotal,
    lineDiscountTotal: lineItemDiscounts,
    netSubtotal,
    shipping: shippingFee,
    saleDiscount,
    units: totalUnits,
  } = totals;
  const netTotal = sale.total || 0;
  const amountPaid = sale.amount_paid ?? 0;
  const remainingBalance = Math.max(0, netTotal - amountPaid);
  const hasOutstandingBalance =
    sale.amount_paid != null && remainingBalance > 0.005;
  const showCommission =
    sale.status === "completed" && (sale.commission_amount ?? 0) > 0;

  const activeLineItems =
    sale.line_items?.filter((item) => item.remaining_qty > 0) ?? [];
  const showNetSubtotal = lineItemDiscounts > 0;

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

  const sellerLabel =
    sale.seller?.name ||
    (sale.seller_id > 0 ? `Seller #${sale.seller_id}` : "—");

  const paymentMethodLabel =
    sale.payment_method_name ||
    (sale.payment_method_id > 0 ? `Method #${sale.payment_method_id}` : "—");

  return (
    <div className="receipt-wrapper invoice-template pdf-capture-safe">
      <div className="receipt-page a4-page">
        <div className="invoice-accent-bar" aria-hidden="true" />
        <div className="ri">
          <header className="invoice-doc-header">
            <div className="invoice-brand">
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
                {companyPhone ? (
                  <div className="hcontact">{companyPhone}</div>
                ) : null}
              </div>
            </div>
            <div className="invoice-doc-meta">
              <div className="invoice-doc-title">{resolvedDocumentTitle}</div>
              <div className="rnum mono-data">
                <span className="ref-label">{resolvedReferenceLabel}</span>
                {padId(sale.id)}
              </div>
              <div className="rdate">
                {formattedDate}
                <span className="rdate-sep"> · </span>
                {formattedTime}
              </div>
              <div className="rby">Processed by {sellerLabel}</div>
            </div>
          </header>

          <section className="invoice-parties" aria-label="Billing and order details">
            <div className="invoice-bill-to">
              <div className="slabel">Bill to</div>
              <div className="party-name">
                {sale.customer?.name || "Walk-in Customer"}
              </div>
              <dl className="party-details">
                <div className="party-row">
                  <dt>Phone</dt>
                  <dd>{sale.customer?.phone || "N/A"}</dd>
                </div>
                {saleAddress ? (
                  <div className="party-row">
                    <dt>Address</dt>
                    <dd>{saleAddress}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
            <div className="invoice-order-details">
              <div className="slabel">Order details</div>
              <dl className="party-details">
                <div className="party-row">
                  <dt>Payment</dt>
                  <dd>
                    <span className="receipt-badge bcard">
                      {sale.payment_method_name ||
                        (sale.payment_method_id > 0
                          ? `Method #${sale.payment_method_id}`
                          : "N/A")}
                    </span>
                  </dd>
                </div>
                <div className="party-row">
                  <dt>Delivery</dt>
                  <dd>{humanizeDeliveryStatus(sale.delivery_status)}</dd>
                </div>
                <div className="party-row">
                  <dt>Channel</dt>
                  <dd>{humanizeSaleType(sale)}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="table-section invoice-items" aria-label="Line items">
            <div className="slabel">Purchased items</div>
            <div className="table-responsive">
              <table className="invoice-items-table">
                <colgroup>
                  <col className="col-line" />
                  <col className="col-item" />
                  <col className="col-type" />
                  <col className="col-qty" />
                  <col className="col-price" />
                  <col className="col-amount" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="label-caps col-line-h" scope="col">
                      #
                    </th>
                    <th className="label-caps" scope="col">
                      Item
                    </th>
                    <th className="label-caps" scope="col">
                      Type
                    </th>
                    <th className="label-caps r" scope="col">
                      Qty
                    </th>
                    <th className="label-caps r" scope="col">
                      Unit price
                    </th>
                    <th className="label-caps r" scope="col">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!sale.line_items || sale.line_items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-row">
                        No items in this transaction
                      </td>
                    </tr>
                  ) : (
                    sale.line_items.map((item, index) => {
                      const lineAmount = lineNetAmount(item);
                      const lineDiscount =
                        item.discount_amount > 0 && item.remaining_qty > 0
                          ? lineDiscountTotal(item)
                          : 0;

                      return (
                        <tr
                          key={item.id}
                          className={
                            item.remaining_qty === 0
                              ? "item-fully-returned"
                              : undefined
                          }
                        >
                          <td
                            className="td-line mono-data r"
                            data-label="#"
                          >
                            {index + 1}
                          </td>
                          <td className="td-item" data-label="Item">
                            <div className="iname">
                              {item.item_name || item.item_label}
                              {item.remaining_qty === 0 ? (
                                <span className="returned-tag">RETURNED</span>
                              ) : null}
                            </div>
                            {item.is_unstored && item.custom_description ? (
                              <div className="text-xs text-on-surface-variant mt-1 leading-snug">
                                {item.custom_description}
                              </div>
                            ) : null}
                          </td>
                          <td className="td-type" data-label="Type">
                            <span
                              className={`receipt-badge type-badge ${getTypeBadgeClass(item.sellable_type)}`}
                            >
                              {saleLineItemTypeLabel(
                                item.sellable_type,
                                item.unstored_type,
                              )}
                            </span>
                          </td>
                          <td
                            className="r mono-data font-semibold"
                            data-label="Qty"
                          >
                            {item.remaining_qty}
                            {item.returned_qty > 0 && item.remaining_qty > 0 ? (
                              <div className="cell-subtle">
                                of {item.quantity}
                              </div>
                            ) : null}
                          </td>
                          <td className="r mono-data" data-label="Unit price">
                            {formatEgp(item.selling_price)}
                          </td>
                          <td
                            className="r istotal mono-data td-amount"
                            data-label="Amount"
                          >
                            {formatEgp(lineAmount)}
                            {lineDiscount > 0 ? (
                              <div className="discount-note">
                                {formatEgpDeduction(lineDiscount)}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="totals-area" aria-label="Order summary">
            <div className="totals-panel">
              <div className="slabel totals-heading">Order summary</div>
              <div className="totals-table">
                <div className="trow">
                  <span className="lbl">
                    Subtotal
                    {totalUnits > 0 ? (
                      <span className="totals-meta">
                        {totalUnits} {totalUnits === 1 ? "item" : "items"}
                        {activeLineItems.length !== totalUnits
                          ? ` · ${activeLineItems.length} lines`
                          : ""}
                      </span>
                    ) : null}
                  </span>
                  <span className="amt mono-data">{formatEgp(itemsSubtotal)}</span>
                </div>

                {lineItemDiscounts > 0 ? (
                  <div className="trow disc">
                    <span className="lbl">Line discounts</span>
                    <span className="amt mono-data">
                      {formatEgpDeduction(lineItemDiscounts)}
                    </span>
                  </div>
                ) : null}

                {showNetSubtotal ? (
                  <div className="trow">
                    <span className="lbl">Net subtotal</span>
                    <span className="amt mono-data">{formatEgp(netSubtotal)}</span>
                  </div>
                ) : null}

                {shippingFee > 0 ? (
                  <div className="trow">
                    <span className="lbl">Handling &amp; shipping</span>
                    <span className="amt mono-data">{formatEgp(shippingFee)}</span>
                  </div>
                ) : null}

                {saleDiscount > 0 ? (
                  <div className="trow disc">
                    <span className="lbl">Promotional discount</span>
                    <span className="amt mono-data">
                      {formatEgpDeduction(saleDiscount)}
                    </span>
                  </div>
                ) : null}
                <div className="totals-divider" aria-hidden="true" />

                {hasOutstandingBalance ? (
                  <>
                    <div className="trow">
                      <span className="lbl">Invoice total</span>
                      <span className="amt mono-data">{formatEgp(netTotal)}</span>
                    </div>
                    <div className="trow paid">
                      <span className="lbl">Amount paid</span>
                      <span className="amt mono-data">{formatEgp(amountPaid)}</span>
                    </div>
                    <div className="trow grand balance-due">
                      <span className="lbl">
                        Remaining balance
                        <span className="totals-status">Balance due</span>
                      </span>
                      <span className="amt mono-data">
                        {formatEgp(remainingBalance)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="trow grand">
                    <span className="lbl">
                      Total due
                      <span className="totals-status">{paymentMethodLabel}</span>
                    </span>
                    <span className="amt mono-data">{formatEgp(netTotal)}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <footer className="receipt-footer invoice-footer">
            <div className="footer-l">
              <p className="footer-policy">
                Items returnable within 30 days with original receipt.
              </p>
              <p className="footer-policy">
                Warranty void if seal is broken or tampered with.
              </p>
              {companyPhone ? (
                <p className="footer-contact">Questions? Call {companyPhone}</p>
              ) : null}
            </div>
            <div className="footer-r">
              <div className="fthanks">Thank you for choosing RPG</div>
              <div className="ftagline">
                {companyEmail} — {new Date().getFullYear()}
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
