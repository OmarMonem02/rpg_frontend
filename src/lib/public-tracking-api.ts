import { getApiUrl } from "@/lib/config";

const SESSION_HEADER = "X-Tracking-Session";

export type TrackingTimelineStep = {
  key: string;
  label: string;
  state: "done" | "current" | "upcoming";
};

export type PublicTrackingItem = {
  id: number;
  type: "part" | "service";
  label: string;
  qty: number;
  unit_price: number;
  discount: number;
  subtotal: number;
};

export type PublicTrackingTask = {
  id: number;
  name: string;
  status: string;
  status_label: string;
  subtotal: number;
  items: PublicTrackingItem[];
};

export type TrackingProgress = {
  timeline: TrackingTimelineStep[];
  tasks_completed: number;
  tasks_total: number;
  tasks_percent: number;
  current_step: number;
  total_steps: number;
};

export type PublicTicketTracking = {
  ticket: {
    id: number;
    ticket_number: string;
    status: string;
    status_label: string;
    total: number;
    customer_notes: string | null;
    created_at: string | null;
    updated_at: string | null;
    updated_at_human: string | null;
  };
  customer: { name: string | null };
  bike: {
    brand: string | null;
    model: string | null;
    year: number | null;
    vin: string | null;
  } | null;
  tasks: PublicTrackingTask[];
  progress: TrackingProgress;
  shop: PublicTrackingShop;
};

export type PublicTrackingShop = {
  name: string;
  tagline: string;
  logo_url: string | null;
  auto_refresh_minutes: number;
};

export type PublicTicketMeta = {
  ticket: {
    ticket_number: string;
    status: string;
    status_label: string;
  };
  shop: PublicTrackingShop;
  progress: {
    timeline: TrackingTimelineStep[];
  };
  requires_phone_verification: boolean;
};

function sessionStorageKey(token: string): string {
  return `rpg_tracking_session_${token}`;
}

export function getStoredTrackingSession(token: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(sessionStorageKey(token));
}

export function storeTrackingSession(token: string, session: string): void {
  sessionStorage.setItem(sessionStorageKey(token), session);
}

export function clearTrackingSession(token: string): void {
  sessionStorage.removeItem(sessionStorageKey(token));
}

async function publicFetch<T>(
  path: string,
  init?: RequestInit,
  session?: string | null,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (session) {
    headers.set(SESSION_HEADER, session);
  }

  const response = await fetch(getApiUrl(path), { ...init, headers });

  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const body = await response.json();
      if (typeof body.message === "string") message = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const publicTrackingApi = {
  getMeta: (token: string) =>
    publicFetch<PublicTicketMeta>(`/public/tickets/${encodeURIComponent(token)}/meta`),

  verify: (token: string, phone: string) =>
    publicFetch<{ tracking_session: string; ticket: PublicTicketTracking }>(
      `/public/tickets/${encodeURIComponent(token)}/verify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      },
    ),

  getTicket: (token: string, session: string) =>
    publicFetch<{ ticket: PublicTicketTracking }>(
      `/public/tickets/${encodeURIComponent(token)}`,
      undefined,
      session,
    ),
};

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
