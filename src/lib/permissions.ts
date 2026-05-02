export type PagePath =
  | "dashboard"
  | "sales"
  | "maintenance"
  | "inventory"
  | "brands"
  | "products"
  | "bikes"
  | "spare-parts"
  | "maintenance-services"
  | "users"
  | "import-export"
  | "payment-methods"
  | "product-categories"
  | "spare-part-categories"
  | "bike-blueprints"
  | "sellers"
  | "reporting";

export type ActionType =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "export"
  | "import";

export type PermissionMatrix = Record<PagePath, ActionType[]>;

export type RoutePermission = {
  page: PagePath;
  action: ActionType;
};

export const ALL_PAGE_PATHS: PagePath[] = [
  "dashboard",
  "sales",
  "maintenance",
  "inventory",
  "brands",
  "products",
  "bikes",
  "spare-parts",
  "maintenance-services",
  "users",
  "import-export",
  "payment-methods",
  "product-categories",
  "spare-part-categories",
  "bike-blueprints",
  "sellers",
  "reporting",
];

export const ALL_ACTIONS: ActionType[] = [
  "create",
  "read",
  "update",
  "delete",
  "export",
  "import",
];

const DEFAULT_ROUTE_BY_PAGE: Record<PagePath, string> = {
  dashboard: "/",
  sales: "/inventory/sales",
  maintenance: "/tickets",
  inventory: "/inventory/spare-parts",
  brands: "/inventory/brands",
  products: "/inventory/products",
  bikes: "/inventory/bikes",
  "spare-parts": "/inventory/spare-parts",
  "maintenance-services": "/inventory/maintenance-services",
  users: "/users",
  "import-export": "/data/import-export",
  "payment-methods": "/data/payment-methods",
  "product-categories": "/data/product-categories",
  "spare-part-categories": "/data/spare-part-categories",
  "bike-blueprints": "/data/bike-blueprints",
  sellers: "/sellers",
  reporting: "/reporting",
};

const ROUTE_PERMISSION_RULES: Array<{
  pattern: RegExp;
  permission: RoutePermission;
}> = [
  {
    pattern: /^\/users\/permissions(?:\/|$)/,
    permission: { page: "users", action: "update" },
  },
  {
    pattern: /^\/users(?:\/|$)/,
    permission: { page: "users", action: "read" },
  },
  {
    pattern: /^\/sellers(?:\/|$)/,
    permission: { page: "sellers", action: "read" },
  },
  {
    pattern: /^\/data\/payment-methods(?:\/|$)/,
    permission: { page: "payment-methods", action: "read" },
  },
  {
    pattern: /^\/data\/import-export(?:\/|$)/,
    permission: { page: "import-export", action: "read" },
  },
  {
    pattern: /^\/data\/product-categories(?:\/|$)/,
    permission: { page: "product-categories", action: "read" },
  },
  {
    pattern: /^\/data\/spare-part-categories(?:\/|$)/,
    permission: { page: "spare-part-categories", action: "read" },
  },
  {
    pattern: /^\/data\/bike-blueprints\/create(?:\/|$)/,
    permission: { page: "bike-blueprints", action: "create" },
  },
  {
    pattern: /^\/data\/bike-blueprints\/edit(?:\/|$)/,
    permission: { page: "bike-blueprints", action: "update" },
  },
  {
    pattern: /^\/data\/bike-blueprints\/[^/]+\/spare-parts(?:\/|$)/,
    permission: { page: "bike-blueprints", action: "update" },
  },
  {
    pattern: /^\/data\/bike-blueprints(?:\/|$)/,
    permission: { page: "bike-blueprints", action: "read" },
  },
  {
    pattern: /^\/reporting(?:\/|$)/,
    permission: { page: "reporting", action: "read" },
  },
  {
    pattern: /^\/inventory\/sales\/create(?:\/|$)/,
    permission: { page: "sales", action: "create" },
  },
  {
    pattern: /^\/inventory\/sales\/[^/]+\/(?:manage|return|exchange)(?:\/|$)/,
    permission: { page: "sales", action: "update" },
  },
  {
    pattern: /^\/inventory\/sales\/[^/]+(?:\/|$)/,
    permission: { page: "sales", action: "read" },
  },
  {
    pattern: /^\/inventory\/sales(?:\/|$)/,
    permission: { page: "sales", action: "read" },
  },
  {
    pattern: /^\/inventory\/maintenance-services\/create(?:\/|$)/,
    permission: { page: "maintenance-services", action: "create" },
  },
  {
    pattern: /^\/inventory\/maintenance-services\/edit(?:\/|$)/,
    permission: { page: "maintenance-services", action: "update" },
  },
  {
    pattern: /^\/inventory\/maintenance-services(?:\/|$)/,
    permission: { page: "maintenance-services", action: "read" },
  },
  {
    pattern: /^\/inventory\/spare-parts\/create(?:\/|$)/,
    permission: { page: "spare-parts", action: "create" },
  },
  {
    pattern: /^\/inventory\/spare-parts\/edit(?:\/|$)/,
    permission: { page: "spare-parts", action: "update" },
  },
  {
    pattern: /^\/inventory\/spare-parts\/manage-links(?:\/|$)/,
    permission: { page: "spare-parts", action: "update" },
  },
  {
    pattern: /^\/inventory\/spare-parts(?:\/|$)/,
    permission: { page: "spare-parts", action: "read" },
  },
  {
    pattern: /^\/inventory\/products\/create(?:\/|$)/,
    permission: { page: "products", action: "create" },
  },
  {
    pattern: /^\/inventory\/products\/edit(?:\/|$)/,
    permission: { page: "products", action: "update" },
  },
  {
    pattern: /^\/inventory\/products(?:\/|$)/,
    permission: { page: "products", action: "read" },
  },
  {
    pattern: /^\/inventory\/bikes\/create(?:\/|$)/,
    permission: { page: "bikes", action: "create" },
  },
  {
    pattern: /^\/inventory\/bikes\/edit(?:\/|$)/,
    permission: { page: "bikes", action: "update" },
  },
  {
    pattern: /^\/inventory\/bikes(?:\/|$)/,
    permission: { page: "bikes", action: "read" },
  },
  {
    pattern: /^\/inventory\/brands(?:\/|$)/,
    permission: { page: "brands", action: "read" },
  },
  {
    pattern: /^\/tickets(?:\/|$)/,
    permission: { page: "maintenance", action: "read" },
  },
  {
    pattern: /^\/maintenance(?:\/|$)/,
    permission: { page: "maintenance", action: "read" },
  },
];

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return {};
}

function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname) return "/";

  const trimmed = pathname.trim().toLowerCase();
  if (!trimmed || trimmed === "/") return "/";

  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export function createEmptyPermissionMatrix(): PermissionMatrix {
  return ALL_PAGE_PATHS.reduce((matrix, page) => {
    matrix[page] = [];
    return matrix;
  }, {} as PermissionMatrix);
}

export function normalizeActions(actions: unknown): ActionType[] {
  if (!Array.isArray(actions)) return [];

  const actionSet = new Set(
    actions
      .filter((action): action is string => typeof action === "string")
      .map((action) => action.toLowerCase()),
  );

  return ALL_ACTIONS.filter((action) => actionSet.has(action));
}

export function normalizePermissionMatrix(value: unknown): PermissionMatrix {
  const record = asRecord(value);
  const matrix = createEmptyPermissionMatrix();

  for (const page of ALL_PAGE_PATHS) {
    matrix[page] = normalizeActions(record[page]);
  }

  return matrix;
}

export function normalizeOptionalPermissionMatrix(
  value: unknown,
): PermissionMatrix | undefined {
  if (value === undefined || value === null) return undefined;
  return normalizePermissionMatrix(value);
}

export function hasPermission(
  permissions: unknown,
  page: PagePath,
  action: ActionType,
): boolean {
  return normalizePermissionMatrix(permissions)[page].includes(action);
}

export function hasAnyPermission(
  permissions: unknown,
  page: PagePath,
  actions: ActionType[],
): boolean {
  const pagePermissions = normalizePermissionMatrix(permissions)[page];
  return actions.some((action) => pagePermissions.includes(action));
}

export function canReadPage(permissions: unknown, page: PagePath): boolean {
  return hasPermission(permissions, page, "read");
}

export function canCreate(permissions: unknown, page: PagePath): boolean {
  return hasPermission(permissions, page, "create");
}

export function canUpdate(permissions: unknown, page: PagePath): boolean {
  return hasPermission(permissions, page, "update");
}

export function canDelete(permissions: unknown, page: PagePath): boolean {
  return hasPermission(permissions, page, "delete");
}

export function canExport(permissions: unknown, page: PagePath): boolean {
  return hasPermission(permissions, page, "export");
}

export function canImport(permissions: unknown, page: PagePath): boolean {
  return hasPermission(permissions, page, "import");
}

export function getAllowedPages(permissions: unknown): PagePath[] {
  const matrix = normalizePermissionMatrix(permissions);
  return ALL_PAGE_PATHS.filter((page) => canReadPage(matrix, page));
}

export function getRoutePermission(
  pathname: string | null | undefined,
): RoutePermission | null {
  const normalizedPath = normalizePathname(pathname);

  if (normalizedPath === "/") {
    return { page: "dashboard", action: "read" };
  }

  const match = ROUTE_PERMISSION_RULES.find(({ pattern }) =>
    pattern.test(normalizedPath),
  );

  return match?.permission ?? null;
}

export function canAccessRoute(
  permissions: unknown,
  pathname: string | null | undefined,
): boolean {
  const routePermission = getRoutePermission(pathname);
  if (!routePermission) return true;

  return hasPermission(
    permissions,
    routePermission.page,
    routePermission.action,
  );
}

export function getDefaultRoute(permissions: unknown): string {
  const allowedPage = getAllowedPages(permissions)[0];

  if (!allowedPage) {
    return "/";
  }

  return DEFAULT_ROUTE_BY_PAGE[allowedPage] ?? "/";
}
