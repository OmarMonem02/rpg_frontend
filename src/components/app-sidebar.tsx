"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode, SVGProps } from "react";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
};

export type SidebarNavSection = {
  /** When set, labels this block (e.g. “Inventory”). Omit for top-level links. */
  title?: string;
  items: SidebarNavItem[];
};

export type SidebarProps = {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
  userName?: string;
  brandTitle?: string;
  logoutLabel?: string;
  navSections?: SidebarNavSection[];
};

type SidebarIconProps = SVGProps<SVGSVGElement>;

function HomeIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function UsersIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
    </svg>
  );
}

function StoreIcon(props: SidebarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
      {...props}
    >
      <path d="M3 9h18l-1.6-5H4.6L3 9Z" />
      <path d="M4.2 9v2.4A2.4 2.4 0 0 0 6.6 14h.4a2.4 2.4 0 0 0 2.4-2.4A2.4 2.4 0 0 0 11.8 14h.4a2.4 2.4 0 0 0 2.4-2.4A2.4 2.4 0 0 0 17 14h.4a2.4 2.4 0 0 0 2.4-2.6V9" />
      <path d="M5.5 14v6h13v-6" />
      <path d="M9 20v-3.5h6V20" />
    </svg>
  );
}

function LogoutIcon(props: SidebarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
      {...props}
    >
      <path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M5 12h11" />
      <path d="m9 8-4 4 4 4" />
    </svg>
  );
}

function SparePartsIcon(props: SidebarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
      {...props}
    >
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
      <path d="M11 7h2v10h-2M7 11v2h10" />
    </svg>
  );
}

function ProductsIcon(props: SidebarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
      {...props}
    >
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" />
      <path d="M4 8.5 12 13l8-4.5" />
      <path d="m12 13 8-4.5" />
    </svg>
  );
}

function MaintenanceIcon(props: SidebarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
      {...props}
    >
      <path d="m14.7 6.3 1.4-1.4a2 2 0 0 1 2.8 2.8l-1.4 1.4" />
      <path d="m16 8-5 5" />
      <path d="m10 14-6 6" />
      <path d="M8 16 6 18" />
      <path d="m3 21 3-3" />
      <path d="M12 6a9 9 0 0 0-8 5" />
    </svg>
  );
}

function BikesIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m18 14-1-3" />
      <path d="m3 9 6 2a2 2 0 0 1 2-2h2a2 2 0 0 1 1.99 1.81" />
      <path d="M8 17h3a1 1 0 0 0 1-1 6 6 0 0 1 6-6 1 1 0 0 0 1-1v-.75A5 5 0 0 0 17 5" />
      <circle cx="19" cy="17" r="3" />
      <circle cx="5" cy="17" r="3" />
    </svg>
  );
}
function CreateIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <line x1="12" x2="12" y1="8" y2="16" />
      <line x1="8" x2="16" y1="12" y2="12" />
    </svg>
  );
}
function TicketsIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 5h8" />
      <path d="M13 12h8" />
      <path d="M13 19h8" />
      <path d="m3 17 2 2 4-4" />
      <path d="m3 7 2 2 4-4" />
    </svg>
  );
}
function SettingsIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function SellerIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 21a8 8 0 0 0-16 0" />
      <circle cx="10" cy="8" r="5" />
      <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />
    </svg>
  );
}
function TransactionsIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3 4 7l4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </svg>
  );
}
function Icon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
    >
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <line x1="12" x2="12" y1="8" y2="16" />
      <line x1="8" x2="16" y1="12" y2="12" />
    </svg>
  );
}

function BrandsIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7v6h4ve-4h8a4 4 0 0 1 4 4v4" />
      <path d="M21 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M3 19h4v0a4 4 0 0 1 4-4h6" />
    </svg>
  );
}

function CategoriesIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 9l7-7 7 7" />
      <path d="M6 9h12" />
      <path d="M5 15l7-7 7 7" />
      <path d="M6 15h12" />
    </svg>
  );
}

function PaymentMethodsIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 8h20" />
      <circle cx="16" cy="15" r="1" />
    </svg>
  );
}

const defaultNavSections: SidebarNavSection[] = [
  {
    items: [
      { href: "/", label: "Home", icon: <HomeIcon className="h-5 w-5" /> },
    ],
  },
  {
    title: "Sales",
    items: [
      {
        href: "/Sales/",
        label: "Transactions",
        icon: <TransactionsIcon className="h-5 w-5" />,
      },
      {
        href: "/Sales/",
        label: "Create New",
        icon: <CreateIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Maintenance",
    items: [
      {
        href: "/Tickets/",
        label: "Tickets",
        icon: <TicketsIcon className="h-5 w-5" />,
      },
      {
        href: "/Tickets/",
        label: "Create New",
        icon: <CreateIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Inventory",
    items: [
      {
        href: "/inventory/spare-parts",
        label: "Spare Parts",
        icon: <SparePartsIcon className="h-5 w-5" />,
      },
      {
        href: "/inventory/products",
        label: "Products",
        icon: <ProductsIcon className="h-5 w-5" />,
      },
      {
        href: "/inventory/bikes",
        label: "Bikes",
        icon: <BikesIcon className="h-5 w-5" />,
      },
      {
        href: "/inventory/maintenance-services",
        label: "Maintenance Services",
        icon: <MaintenanceIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Master Data",
    items: [
      {
        href: "/inventory/brands",
        label: "Brands",
        icon: <BrandsIcon className="h-5 w-5" />,
      },
      {
        href: "/data/bike-blueprints",
        label: "Bike Blueprints",
        icon: <BikesIcon className="h-5 w-5" />,
      },
      {
        href: "/data/payment-methods",
        label: "Payment Methods",
        icon: <PaymentMethodsIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Admin",
    items: [
      {
        href: "/users",
        label: "Users",
        icon: <UsersIcon className="h-5 w-5" />,
      },
      {
        href: "/sellers",
        label: "Sellers",
        icon: <SellerIcon className="h-5 w-5" />,
      },
      {
        href: "/settings",
        label: "Settings",
        icon: <SettingsIcon className="h-5 w-5" />,
      },
    ],
  },
];

function normalizePath(path: string): string {
  if (!path) return "/";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function isRouteActive(pathname: string, href: string): boolean {
  const current = normalizePath(pathname);
  const target = normalizePath(href);

  if (target === "/") return current === "/";
  return current === target || current.startsWith(`${target}/`);
}

export function AppSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onLogout,
  userName = "User",
  brandTitle = "RPG System",
  logoutLabel = "Logout",
  navSections = defaultNavSections,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        aria-label="Close menu overlay"
        aria-hidden={!isMobileOpen}
        tabIndex={-1}
        className={[
          "fixed inset-0 z-30 bg-on-surface/30 backdrop-blur-[2px] transition-opacity duration-300 ease-out md:hidden",
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onCloseMobile}
      />

      <aside
        className={[
          "glass ghost-border fixed inset-y-0 left-0 z-40 flex min-h-0 flex-col overflow-hidden border-r shadow-ambient",
          "transition-[width,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
          isCollapsed ? "w-20" : "w-72",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className="border-b border-outline-variant/20 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className={isCollapsed ? "hidden" : "block"}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
                Workshop Ops
              </p>
              <p className="mt-1 font-display text-lg font-bold text-on-surface">{brandTitle}</p>
              <p className="mt-1 text-xs text-on-surface-variant">Sales, inventory, master data, and admin in one surface.</p>
            </div>
            {isCollapsed ? (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-outline-variant/20 bg-surface-container-low text-sm font-bold text-on-surface">
                RPG
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="mt-3 flex items-center justify-center rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm text-on-surface hover:bg-surface-container"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span aria-hidden="true" className="inline-block">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={[
                  "h-5 w-5 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
                  isCollapsed ? "rotate-180" : "rotate-0",
                ].join(" ")}
              >
                <path d="M15 18 9 12l6-6" />
              </svg>
            </span>
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {navSections.map((section, sectionIndex) => (
            <div key={`nav-section-${sectionIndex}`} className="space-y-1.5">
              {sectionIndex > 0 ? (
                <div
                  className={
                    isCollapsed
                      ? "my-1 border-t border-outline-variant/20"
                      : "my-2 border-t border-outline-variant/20"
                  }
                  aria-hidden
                />
              ) : null}

              {section.title ? (
                !isCollapsed ? (
                  <p className="px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                    {section.title}
                  </p>
                ) : sectionIndex > 0 ? (
                  <span className="sr-only">{section.title}</span>
                ) : null
              ) : null}

              {section.items.map((item, index) => {
                const isActive = isRouteActive(pathname, item.href);

                return (
                  <Link
                    key={`${sectionIndex}-${item.href}-${index}`}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    title={isCollapsed ? item.label : undefined}
                    className={[
                      "flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out",
                      isActive
                        ? "bg-primary text-on-primary shadow-sm"
                        : "text-on-surface hover:bg-surface-container-low",
                    ].join(" ")}
                    onClick={onCloseMobile}
                  >
                    <span className="shrink-0">
                      {item.icon ?? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-surface-container text-[10px] font-semibold text-on-surface-variant">
                          {item.label.charAt(0)}
                        </span>
                      )}
                    </span>
                    {!isCollapsed ? (
                      <span className="ml-3 truncate">{item.label}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="flex-shrink-0 border-t border-outline-variant/20 px-2 py-3">
          {!isCollapsed ? (
            <div className="mb-3 rounded-2xl border border-outline-variant/10 bg-surface px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">Signed in</p>
              <p className="mt-1 truncate text-sm font-semibold text-on-surface">{userName}</p>
            </div>
          ) : null}
          <button
            type="button"
            className="flex w-full items-center justify-center rounded-xl bg-error-container px-3 py-2.5 text-xs font-semibold text-on-error-container hover:opacity-90"
            onClick={onLogout}
          >
            <LogoutIcon className="h-5 w-5 shrink-0" />
            {!isCollapsed ? (
              <span className="ml-2 truncate">{logoutLabel}</span>
            ) : null}
          </button>
        </div>
      </aside>
    </>
  );
}
