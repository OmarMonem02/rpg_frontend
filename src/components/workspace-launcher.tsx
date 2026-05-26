"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePermissions } from "@/components/permission-provider";
import {
  defaultWorkspaceNavSections,
  type SidebarNavItem,
  type SidebarNavSection,
} from "@/lib/workspace-nav";

function normalizePath(path: string): string {
  if (!path) return "/";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

const ICON_BACKDROPS = [
  "bg-primary/12 text-primary",
  "bg-accent/10 text-accent",
  "bg-primary-container/90 text-on-primary-container",
  "bg-surface-container-high text-on-surface",
  "bg-primary/10 text-primary ring-1 ring-inset ring-primary/15",
  "bg-accent/8 text-accent ring-1 ring-inset ring-accent/20",
] as const;

export type WorkspaceLauncherProps = {
  navSections?: SidebarNavSection[];
};

export function WorkspaceLauncher({
  navSections = defaultWorkspaceNavSections,
}: WorkspaceLauncherProps) {
  const permissions = usePermissions();

  const tiles = useMemo(() => {
    const out: SidebarNavItem[] = [];
    for (const section of navSections) {
      for (const item of section.items) {
        if (normalizePath(item.href) === "/") continue;
        if (!permissions.canAccessRoute(item.href)) continue;
        out.push(item);
      }
    }
    return out;
  }, [navSections, permissions]);

  if (tiles.length === 0) {
    return (
      <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest/80 px-6 py-12 text-center shadow-sm">
        <p className="text-sm font-medium text-on-surface">
          No workspace apps are available for your account.
        </p>
        <p className="mt-2 text-sm text-on-surface-variant">
          Contact an administrator if you need access to additional areas.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[1.75rem] border border-outline-variant/10 bg-gradient-to-br from-primary/[0.06] via-background to-surface-tinted p-6 shadow-ambient md:p-8"
      role="navigation"
      aria-label="Workspace apps"
    >
      <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-6 md:gap-7">
        {tiles.map((item, index) => {
          const backdrop = ICON_BACKDROPS[index % ICON_BACKDROPS.length];
          return (
            <li
              key={item.href}
              className="animate-fade-in motion-reduce:animate-none motion-reduce:opacity-100"
              style={{
                animationDelay: `${index * 42}ms`,
                animationFillMode: "backwards",
              }}
            >
              <Link
                href={item.href}
                className="group flex flex-col items-center gap-2.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="relative flex aspect-square w-full max-w-[6.5rem] mx-auto flex-col items-center justify-center rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-3 shadow-sm transition duration-200 ease-out motion-reduce:transition-none group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-ambient)] group-hover:border-outline-variant/20 group-active:translate-y-0">
                  <span
                    className={[
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl [&_svg]:h-9 [&_svg]:w-9",
                      backdrop,
                    ].join(" ")}
                  >
                    {item.icon ?? (
                      <span className="text-lg font-bold tracking-tight">
                        {item.label.charAt(0)}
                      </span>
                    )}
                  </span>
                </span>
                <span className="text-body-sm max-w-[7.5rem] text-center font-medium leading-snug text-on-surface transition-colors group-hover:text-primary">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
