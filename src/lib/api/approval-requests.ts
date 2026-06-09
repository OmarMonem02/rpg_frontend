import {
  asRecord,
  authorizedFetch,
  buildQuery,
  parsePagination,
  pickArray,
  toNumber,
  toText,
  type PaginatedResult,
} from "./core";
import type { DiscountInputType } from "@/lib/discount-input";
import type { DiscountScope } from "@/lib/discount-scope";

export type ApprovalRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "consumed";

export type ApprovalRequestType =
  | "sale_discount"
  | "ticket_discount"
  | "sale_item_discount"
  | "ticket_item_discount";

export type ApprovalRequestUser = {
  id: number;
  name: string;
  email: string;
};

export type ApprovalRequestCartItem = {
  sellable_type: string;
  sellable_id: number;
  item_name: string;
  selling_price: number;
  discount_amount: number;
  quantity: number;
  currency: string;
  line_total: number;
};

export type ApprovalRequestSaleContext = {
  customer_id?: number | null;
  customer_name?: string | null;
  seller_id?: number | null;
  sale_type?: string | null;
  shipping_fee?: number | null;
  is_maintenance?: boolean | null;
  discount_includes_maintenance?: boolean | null;
  discount_scope?: Partial<DiscountScope> | null;
  full_cart_subtotal?: number | null;
};

export type ApprovalRequestTicketContext = {
  ticket_id?: number | null;
  customer_name?: string | null;
  discount_includes_maintenance?: boolean | null;
  discount_scope?: Partial<DiscountScope> | null;
  full_cart_subtotal?: number | null;
};

export type ApprovalRequestItemContext = {
  sellable_type: string;
  sellable_id: number;
  item_name: string;
  unit_price: number;
  quantity: number;
  currency: string;
  catalog_max_discount_type?: string | null;
  catalog_max_discount_value?: number | null;
  cost_price?: number | null;
  ticket_id?: number | null;
  task_id?: number | null;
  ticket_item_id?: number | null;
};

export type ApprovalRequestPayload = {
  cart_items: ApprovalRequestCartItem[];
  sale_context?: ApprovalRequestSaleContext;
  ticket_context?: ApprovalRequestTicketContext;
  item_context?: ApprovalRequestItemContext;
};

export type ApprovalRequestRecord = {
  id: number;
  type: ApprovalRequestType;
  status: ApprovalRequestStatus;
  requested_by: number;
  requester: ApprovalRequestUser | null;
  reviewed_by: number | null;
  reviewer: ApprovalRequestUser | null;
  reviewed_at: string | null;
  requested_discount_amount: number;
  approved_discount_amount: number | null;
  discount_input_type: DiscountInputType;
  discount_input_value: number;
  approved_discount_input_type: DiscountInputType | null;
  approved_discount_input_value: number | null;
  cart_subtotal: number;
  rejection_reason: string | null;
  payload: ApprovalRequestPayload;
  consumed_at: string | null;
  consumed_sale_id: number | null;
  consumed_ticket_id: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ApprovalRequestFilters = {
  type?: ApprovalRequestType;
  status?: ApprovalRequestStatus;
  page?: number;
  per_page?: number;
};

export type CreateSaleDiscountApprovalPayload = {
  type: "sale_discount";
  requested_discount_amount: number;
  discount_input_type: DiscountInputType;
  discount_input_value: number;
  cart_subtotal: number;
  payload: ApprovalRequestPayload & { sale_context: ApprovalRequestSaleContext };
};

export type CreateTicketDiscountApprovalPayload = {
  type: "ticket_discount";
  requested_discount_amount: number;
  discount_input_type: DiscountInputType;
  discount_input_value: number;
  cart_subtotal: number;
  payload: ApprovalRequestPayload & {
    ticket_context: ApprovalRequestTicketContext;
  };
};

export type CreateSaleItemDiscountApprovalPayload = {
  type: "sale_item_discount";
  requested_discount_amount: number;
  discount_input_type: DiscountInputType;
  discount_input_value: number;
  cart_subtotal: number;
  payload: ApprovalRequestPayload & {
    item_context: ApprovalRequestItemContext;
    sale_context?: ApprovalRequestSaleContext;
  };
};

export type CreateTicketItemDiscountApprovalPayload = {
  type: "ticket_item_discount";
  requested_discount_amount: number;
  discount_input_type: DiscountInputType;
  discount_input_value: number;
  cart_subtotal: number;
  payload: ApprovalRequestPayload & {
    item_context: ApprovalRequestItemContext;
    ticket_context: ApprovalRequestTicketContext;
  };
};

export type ApproveSaleDiscountPayload = {
  approved_discount_amount: number;
  approved_discount_input_type?: DiscountInputType;
  approved_discount_input_value?: number;
};

function mapDiscountScope(
  raw: unknown,
): Partial<DiscountScope> | null | undefined {
  if (raw == null) return null;
  const row = asRecord(raw);
  const scope: Partial<DiscountScope> = {};
  let hasValue = false;

  for (const key of [
    "spare_parts",
    "products",
    "maintenance_services",
    "bikes",
  ] as const) {
    if (typeof row[key] === "boolean") {
      scope[key] = row[key];
      hasValue = true;
    }
  }

  return hasValue ? scope : null;
}

function mapApprovalRequest(raw: unknown): ApprovalRequestRecord {
  const row = asRecord(raw);
  const requester = asRecord(row.requester);
  const reviewer = asRecord(row.reviewer);
  const payload = asRecord(row.payload);
  const saleContext = asRecord(payload.sale_context);
  const ticketContext = asRecord(payload.ticket_context);
  const itemContext = asRecord(payload.item_context);

  return {
    id: toNumber(row.id),
    type: (toText(row.type) || "sale_discount") as ApprovalRequestType,
    status: (toText(row.status) || "pending") as ApprovalRequestStatus,
    requested_by: toNumber(row.requested_by),
    requester: row.requester
      ? {
          id: toNumber(requester.id),
          name: toText(requester.name),
          email: toText(requester.email),
        }
      : null,
    reviewed_by: row.reviewed_by ? toNumber(row.reviewed_by) : null,
    reviewer: row.reviewer
      ? {
          id: toNumber(reviewer.id),
          name: toText(reviewer.name),
          email: toText(reviewer.email),
        }
      : null,
    reviewed_at: row.reviewed_at ? toText(row.reviewed_at) : null,
    requested_discount_amount: toNumber(row.requested_discount_amount),
    approved_discount_amount:
      row.approved_discount_amount != null
        ? toNumber(row.approved_discount_amount)
        : null,
    discount_input_type:
      (toText(row.discount_input_type) as DiscountInputType) || "fixed",
    discount_input_value: toNumber(row.discount_input_value),
    approved_discount_input_type: row.approved_discount_input_type
      ? (toText(row.approved_discount_input_type) as DiscountInputType)
      : null,
    approved_discount_input_value:
      row.approved_discount_input_value != null
        ? toNumber(row.approved_discount_input_value)
        : null,
    cart_subtotal: toNumber(row.cart_subtotal),
    rejection_reason: row.rejection_reason ? toText(row.rejection_reason) : null,
    payload: {
      cart_items: pickArray(payload, ["cart_items"]).map((item) => {
        const rowItem = asRecord(item);
        return {
          sellable_type: toText(rowItem.sellable_type),
          sellable_id: toNumber(rowItem.sellable_id),
          item_name: toText(rowItem.item_name),
          selling_price: toNumber(rowItem.selling_price),
          discount_amount: toNumber(rowItem.discount_amount),
          quantity: toNumber(rowItem.quantity),
          currency: toText(rowItem.currency),
          line_total: toNumber(rowItem.line_total),
        };
      }),
      sale_context: payload.sale_context
        ? {
            customer_id:
              saleContext.customer_id != null
                ? toNumber(saleContext.customer_id)
                : null,
            customer_name: saleContext.customer_name
              ? toText(saleContext.customer_name)
              : null,
            seller_id:
              saleContext.seller_id != null
                ? toNumber(saleContext.seller_id)
                : null,
            sale_type: saleContext.sale_type
              ? toText(saleContext.sale_type)
              : null,
            shipping_fee:
              saleContext.shipping_fee != null
                ? toNumber(saleContext.shipping_fee)
                : null,
            is_maintenance:
              typeof saleContext.is_maintenance === "boolean"
                ? saleContext.is_maintenance
                : null,
            discount_includes_maintenance:
              typeof saleContext.discount_includes_maintenance === "boolean"
                ? saleContext.discount_includes_maintenance
                : null,
            discount_scope: mapDiscountScope(saleContext.discount_scope),
            full_cart_subtotal:
              saleContext.full_cart_subtotal != null
                ? toNumber(saleContext.full_cart_subtotal)
                : null,
          }
        : undefined,
      ticket_context: payload.ticket_context
        ? {
            ticket_id:
              ticketContext.ticket_id != null
                ? toNumber(ticketContext.ticket_id)
                : null,
            customer_name: ticketContext.customer_name
              ? toText(ticketContext.customer_name)
              : null,
            discount_includes_maintenance:
              typeof ticketContext.discount_includes_maintenance === "boolean"
                ? ticketContext.discount_includes_maintenance
                : null,
            discount_scope: mapDiscountScope(ticketContext.discount_scope),
            full_cart_subtotal:
              ticketContext.full_cart_subtotal != null
                ? toNumber(ticketContext.full_cart_subtotal)
                : null,
          }
        : undefined,
      item_context: payload.item_context
        ? {
            sellable_type: toText(itemContext.sellable_type),
            sellable_id: toNumber(itemContext.sellable_id),
            item_name: toText(itemContext.item_name),
            unit_price: toNumber(itemContext.unit_price),
            quantity: toNumber(itemContext.quantity),
            currency: toText(itemContext.currency),
            catalog_max_discount_type: itemContext.catalog_max_discount_type
              ? toText(itemContext.catalog_max_discount_type)
              : null,
            catalog_max_discount_value:
              itemContext.catalog_max_discount_value != null
                ? toNumber(itemContext.catalog_max_discount_value)
                : null,
            cost_price:
              itemContext.cost_price != null
                ? toNumber(itemContext.cost_price)
                : null,
            ticket_id:
              itemContext.ticket_id != null
                ? toNumber(itemContext.ticket_id)
                : null,
            task_id:
              itemContext.task_id != null
                ? toNumber(itemContext.task_id)
                : null,
            ticket_item_id:
              itemContext.ticket_item_id != null
                ? toNumber(itemContext.ticket_item_id)
                : null,
          }
        : undefined,
    },
    consumed_at: row.consumed_at ? toText(row.consumed_at) : null,
    consumed_sale_id:
      row.consumed_sale_id != null ? toNumber(row.consumed_sale_id) : null,
    consumed_ticket_id:
      row.consumed_ticket_id != null ? toNumber(row.consumed_ticket_id) : null,
    created_at: row.created_at ? toText(row.created_at) : null,
    updated_at: row.updated_at ? toText(row.updated_at) : null,
  };
}

export async function listApprovalRequests(
  token: string,
  filters: ApprovalRequestFilters = {},
): Promise<PaginatedResult<ApprovalRequestRecord>> {
  const query = buildQuery({
    type: filters.type,
    status: filters.status,
    page: filters.page,
    per_page: filters.per_page,
  });

  const payload = await authorizedFetch<unknown>(
    `/approval-requests?${query}`,
    token,
  );
  const data = pickArray(payload, ["data"]).map(mapApprovalRequest);
  const pagination = parsePagination(payload);

  return {
    items: data,
    currentPage: pagination.current_page ?? 1,
    lastPage: pagination.last_page ?? 1,
  };
}

export async function getApprovalRequest(
  token: string,
  id: number,
): Promise<ApprovalRequestRecord> {
  const payload = await authorizedFetch<unknown>(
    `/approval-requests/${id}`,
    token,
  );
  return mapApprovalRequest(payload);
}

export async function getPendingApprovalRequestCount(
  token: string,
): Promise<number> {
  const payload = await authorizedFetch<{ count?: number }>(
    "/approval-requests/pending-count",
    token,
  );
  return toNumber(payload.count);
}

export async function createSaleDiscountApprovalRequest(
  token: string,
  body: CreateSaleDiscountApprovalPayload,
): Promise<ApprovalRequestRecord> {
  const payload = await authorizedFetch<unknown>("/approval-requests", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return mapApprovalRequest(payload);
}

export async function createTicketDiscountApprovalRequest(
  token: string,
  body: CreateTicketDiscountApprovalPayload,
): Promise<ApprovalRequestRecord> {
  const payload = await authorizedFetch<unknown>("/approval-requests", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return mapApprovalRequest(payload);
}

export async function createSaleItemDiscountApprovalRequest(
  token: string,
  body: CreateSaleItemDiscountApprovalPayload,
): Promise<ApprovalRequestRecord> {
  const payload = await authorizedFetch<unknown>("/approval-requests", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return mapApprovalRequest(payload);
}

export async function createTicketItemDiscountApprovalRequest(
  token: string,
  body: CreateTicketItemDiscountApprovalPayload,
): Promise<ApprovalRequestRecord> {
  const payload = await authorizedFetch<unknown>("/approval-requests", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return mapApprovalRequest(payload);
}

export async function approveApprovalRequest(
  token: string,
  id: number,
  body: ApproveSaleDiscountPayload,
): Promise<ApprovalRequestRecord> {
  const payload = await authorizedFetch<unknown>(
    `/approval-requests/${id}/approve`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return mapApprovalRequest(payload);
}

export async function rejectApprovalRequest(
  token: string,
  id: number,
  rejectionReason?: string,
): Promise<ApprovalRequestRecord> {
  const payload = await authorizedFetch<unknown>(
    `/approval-requests/${id}/reject`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        rejectionReason ? { rejection_reason: rejectionReason } : {},
      ),
    },
  );
  return mapApprovalRequest(payload);
}

export async function cancelApprovalRequest(
  token: string,
  id: number,
): Promise<ApprovalRequestRecord> {
  const payload = await authorizedFetch<unknown>(
    `/approval-requests/${id}`,
    token,
    { method: "DELETE" },
  );
  return mapApprovalRequest(payload);
}
