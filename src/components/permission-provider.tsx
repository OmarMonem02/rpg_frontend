"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  canAccessRoute,
  canCreate,
  canDelete,
  canExport,
  canImport,
  canDisplayPage,
  canReadPage,
  canUpdate,
  getAllowedPages,
  getDefaultRoute,
  hasAnyPermission,
  hasPermission,
  normalizePermissionMatrix,
  type ActionType,
  type PagePath,
  type PermissionMatrix,
} from "@/lib/permissions";
import {
  AUTH_SESSION_EVENT,
  getAuthUser,
  type AuthUser,
} from "@/lib/auth-session";

type PermissionContextType = {
  permissions: PermissionMatrix;
  hasPermission: (page: PagePath, action: ActionType) => boolean;
  hasAnyPermission: (page: PagePath, actions: ActionType[]) => boolean;
  canReadPage: (page: PagePath) => boolean;
  canDisplayPage: (page: PagePath) => boolean;
  canAccessRoute: (pathname: string) => boolean;
  canCreate: (page: PagePath) => boolean;
  canUpdate: (page: PagePath) => boolean;
  canDelete: (page: PagePath) => boolean;
  canExport: (page: PagePath) => boolean;
  canImport: (page: PagePath) => boolean;
  getAllowedPages: () => PagePath[];
  getDefaultRoute: () => string;
};

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined,
);

export function PermissionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getAuthUser());

  useEffect(() => {
    const syncAuthUser = () => setAuthUser(getAuthUser());

    syncAuthUser();
    window.addEventListener(AUTH_SESSION_EVENT, syncAuthUser);
    window.addEventListener("storage", syncAuthUser);

    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncAuthUser);
      window.removeEventListener("storage", syncAuthUser);
    };
  }, []);

  const permissionMatrix = useMemo(
    () => normalizePermissionMatrix(authUser?.permissions),
    [authUser?.permissions],
  );

  const contextValue = useMemo<PermissionContextType>(
    () => ({
      permissions: permissionMatrix,
      hasPermission: (page, action) =>
        hasPermission(permissionMatrix, page, action),
      hasAnyPermission: (page, actions) =>
        hasAnyPermission(permissionMatrix, page, actions),
      canReadPage: (page) => canReadPage(permissionMatrix, page),
      canDisplayPage: (page) => canDisplayPage(permissionMatrix, page),
      canAccessRoute: (pathname) => {
        const normalized = pathname.replace(/\/+$/, "") || "/";
        if (/^\/history(?:\/|$)/.test(normalized)) {
          return authUser?.role === "admin";
        }
        if (/^\/requests(?:\/|$)/.test(normalized)) {
          return authUser?.role === "admin";
        }
        return canAccessRoute(permissionMatrix, pathname);
      },
      canCreate: (page) => canCreate(permissionMatrix, page),
      canUpdate: (page) => canUpdate(permissionMatrix, page),
      canDelete: (page) => canDelete(permissionMatrix, page),
      canExport: (page) => canExport(permissionMatrix, page),
      canImport: (page) => canImport(permissionMatrix, page),
      getAllowedPages: () => getAllowedPages(permissionMatrix),
      getDefaultRoute: () => getDefaultRoute(permissionMatrix),
    }),
    [authUser?.role, permissionMatrix],
  );

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
}
