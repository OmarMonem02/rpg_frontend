"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { ApiError } from "@/lib/auth-api";
import { usePermissions } from "@/components/permission-provider";
import { getAuthToken, getAuthUser, setAuthUser } from "@/lib/auth-session";
import { getPermissionMetadata, getUser, updateUserPermissions } from "@/lib/crud-api";
import { PermissionsEditor } from "@/components/permissions-editor";
import {
  ActionButton,
  PageHero,
  PageShell,
  InlineMessage,
  StatCard,
  StatGrid,
} from "@/components/ops-ui";
import type { UserRecord } from "@/lib/crud-api";
import {
  ALL_PAGE_PATHS,
  FALLBACK_PERMISSION_METADATA,
  type PermissionMatrix,
  type PermissionMetadata,
} from "@/lib/permissions";
import { usePageTitle } from "@/components/page-title-provider";

function countDataPages(matrix: PermissionMatrix | undefined) {
  if (!matrix) return 0;
  return ALL_PAGE_PATHS.filter((page) => matrix[page]?.includes("read")).length;
}

function countDisplayPages(matrix: PermissionMatrix | undefined) {
  if (!matrix) return 0;
  return ALL_PAGE_PATHS.filter((page) => matrix[page]?.includes("display")).length;
}

function countActions(matrix: PermissionMatrix | undefined) {
  if (!matrix) return 0;
  return Object.values(matrix).reduce((sum, actions) => sum + actions.length, 0);
}

function getRoleLabel(role: string): string {
  if (!role) return "Unknown";
  return role === "Technician" ? role : `${role[0].toUpperCase()}${role.slice(1)}`;
}

export default function UserPermissionsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = Number(params?.id);
  const permissions = usePermissions();
  const canSavePermissions = permissions.canUpdate("users");

  const [user, setUser] = useState<UserRecord | null>(null);
  const [metadata, setMetadata] = useState<PermissionMetadata>(
    FALLBACK_PERMISSION_METADATA,
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveErrorStatus, setSaveErrorStatus] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  usePageTitle(user ? `${user.name} Permissions` : null);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      if (!userId || userId <= 0) throw new Error("Invalid user ID");

      const [userData, permissionMetadata] = await Promise.all([
        getUser(token, userId),
        getPermissionMetadata(token).catch(() => FALLBACK_PERMISSION_METADATA),
      ]);
      setUser(userData);
      setMetadata(permissionMetadata);
      setLoadError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load user";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const stats = useMemo(() => {
    const matrix = user?.permissions;
    return {
      dataPages: countDataPages(matrix),
      displayPages: countDisplayPages(matrix),
      totalActions: countActions(matrix),
      source:
        user?.permission_source === "custom" ? "Custom override" : "Role default",
    };
  }, [user?.permission_source, user?.permissions]);

  const handleSavePermissions = async (newPermissions: PermissionMatrix) => {
    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveErrorStatus(null);
      setSuccess(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      if (!userId || userId <= 0) throw new Error("Invalid user ID");

      const updatedUser = await updateUserPermissions(
        token,
        userId,
        newPermissions,
      );
      setUser(updatedUser);

      const currentUser = getAuthUser();
      if (currentUser?.id === updatedUser.id) {
        setAuthUser(updatedUser);
      }

      setSuccess("Permissions updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof ApiError) {
        setSaveError(err.message);
        setSaveErrorStatus(err.status);
      } else {
        const message =
          err instanceof Error ? err.message : "Failed to save permissions";
        setSaveError(message);
        setSaveErrorStatus(null);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary" />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <PageHero title="User Not Found" />
        <InlineMessage tone="danger">
          {loadError || "Failed to load user information. Please try again."}
        </InlineMessage>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHero
        eyebrow="Manage permissions"
        title={user.name}
        meta={
          <p className="text-sm text-on-surface-variant">
            {user.email} · {getRoleLabel(user.role)} · User #{user.id}
          </p>
        }
        actions={
          <ActionButton
            type="button"
            variant="outline"
            onClick={() => router.push("/users")}
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to users
          </ActionButton>
        }
      />

      <StatGrid>
        <StatCard label="Access source" value={stats.source} />
        <StatCard
          label="Data (API)"
          value={String(stats.dataPages)}
          hint="Pages with read data permission"
        />
        <StatCard
          label="UI pages"
          value={String(stats.displayPages)}
          hint="Pages visible in navigation"
        />
        <StatCard label="Total actions" value={String(stats.totalActions)} />
      </StatGrid>

      {loadError ? <InlineMessage tone="danger">{loadError}</InlineMessage> : null}
      {saveError ? (
        <InlineMessage tone={saveErrorStatus === 403 ? "danger" : "warning"}>
          {saveError}
        </InlineMessage>
      ) : null}
      {success ? <InlineMessage tone="success">{success}</InlineMessage> : null}
      {!canSavePermissions ? (
        <InlineMessage tone="warning">
          Your account can read users, but it cannot update permissions.
        </InlineMessage>
      ) : null}

      <PermissionsEditor
        userId={user.id}
        userName={user.name}
        userEmail={user.email}
        currentRole={user.role}
        initialPermissions={user.permissions}
        rolePermissions={user.role_permissions}
        permissionSource={user.permission_source}
        metadata={metadata}
        onSave={handleSavePermissions}
        isSaving={isSaving}
        canSave={canSavePermissions}
        isCurrentUser={getAuthUser()?.id === user.id}
        showHeader={false}
      />
    </PageShell>
  );
}
