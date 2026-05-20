import { describe, expect, it } from "vitest";
import {
  canAccessRoute,
  canDisplayPage,
  canReadPage,
  createEmptyPermissionMatrix,
  FALLBACK_PERMISSION_METADATA,
  getAllowedActionsForPage,
  getRolePresetPermissions,
  normalizePermissionMatrix,
  normalizePermissionMatrixForMetadata,
  normalizePermissionMetadata,
} from "./permissions";

describe("permission metadata", () => {
  it("normalizes metadata and keeps fallback pages for missing definitions", () => {
    const metadata = normalizePermissionMetadata({
      actions: ["read", "display", "delete", "fly"],
      groups: [{ key: "ops", label: "Operations" }],
      pages: [
        {
          key: "dashboard",
          label: "Dashboard",
          group: "ops",
          description: "Home",
          actions: ["read", "display", "delete"],
        },
      ],
      role_presets: [],
    });

    expect(metadata.actions).toEqual(["read", "display", "delete"]);
    expect(metadata.groups).toEqual([{ key: "ops", label: "Operations" }]);
    expect(getAllowedActionsForPage(metadata, "dashboard")).toEqual([
      "read",
      "display",
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

describe("route access with display", () => {
  it("allows API data read without granting page route access", () => {
    const matrix = normalizePermissionMatrix({
      ...createEmptyPermissionMatrix(),
      products: ["read"],
      sales: ["read", "display"],
    });

    expect(canReadPage(matrix, "products")).toBe(true);
    expect(canDisplayPage(matrix, "products")).toBe(false);
    expect(canAccessRoute(matrix, "/inventory/products")).toBe(false);
  });

  it("allows page route when display and read are granted", () => {
    const matrix = normalizePermissionMatrix({
      ...createEmptyPermissionMatrix(),
      products: ["read", "display"],
    });

    expect(canAccessRoute(matrix, "/inventory/products")).toBe(true);
  });

  it("treats read as page access on legacy matrices without display", () => {
    const legacy = normalizePermissionMatrix({
      ...createEmptyPermissionMatrix(),
      sales: ["create", "read", "update"],
      maintenance: ["read"],
    });

    expect(canAccessRoute(legacy, "/inventory/sales")).toBe(true);
    expect(canAccessRoute(legacy, "/tickets")).toBe(true);
    expect(canAccessRoute(legacy, "/")).toBe(false);
  });

  it("requires display for customers workspace route", () => {
    const salesOnly = normalizePermissionMatrix({
      ...createEmptyPermissionMatrix(),
      sales: ["read", "display"],
      maintenance: [],
    });

    expect(canAccessRoute(salesOnly, "/customers")).toBe(true);

    const dataOnly = normalizePermissionMatrix({
      ...createEmptyPermissionMatrix(),
      sales: ["read"],
      maintenance: ["read"],
      users: ["read", "display"],
    });

    expect(canAccessRoute(dataOnly, "/customers")).toBe(false);
  });

  it("requires display plus route action for create pages", () => {
    const matrix = normalizePermissionMatrix({
      ...createEmptyPermissionMatrix(),
      products: ["read", "display", "create"],
    });

    expect(canAccessRoute(matrix, "/inventory/products/create")).toBe(true);

    const withoutDisplay = normalizePermissionMatrix({
      ...createEmptyPermissionMatrix(),
      products: ["read", "create"],
      sales: ["read", "display"],
    });

    expect(
      canAccessRoute(withoutDisplay, "/inventory/products/create"),
    ).toBe(false);
  });
});
