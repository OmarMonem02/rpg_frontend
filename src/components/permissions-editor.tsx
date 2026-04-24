"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ALL_ACTIONS,
  ALL_PAGE_PATHS,
  normalizePermissionMatrix,
  type PermissionMatrix,
} from "@/lib/permissions";
import { ActionButton, SurfaceCard } from "@/components/ops-ui";

interface PermissionsEditorProps {
  userId: number;
  userName: string;
  currentRole: string;
  initialPermissions?: PermissionMatrix;
  onSave: (permissions: PermissionMatrix) => Promise<void>;
  isSaving?: boolean;
  canSave?: boolean;
}

const PAGE_LABELS: Record<keyof PermissionMatrix, string> = {
  dashboard: "Dashboard",
  sales: "Sales",
  maintenance: "Maintenance",
  inventory: "Inventory",
  brands: "Brands",
  products: "Products",
  bikes: "Bikes",
  "spare-parts": "Spare Parts",
  "maintenance-services": "Maintenance Services",
  users: "Users",
  "import-export": "Import / Export",
  "payment-methods": "Payment Methods",
  "product-categories": "Product Categories",
  "spare-part-categories": "Spare Part Categories",
  "bike-blueprints": "Bike Blueprints",
  sellers: "Sellers",
};

export function PermissionsEditor({
  userId,
  userName,
  currentRole,
  initialPermissions,
  onSave,
  isSaving = false,
  canSave = true,
}: PermissionsEditorProps) {
  const resolvedInitialPermissions = useMemo(
    () => normalizePermissionMatrix(initialPermissions),
    [initialPermissions],
  );

  const [permissions, setPermissions] = useState<PermissionMatrix>(
    resolvedInitialPermissions,
  );

  useEffect(() => {
    setPermissions(resolvedInitialPermissions);
  }, [resolvedInitialPermissions]);

  const toggleAction = (
    page: keyof PermissionMatrix,
    action: (typeof ALL_ACTIONS)[number],
  ) => {
    setPermissions((prev) => {
      const pageActions = prev[page];
      const nextPageActions = pageActions.includes(action)
        ? pageActions.filter((candidate) => candidate !== action)
        : [...pageActions, action];

      return normalizePermissionMatrix({
        ...prev,
        [page]: nextPageActions,
      });
    });
  };

  const totalAllowed = Object.values(permissions).reduce(
    (sum, actions) => sum + actions.length,
    0,
  );
  const readablePages = ALL_PAGE_PATHS.filter((page) =>
    permissions[page].includes("read"),
  ).length;

  const handleSave = async () => {
    await onSave(normalizePermissionMatrix(permissions));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4">
        <h2 className="mb-1 text-lg font-semibold text-on-surface">{userName}</h2>
        <div className="flex flex-wrap gap-4 text-sm text-on-surface-variant">
          <span>User ID: {userId}</span>
          <span>Role: {currentRole || "Unknown"}</span>
        </div>
      </div>

      <SurfaceCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-on-surface">
              Effective Permission Matrix
            </h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              The backend owns these permissions. Every save submits the full 16-page matrix.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-outline-variant/20 bg-surface px-3 py-1 text-on-surface">
              {readablePages} readable pages
            </span>
            <span className="rounded-full border border-outline-variant/20 bg-surface px-3 py-1 text-on-surface">
              {totalAllowed} total actions
            </span>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-outline-variant/20 bg-surface-container-low">
              <tr>
                <th className="px-4 py-3 font-semibold text-on-surface">Page</th>
                {ALL_ACTIONS.map((action) => (
                  <th
                    key={action}
                    className="px-4 py-3 text-center font-semibold capitalize text-on-surface"
                  >
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_PAGE_PATHS.map((page) => {
                const pageActions = permissions[page];

                return (
                  <tr
                    key={page}
                    className="border-b border-outline-variant/10 text-on-surface"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{PAGE_LABELS[page]}</div>
                      <div className="text-xs text-on-surface-variant">{page}</div>
                    </td>
                    {ALL_ACTIONS.map((action) => (
                      <td key={`${page}-${action}`} className="px-4 py-3 text-center">
                        <label className="inline-flex cursor-pointer items-center justify-center">
                          <input
                            type="checkbox"
                            checked={pageActions.includes(action)}
                            onChange={() => toggleAction(page, action)}
                            disabled={isSaving || !canSave}
                            aria-label={`${PAGE_LABELS[page]} ${action}`}
                            className="h-4 w-4 rounded border-outline-variant/40"
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SurfaceCard>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-on-surface-variant">
          Empty rows are preserved and sent as empty arrays.
        </p>
        <ActionButton
          tone="primary"
          variant="filled"
          disabled={isSaving || !canSave}
          onClick={handleSave}
        >
          {isSaving ? "Saving..." : "Save Permissions"}
        </ActionButton>
      </div>
    </div>
  );
}
