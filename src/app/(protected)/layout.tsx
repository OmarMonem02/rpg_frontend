"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { getMe, logout } from "@/lib/auth-api";
import { clearAuthSession, getAuthToken, getAuthUser, setAuthSession } from "@/lib/auth-session";

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
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface">
        Checking session...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((value) => !value)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col md:ml-0">
        <header className="glass ghost-border sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4">
          <button
            type="button"
            className="rounded-md border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm text-on-surface md:hidden"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open menu"
          >
            Menu
          </button>
          <p className="text-sm text-on-surface-variant">
            Signed in as <span className="font-semibold text-on-surface">{userName}</span>
          </p>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
