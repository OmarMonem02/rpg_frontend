import {
  ALL_PAGE_PATHS,
  canAccessRoute,
  getDefaultRoute,
  getRoutePermission,
  hasAnyPermission,
  hasPermission,
  normalizePermissionMatrix,
  type PermissionMatrix,
} from "@/lib/permissions";

function createMatrix(overrides: Partial<PermissionMatrix> = {}): PermissionMatrix {
  return normalizePermissionMatrix(overrides);
}

describe("permissions", () => {
  it("normalizes invalid payloads into the full 16-page matrix", () => {
    const matrix = normalizePermissionMatrix({
      sales: ["READ", "delete", "unknown"],
      users: "invalid",
    });

    expect(Object.keys(matrix)).toHaveLength(ALL_PAGE_PATHS.length);
    expect(matrix.sales).toEqual(["read", "delete"]);
    expect(matrix.users).toEqual([]);
    expect(matrix.dashboard).toEqual([]);
  });

  it("maps nested routes to the required page and action", () => {
    expect(getRoutePermission("/inventory/sales/create")).toEqual({
      page: "sales",
      action: "create",
    });
    expect(getRoutePermission("/inventory/sales/42/manage")).toEqual({
      page: "sales",
      action: "update",
    });
    expect(getRoutePermission("/users/permissions/7")).toEqual({
      page: "users",
      action: "update",
    });
    expect(getRoutePermission("/data/bike-blueprints/11/spare-parts")).toEqual({
      page: "bike-blueprints",
      action: "update",
    });
  });

  it("checks permission helpers from matrix data only", () => {
    const matrix = createMatrix({
      dashboard: ["read"],
      sales: ["read", "update", "export"],
    });

    expect(hasPermission(matrix, "sales", "update")).toBe(true);
    expect(hasPermission(matrix, "sales", "create")).toBe(false);
    expect(hasAnyPermission(matrix, "sales", ["delete", "export"])).toBe(true);
    expect(canAccessRoute(matrix, "/inventory/sales/123/manage")).toBe(true);
    expect(canAccessRoute(matrix, "/users")).toBe(false);
  });

  it("selects the first readable route as the default fallback", () => {
    const matrix = createMatrix({
      products: ["read"],
      sales: ["read"],
    });

    expect(getDefaultRoute(matrix)).toBe("/inventory/sales");
  });
});
