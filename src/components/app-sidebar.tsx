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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
      <path d="M9.5 21v-6.5h5V21" />
    </svg>
  );
}

function UsersIcon(props: SidebarIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <path d="M16 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M2.8 20.5a5.2 5.2 0 0 1 10.4 0" />
      <path d="M14 20.5a4.5 4.5 0 0 1 7.2-3.6" />
    </svg>
  );
}

function StoreIcon(props: SidebarIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <path d="M3 9h18l-1.6-5H4.6L3 9Z" />
      <path d="M4.2 9v2.4A2.4 2.4 0 0 0 6.6 14h.4a2.4 2.4 0 0 0 2.4-2.4A2.4 2.4 0 0 0 11.8 14h.4a2.4 2.4 0 0 0 2.4-2.4A2.4 2.4 0 0 0 17 14h.4a2.4 2.4 0 0 0 2.4-2.6V9" />
      <path d="M5.5 14v6h13v-6" />
      <path d="M9 20v-3.5h6V20" />
    </svg>
  );
}

function LogoutIcon(props: SidebarIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M5 12h11" />
      <path d="m9 8-4 4 4 4" />
    </svg>
  );
}

function SparePartsIcon(props: SidebarIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
      <path d="M11 7h2v10h-2M7 11v2h10" />
    </svg>
  );
}

function ProductsIcon(props: SidebarIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" />
      <path d="M4 8.5 12 13l8-4.5" />
      <path d="m12 13 8-4.5" />
    </svg>
  );
}

function MaintenanceIcon(props: SidebarIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M15 6h-4l-2 8" />
      <path d="M15 6 11 17" />
      <path d="m9 6 6 11" />
      <path d="m18 6-3 6" />
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
      { href: "/Sales/", label: "Transactions", icon: <SparePartsIcon className="h-5 w-5" /> },
      { href: "/Sales/", label: "Create New", icon: <ProductsIcon className="h-5 w-5" /> },
    ],
  },
  {
    title: "Maintenance",
    items: [
      { href: "/Tickets/", label: "Tickets", icon: <SparePartsIcon className="h-5 w-5" /> },
      { href: "/Tickets/", label: "Create New", icon: <ProductsIcon className="h-5 w-5" /> },
    ],
  },
  {
    title: "Inventory",
    items: [
      { href: "/inventory/spare-parts", label: "Spare Parts", icon: <SparePartsIcon className="h-5 w-5" /> },
      { href: "/inventory/products", label: "Products", icon: <ProductsIcon className="h-5 w-5" /> },
      {
        href: "/inventory/maintenance-services",
        label: "Maintenance services",
        icon: <MaintenanceIcon className="h-5 w-5" />,
      },
      { href: "/inventory/bikes", label: "Bikes", icon: <BikesIcon className="h-5 w-5" /> },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/users", label: "Users", icon: <UsersIcon className="h-5 w-5" /> },
      { href: "/sellers", label: "Sellers", icon: <StoreIcon className="h-5 w-5" /> },
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
  brandTitle = "RPG Hub",
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
          "glass ghost-border fixed inset-y-0 left-0 z-40 flex min-h-0 flex-col overflow-hidden border-r",
          "transition-[width,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
          isCollapsed ? "w-20" : "w-72",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-16 items-center justify-between border-b border-outline-variant/20 px-4">
          <div className={isCollapsed ? "hidden" : "block"}>
            <p className="font-display text-lg font-bold text-on-surface">{brandTitle}</p>
          </div>
          <button
            type="button"
            className="rounded-md border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm text-on-surface hover:bg-surface-container flex items-center justify-center"
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

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
          {navSections.map((section, sectionIndex) => (
            <div key={`nav-section-${sectionIndex}`} className="space-y-1">
              {sectionIndex > 0 ? (
                <div
                  className={
                    isCollapsed
                      ? "my-2 border-t border-outline-variant/20"
                      : "mt-4 border-t border-outline-variant/20 pt-1"
                  }
                  aria-hidden
                />
              ) : null}

              {section.title ? (
                !isCollapsed ? (
                  <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
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
                      "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out",
                      isActive
                        ? "bg-primary text-on-primary"
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
                    {!isCollapsed ? <span className="ml-3 truncate">{item.label}</span> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-outline-variant/20 p-3">
          {!isCollapsed ? (
            <p className="mb-2 truncate text-xs text-on-surface-variant">Signed in: {userName}</p>
          ) : null}
          <button
            type="button"
            className="flex w-full items-center justify-center rounded-md bg-error-container px-3 py-2 text-sm font-semibold text-on-error-container hover:opacity-90"
            onClick={onLogout}
          >
            <LogoutIcon className="h-5 w-5 shrink-0" />
            {!isCollapsed ? <span className="ml-2 truncate">{logoutLabel}</span> : null}
          </button>
        </div>
      </aside>
    </>
  );
}
