/** Modern CSS color functions that html2canvas cannot parse (rgb/hsl only). */
const UNSUPPORTED_COLOR_PATTERN =
  /\b(?:color|color-mix|oklch|oklab|lab|lch)\(/i;

/** A4 portrait dimensions (ISO 216) */
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

/** 210mm at 96dpi — fixed capture width for consistent PDF output */
export const A4_WIDTH_PX = 794;

function waitForLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * Rewrites cloned-node inline colors to rgb/hex so html2canvas can parse them.
 * Call from html2canvas `onclone` after the document is cloned.
 */
export function normalizeColorsForHtml2Canvas(
  doc: Document,
  root: HTMLElement,
): void {
  const canvas = doc.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const toSafeColor = (value: string): string | null => {
    const trimmed = value.trim();
    if (
      !trimmed ||
      trimmed === "transparent" ||
      trimmed === "initial" ||
      trimmed === "inherit" ||
      trimmed === "unset"
    ) {
      return null;
    }
    if (!UNSUPPORTED_COLOR_PATTERN.test(trimmed)) {
      return null;
    }
    try {
      ctx.fillStyle = "#000000";
      ctx.fillStyle = trimmed;
      return ctx.fillStyle;
    } catch {
      return null;
    }
  };

  const nodes: HTMLElement[] = [root];
  root.querySelectorAll<HTMLElement>("*").forEach((node) => nodes.push(node));

  for (const el of nodes) {
    const opacity = Number.parseFloat(el.style.opacity);
    if (!Number.isNaN(opacity) && opacity < 1) {
      el.style.opacity = "1";
    }

    for (let i = el.style.length - 1; i >= 0; i--) {
      const prop = el.style.item(i);
      const value = el.style.getPropertyValue(prop);
      if (!value || !UNSUPPORTED_COLOR_PATTERN.test(value)) continue;

      if (prop === "box-shadow" || prop === "text-shadow") {
        el.style.setProperty(prop, "none");
        continue;
      }

      const safe = toSafeColor(value);
      if (safe) el.style.setProperty(prop, safe);
    }
  }
}

export const html2canvasPdfCaptureOptions = {
  scale: 3,
  useCORS: true,
  backgroundColor: "#ffffff",
} as const;

/** Renders an element to a multi-page A4 PDF with sharp, high-contrast output. */
export async function exportHtmlElementToPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const previousWidth = element.style.width;
  element.classList.add("pdf-export");
  element.style.width = "210mm";

  try {
    await waitForLayout();

    const { default: html2canvas } = await import("html2canvas");
    const jspdfModule = await import("jspdf");
    const JsPDF =
      "jsPDF" in jspdfModule && typeof jspdfModule.jsPDF === "function"
        ? jspdfModule.jsPDF
        : jspdfModule.default;

    if (typeof JsPDF !== "function") {
      throw new Error("jsPDF constructor not available");
    }

    const canvas = await html2canvas(element, {
      ...html2canvasPdfCaptureOptions,
      width: A4_WIDTH_PX,
      windowWidth: A4_WIDTH_PX,
      onclone: (doc, clonedElement) => {
        normalizeColorsForHtml2Canvas(doc, clonedElement);
      },
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new JsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = A4_WIDTH_MM;
    const pageHeight = A4_HEIGHT_MM;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let pageCount = Math.max(1, Math.ceil(imgHeight / pageHeight));
    if (pageCount > 1) {
      const lastPageContentMm = imgHeight - (pageCount - 1) * pageHeight;
      // Skip a near-empty trailing page (common when min-height forced full A4 capture)
      if (lastPageContentMm < 15) pageCount -= 1;
    }

    let position = 0;
    for (let page = 0; page < pageCount; page++) {
      if (page > 0) {
        pdf.addPage();
        position -= pageHeight;
      }
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    }

    pdf.save(filename);
  } finally {
    element.classList.remove("pdf-export");
    element.style.width = previousWidth;
  }
}

/** Opens a popup with only the invoice HTML and triggers the browser print dialog. */
export function printInvoiceElement(
  element: HTMLElement,
  title = "Invoice",
): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error(
      "Could not open print window. Allow popups for this site and try again.",
    );
  }

  const styles = Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]'),
  )
    .map((node) => node.outerHTML)
    .join("\n");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        ${styles}
        <style>${invoicePrintPageStyles}</style>
      </head>
      <body class="bg-white m-0 p-0">
        <div class="pdf-export" style="width:210mm;margin:0 auto;">
          ${element.innerHTML}
        </div>
        <script>
          window.addEventListener("load", function () {
            setTimeout(function () {
              window.focus();
              window.print();
            }, 400);
          });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/** Inline styles injected into invoice print popup windows */
export const invoicePrintPageStyles = `
  @page {
    size: A4 portrait;
    margin: 10mm;
  }
  @media print {
    html, body {
      width: 210mm;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      background: #fff !important;
    }
    .pdf-export {
      width: 210mm !important;
      margin: 0 auto !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .invoice-template .receipt-page.a4-page {
      min-height: auto !important;
      height: auto !important;
      overflow: visible !important;
    }
    .invoice-template .receipt-page.a4-page::after {
      display: none !important;
    }
    .invoice-template .ri {
      min-height: auto !important;
      height: auto !important;
    }
    .invoice-template .invoice-doc-header,
    .invoice-template .invoice-parties,
    .invoice-template .totals-panel,
    .invoice-template .receipt-footer {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .invoice-template .table-section {
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    .invoice-template .invoice-items-table thead {
      display: table-header-group !important;
    }
    .invoice-template .invoice-items-table tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  }
`;
