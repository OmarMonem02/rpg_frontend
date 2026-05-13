"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  ALL_PAGE_PATHS,
  FALLBACK_PERMISSION_METADATA,
  getAllowedActionsForPage,
  getRolePresetPermissions,
  normalizePermissionMatrixForMetadata,
  type ActionType,
  type PagePath,
  type PermissionMatrix,
  type PermissionMetadata,
} from "@/lib/permissions";
import { ActionButton, InlineMessage, SurfaceCard } from "@/components/ops-ui";

interface PermissionsEditorProps {
  userId: number;
  userName: string;
  userEmail: string;
  currentRole: string;
  initialPermissions?: PermissionMatrix;
  rolePermissions?: PermissionMatrix;
  permissionSource?: "custom" | "role";
  metadata?: PermissionMetadata;
  onSave: (permissions: PermissionMatrix) => Promise<void>;
  isSaving?: boolean;
  canSave?: boolean;
  isCurrentUser?: boolean;
}

type RowMode = "none" | "view" | "editor" | "manager";

const ACTION_LABELS: Record<ActionType, string> = {
  create: "Create",
  read: "Read",
  update: "Update",
  delete: "Delete",
  export: "Export",
  import: "Import",
};

const MODE_LABELS: Record<RowMode, string> = {
  none: "No access",
  view: "View only",
  editor: "Editor",
  manager: "Manager",
};

function sortActions(actions: ActionType[], allowedActions: ActionType[]) {
  return allowedActions.filter((action) => actions.includes(action));
}

function getModeActions(
  mode: RowMode,
  allowedActions: ActionType[],
): ActionType[] {
  if (mode === "none") return [];
  if (mode === "view") return allowedActions.includes("read") ? ["read"] : [];
  if (mode === "editor") {
    return sortActions(["read", "create", "update"], allowedActions);
  }
  return [...allowedActions];
}

function getRowMode(actions: ActionType[], allowedActions: ActionType[]): RowMode {
  if (actions.length === 0) return "none";
  if (actions.length === 1 && actions[0] === "read") return "view";
  if (allowedActions.every((action) => actions.includes(action))) return "manager";
  return "editor";
}

function countActions(matrix: PermissionMatrix) {
  return Object.values(matrix).reduce((sum, actions) => sum + actions.length, 0);
}

function countReadablePages(matrix: PermissionMatrix) {
  return ALL_PAGE_PATHS.filter((page) => matrix[page].includes("read")).length;
}

function matricesEqual(left: PermissionMatrix, right: PermissionMatrix) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function PermissionsEditor({
  userId,
  userName,
  userEmail,
  currentRole,
  initialPermissions,
  rolePermissions,
  permissionSource = "role",
  metadata = FALLBACK_PERMISSION_METADATA,
  onSave,
  isSaving = false,
  canSave = true,
  isCurrentUser = false,
}: PermissionsEditorProps) {
  const resolvedInitialPermissions = useMemo(
    () => normalizePermissionMatrixForMetadata(initialPermissions, metadata),
    [initialPermissions, metadata],
  );
  const normalizedRolePermissions = useMemo(
    () => normalizePermissionMatrixForMetadata(rolePermissions, metadata),
    [rolePermissions, metadata],
  );

  const [permissions, setPermissions] = useState<PermissionMatrix>(
    resolvedInitialPermissions,
  );
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");

  useEffect(() => {
    setPermissions(resolvedInitialPermissions);
  }, [resolvedInitialPermissions]);

  const hasChanges = !matricesEqual(permissions, resolvedInitialPermissions);
  const totalAllowed = countActions(permissions);
  const readablePages = countReadablePages(permissions);
  const roleTotalAllowed = countActions(normalizedRolePermissions);

  const visiblePages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return metadata.pages.filter((page) => {
      const matchesGroup = activeGroup === "all" || page.group === activeGroup;
      const matchesQuery =
        !normalizedQuery ||
        page.label.toLowerCase().includes(normalizedQuery) ||
        page.description.toLowerCase().includes(normalizedQuery) ||
        page.key.toLowerCase().includes(normalizedQuery);

      return matchesGroup && matchesQuery;
    });
  }, [activeGroup, metadata.pages, query]);

  const setPageActions = (page: PagePath, nextActions: ActionType[]) => {
    setPermissions((prev) =>
      normalizePermissionMatrixForMetadata(
        {
          ...prev,
          [page]: nextActions,
        },
        metadata,
      ),
    );
  };

  const toggleAction = (page: PagePath, action: ActionType) => {
    const allowedActions = getAllowedActionsForPage(metadata, page);
    const pageActions = permissions[page];
    const nextActions = pageActions.includes(action)
      ? pageActions.filter((candidate) => candidate !== action)
      : [...pageActions, action];
    const withRead: ActionType[] =
      action !== "read" && !nextActions.includes("read")
        ? ["read", ...nextActions]
        : nextActions;

    setPageActions(page, sortActions(withRead, allowedActions));
  };

  const applyPreset = (role: string) => {
    const preset = getRolePresetPermissions(metadata, role);
    if (preset) setPermissions(preset);
  };

  const clearAll = () => {
    setPermissions(normalizePermissionMatrixForMetadata({}, metadata));
  };

  const resetChanges = () => {
    setPermissions(resolvedInitialPermissions);
  };

  const handleSave = async () => {
    await onSave(normalizePermissionMatrixForMetadata(permissions, metadata));
  };

  return (
    <div className="space-y-5">
      <SurfaceCard>
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <ShieldCheckIcon className="h-4 w-4" />
                {permissionSource === "custom" ? "Custom access" : "Role default"}
              </span>
              {hasChanges ? (
                <span className="rounded-full border border-yellow-500/25 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-700">
                  Unsaved changes
                </span>
              ) : null}
            </div>
            <h2 className="text-2xl font-bold text-on-surface">{userName}</h2>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-on-surface-variant">
              <span>{userEmail}</span>
              <span>User ID: {userId}</span>
              <span>Role: {currentRole || "Unknown"}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-outline-variant/15 bg-surface px-3 py-2">
              <p className="mono-data text-lg font-bold text-on-surface">{readablePages}</p>
              <p className="text-xs text-on-surface-variant">Pages</p>
            </div>
            <div className="rounded-xl border border-outline-variant/15 bg-surface px-3 py-2">
              <p className="mono-data text-lg font-bold text-on-surface">{totalAllowed}</p>
              <p className="text-xs text-on-surface-variant">Actions</p>
            </div>
            <div className="rounded-xl border border-outline-variant/15 bg-surface px-3 py-2">
              <p className="mono-data text-lg font-bold text-on-surface">{roleTotalAllowed}</p>
              <p className="text-xs text-on-surface-variant">Role</p>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {isCurrentUser ? (
        <InlineMessage tone="warning">
          You are editing your own access. The backend will block changes that
          remove your ability to read and update users.
        </InlineMessage>
      ) : null}

      <SurfaceCard>
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <label className="space-y-2">
            <span className="label-caps">Find permissions</span>
            <div className="flex items-center rounded-xl border border-outline-variant/25 bg-surface px-3 py-2 focus-within:border-primary">
              <MagnifyingGlassIcon className="mr-2 h-5 w-5 text-on-surface-variant" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-on-surface-variant/60"
                placeholder="Search page, group, or description"
              />
            </div>
          </label>

          <div className="flex flex-wrap gap-2">
            {metadata.role_presets.map((preset) => (
              <ActionButton
                key={preset.key}
                type="button"
                size="sm"
                variant={preset.key === currentRole ? "filled" : "outline"}
                tone={preset.key === currentRole ? "primary" : "default"}
                onClick={() => applyPreset(preset.key)}
                disabled={isSaving || !canSave}
              >
                <ShieldCheckIcon className="h-4 w-4" />
                {preset.label}
              </ActionButton>
            ))}
            <ActionButton
              type="button"
              size="sm"
              variant="outline"
              onClick={clearAll}
              disabled={isSaving || !canSave}
            >
              <XMarkIcon className="h-4 w-4" />
              Clear all
            </ActionButton>
            <ActionButton
              type="button"
              size="sm"
              variant="outline"
              onClick={resetChanges}
              disabled={isSaving || !hasChanges}
            >
              <ArrowPathIcon className="h-4 w-4" />
              Reset
            </ActionButton>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveGroup("all")}
            className={`flex-none rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              activeGroup === "all"
                ? "bg-primary text-on-primary"
                : "bg-surface text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            All
          </button>
          {metadata.groups.map((group) => (
            <button
              key={group.key}
              type="button"
              onClick={() => setActiveGroup(group.key)}
              className={`flex-none rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                activeGroup === group.key
                  ? "bg-primary text-on-primary"
                  : "bg-surface text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {group.label}
            </button>
          ))}
        </div>
      </SurfaceCard>

      <div className="grid gap-4">
        {visiblePages.map((page) => {
          const allowedActions = getAllowedActionsForPage(metadata, page.key);
          const pageActions = permissions[page.key];
          const rowMode = getRowMode(pageActions, allowedActions);

          return (
            <SurfaceCard key={page.key} className="bg-surface-container-lowest">
              <div className="grid gap-4 xl:grid-cols-[minmax(220px,0.8fr)_minmax(320px,1.2fr)_auto] xl:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-on-surface">
                      {page.label}
                    </h3>
                    <span className="mono-data rounded-lg bg-surface-container px-2 py-1 text-xs text-on-surface-variant">
                      {page.key}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                    {page.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {allowedActions.map((action) => {
                    const checked = pageActions.includes(action);
                    return (
                      <button
                        key={`${page.key}-${action}`}
                        type="button"
                        onClick={() => toggleAction(page.key, action)}
                        disabled={isSaving || !canSave}
                        aria-pressed={checked}
                        className={`inline-flex min-w-24 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                          checked
                            ? "border-primary bg-primary text-on-primary"
                            : "border-outline-variant/20 bg-surface text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                        }`}
                      >
                        {checked ? <CheckIcon className="h-4 w-4" /> : null}
                        {ACTION_LABELS[action]}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  {(Object.keys(MODE_LABELS) as RowMode[]).map((mode) => (
                    <button
                      key={`${page.key}-${mode}`}
                      type="button"
                      onClick={() =>
                        setPageActions(
                          page.key,
                          getModeActions(mode, allowedActions),
                        )
                      }
                      disabled={isSaving || !canSave}
                      className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                        rowMode === mode
                          ? "bg-on-surface text-surface"
                          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                      }`}
                    >
                      {MODE_LABELS[mode]}
                    </button>
                  ))}
                </div>
              </div>
            </SurfaceCard>
          );
        })}
      </div>

      <div className="sticky bottom-2 z-20 rounded-2xl border border-outline-variant/20 bg-surface/95 p-3 shadow-ambient backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-on-surface-variant">
            {hasChanges
              ? "Review changes, then save the complete permission matrix."
              : "Permissions are synchronized with the saved matrix."}
          </p>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              type="button"
              variant="outline"
              onClick={resetChanges}
              disabled={isSaving || !hasChanges}
            >
              <ArrowPathIcon className="h-4 w-4" />
              Reset changes
            </ActionButton>
            <ActionButton
              tone="primary"
              variant="filled"
              disabled={isSaving || !canSave || !hasChanges}
              onClick={handleSave}
            >
              <CheckIcon className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save access"}
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
