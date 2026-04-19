"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import { getSale, deleteSale, type SaleRecord } from "@/lib/crud-api";
import { PageShell, ActionButton } from "@/components/ops-ui";
import { InvoiceTemplate } from "@/components/invoice-template";
import {
  ArrowLeftIcon,
  TrashIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";

export default function SaleDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const saleId = params?.id ? Number(params.id) : null;

  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);

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

      // @ts-ignore
      const { default: html2canvas } = await import("html2canvas");
      // @ts-ignore
      const jspdf = await import("jspdf").then((m) => m.jsPDF);

      const canvas = await html2canvas(invoiceElement, {
        scale: 3, // Increased scale for even better clarity
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc: Document) => {
          const clonedRootElement = clonedDoc.getElementById("invoice-export-root");
          const originalRootElement = document.getElementById("invoice-export-root");
          
          if (clonedRootElement && originalRootElement) {
            // 1. Resolve and inject CSS variables globally into the cloned document
            // This helps with pseudo-elements and situations where element-level freezing misses something
            const styleSheet = clonedDoc.createElement("style");
            const rootStyle = window.getComputedStyle(document.documentElement);
            const variables = [
              "--primary-red", "--primary-red-glow", "--dark-bg", 
              "--surface-light", "--border-color", "--text-main", "--text-muted"
            ];
            
            let cssVars = ":root { ";
            variables.forEach(v => {
              cssVars += `${v}: ${rootStyle.getPropertyValue(v)}; `;
            });
            cssVars += "}";
            styleSheet.innerText = cssVars;
            clonedDoc.head.appendChild(styleSheet);

            const clonedElements = clonedRootElement.getElementsByTagName("*");
            const originalElements = originalRootElement.getElementsByTagName("*");
            
            // 2. Loop through all elements to freeze their computed styles
            for (let i = 0; i < originalElements.length; i++) {
              const originalEl = originalElements[i] as HTMLElement;
              const clonedEl = clonedElements[i] as HTMLElement;
              
              if (!clonedEl) continue;

              const style = window.getComputedStyle(originalEl);
              
              const propsToFreeze = [
                "color", "backgroundColor", "borderColor", 
                "borderTopColor", "borderBottomColor", 
                "borderLeftColor", "borderRightColor",
                "fill", "stroke", "boxShadow", "opacity"
              ];

              propsToFreeze.forEach(prop => {
                const computedVal = style.getPropertyValue(prop);
                if (computedVal) {
                  clonedEl.style.setProperty(prop, computedVal, "important");
                }
              });
            }

            clonedRootElement.style.animation = "none";
            clonedRootElement.style.transition = "none";
            
            // Force desktop layout for capture regardless of current viewport size
            const clonedPage = clonedRootElement.querySelector(".receipt-page") as HTMLElement;
            if (clonedPage) {
              clonedPage.style.width = "800px";
              clonedPage.style.maxWidth = "none";
              clonedPage.style.margin = "0";
            }
          }
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jspdf({ orientation: "portrait", unit: "mm", format: "a4" });
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
      console.error("PDF export error:", err);
      alert(err instanceof Error ? err.message : "An unknown error occurred during PDF export");
    } finally {
      setExporting(false);
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-on-surface-variant font-medium">Loading sale details...</p>
          </div>
        </div>
      </PageShell>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────────
  if (error || !sale) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant/30 hover:border-outline-variant/60 bg-surface-container-lowest text-on-surface font-medium text-sm transition-all"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Go Back
          </button>
          <div className="rounded-2xl bg-error/10 border border-error/30 px-6 py-6">
            <h3 className="font-semibold text-error mb-2">Error Loading Sale</h3>
            <p className="text-error text-sm">{error || "Sale not found"}</p>
          </div>
        </div>
      </PageShell>
    );
  }

  // ─── Print Mode — Fullscreen template, no chrome ────────────────────────────
  if (isPrinting) {
    return (
      <div className="bg-white min-h-screen p-8">
        <style>{`
          @media print {
            body { margin: 0 !important; padding: 0 !important; }
          }
        `}</style>
        <div id="invoice-export-root">
          <InvoiceTemplate sale={sale} />
        </div>
      </div>
    );
  }

  // ─── Normal Page View ─────────────────────────────────────────────────────────
  return (
    <PageShell>
      <div className="max-w-5xl mx-auto animate-app-shell-enter space-y-6">
        {/* ── Action Bar ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant/30 hover:border-outline-variant/60 bg-surface-container-lowest text-on-surface font-medium text-sm transition-all"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Print */}
            <ActionButton variant="outline" onClick={handlePrint} className="gap-2">
              <PrinterIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </ActionButton>

            {/* Export PDF */}
            <ActionButton
              variant="outline"
              onClick={handleExportPDF}
              disabled={exporting}
              className="gap-2"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{exporting ? "Exporting..." : "PDF"}</span>
            </ActionButton>

            {/* Delete */}
            <ActionButton variant="outline" tone="danger" onClick={handleDelete}>
              <TrashIcon className="w-4 h-4" />
            </ActionButton>
          </div>
        </div>

        {/* ── Invoice Template ── */}
        <div id="invoice-export-root" className="w-full">
          <InvoiceTemplate sale={sale} />
        </div>
      </div>
    </PageShell>
  );
}
