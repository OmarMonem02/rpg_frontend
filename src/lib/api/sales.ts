// === SALES & PAYMENT METHODS ===
import {
  asRecord,
  pickArray,
  toText,
  toNumber,
  parsePagination,
  authorizedFetch,
  buildQuery,
  type PaginatedResult,
} from "./core";
import { normalizeCustomer, type CustomerRecord } from "./customers";
import {
  normalizeCustomerAddress,
  formatCustomerAddressLabel,
  type CustomerAddressRecord,
} from "./customer-addresses";
import { downloadFile } from "./import-export";
import { normalizeSeller, type SellerRecord } from "./users";

// --- PAYMENT METHODS ---
export type PaymentMethodRecord = {
  id: number;
  name: string;
  created_at?: string;
};

export type CreatePaymentMethodPayload = {
  name: string;
};

export function normalizePaymentMethod(raw: unknown): PaymentMethodRecord {
  const record = asRecord(raw);
  return {
    id: toNumber(record.id),
    name: toText(record.name),
    created_at: toText(record.created_at) || undefined,
  };
}

export async function listPaymentMethods(
  token: string,
  pageOrOptions:
    | number
    | { page?: number; per_page?: number; search?: string } = 1,
): Promise<PaginatedResult<PaymentMethodRecord>> {
  const opts =
    typeof pageOrOptions === "number"
      ? { page: pageOrOptions }
      : pageOrOptions;
  const query = buildQuery({
    page: opts.page ?? 1,
    per_page: opts.per_page,
    search: opts.search?.trim() || undefined,
  });
  const payload = await authorizedFetch<unknown>(
    `/payment_methods?${query}`,
    token,
  );
  const rows = pickArray(payload, ["data", "payment_methods"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizePaymentMethod).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export async function createPaymentMethod(
  token: string,
  payload: CreatePaymentMethodPayload,
): Promise<PaymentMethodRecord> {
  const data = await authorizedFetch<unknown>("/payment_methods", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizePaymentMethod(record.data ?? record);
}

export async function updatePaymentMethod(
  token: string,
  id: number,
  payload: CreatePaymentMethodPayload,
): Promise<PaymentMethodRecord> {
  const data = await authorizedFetch<unknown>(`/payment_methods/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizePaymentMethod(record.data ?? record);
}

export async function deletePaymentMethod(
  token: string,
  id: number,
): Promise<void> {
  await authorizedFetch<void>(`/payment_methods/${id}`, token, {
    method: "DELETE",
  });
}

// --- SALES ---
export type SaleLineItemRecord = {
  id: number;
  sale_id: number;
  sellable_type:
    | "products"
    | "spare_parts"
    | "maintenance_parts"
    | "bikes"
    | "maintenance_services"
    | "unstored";
  sellable_id: number;
  selling_price: number;
  discount_amount: number;
  quantity: number;
  returned_qty: number;
  remaining_qty: number;
  status?: "active" | "partially_returned" | "returned" | "exchanged";
  item_label?: string;
  item_name?: string;
  is_unstored?: boolean;
  custom_name?: string;
  custom_description?: string;
  unstored_type?: string;
  cost_price?: number;
  commission_base?: number;
  commission_amount?: number;
  created_at?: string;
};

export type SaleAdjustmentUser = {
  id: number;
  name: string;
  email?: string;
};

export type SaleAuditItemSnapshot = {
  id: number;
  item_label?: string;
  selling_price?: number;
  discount?: number;
  qty?: number;
  returned_qty?: number;
  status?: string;
};

export type SaleAuditSnapshot = {
  id?: number;
  total?: number;
  discount?: number;
  status?: string;
  items?: SaleAuditItemSnapshot[];
};

export type SaleAdjustmentRecord = {
  id: number;
  sale_id: number;
  user_id: number;
  action_type: string;
  summary: string;
  before_snapshot: SaleAuditSnapshot | null;
  after_snapshot: SaleAuditSnapshot | null;
  amount_delta: number;
  refund_amount: number;
  extra_amount_due: number;
  notes?: string | null;
  meta?: Record<string, unknown> | null;
  user?: SaleAdjustmentUser | null;
  created_at?: string;
  updated_at?: string;
};

export type SaleRecord = {
  id: number;
  customer_id: number;
  customer_address_id?: number;
  seller_id: number;
  payment_method_id: number;
  payment_method_name?: string;
  user_id: number;
  sale_type: string;
  status: string;
  delivery_status: string;
  is_maintenance: boolean;
  shipping_fee: number;
  sale_discount: number;
  total: number;
  amount_paid?: number;
  commission_base?: number;
  commission_amount?: number;
  line_items?: SaleLineItemRecord[];
  adjustments?: SaleAdjustmentRecord[];
  created_at?: string;
  updated_at?: string;
  customer?: CustomerRecord;
  customer_address?: CustomerAddressRecord;
  seller?: SellerRecord;
};

export type CreateSaleLineItemPayload = {
  product_id?: number;
  spare_part_id?: number;
  maintenance_part_id?: number;
  bike_for_sale_id?: number;
  maintenance_service_id?: number;
  is_unstored?: boolean;
  custom_name?: string;
  custom_description?: string;
  unstored_type?: string;
  cost_price?: number;
  selling_price: number;
  discount?: number;
  discount_approval_request_id?: number;
  qty: number;
};

export type CreateSalePayload = {
  customer_id: number;
  customer_address_id?: number;
  seller_id: number;
  payment_method_id: number;
  type: "site" | "online" | "delivery";
  delivery_status?: "pending" | "in-transit" | "delivered";
  shipping_fee?: number;
  discount?: number;
  sale_discount?: number;
  discount_approval_request_id?: number;
  admin_password?: string;
  is_maintenance?: boolean;
  items: CreateSaleLineItemPayload[];
};

export type UpdateSalePayload = Partial<
  Omit<CreateSalePayload, "items">
>;

export type SaleListSort = "newest" | "oldest" | "highest" | "lowest";

export type SalesExportScope = "sales" | "items" | "both";

export type SalesExportOptions = {
  scope?: SalesExportScope;
  columns?: string;
  itemColumns?: string;
};

export type SaleListFilters = {
  search?: string;
  customer_id?: number;
  customer_name?: string;
  seller_id?: number;
  payment_method_id?: number;
  status?: string;
  delivery_status?: string;
  sale_type?: string;
  is_maintenance?: boolean;
  date_from?: string;
  date_to?: string;
  total_min?: number;
  total_max?: number;
  item_type?: "product" | "spare_part" | "maintenance_part" | "maintenance_service" | "bike";
  has_unstored_items?: boolean;
  user_id?: number;
  sort?: SaleListSort;
  per_page?: number;
  remote_only?: boolean;
};

export type UpdateSaleLineItemPayload = Partial<CreateSaleLineItemPayload>;

const API_ITEM_TYPE_TO_SELLABLE: Record<
  string,
  SaleLineItemRecord["sellable_type"]
> = {
  product: "products",
  products: "products",
  spare_part: "spare_parts",
  spare_parts: "spare_parts",
  maintenance_part: "maintenance_parts",
  maintenance_parts: "maintenance_parts",
  bike: "bikes",
  bikes: "bikes",
  maintenance_service: "maintenance_services",
  maintenance_services: "maintenance_services",
  unstored: "unstored",
};

export function saleLineItemTypeLabel(
  type: SaleLineItemRecord["sellable_type"] | string,
  unstoredType?: string | null,
): string {
  if (type === "unstored" && unstoredType) {
    const map: Record<string, string> = {
      product: "Product",
      spare_part: "Spare Part",
      maintenance_part: "Maintenance Part",
      maintenance_service: "Maintenance Service",
    };
    return map[unstoredType] ?? "Unstored";
  }
  const labels: Record<SaleLineItemRecord["sellable_type"], string> = {
    products: "Product",
    spare_parts: "Spare Part",
    maintenance_parts: "Maintenance Part",
    bikes: "Bike",
    maintenance_services: "Service",
    unstored: "Unstored",
  };
  const normalized = resolveLineItemSellableType(asRecord({ sellable_type: type }));
  return labels[normalized] ?? "Item";
}

function resolveLineItemSellableType(
  record: Record<string, unknown>,
): SaleLineItemRecord["sellable_type"] {
  const raw =
    toText(record.sellable_type) ||
    toText(record.item_type) ||
    toText(record.type);

  if (raw) {
    const key = raw.toLowerCase().replace(/-/g, "_");
    const mapped = API_ITEM_TYPE_TO_SELLABLE[key];
    if (mapped) return mapped;
  }

  if (toNumber(record.product_id) > 0) return "products";
  if (toNumber(record.spare_part_id) > 0) return "spare_parts";
  if (toNumber(record.maintenance_part_id) > 0) return "maintenance_parts";
  if (toNumber(record.bike_for_sale_id) > 0) return "bikes";
  if (toNumber(record.maintenance_service_id) > 0) return "maintenance_services";
  if (record.is_unstored === true || record.is_unstored === "true") {
    return "unstored";
  }

  return "products";
}

function resolveLineItemSellableId(
  record: Record<string, unknown>,
  sellableType: SaleLineItemRecord["sellable_type"],
): number {
  const explicit = toNumber(record.sellable_id);
  if (explicit > 0) return explicit;

  switch (sellableType) {
    case "products":
      return toNumber(record.product_id);
    case "spare_parts":
      return toNumber(record.spare_part_id);
    case "maintenance_parts":
      return toNumber(record.maintenance_part_id);
    case "bikes":
      return toNumber(record.bike_for_sale_id);
    case "maintenance_services":
      return toNumber(record.maintenance_service_id);
    default:
      return 0;
  }
}

/** Strips known type prefixes the backend prepends to item_label (e.g. "product ", "spare part "). */
export function stripItemTypePrefix(label: string): string {
  const prefixes = [
    "unstored maintenance service ",
    "unstored maintenance part ",
    "unstored spare part ",
    "unstored product ",
    "maintenance service ",
    "maintenance part ",
    "spare part ",
    "product ",
    "bike ",
    "unstored ",
  ];
  for (const prefix of prefixes) {
    if (label.toLowerCase().startsWith(prefix)) {
      return label.slice(prefix.length);
    }
  }
  return label;
}

function resolveLineItemStatusFromRecord(
  record: Record<string, unknown>,
  qty: number,
  returned: number,
  remaining: number,
): SaleLineItemRecord["status"] {
  const raw = toText(record.status)?.toLowerCase().replace(/-/g, "_");
  if (
    raw === "returned" ||
    raw === "exchanged" ||
    raw === "partially_returned"
  ) {
    return raw;
  }

  if (remaining <= 0 && returned > 0) {
    return "returned";
  }

  if (returned > 0 && remaining > 0) {
    return "partially_returned";
  }

  return "active";
}

export function normalizeSaleLineItem(raw: unknown): SaleLineItemRecord {
  const record = asRecord(raw);
  const qty = toNumber(record.quantity || record.qty || 0);
  const returned = toNumber(record.returned_qty || 0);
  const rawLabel = toText(record.item_label) || undefined;
  const sellableType = resolveLineItemSellableType(record);
  const isUnstored =
    record.is_unstored === true || record.is_unstored === "true";
  const customName = toText(record.custom_name) || undefined;
  const safeQty = Math.max(1, qty);
  const explicitLineDiscount = record.discount_amount;
  const discountAmount =
    explicitLineDiscount != null && explicitLineDiscount !== ""
      ? toNumber(explicitLineDiscount)
      : toNumber(record.discount || 0) * safeQty;
  return {
    id: toNumber(record.id),
    sale_id: toNumber(record.sale_id),
    sellable_type: sellableType,
    sellable_id: resolveLineItemSellableId(record, sellableType),
    selling_price: toNumber(record.selling_price || record.sale_price || 0),
    discount_amount: discountAmount,
    quantity: qty,
    returned_qty: returned,
    remaining_qty: toNumber(record.remaining_qty ?? Math.max(0, qty - returned)),
    status: resolveLineItemStatusFromRecord(
      record,
      qty,
      returned,
      toNumber(record.remaining_qty ?? Math.max(0, qty - returned)),
    ),
    item_label: rawLabel,
    item_name: isUnstored
      ? customName
      : rawLabel
        ? stripItemTypePrefix(rawLabel)
        : customName,
    is_unstored: isUnstored,
    custom_name: customName,
    custom_description: toText(record.custom_description) || undefined,
    unstored_type: toText(record.unstored_type) || undefined,
    cost_price:
      record.cost_price != null && record.cost_price !== ""
        ? toNumber(record.cost_price)
        : undefined,
    commission_base: toNumber(record.commission_base || 0),
    commission_amount: toNumber(record.commission_amount || 0),
    created_at: toText(record.created_at) || undefined,
  };
}

function normalizeSaleAdjustmentUser(raw: unknown): SaleAdjustmentUser | null {
  if (!raw || typeof raw !== "object") return null;
  const record = asRecord(raw);
  const id = toNumber(record.id);
  if (id <= 0) return null;
  return {
    id,
    name: toText(record.name) || "Unknown user",
    email: toText(record.email) || undefined,
  };
}

function normalizeSaleAuditItemSnapshot(raw: unknown): SaleAuditItemSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const record = asRecord(raw);
  const id = toNumber(record.id);
  if (id <= 0) return null;
  return {
    id,
    item_label: toText(record.item_label) || undefined,
    selling_price:
      record.selling_price != null ? toNumber(record.selling_price) : undefined,
    discount: record.discount != null ? toNumber(record.discount) : undefined,
    qty: record.qty != null ? toNumber(record.qty) : undefined,
    returned_qty:
      record.returned_qty != null ? toNumber(record.returned_qty) : undefined,
    status: toText(record.status) || undefined,
  };
}

function normalizeSaleAuditSnapshot(raw: unknown): SaleAuditSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const record = asRecord(raw);
  const itemsRaw = pickArray(record, ["items"]);
  return {
    id: toNumber(record.id) || undefined,
    total: record.total != null ? toNumber(record.total) : undefined,
    discount: record.discount != null ? toNumber(record.discount) : undefined,
    status: toText(record.status) || undefined,
    items: itemsRaw
      .map(normalizeSaleAuditItemSnapshot)
      .filter((item): item is SaleAuditItemSnapshot => item !== null),
  };
}

function normalizeSaleAdjustment(raw: unknown): SaleAdjustmentRecord | null {
  const record = asRecord(raw);
  const id = toNumber(record.id);
  if (id <= 0) return null;

  return {
    id,
    sale_id: toNumber(record.sale_id),
    user_id: toNumber(record.user_id),
    action_type: toText(record.action_type) || "update",
    summary: toText(record.summary),
    before_snapshot: normalizeSaleAuditSnapshot(record.before_snapshot),
    after_snapshot: normalizeSaleAuditSnapshot(record.after_snapshot),
    amount_delta: toNumber(record.amount_delta || 0),
    refund_amount: toNumber(record.refund_amount || 0),
    extra_amount_due: toNumber(record.extra_amount_due || 0),
    notes: toText(record.notes) || null,
    meta:
      record.meta && typeof record.meta === "object"
        ? (record.meta as Record<string, unknown>)
        : null,
    user: normalizeSaleAdjustmentUser(record.user),
    created_at: toText(record.created_at) || undefined,
    updated_at: toText(record.updated_at) || undefined,
  };
}

export function normalizeSale(raw: unknown): SaleRecord {
  const record = asRecord(raw);
  const lineItemsRaw = pickArray(record, ["line_items", "items"]);
  const adjustmentsRaw = pickArray(record, ["adjustments"]);
  const paymentMethod = asRecord(record.payment_method);
  const camelPaymentMethod = asRecord(record.paymentMethod);
  return {
    id: toNumber(record.id),
    customer_id: toNumber(record.customer_id),
    customer_address_id: toNumber(record.customer_address_id) || undefined,
    seller_id: toNumber(record.seller_id),
    payment_method_id: toNumber(record.payment_method_id),
    payment_method_name:
      toText(
        record.payment_method_name ||
          paymentMethod.name ||
          camelPaymentMethod.name,
      ) || undefined,
    user_id: toNumber(record.user_id),
    sale_type: toText(record.sale_type || record.type),
    status: toText(record.status),
    delivery_status: toText(
      record.delivery_status || record.delivery_date || "pending",
    ),
    is_maintenance:
      record.is_maintenance === true || record.is_maintenance === "true",
    shipping_fee: toNumber(record.shipping_fee || 0),
    sale_discount: toNumber(record.sale_discount || record.discount || 0),
    total: toNumber(record.total || 0),
    commission_base: toNumber(record.commission_base || 0),
    commission_amount: toNumber(record.commission_amount || 0),
    line_items: lineItemsRaw.map(normalizeSaleLineItem),
    adjustments: adjustmentsRaw
      .map(normalizeSaleAdjustment)
      .filter((item): item is SaleAdjustmentRecord => item !== null),
    created_at: toText(record.created_at) || undefined,
    updated_at: toText(record.updated_at) || undefined,
    customer: record.customer ? normalizeCustomer(record.customer) : undefined,
    customer_address: record.customer_address
      ? normalizeCustomerAddress(record.customer_address)
      : record.customerAddress
        ? normalizeCustomerAddress(record.customerAddress)
        : undefined,
    seller: record.seller ? normalizeSeller(record.seller) : undefined,
  };
}

export function resolveSaleAddress(sale: SaleRecord): string | undefined {
  if (sale.customer_address) {
    return (
      sale.customer_address.formatted ??
      formatCustomerAddressLabel(sale.customer_address)
    );
  }

  return sale.customer?.address;
}

export async function listSales(
  token: string,
  page = 1,
  filters?: SaleListFilters,
): Promise<PaginatedResult<SaleRecord>> {
  const query = buildQuery({
    page,
    search: filters?.search,
    customer_id: filters?.customer_id,
    customer_name: filters?.customer_name,
    seller_id: filters?.seller_id,
    payment_method_id: filters?.payment_method_id,
    status: filters?.status,
    delivery_status: filters?.delivery_status,
    type: filters?.sale_type,
    is_maintenance: filters?.is_maintenance,
    date_from: filters?.date_from,
    date_to: filters?.date_to,
    total_min: filters?.total_min,
    total_max: filters?.total_max,
    item_type: filters?.item_type,
    has_unstored_items: filters?.has_unstored_items,
    user_id: filters?.user_id,
    sort: filters?.sort,
    per_page: filters?.per_page,
    remote_only: filters?.remote_only,
  });

  const payload = await authorizedFetch<unknown>(`/sales?${query}`, token);
  const rows = pickArray(payload, ["data", "sales"]);
  const meta = parsePagination(payload);
  return {
    items: rows.map(normalizeSale).filter((item) => item.id > 0),
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
  };
}

export function buildSalesExportQuery(
  filters: SaleListFilters | undefined,
  format: "xlsx" | "csv",
  options: SalesExportOptions = {},
): string {
  const query = buildQuery({
    search: filters?.search,
    customer_id: filters?.customer_id,
    customer_name: filters?.customer_name,
    seller_id: filters?.seller_id,
    payment_method_id: filters?.payment_method_id,
    status: filters?.status,
    delivery_status: filters?.delivery_status,
    type: filters?.sale_type,
    is_maintenance: filters?.is_maintenance,
    date_from: filters?.date_from,
    date_to: filters?.date_to,
    total_min: filters?.total_min,
    total_max: filters?.total_max,
    item_type: filters?.item_type,
    has_unstored_items: filters?.has_unstored_items,
    user_id: filters?.user_id,
    sort: filters?.sort,
    remote_only: filters?.remote_only,
    export_scope: options.scope ?? "sales",
    format,
  });

  return query.toString();
}

function salesExportFilename(
  scope: SalesExportScope,
  format: "xlsx" | "csv",
): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const ext = format === "csv" ? "csv" : "xlsx";

  if (scope === "items") {
    return `sold_items_export_${stamp}.${ext}`;
  }

  if (scope === "both") {
    return `sales_workbook_${stamp}.xlsx`;
  }

  return `sales_export_${stamp}.${ext}`;
}

export async function exportSales(
  token: string,
  filters: SaleListFilters | undefined,
  format: "xlsx" | "csv",
  options: SalesExportOptions = {},
): Promise<void> {
  const scope = options.scope ?? "sales";
  const qs = buildSalesExportQuery(filters, format, options);
  const columnsQuery = options.columns
    ? `&columns=${encodeURIComponent(options.columns)}`
    : "";
  const itemColumnsQuery = options.itemColumns
    ? `&item_columns=${encodeURIComponent(options.itemColumns)}`
    : "";
  const filename = salesExportFilename(scope, format);
  await downloadFile(
    `/sales/export?${qs}${columnsQuery}${itemColumnsQuery}`,
    token,
    filename,
  );
}

export async function getSale(token: string, id: number): Promise<SaleRecord> {
  const data = await authorizedFetch<unknown>(`/sales/${id}`, token);
  const record = asRecord(data);
  return normalizeSale(record.data ?? record.sale ?? record);
}

export async function createSale(
  token: string,
  payload: CreateSalePayload,
): Promise<SaleRecord> {
  const data = await authorizedFetch<unknown>("/sales", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(serializeSalePayload(payload)),
  });
  const record = asRecord(data);
  return normalizeSale(record.data ?? record);
}

export async function updateSale(
  token: string,
  id: number,
  payload: UpdateSalePayload,
): Promise<SaleRecord> {
  const data = await authorizedFetch<unknown>(`/sales/${id}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(serializeSalePayload(payload)),
  });
  const record = asRecord(data);
  return normalizeSale(record.data ?? record);
}

function serializeSalePayload<T extends CreateSalePayload | UpdateSalePayload>(
  payload: T,
): T & { discount?: number } {
  if (payload.sale_discount === undefined || payload.discount !== undefined) {
    return payload;
  }

  const { sale_discount: saleDiscount, ...rest } = payload;
  return {
    ...rest,
    discount: saleDiscount,
  } as T & { discount?: number };
}

export async function deleteSale(token: string, id: number): Promise<void> {
  await authorizedFetch<void>(`/sales/${id}`, token, { method: "DELETE" });
}

export async function addSaleLineItem(
  token: string,
  saleId: number,
  payload: CreateSaleLineItemPayload,
): Promise<SaleLineItemRecord> {
  const data = await authorizedFetch<unknown>(`/sales/${saleId}/items`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const record = asRecord(data);
  return normalizeSaleLineItem(record.data ?? record);
}

export async function updateSaleLineItem(
  token: string,
  saleId: number,
  itemId: number,
  payload: UpdateSaleLineItemPayload,
): Promise<SaleLineItemRecord> {
  const data = await authorizedFetch<unknown>(
    `/sales/${saleId}/items/${itemId}`,
    token,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const record = asRecord(data);
  return normalizeSaleLineItem(record.data ?? record);
}

export async function deleteSaleLineItem(
  token: string,
  saleId: number,
  itemId: number,
): Promise<void> {
  await authorizedFetch<void>(`/sales/${saleId}/items/${itemId}`, token, {
    method: "DELETE",
  });
}

export async function processSaleReturn(
  token: string,
  saleId: number,
  payload: { sale_item_id: number; qty: number; notes?: string },
): Promise<SaleRecord> {
  const data = await authorizedFetch<unknown>(
    `/sales/${saleId}/returns`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const record = asRecord(data);
  return normalizeSale(record.data ?? record);
}

export async function processSaleExchange(
  token: string,
  saleId: number,
  payload: {
    sale_item_id: number;
    qty: number;
    notes?: string;
    replacements: CreateSaleLineItemPayload[];
  },
): Promise<SaleRecord> {
  const data = await authorizedFetch<unknown>(
    `/sales/${saleId}/exchanges`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const record = asRecord(data);
  return normalizeSale(record.data ?? record);
}
