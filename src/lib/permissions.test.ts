import { describe, expect, it } from "vitest";
import {
  FALLBACK_PERMISSION_METADATA,
  getAllowedActionsForPage,
  getRolePresetPermissions,
  normalizePermissionMatrixForMetadata,
  normalizePermissionMetadata,
} from "./permissions";

describe("permission metadata", () => {
  it("normalizes metadata and keeps fallback pages for missing definitions", () => {
    const metadata = normalizePermissionMetadata({
      actions: ["read", "delete", "fly"],
      groups: [{ key: "ops", label: "Operations" }],
      pages: [
        {
          key: "dashboard",
          label: "Dashboard",
          group: "ops",
          description: "Home",
          actions: ["read", "delete"],
        },
      ],
      role_presets: [],
    });

    expect(metadata.actions).toEqual(["read", "delete"]);
    expect(metadata.groups).toEqual([{ key: "ops", label: "Operations" }]);
    expect(getAllowedActionsForPage(metadata, "dashboard")).toEqual([
      "read",
      "delete",
    ]);
    expect(metadata.pages.some((page) => page.key === "sales")).toBe(true);
  });

  it("normalizes matrices against allowed page actions", () => {
    const matrix = normalizePermissionMatrixForMetadata(
      {
        dashboard: ["read", "delete"],
        sales: ["read", "export", "import"],
      },
      FALLBACK_PERMISSION_METADATA,
    );

    expect(matrix.dashboard).toEqual(["read"]);
    expect(matrix.sales).toEqual(["read", "export"]);
  });

  it("applies role presets through metadata", () => {
    const metadata = normalizePermissionMetadata({
      ...FALLBACK_PERMISSION_METADATA,
      role_presets: [
        {
          key: "staff",
          label: "Staff",
          permissions: {
            sales: ["read", "create"],
            dashboard: ["read", "delete"],
          },
        },
      ],
    });

    const preset = getRolePresetPermissions(metadata, "staff");

    expect(preset?.sales).toEqual(["create", "read"]);
    expect(preset?.dashboard).toEqual(["read"]);
  });
});
