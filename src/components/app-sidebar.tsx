"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarProps = {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
};

const navItems = [
  { href: "/", label: "Home" },
  { href: "/users", label: "Users" },
  { href: "/sellers", label: "Sellers" },
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
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {isMobileOpen ? (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="fixed inset-0 z-30 bg-on-surface/20 md:hidden"
          onClick={onCloseMobile}
        />
      ) : null}

      <aside
        className={[
          "glass ghost-border fixed inset-y-0 left-0 z-40 flex flex-col border-r transition-transform duration-200 md:static md:translate-x-0",
          isCollapsed ? "w-20" : "w-72",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-16 items-center justify-between border-b border-outline-variant/20 px-4">
          <div className={isCollapsed ? "hidden" : "block"}>
            <p className="font-display text-lg font-bold text-on-surface">RPG Hub</p>
          </div>
          <button
            type="button"
            className="rounded-md border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm text-on-surface hover:bg-surface-container"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? ">>" : "<<"}
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive = isRouteActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-on-primary"
                    : "text-on-surface hover:bg-surface-container-low",
                ].join(" ")}
                onClick={onCloseMobile}
              >
                {isCollapsed ? item.label.charAt(0) : item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-outline-variant/20 p-3">
          <button
            type="button"
            className="w-full rounded-md bg-error-container px-3 py-2 text-sm font-semibold text-on-error-container hover:opacity-90"
            onClick={onLogout}
          >
            {isCollapsed ? "Out" : "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}
