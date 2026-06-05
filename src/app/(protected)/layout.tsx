"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { RefetchAllDataButton } from "@/components/refetch-all-data-button";
import {
  PermissionProvider,
  usePermissions,
} from "@/components/permission-provider";
import { WorkspaceLoadingCard } from "@/components/workspace-loading-card";
import { getMe, logout } from "@/lib/auth-api";
import {
  clearAuthSession,
  getAuthToken,
  getAuthUser,
  setAuthSession,
} from "@/lib/auth-session";

function ProtectedWorkspace({
  children,
  isCollapsed,
  isMobileOpen,
  onOpenMobile,
  onCloseMobile,
  onToggleCollapse,
  onLogout,
  userName,
}: Readonly<{
  children: React.ReactNode;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onOpenMobile: () => void;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
  onLogout: () => Promise<void>;
  userName: string;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const permissions = usePermissions();
  const canAccessCurrentRoute = permissions.canAccessRoute(pathname);
  const fallbackRoute = permissions.getDefaultRoute();
  const canAccessFallbackRoute = permissions.canAccessRoute(fallbackRoute);

  useEffect(() => {
    if (!canAccessCurrentRoute) {
      if (canAccessFallbackRoute && fallbackRoute !== pathname) {
        router.replace(fallbackRoute);
      }
    }
  }, [
    canAccessCurrentRoute,
    canAccessFallbackRoute,
    fallbackRoute,
    pathname,
    router,
  ]);

  if (
    !canAccessCurrentRoute &&
    canAccessFallbackRoute &&
    fallbackRoute !== pathname
  ) {
    return <WorkspaceLoadingCard />;
  }

  if (!canAccessCurrentRoute) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-lg rounded-[2rem] border border-outline-variant/20 bg-surface-container-lowest p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
            Access Restricted
          </p>
          <h1 className="mt-3 text-2xl font-display font-bold text-on-surface">
            No readable workspace is available for this session.
          </h1>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            Your account is signed in, but the current permission matrix does
            not allow access to this route or any fallback page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={onCloseMobile}
        onLogout={onLogout}
        userName={userName}
      />

      <div
        className={[
          "flex min-h-screen min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-out motion-reduce:transition-none",
          isCollapsed ? "md:pl-20" : "md:pl-72",
          "animate-app-shell-enter",
        ].join(" ")}
      >
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 py-2 px-4 bg-background/90 backdrop-blur md:px-8">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface transition-colors hover:bg-surface-container md:hidden"
            onClick={() => {
              if (window.innerWidth < 768) {
                onOpenMobile();
              } else {
                onToggleCollapse();
              }
            }}
            aria-label="Toggle sidebar"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        <main className="flex-1 px-4 py-6 md:px-6 md:py-8 lg:px-8">
          <div className="mx-auto max-w-screen-2xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userName, setUserName] = useState(() => getAuthUser()?.name ?? "User");

  useEffect(() => {
    let active = true;

    async function validateSession() {
      const token = getAuthToken();
      if (!token) {
        clearAuthSession();
        router.replace("/login");
        if (active) setIsCheckingAuth(false);
        return;
      }

      try {
        const refreshedUser = await getMe(token);
        setAuthSession(token, refreshedUser);
        if (active) {
          setUserName(refreshedUser.name);
        }
      } catch {
        clearAuthSession();
        router.replace("/login");
      } finally {
        if (active) setIsCheckingAuth(false);
      }
    }

    void validateSession();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  async function handleLogout() {
    const token = getAuthToken();

    if (token) {
      try {
        await logout(token);
      } catch {
        // Intentionally ignore network/server errors on logout.
      }
    }

    clearAuthSession();
    router.replace("/login");
  }

  if (isCheckingAuth) {
    return <WorkspaceLoadingCard />;
  }

  return (
    <PermissionProvider>
      <ProtectedWorkspace
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onOpenMobile={() => setIsMobileOpen(true)}
        onCloseMobile={() => setIsMobileOpen(false)}
        onToggleCollapse={() => setIsCollapsed((value) => !value)}
        onLogout={handleLogout}
        userName={userName}
      >
        {children}
      </ProtectedWorkspace>
    </PermissionProvider>
  );
}
