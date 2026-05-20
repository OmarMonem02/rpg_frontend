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
  | "display"
  | "update"
  | "delete"
  | "export"
  | "import";

export const NON_OPERATIONAL_ACTIONS: ActionType[] = ["read", "display"];

export type PermissionMatrix = Record<PagePath, ActionType[]>;

export type RoutePermission = {
  page: PagePath;
  action: ActionType;
};

export type PermissionGroup = {
  key: string;
  label: string;
};

export type PermissionPageDefinition = {
  key: PagePath;
  label: string;
  group: string;
  description: string;
  actions: ActionType[];
};

export type RolePermissionPreset = {
  key: string;
  label: string;
  permissions: PermissionMatrix;
};

export type PermissionMetadata = {
  actions: ActionType[];
  groups: PermissionGroup[];
  pages: PermissionPageDefinition[];
  role_presets: RolePermissionPreset[];
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
  "display",
  "update",
  "delete",
  "export",
  "import",
];

const FALLBACK_PAGE_DEFINITIONS: PermissionPageDefinition[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    group: "overview",
    description: "View the operational home screen and quick links.",
    actions: ["read", "display"],
  },
  {
    key: "sales",
    label: "Sales",
    group: "sales",
    description: "Create, manage, delete, and export sales records.",
    actions: ["create", "read", "display", "update", "delete", "export"],
  },
  {
    key: "maintenance",
    label: "Maintenance",
    group: "maintenance",
    description: "Operate tickets, service tasks, and workshop activity.",
    actions: ["create", "read", "display", "update", "delete"],
  },
  {
    key: "inventory",
    label: "Inventory",
    group: "inventory",
    description: "Access inventory workspace navigation and summaries.",
    actions: ["read", "display"],
  },
  {
    key: "brands",
    label: "Brands",
    group: "master-data",
    description: "Maintain brand records used by products and bikes.",
    actions: ["create", "read", "display", "update", "delete"],
  },
  {
    key: "products",
    label: "Products",
    group: "inventory",
    description: "Manage products, pricing, stock, and catalog data.",
    actions: ["create", "read", "display", "update", "delete"],
  },
  {
    key: "bikes",
    label: "Bikes",
    group: "inventory",
    description: "Manage bikes for sale and bike inventory records.",
    actions: ["create", "read", "display", "update", "delete"],
  },
  {
    key: "spare-parts",
    label: "Spare Parts",
    group: "inventory",
    description: "Manage spare parts, compatibility links, and stock.",
    actions: ["create", "read", "display", "update", "delete"],
  },
  {
    key: "maintenance-services",
    label: "Maintenance Services",
    group: "maintenance",
    description: "Maintain service catalog items and pricing.",
    actions: ["create", "read", "display", "update", "delete"],
  },
  {
    key: "users",
    label: "Users & Access",
    group: "admin",
    description: "Create users and manage account-level permissions.",
    actions: ["create", "read", "display", "update", "delete"],
  },
  {
    key: "import-export",
    label: "Import / Export",
    group: "data",
    description: "Access templates, exports, and spreadsheet imports.",
    actions: ["read", "display", "export", "import"],
  },
  {
    key: "payment-methods",
    label: "Payment Methods",
    group: "admin",
    description: "Maintain payment methods and payment settings.",
    actions: ["create", "read", "display", "update", "delete"],
  },
  {
    key: "product-categories",
    label: "Product Categories",
    group: "master-data",
    description: "Maintain product classification data.",
    actions: ["create", "read", "display", "update", "delete"],
  },
  {
    key: "spare-part-categories",
    label: "Spare Part Categories",
    group: "master-data",
    description: "Maintain spare part classification data.",
    actions: ["create", "read", "display", "update", "delete"],
  },
  {
    key: "bike-blueprints",
    label: "Bike Blueprints",
    group: "master-data",
    description: "Maintain bike blueprint data and spare part links.",
    actions: ["create", "read", "display", "update", "delete"],
  },
  {
    key: "sellers",
    label: "Sellers",
    group: "admin",
    description: "Manage seller records and commission rates.",
    actions: ["create", "read", "display", "update", "delete"],
  },
  {
    key: "reporting",
    label: "Reporting & Expenses",
    group: "reporting",
    description: "View reports and manage the expense ledger.",
    actions: ["create", "read", "display", "update", "delete"],
  },
];

export const FALLBACK_PERMISSION_METADATA: PermissionMetadata = {
  actions: ALL_ACTIONS,
  groups: [
    { key: "overview", label: "Overview" },
    { key: "sales", label: "Sales" },
    { key: "maintenance", label: "Maintenance" },
    { key: "inventory", label: "Inventory" },
    { key: "master-data", label: "Master Data" },
    { key: "data", label: "Data" },
    { key: "admin", label: "Admin" },
    { key: "reporting", label: "Reporting" },
  ],
  pages: FALLBACK_PAGE_DEFINITIONS,
  role_presets: [],
};

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

export function normalizePathname(pathname: string | null | undefined): string {
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

function normalizePermissionPageDefinition(
  value: unknown,
): PermissionPageDefinition | null {
  const record = asRecord(value);
  const key = typeof record.key === "string" ? record.key : "";
  if (!ALL_PAGE_PATHS.includes(key as PagePath)) return null;

  return {
    key: key as PagePath,
    label: typeof record.label === "string" ? record.label : key,
    group: typeof record.group === "string" ? record.group : "overview",
    description:
      typeof record.description === "string" ? record.description : "",
    actions: normalizeActions(record.actions),
  };
}

export function normalizePermissionMetadata(
  value: unknown,
): PermissionMetadata {
  const record = asRecord(value);
  const groups = Array.isArray(record.groups)
    ? record.groups
        .map((group) => {
          const item = asRecord(group);
          return typeof item.key === "string" && typeof item.label === "string"
            ? { key: item.key, label: item.label }
            : null;
        })
        .filter((group): group is PermissionGroup => Boolean(group))
    : FALLBACK_PERMISSION_METADATA.groups;

  const pages = Array.isArray(record.pages)
    ? record.pages
        .map(normalizePermissionPageDefinition)
        .filter((page): page is PermissionPageDefinition => Boolean(page))
    : FALLBACK_PERMISSION_METADATA.pages;

  const pageKeys = new Set(pages.map((page) => page.key));
  const completePages = [
    ...pages,
    ...FALLBACK_PERMISSION_METADATA.pages.filter(
      (page) => !pageKeys.has(page.key),
    ),
  ];

  const rolePresets = Array.isArray(record.role_presets)
    ? record.role_presets
        .map((preset) => {
          const item = asRecord(preset);
          if (typeof item.key !== "string" || typeof item.label !== "string") {
            return null;
          }
          return {
            key: item.key,
            label: item.label,
            permissions: normalizePermissionMatrix(item.permissions),
          };
        })
        .filter((preset): preset is RolePermissionPreset => Boolean(preset))
    : [];

  const actions = normalizeActions(record.actions);

  return {
    actions: actions.length > 0 ? actions : ALL_ACTIONS,
    groups,
    pages: completePages,
    role_presets: rolePresets,
  };
}

export function getAllowedActionsForPage(
  metadata: PermissionMetadata,
  page: PagePath,
): ActionType[] {
  return (
    metadata.pages.find((definition) => definition.key === page)?.actions ??
    ALL_ACTIONS
  );
}

export function normalizePermissionMatrixForMetadata(
  value: unknown,
  metadata: PermissionMetadata,
): PermissionMatrix {
  const base = normalizePermissionMatrix(value);
  const normalized = createEmptyPermissionMatrix();

  for (const page of ALL_PAGE_PATHS) {
    const allowedActions = getAllowedActionsForPage(metadata, page);
    normalized[page] = allowedActions.filter((action) =>
      base[page].includes(action),
    );
  }

  return normalized;
}

export function getRolePresetPermissions(
  metadata: PermissionMetadata,
  role: string,
): PermissionMatrix | null {
  const preset = metadata.role_presets.find((item) => item.key === role);
  return preset ? normalizePermissionMatrixForMetadata(preset.permissions, metadata) : null;
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

export function canDisplayPage(permissions: unknown, page: PagePath): boolean {
  return hasPermission(permissions, page, "display");
}

/** True once any page explicitly uses the display action (post-migration matrix). */
export function matrixUsesDisplayAction(permissions: unknown): boolean {
  const matrix = normalizePermissionMatrix(permissions);
  return ALL_PAGE_PATHS.some((page) => matrix[page].includes("display"));
}

/**
 * UI route/nav access: requires display, or read on legacy matrices saved before display existed.
 */
export function canAccessPageUi(permissions: unknown, page: PagePath): boolean {
  if (canDisplayPage(permissions, page)) return true;
  if (!matrixUsesDisplayAction(permissions) && canReadPage(permissions, page)) {
    return true;
  }
  return false;
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
  return ALL_PAGE_PATHS.filter((page) => canAccessPageUi(permissions, page));
}

export function getRoutePermission(
  pathname: string | null | undefined,
): RoutePermission | null {
  const normalizedPath = normalizePathname(pathname);

  if (normalizedPath === "/") {
    return { page: "dashboard", action: "display" };
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
  const normalizedPath = normalizePathname(pathname);
  if (/^\/customers(?:\/|$)/.test(normalizedPath)) {
    return (
      canAccessPageUi(permissions, "sales") ||
      canAccessPageUi(permissions, "maintenance")
    );
  }

  const routePermission = getRoutePermission(pathname);
  if (!routePermission) return true;

  const { page, action } = routePermission;

  if (!canAccessPageUi(permissions, page)) {
    return false;
  }

  if (action === "display") {
    return true;
  }

  return hasPermission(permissions, page, action);
}

export function getDefaultRoute(permissions: unknown): string {
  const allowedPage = getAllowedPages(permissions)[0];

  if (!allowedPage) {
    return "/";
  }

  return DEFAULT_ROUTE_BY_PAGE[allowedPage] ?? "/";
}
