import { getApiUrl } from "@/lib/config";
import { getAuthToken } from "@/lib/auth-session";
import { ApiError } from "@/lib/auth-api";
import { asRecord, toNumber, toText } from "@/lib/api/core";

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
    let errorMsg = "Request failed";
    try {
      const errorJson = await response.json();
      errorMsg = errorJson.message || errorMsg;
    } catch {}
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
};

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
  status: string; // 'pending', 'in_progress', 'completed'
  total: number;
  created_at: string;
  customer?: Customer;
  customer_bike?: Bike;
  notes?: string;
  tasks?: TicketTask[];
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
    const res = await authorizedFetch<Ticket>(`/tickets/${ticketId}`);
    return res;
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
  endTicket: async (ticketId: number) => {
    const res = await authorizedFetch<{ message: string; status: string }>(`/tickets/${ticketId}/end`, { method: "POST" });
    return res;
  },
  reopenTicket: async (ticketId: number) => {
    const res = await authorizedFetch<{ message: string; status: string }>(`/tickets/${ticketId}/reopen`, { method: "POST" });
    return res;
  },
  closeTicket: async (ticketId: number, payment?: { payment_method: string; amount_paid: number }) => {
    const options: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" } };
    if (payment) options.body = JSON.stringify(payment);
    const res = await authorizedFetch<{ message: string; status: string }>(`/tickets/${ticketId}/close`, options);
    return res;
  },
};
