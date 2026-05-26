"use client";

import { PageShell } from "@/components/ops-ui";
import { WorkspaceLauncher } from "@/components/workspace-launcher";
import { AUTH_SESSION_EVENT, getAuthUser } from "@/lib/auth-session";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [displayName, setDisplayName] = useState(() => getAuthUser()?.name ?? "");

  useEffect(() => {
    const sync = () => setDisplayName(getAuthUser()?.name ?? "");
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(AUTH_SESSION_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(AUTH_SESSION_EVENT, sync);
    };
  }, []);

  const greeting = displayName
    ? `Welcome back, ${displayName.split(" ")[0]}`
    : "Welcome back";

  return (
    <PageShell className="gap-1">
      <header className="space-y-2 items-center justify-center">
        <p className="label-caps text-on-surface-variant text-center">Workspace</p>
        <h1 className="text-display-md text-center">
          {greeting}
        </h1>
      </header>

      <WorkspaceLauncher />
    </PageShell>
  );
}
