import { defaultWorkspaceNavSections } from "@/lib/workspace-nav";

const APP_TITLE = "RPG Hub";

export function formatSaleNumber(id: number): string {
  return `Sale #${String(id).padStart(6, "0")}`;
}

const navLabels = (() => {
  const labels = new Map<string, string>();

  for (const section of defaultWorkspaceNavSections) {
    for (const item of section.items) {
      labels.set(item.href, item.label);
    }
  }

  return labels;
})();

/** Nested routes that are not listed in the sidebar navigation. */
const ROUTE_TITLE_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  title: string;
}> = [
  { pattern: /^\/login$/, title: "Login" },
  { pattern: /^\/inventory\/sales\/[^/]+\/manage$/, title: "Manage Sale" },
  { pattern: /^\/inventory\/sales\/[^/]+\/return$/, title: "Return Sale" },
  { pattern: /^\/inventory\/sales\/[^/]+\/exchange$/, title: "Exchange Sale" },
  { pattern: /^\/inventory\/sales\/[^/]+$/, title: "Sale Details" },
  { pattern: /^\/inventory\/delivery-orders\/[^/]+$/, title: "Delivery Order" },
  { pattern: /^\/inventory\/products\/create$/, title: "Create Product" },
  { pattern: /^\/inventory\/products\/edit\/[^/]+$/, title: "Edit Product" },
  { pattern: /^\/inventory\/products\/bulk-edit$/, title: "Bulk Edit Products" },
  { pattern: /^\/inventory\/spare-parts\/create$/, title: "Create Spare Part" },
  { pattern: /^\/inventory\/spare-parts\/edit\/[^/]+$/, title: "Edit Spare Part" },
  { pattern: /^\/inventory\/spare-parts\/bulk-edit$/, title: "Bulk Edit Spare Parts" },
  {
    pattern: /^\/inventory\/spare-parts\/manage-links$/,
    title: "Manage Spare Part Links",
  },
  {
    pattern: /^\/inventory\/maintenance-parts\/create$/,
    title: "Create Maintenance Part",
  },
  {
    pattern: /^\/inventory\/maintenance-parts\/edit\/[^/]+$/,
    title: "Edit Maintenance Part",
  },
  {
    pattern: /^\/inventory\/maintenance-parts\/bulk-edit$/,
    title: "Bulk Edit Maintenance Parts",
  },
  {
    pattern: /^\/inventory\/maintenance-parts\/manage-links$/,
    title: "Manage Maintenance Part Links",
  },
  { pattern: /^\/inventory\/bikes\/create$/, title: "Create Bike" },
  { pattern: /^\/inventory\/bikes\/edit\/[^/]+$/, title: "Edit Bike" },
  {
    pattern: /^\/inventory\/maintenance-services\/create$/,
    title: "Create Maintenance Service",
  },
  {
    pattern: /^\/inventory\/maintenance-services\/edit\/[^/]+$/,
    title: "Edit Maintenance Service",
  },
  { pattern: /^\/customers\/[^/]+$/, title: "Customer Details" },
  { pattern: /^\/tickets\/[^/]+$/, title: "Ticket Details" },
  { pattern: /^\/sellers\/[^/]+\/history$/, title: "Seller History" },
  { pattern: /^\/users\/permissions\/[^/]+$/, title: "User Permissions" },
  { pattern: /^\/data\/bike-blueprints\/create$/, title: "Create Bike Blueprint" },
  {
    pattern: /^\/data\/bike-blueprints\/edit\/[^/]+$/,
    title: "Edit Bike Blueprint",
  },
  {
    pattern: /^\/data\/bike-blueprints\/[^/]+\/spare-parts$/,
    title: "Blueprint Spare Parts",
  },
  {
    pattern: /^\/data\/bike-blueprints\/[^/]+\/maintenance-parts$/,
    title: "Blueprint Maintenance Parts",
  },
  { pattern: /^\/data\/import-export\/[^/]+$/, title: "Import & Export" },
  {
    pattern: /^\/data\/maintenance-part-categories$/,
    title: "Maintenance Part Categories",
  },
  { pattern: /^\/data\/spare-part-categories$/, title: "Spare Part Categories" },
  { pattern: /^\/data\/product-categories$/, title: "Product Categories" },
  { pattern: /^\/reporting\/annual$/, title: "Annual Reporting" },
  { pattern: /^\/reporting\/expenses$/, title: "Expenses" },
  { pattern: /^\/reporting\/balance-sheet$/, title: "Balance Sheet" },
  { pattern: /^\/reporting\/profit-loss$/, title: "Profit & Loss" },
];

export function resolvePageTitle(pathname: string): string | null {
  const normalizedPath =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  if (normalizedPath === "/") {
    return null;
  }

  const navLabel = navLabels.get(normalizedPath);
  if (navLabel) {
    return navLabel;
  }

  for (const { pattern, title } of ROUTE_TITLE_PATTERNS) {
    if (pattern.test(normalizedPath)) {
      return title;
    }
  }

  return null;
}

export function formatDocumentTitle(pageTitle: string | null): string {
  if (!pageTitle) {
    return APP_TITLE;
  }

  return `${APP_TITLE} | ${pageTitle}`;
}
