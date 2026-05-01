"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import { WorkspaceLoadingCard } from "@/components/workspace-loading-card";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const permissions = usePermissions();

  useEffect(() => {
    if (!permissions.canReadPage("users")) {
      router.replace(permissions.getDefaultRoute());
    }
  }, [permissions, router]);

  if (!permissions.canReadPage("users")) {
    return <WorkspaceLoadingCard />;
  }

  return children;
}
