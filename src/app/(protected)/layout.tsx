"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { WorkspaceLoadingCard } from "@/components/workspace-loading-card";
import { getMe, logout } from "@/lib/auth-api";
import {
  clearAuthSession,
  getAuthToken,
  getAuthUser,
  setAuthSession,
} from "@/lib/auth-session";

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

    validateSession();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
      }
    }

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
    <div className="min-h-screen bg-background flex">
      <AppSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((value) => !value)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onLogout={handleLogout}
        userName={userName}
      />

      <div
        className={[
          "flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-300 ease-out motion-reduce:transition-none",
          isCollapsed ? "md:ml-20" : "md:ml-72",
          "animate-app-shell-enter",
        ].join(" ")}
      >
        <header className="sticky top-0 z-20 border-b border-outline-variant/15 bg-background/90 px-4 py-4 backdrop-blur md:px-6">
          <div className="glass ghost-border flex items-center justify-between rounded-[1.25rem] border px-4 py-3 gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface transition-colors hover:bg-surface-container md:hidden"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setIsMobileOpen(true);
                  } else {
                    setIsCollapsed(!isCollapsed);
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
              <div className="hidden sm:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                  RPG Workshop Console
                </p>
                <p className="text-sm text-on-surface">
                  Daily operations, inventory, and admin control.
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">
                Active session
              </p>
              <p className="text-sm font-semibold text-on-surface truncate max-w-[120px] sm:max-w-none">
                {userName}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-6 pt-4 md:px-6">{children}</main>
      </div>
    </div>
  );
}
