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
      (sum, item) => sum + item.quantity * item.selling_price,
      0,
    ) || 0;
  const originalSubtotal = itemsSubtotal;
  const currentSubtotal = itemsSubtotal;
  const hasReturns = false;
  const totalRefundAmount = 0;
  const exchangeAdjustments = 0;
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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Barlow+Condensed:wght@700;800&display=swap');

        :root {
          --primary-red: #c0392b;
          --primary-red-glow: #ff1900;
          --dark-bg: #0f0f0f;
          --surface-light: #ffffff;
          --border-color: #efefef;
          --text-main: #1a1a1a;
          --text-muted: #464646ff;
        }

        .receipt-wrapper { 
          background: transparent; 
          padding: 40px 0; 
          font-family: 'Outfit', sans-serif; 
          display: flex; 
          justify-content: center; 
          width: 100%; 
          color: var(--text-main);
          animation: fadeIn 0.8s ease-out;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .receipt-page { 
          width: 800px; 
          min-width: 800px;
          margin: 0 auto; 
          background: var(--surface-light); 
          position: relative; 
          overflow: hidden; 
          box-shadow: 0 20px 50px rgba(0,0,0,0.08); 
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }

        .receipt-page::before { 
          content: ''; 
          position: absolute; 
          top: 0; 
          left: 0; 
          right: 0; 
          height: 8px; 
          background: linear-gradient(90deg, var(--primary-red) 0%, var(--primary-red-glow) 50%, var(--primary-red) 100%); 
          z-index: 2; 
        }

        .receipt-page::after { 
          content: 'RPG'; 
          position: absolute; 
          top: 50%; 
          left: 50%; 
          transform: translate(-50%, -50%) rotate(-20deg); 
          font-family: 'Barlow Condensed', sans-serif; 
          font-size: 380px; 
          font-weight: 800; 
          color: rgba(0,0,0,0.05); 
          pointer-events: none; 
          user-select: none; 
          z-index: 0;
          white-space: nowrap;
        }
        
        .ri { position: relative; z-index: 1; padding: 48px; }

        .receipt-header { 
          display: flex; 
          align-items: flex-start; 
          justify-content: space-between;
          padding-bottom: 32px; 
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 32px;
        }

        .brand-section { display: flex; align-items: center; gap: 20px; }
        
        .logo-box { 
          width: 72px; 
          height: 72px; 
          background: var(--dark-bg); 
          border-radius: 14px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          flex-shrink: 0; 
          overflow: hidden; 
          box-shadow: 0 8px 16px rgba(0,0,0,0.1);
          transition: transform 0.3s ease;
        }
        
        .logo-box:hover { transform: scale(1.05); }

        .logo-box span { 
          font-family: 'Barlow Condensed', sans-serif; 
          font-weight: 800; 
          font-size: 24px; 
          color: var(--primary-red); 
          letter-spacing: 1px; 
        }

        .htext { }
        .htitle { 
          font-size: 28px; 
          font-weight: 800; 
          color: var(--dark-bg); 
          line-height: 1.1; 
          letter-spacing: -0.5px;
        }
        .hsub { 
          font-size: 13px; 
          font-weight: 500; 
          color: var(--text-muted); 
          text-transform: uppercase; 
          letter-spacing: 2px;
          margin-top: 6px; 
        }

        .hmeta { text-align: right; }
        .rnum { 
          font-family: 'Barlow Condensed', sans-serif; 
          font-size: 32px; 
          font-weight: 700; 
          color: var(--dark-bg); 
          line-height: 1;
        }
        .rnum span { color: var(--primary-red); opacity: 0.8; margin-right: 2px; }
        .rdate { font-size: 13px; color: var(--text-muted); margin-top: 8px; font-weight: 500; }
        .rby { font-size: 11px; color: var(--text-muted); margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }

        .slabel { 
          font-family: 'Barlow Condensed', sans-serif; 
          font-size: 12px; 
          font-weight: 800; 
          letter-spacing: 3px; 
          text-transform: uppercase; 
          color: var(--text-muted);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .slabel::after {
          content: '';
          height: 1px;
          flex: 1;
          background: var(--border-color);
        }

        .mgrid { 
          display: grid; 
          grid-template-columns: repeat(4, 1fr); 
          gap: 1px;
          background: var(--border-color);
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border-color);
          margin-bottom: 32px;
        }
        
        .mcell { 
          padding: 20px; 
          background: #fff;
          transition: background 0.2s ease;
        }
        
        .mcell:hover { background: #fafafa; }

        .mlabel { 
          font-size: 11px; 
          font-weight: 700; 
          letter-spacing: 1.5px; 
          text-transform: uppercase; 
          color: var(--text-muted); 
          margin-bottom: 8px; 
        }
        
        .mvalue { font-size: 14px; font-weight: 600; color: var(--dark-bg); }

        .receipt-badge { 
          display: inline-flex; 
          align-items: center;
          padding: 4px 12px; 
          border-radius: 6px; 
          font-size: 11px; 
          font-weight: 700; 
          letter-spacing: 0.5px; 
          text-transform: uppercase; 
        }
        
        .bcomp { background: #ecfdf5; color: #059669; }
        .bpend { background: #fffbeb; color: #d97706; }
        .breturn { background: #fef2f2; color: #dc2626; }
        .bpartial { background: #f0f9ff; color: #0284c7; }
        .bcard { background: #f5f3ff; color: #7c3aed; }

        .table-section { margin-bottom: 40px; }
        .receipt-wrapper table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .receipt-wrapper thead th { 
          padding: 16px; 
          text-align: left; 
          font-size: 11px; 
          font-weight: 700; 
          text-transform: uppercase; 
          letter-spacing: 2px; 
          color: var(--text-muted);
          border-bottom: 2px solid var(--dark-bg);
        }
        .receipt-wrapper th.r { text-align: right; }
        
        .receipt-wrapper tbody tr { transition: background 0.2s ease; }
        .receipt-wrapper tbody tr:hover { background: #fcfcfc; }
        .receipt-wrapper td { padding: 16px; vertical-align: middle; border-bottom: 1px solid var(--border-color); }
        .receipt-wrapper td.r { text-align: right;}
        
        .iname { font-weight: 700; font-size: 15px; color: var(--dark-bg); }
        .isub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
        .istotal { font-weight: 700; color: var(--dark-bg); font-size: 15px; }

        .totals-area { 
          display: flex; 
          justify-content: flex-end; 
          gap: 48px;
          padding-top: 24px;
        }

        .totals-table { width: 100%; max-width: 320px; }
        .trow { 
          display: flex; 
          justify-content: space-between; 
          padding: 10px 0; 
          font-size: 14px; 
        }
        .trow .lbl { color: var(--text-muted); font-weight: 500; }
        .trow .amt { font-weight: 600; color: var(--dark-bg); }
        .trow.disc .amt { color: var(--primary-red); }
        
        .trow.grand { 
          margin-top: 16px; 
          padding: 20px; 
          background: var(--dark-bg);
          border-radius: 12px;
          color: #fff;
        }
        .trow.grand .lbl { 
          font-size: 13px; 
          font-weight: 700; 
          text-transform: uppercase; 
          letter-spacing: 2px; 
          color: rgba(255,255,255,0.6); 
        }
        .trow.grand .amt { 
          font-size: 26px; 
          font-weight: 800; 
          color: #fff; 
        }

        .official-seal {
          position: absolute;
          bottom: 100px;
          right: 50px;
          width: 120px;
          height: 120px;
          border: 4px double var(--primary-red);
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          opacity: 0.15;
          transform: rotate(-15deg);
          pointer-events: none;
        }
        
        .official-seal span {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 800;
          font-size: 14px;
          color: var(--primary-red);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .receipt-footer { 
          margin-top: 64px; 
          padding-top: 32px; 
          border-top: 1px solid var(--border-color); 
          display: flex; 
          justify-content: space-between; 
          align-items: center;
        }
        
        .footer-l { font-size: 12px; color: var(--text-muted); line-height: 1.6; }
        .footer-r { text-align: right; }
        .fthanks { font-weight: 800; font-size: 16px; color: var(--dark-bg); text-transform: uppercase; letter-spacing: 1px; }
        .ftagline { font-size: 11px; color: var(--text-muted); margin-top: 4px; font-weight: 500; }


        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .receipt-wrapper { 
            padding: 0 !important; 
            background: #fff !important;
            display: block !important;
          }
          .receipt-page { 
            width: 210mm !important;
            min-height: 297mm !important;
            box-shadow: none !important; 
            border: none !important; 
            margin: 0 auto !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          .ri { padding: 15mm !important; }
          .official-seal { opacity: 0.12 !important; }
          .trow.grand { background: #000 !important; color: #fff !important; }
        }
      `}</style>

      <div className="receipt-wrapper">
        <div className="receipt-page">
          <div className="ri">
            <div className="receipt-header">
              <div className="brand-section">
                <div className="logo-box">
                  <img
                    src="/favicon.ico"
                    alt="RPG"
                    className="w-full h-full object-contain"
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
                <div className="rnum">
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
                    ID #{sale.payment_method_id}
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
                      <th>Product Details</th>
                      <th className="r">Qty</th>
                      <th className="r">Unit</th>
                      <th className="r">Price</th>
                      <th className="r">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!sale.line_items || sale.line_items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center"
                          style={{ color: "#aaa", padding: "40px" }}
                        >
                          No items in this transaction
                        </td>
                      </tr>
                    ) : (
                      sale.line_items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="iname">
                              {item.item_label}
                            </div>
                          </td>
                          <td className="r" style={{ fontWeight: 600 }}>
                            {item.quantity}
                          </td>
                          <td
                            className="r"
                            style={{
                              fontSize: "11px",
                              color: "#888",
                              textTransform: "uppercase",
                            }}
                          >
                            {item.sellable_type.split("_")[0]}
                          </td>
                          <td className="r">
                            EGP{" "}
                            {item.selling_price.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="r istotal">
                            EGP{" "}
                            {(
                              item.quantity * item.selling_price -
                              (item.discount_amount || 0)
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                            {item.discount_amount > 0 && (
                              <div
                                style={{
                                  color: "var(--primary-red)",
                                  fontSize: "10px",
                                  fontWeight: 500,
                                }}
                              >
                                -{item.discount_amount.toFixed(2)}
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
                  <span className="amt">
                    EGP{" "}
                    {itemsSubtotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {shippingFee > 0 && (
                  <div className="trow">
                    <span className="lbl">Handling & Shipping</span>
                    <span className="amt">
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
                    <span className="amt">
                      −EGP{" "}
                      {saleDiscount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                <div className="trow grand">
                  <span className="lbl">Total Amount</span>
                  <span className="amt">
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
    </>
  );
}
