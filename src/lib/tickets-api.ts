import { getApiUrl } from "@/lib/config";
import { getAuthToken } from "@/lib/auth-session";
import { ApiError } from "@/lib/auth-api";
import { asRecord, parseErrorMessage, toNumber, toText } from "@/lib/api/core";
import type { MaxDiscountType } from "@/lib/max-discount";

export async function authorizedFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);
  
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(getApiUrl(path), {
    ...init,
    headers,
  });

  if (!response.ok) {
    const errorMsg = await parseErrorMessage(response);
    throw new ApiError(errorMsg, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as T;
}

export type Customer = {
  id: number;
  name: string;
  phone: string;
  address?: string;
  how_did_you_know_us?: string;
  notes?: string;
};

export type CreateTicketCustomerPayload = {
  name: string;
  phone: string;
  address?: string;
  how_did_you_know_us?: string;
  notes?: string;
};

function normalizeCustomerResponse(raw: unknown): Customer {
  const r = asRecord(raw);
  return {
    id: toNumber(r.id),
    name: toText(r.name),
    phone: toText(r.phone),
    address: toText(r.address) || undefined,
    how_did_you_know_us: toText(r.how_did_you_know_us) || undefined,
    notes: toText(r.notes) || undefined,
  };
}
export type BikeBlueprint = { id: number; model: string; year: number; brand?: { name: string } };
export type Bike = {
  id: number;
  bike_blueprint_id: number;
  customer_id: number;
  image?: string;
  image_public_id?: string;
  brand?: string;
  model?: string;
  vin?: string;
  mileage?: number;
  bike_blueprint?: BikeBlueprint;
};
export type TicketCatalogDiscount = {
  max_discount_type?: "fixed" | "percentage";
  max_discount_value?: number;
};

export type TicketItem = {
  id: number;
  task_id: number;
  ticket_id: number;
  spare_part_id?: number;
  maintenance_service_id?: number;
  price_snapshot: number;
  discount: number;
  qty: number;
  subtotal: number;
  item_name?: string;
  spare_part?: { id: number; name: string } & TicketCatalogDiscount;
  maintenance_service?: { id: number; name: string } & TicketCatalogDiscount;
};

function normalizeTicketCatalog(
  raw: unknown,
): ({ id: number; name: string } & TicketCatalogDiscount) | undefined {
  const record = asRecord(raw);
  if (!record.id && !record.name) return undefined;
  const type = toText(record.max_discount_type);

  return {
    id: toNumber(record.id),
    name: toText(record.name),
    max_discount_type:
      type === "fixed" || type === "percentage" ? (type as MaxDiscountType) : undefined,
    max_discount_value: toNumber(record.max_discount_value),
  };
}

function normalizeTicketItem(raw: unknown): TicketItem {
  const record = asRecord(raw);
  const sparePart = normalizeTicketCatalog(record.spare_part ?? record.sparePart);
  const maintenanceService = normalizeTicketCatalog(
    record.maintenance_service ?? record.maintenanceService,
  );

  return {
    id: toNumber(record.id),
    task_id: toNumber(record.task_id),
    ticket_id: toNumber(record.ticket_id),
    spare_part_id: toNumber(record.spare_part_id) || undefined,
    maintenance_service_id: toNumber(record.maintenance_service_id) || undefined,
    price_snapshot: toNumber(record.price_snapshot),
    discount: toNumber(record.discount),
    qty: toNumber(record.qty),
    subtotal: toNumber(record.subtotal),
    item_name: toText(record.item_name) || undefined,
    spare_part: sparePart,
    maintenance_service: maintenanceService,
  };
}

function normalizeTicketTask(raw: unknown): TicketTask {
  const record = asRecord(raw);
  const items = Array.isArray(record.items)
    ? record.items.map((item) => normalizeTicketItem(item))
    : undefined;

  return {
    id: toNumber(record.id),
    ticket_id: toNumber(record.ticket_id),
    name: toText(record.name),
    status: toText(record.status),
    subtotal: toNumber(record.subtotal),
    items,
  };
}

function normalizeTicket(raw: unknown): Ticket {
  const record = asRecord(raw);
  const tasks = Array.isArray(record.tasks)
    ? record.tasks.map((task) => normalizeTicketTask(task))
    : undefined;

  return {
    id: toNumber(record.id),
    customer_id: toNumber(record.customer_id),
    customer_bike_id: toNumber(record.customer_bike_id),
    status: toText(record.status),
    total: toNumber(record.total),
    payment_method: toText(record.payment_method) || undefined,
    amount_paid: toNumber(record.amount_paid),
    closed_at: toText(record.closed_at) || undefined,
    created_at: toText(record.created_at),
    notes: toText(record.notes) || undefined,
    customer: record.customer
      ? {
          id: toNumber(asRecord(record.customer).id),
          name: toText(asRecord(record.customer).name),
          phone: toText(asRecord(record.customer).phone),
          address: toText(asRecord(record.customer).address) || undefined,
          how_did_you_know_us:
            toText(asRecord(record.customer).how_did_you_know_us) || undefined,
          notes: toText(asRecord(record.customer).notes) || undefined,
        }
      : undefined,
    customer_bike: record.customer_bike
      ? (record.customer_bike as Ticket["customer_bike"])
      : undefined,
    tasks,
    public_token: toText(record.public_token) || undefined,
    tracking_link_sent_at: toText(record.tracking_link_sent_at) || undefined,
    tracking_link_send_count: toNumber(record.tracking_link_send_count) || undefined,
  };
}

export function ticketItemName(item: TicketItem): string {
  if (item.item_name) return item.item_name;
  if (item.spare_part?.name) return item.spare_part.name;
  if (item.maintenance_service?.name) return item.maintenance_service.name;
  return item.spare_part_id ? "Spare Part" : "Service";
}

export type TicketTask = {
  id: number;
  ticket_id: number;
  name: string;
  status: string; // 'pending', 'completed'
  subtotal: number;
  items?: TicketItem[];
};

export type Ticket = {
  id: number;
  customer_id: number;
  customer_bike_id: number;
  status: string; // 'pending', 'in_progress', 'completed', 'closed'
  total: number;
  payment_method?: string | null;
  amount_paid?: number;
  closed_at?: string | null;
  created_at: string;
  customer?: Customer;
  customer_bike?: Bike;
  notes?: string;
  tasks?: TicketTask[];
  public_token?: string | null;
  tracking_link_sent_at?: string | null;
  tracking_link_send_count?: number;
};

export function buildTicketTrackingUrl(publicToken: string): string {
  if (typeof window === "undefined") {
    return `/track/${publicToken}`;
  }
  return `${window.location.origin}/track/${publicToken}`;
}

export type EnsureTrackingLinkResponse = {
  tracking_url: string;
  public_token: string;
};

export type SendTrackingLinkResponse = {
  sent_at: string;
  tracking_url: string;
  public_token: string;
};

export type RegenerateTrackingTokenResponse = {
  public_token: string;
  tracking_url: string;
  message: string;
};

export const ticketsApi = {
  searchCustomers: async (search: string) => {
    const res = await authorizedFetch<{ data: Customer[] }>(`/customers?search=${encodeURIComponent(search)}`);
    return res.data;
  },
  createCustomer: async (data: CreateTicketCustomerPayload) => {
    const raw = await authorizedFetch<unknown>(`/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return normalizeCustomerResponse(raw);
  },
  getCustomerBikes: async (customerId: number) => {
    const res = await authorizedFetch<{ data: Bike[] }>(`/customer_bikes?customer_id=${customerId}`);
    return res.data;
  },
  searchBlueprints: async (search: string) => {
    const res = await authorizedFetch<{ data: BikeBlueprint[] }>(`/bike_blueprints?search=${encodeURIComponent(search)}`);
    return res.data;
  },
  createBike: async (data: {
    customer_id: number;
    bike_blueprint_id: number;
    image?: string;
    image_public_id?: string;
    vin?: string;
    mileage?: number;
  }) => {
    const res = await authorizedFetch<Bike>(`/customer_bikes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res;
  },
  getTickets: async () => {
    const res = await authorizedFetch<{ data: Ticket[] }>(`/tickets`);
    return res.data;
  },
  getTicket: async (ticketId: number) => {
    const res = await authorizedFetch<unknown>(`/tickets/${ticketId}`);
    return normalizeTicket(res);
  },
  createTicket: async (data: { customer_id: number; customer_bike_id: number; notes: string }) => {
    const res = await authorizedFetch<Ticket>(`/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, status: "pending" }),
    });
    return res;
  },
  addTask: async (ticketId: number, data: { name: string; status: string }) => {
    const res = await authorizedFetch<Ticket>(`/tickets/${ticketId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res;
  },
  updateTask: async (ticketId: number, taskId: number, data: { name?: string; status?: string }) => {
    const res = await authorizedFetch<TicketTask>(`/tickets/${ticketId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res;
  },
  deleteTask: async (ticketId: number, taskId: number) => {
    await authorizedFetch<void>(`/tickets/${ticketId}/tasks/${taskId}`, {
      method: "DELETE",
    });
  },
  addItemToTask: async (
    ticketId: number,
    taskId: number,
    data: {
      spare_part_id?: number;
      maintenance_service_id?: number;
      price_snapshot: number;
      discount?: number;
      qty: number;
    },
  ) => {
    const res = await authorizedFetch<TicketItem>(`/tickets/${ticketId}/tasks/${taskId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res;
  },
  updateItemInTask: async (
    ticketId: number,
    taskId: number,
    itemId: number,
    data: {
      price_snapshot?: number;
      discount?: number;
      qty?: number;
    },
  ) => {
    const res = await authorizedFetch<TicketItem>(`/tickets/${ticketId}/tasks/${taskId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res;
  },
  removeItemFromTask: async (ticketId: number, taskId: number, itemId: number) => {
    await authorizedFetch<void>(`/tickets/${ticketId}/tasks/${taskId}/items/${itemId}`, {
      method: "DELETE",
    });
  },
  updateTicketStatus: async (
    ticketId: number,
    status: "pending" | "in_progress" | "completed",
  ) => {
    const res = await authorizedFetch<Ticket>(`/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return normalizeTicket(res);
  },
  updateTicketNotes: async (ticketId: number, notes: string) => {
    const res = await authorizedFetch<unknown>(`/tickets/${ticketId}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    return normalizeTicket(res);
  },
  endTicket: async (ticketId: number) => {
    const res = await authorizedFetch<{ message: string; status: string }>(`/tickets/${ticketId}/end`, { method: "POST" });
    return res;
  },
  reopenTicket: async (ticketId: number, payload?: { admin_password?: string }) => {
    const options: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    };
    if (payload?.admin_password) {
      options.body = JSON.stringify({ admin_password: payload.admin_password });
    }
    const res = await authorizedFetch<{ message: string; status: string; ticket?: Ticket }>(
      `/tickets/${ticketId}/reopen`,
      options,
    );
    return res;
  },
  closeTicket: async (ticketId: number, payment: { payment_method: string; amount_paid: number }) => {
    const res = await authorizedFetch<{ message: string; status: string; ticket?: Ticket }>(
      `/tickets/${ticketId}/close`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payment),
      },
    );
    return res;
  },
  ensureTrackingLink: async (ticketId: number) => {
    return authorizedFetch<EnsureTrackingLinkResponse>(
      `/tickets/${ticketId}/ensure-tracking-link`,
      { method: "POST" },
    );
  },
  sendTrackingLink: async (ticketId: number) => {
    return authorizedFetch<SendTrackingLinkResponse>(`/tickets/${ticketId}/send-tracking-link`, {
      method: "POST",
    });
  },
  regenerateTrackingToken: async (ticketId: number) => {
    return authorizedFetch<RegenerateTrackingTokenResponse>(
      `/tickets/${ticketId}/regenerate-tracking-token`,
      { method: "POST" },
    );
  },
  deleteTicket: async (ticketId: number) => {
    await authorizedFetch<void>(`/tickets/${ticketId}`, {
      method: "DELETE",
    });
  },
};
