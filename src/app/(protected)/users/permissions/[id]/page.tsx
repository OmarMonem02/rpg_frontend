"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ApiError } from "@/lib/auth-api";
import { usePermissions } from "@/components/permission-provider";
import { getAuthToken, getAuthUser, setAuthUser } from "@/lib/auth-session";
import { getUser, updateUserPermissions } from "@/lib/crud-api";
import { PermissionsEditor } from "@/components/permissions-editor";
import { PageHero, PageShell, InlineMessage } from "@/components/ops-ui";
import type { UserRecord } from "@/lib/crud-api";
import type { PermissionMatrix } from "@/lib/permissions";

export default function UserPermissionsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = Number(params?.id);
  const permissions = usePermissions();
  const canSavePermissions = permissions.canUpdate("users");

  const [user, setUser] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveErrorStatus, setSaveErrorStatus] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      if (!userId || userId <= 0) throw new Error("Invalid user ID");

      const userData = await getUser(token, userId);
      setUser(userData);
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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"></div>
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
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-outline-variant/30 hover:bg-surface-container transition-colors"
          title="Go back"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div>
          <p className="text-sm text-on-surface-variant">Manage Permissions</p>
          <h1 className="text-2xl font-bold text-on-surface">{user.name}</h1>
        </div>
      </div>

      <PageHero
        title={`User Authorizations for ${user.name} (${user.email})`}
      />

      {loadError && <InlineMessage tone="danger">{loadError}</InlineMessage>}
      {saveError ? (
        <InlineMessage tone={saveErrorStatus === 403 ? "danger" : "warning"}>
          {saveError}
        </InlineMessage>
      ) : null}
      {success && <InlineMessage tone="success">{success}</InlineMessage>}
      {!canSavePermissions ? (
        <InlineMessage tone="warning">
          Your account can read users, but it cannot update permissions.
        </InlineMessage>
      ) : null}

      <PermissionsEditor
        userId={user.id}
        userName={user.name}
        currentRole={user.role}
        initialPermissions={user.permissions}
        onSave={handleSavePermissions}
        isSaving={isSaving}
        canSave={canSavePermissions}
      />
    </PageShell>
  );
}
