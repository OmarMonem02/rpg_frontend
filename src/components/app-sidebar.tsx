"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { usePermissions } from "@/components/permission-provider";
import { getPendingApprovalRequestCount } from "@/lib/api/approval-requests";
import { getAuthToken, getAuthUser } from "@/lib/auth-session";
import {
  defaultWorkspaceNavSections,
  type SidebarNavSection,
} from "@/lib/workspace-nav";
import type { SVGProps } from "react";

export type { SidebarNavItem, SidebarNavSection } from "@/lib/workspace-nav";

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

function LogoutIcon(props: SidebarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

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
  navSections = defaultWorkspaceNavSections,
}: SidebarProps) {
  const pathname = usePathname();
  const permissions = usePermissions();
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const isAdminUser = getAuthUser()?.role === "admin";

  useEffect(() => {
    if (!isAdminUser) {
      setPendingRequestCount(0);
      return;
    }

    let active = true;

    async function loadPendingCount() {
      const token = getAuthToken();
      if (!token) return;

      try {
        const count = await getPendingApprovalRequestCount(token);
        if (active) setPendingRequestCount(count);
      } catch {
        if (active) setPendingRequestCount(0);
      }
    }

    void loadPendingCount();
    const interval = window.setInterval(() => {
      void loadPendingCount();
    }, 60_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isAdminUser, pathname]);

  const filteredNavSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        permissions.canAccessRoute(item.href),
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      <div
        className={[
          "fixed inset-0 z-30 bg-on-surface/30 backdrop-blur-[2px] transition-opacity duration-300 ease-out md:hidden",
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className={[
          "glass ghost-border fixed inset-y-0 left-0 z-40 flex min-h-0 flex-col overflow-hidden border-r shadow-ambient",
          "transition-[width,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
          isCollapsed ? "w-20" : "w-72",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className="border-b border-outline-variant/20 px-3 py-4 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-2">
            {!isCollapsed ? (
              <div className="flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-primary" aria-hidden="true" />
                <div className="flex flex-col">
                  <p className="label-caps">Workshop Ops</p>
                  <p className="font-display text-xl font-black tracking-tight text-on-surface">
                    {brandTitle}
                  </p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="flex h-11 w-11 mx-auto items-center justify-center rounded-2xl border border-outline-variant/20 bg-surface-container-low text-sm font-bold text-on-surface shadow-sm hover:bg-surface-container transition-colors overflow-hidden"
                title="Expand sidebar"
              >
                <img
                  src="/logo.ico"
                  alt="menu"
                  className="w-full h-full object-cover"
                />
              </button>
            )}
            {isMobileOpen && (
              <button
                type="button"
                className="flex items-center justify-center rounded-2xl border border-outline-variant/30 bg-surface-container-low p-2.5 text-on-surface hover:bg-surface-container transition-colors md:hidden"
                onClick={onCloseMobile}
                aria-label="Close menu"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M18 6 6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            )}
            {!isCollapsed && !isMobileOpen && (
              <button
                type="button"
                className="hidden items-center justify-center rounded-2xl border border-outline-variant/30 bg-surface-container-low p-2.5 text-on-surface hover:bg-surface-container transition-colors md:flex"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 transition-transform duration-300 hover:rotate-180"
                >
                  <path d="M15 18 9 12l6-6" />
                </svg>
              </button>
            )}
          </div>
          {!isCollapsed && (
            <p className="text-caption leading-relaxed text-on-surface-variant/60">
              Sales, inventory, master data, and admin control.
            </p>
          )}
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {filteredNavSections.map((section, sectionIndex) => (
            <div key={`nav-section-${sectionIndex}`} className="space-y-1.5">
              {sectionIndex > 0 ? (
                <div
                  className={
                    isCollapsed
                      ? "divider my-1"
                      : "divider my-2"
                  }
                  aria-hidden
                />
              ) : null}

              {section.title ? (
                !isCollapsed ? (
                  <p className="label-caps py-0.5 pl-1">
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
                      "flex items-center px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-out",
                      isCollapsed ? "justify-center px-0" : "px-3",
                      isActive
                        ? isCollapsed
                          ? "rounded-xl text-primary"
                          : "rounded-r-xl rounded-l-none border-l-2 border-primary bg-primary/10 font-semibold text-primary"
                        : "rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                    ].join(" ")}
                    onClick={onCloseMobile}
                  >
                    <span
                      className={[
                        "shrink-0 transition-transform duration-150",
                        isActive ? "text-primary" : "",
                        isCollapsed && isActive ? "rounded-xl bg-primary/10 p-2" : "",
                      ].join(" ")}
                    >
                      {item.icon ?? (
                        <span className="text-caption inline-flex h-6 w-6 items-center justify-center rounded-lg bg-surface-container font-semibold text-on-surface-variant">
                          {item.label.charAt(0)}
                        </span>
                      )}
                    </span>
                    {!isCollapsed ? (
                      <span className="ml-3 flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="truncate">{item.label}</span>
                        {item.href === "/requests" && pendingRequestCount > 0 ? (
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-warning px-1.5 py-0.5 text-[10px] font-bold text-on-warning">
                            {pendingRequestCount}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="flex-shrink-0 border-t border-outline-variant/20 px-2 py-4">
          {!isCollapsed && (
            <div className="mb-4 rounded-2xl border border-outline-variant/10 bg-surface px-4 py-2 shadow-sm">
              <p className="label-caps">
                Signed in
              </p>
              <p className="mono-data mt-0.5 truncate font-semibold text-on-surface">
                {userName}
              </p>
            </div>
          )}
          <button
            type="button"
            className={[
              "flex items-center justify-center rounded-xl border border-error/20 bg-error/8 text-xs font-bold text-error transition-colors duration-150 hover:bg-error hover:text-on-primary",
              isCollapsed ? "h-11 w-11 mx-auto p-0" : "w-full px-4 py-3",
            ].join(" ")}
            onClick={onLogout}
            title={isCollapsed ? logoutLabel : undefined}
          >
            <LogoutIcon
              className={["h-5 w-5 shrink-0", !isCollapsed ? "mr-2" : ""].join(
                " ",
              )}
            />
            {!isCollapsed && <span className="truncate">{logoutLabel}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
