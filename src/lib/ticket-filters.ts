import type { ExchangeRates } from "@/lib/currencies";
import { computeTicketDisplayTotals } from "@/lib/ticket-display-pricing";
import type { Ticket } from "@/lib/tickets-api";

export type TicketFilters = {
  search?: string;
  id?: string;
  status?: string;
  customer_id?: number;
  customer_bike_id?: number;
  bike_brand?: string;
  bike_model?: string;
  vin?: string;
  payment_method?: string;
  opened_from?: string;
  opened_to?: string;
  closed_from?: string;
  closed_to?: string;
  total_min?: number;
  total_max?: number;
  discount_min?: number;
  discount_max?: number;
  amount_paid_min?: number;
  amount_paid_max?: number;
  tracking_link_sent?: "" | "yes" | "no";
  notes?: string;
  has_unstored_items?: boolean;
};

export const TICKET_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "closed", label: "Closed" },
  { value: "partial", label: "Partial" },
] as const;

export const TICKET_PAYMENT_METHODS = [
  { value: "", label: "All payment methods" },
  { value: "none", label: "No payment recorded" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
] as const;

export const TRACKING_LINK_FILTERS = [
  { value: "", label: "All tickets" },
  { value: "yes", label: "Link sent" },
  { value: "no", label: "Link not sent" },
] as const;

export function getTicketBikeBrand(ticket: Ticket): string {
  return (
    ticket.customer_bike?.bike_blueprint?.brand?.name ||
    ticket.customer_bike?.brand ||
    ""
  );
}

export function getTicketBikeModel(ticket: Ticket): string {
  return (
    ticket.customer_bike?.bike_blueprint?.model ||
    ticket.customer_bike?.model ||
    ""
  );
}

export function getTicketBikeYear(ticket: Ticket): string {
  return (
    ticket.customer_bike?.bike_blueprint?.year?.toString() ||
    ""
  );
}

export function getTicketVin(ticket: Ticket): string {
  return ticket.customer_bike?.vin || "";
}

function parseDateStart(value: string): number {
  return new Date(`${value}T00:00:00`).getTime();
}

function parseDateEnd(value: string): number {
  return new Date(`${value}T23:59:59.999`).getTime();
}

function inNumberRange(
  value: number,
  min?: number,
  max?: number,
): boolean {
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

export function hasActiveTicketFilters(filters: TicketFilters): boolean {
  return Object.values(filters).some(
    (value) => value !== undefined && value !== null && value !== "",
  );
}

export function buildTicketFilterOptions(tickets: Ticket[]) {
  const customers = new Map<number, string>();
  const bikes = new Map<number, string>();
  const brands = new Set<string>();
  const models = new Set<string>();

  for (const ticket of tickets) {
    if (ticket.customer_id && ticket.customer?.name) {
      customers.set(ticket.customer_id, ticket.customer.name);
    }
    if (ticket.customer_bike_id) {
      const label = `${getTicketBikeBrand(ticket)} ${getTicketBikeModel(ticket)}`.trim();
      bikes.set(
        ticket.customer_bike_id,
        label || `Bike #${ticket.customer_bike_id}`,
      );
    }
    const brand = getTicketBikeBrand(ticket);
    if (brand) brands.add(brand);
    const model = getTicketBikeModel(ticket);
    if (model) models.add(model);
  }

  return {
    customers: [...customers.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    bikes: [...bikes.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    brands: [...brands].sort((a, b) => a.localeCompare(b)),
    models: [...models].sort((a, b) => a.localeCompare(b)),
  };
}

export function filterTickets(
  tickets: Ticket[],
  filters: TicketFilters,
  rates: ExchangeRates,
): Ticket[] {
  if (!hasActiveTicketFilters(filters)) return tickets;

  const search = filters.search?.trim().toLowerCase();
  const idFilter = filters.id?.trim();
  const notesFilter = filters.notes?.trim().toLowerCase();
  const vinFilter = filters.vin?.trim().toLowerCase();

  return tickets.filter((ticket) => {
    if (idFilter && String(ticket.id) !== idFilter) return false;

    if (filters.status && ticket.status.toLowerCase() !== filters.status) {
      return false;
    }

    if (filters.customer_id && ticket.customer_id !== filters.customer_id) {
      return false;
    }

    if (
      filters.customer_bike_id &&
      ticket.customer_bike_id !== filters.customer_bike_id
    ) {
      return false;
    }

    if (filters.bike_brand && getTicketBikeBrand(ticket) !== filters.bike_brand) {
      return false;
    }

    if (filters.bike_model && getTicketBikeModel(ticket) !== filters.bike_model) {
      return false;
    }

    if (vinFilter) {
      const vin = getTicketVin(ticket).toLowerCase();
      if (!vin.includes(vinFilter)) return false;
    }

    if (filters.payment_method) {
      if (filters.payment_method === "none") {
        if (ticket.payment_method) return false;
      } else if (ticket.payment_method !== filters.payment_method) {
        return false;
      }
    }

    if (filters.tracking_link_sent === "yes" && !ticket.tracking_link_sent_at) {
      return false;
    }
    if (filters.tracking_link_sent === "no" && ticket.tracking_link_sent_at) {
      return false;
    }

    if (notesFilter) {
      const notes = (ticket.notes || "").toLowerCase();
      if (!notes.includes(notesFilter)) return false;
    }

    if (filters.has_unstored_items) {
      const hasUncat = ticket.tasks?.some((task) =>
        task.items?.some((item) => item.is_unstored),
      );
      if (!hasUncat) return false;
    }

    if (filters.opened_from || filters.opened_to) {
      const openedAt = new Date(ticket.created_at).getTime();
      if (filters.opened_from && openedAt < parseDateStart(filters.opened_from)) {
        return false;
      }
      if (filters.opened_to && openedAt > parseDateEnd(filters.opened_to)) {
        return false;
      }
    }

    if (filters.closed_from || filters.closed_to) {
      if (!ticket.closed_at) return false;
      const closedAt = new Date(ticket.closed_at).getTime();
      if (filters.closed_from && closedAt < parseDateStart(filters.closed_from)) {
        return false;
      }
      if (filters.closed_to && closedAt > parseDateEnd(filters.closed_to)) {
        return false;
      }
    }

    const displayTotal = computeTicketDisplayTotals(ticket, rates).total;
    if (
      !inNumberRange(displayTotal, filters.total_min, filters.total_max)
    ) {
      return false;
    }

    const discount = Number(ticket.discount || 0);
    if (!inNumberRange(discount, filters.discount_min, filters.discount_max)) {
      return false;
    }

    const amountPaid = Number(ticket.amount_paid || 0);
    if (
      !inNumberRange(amountPaid, filters.amount_paid_min, filters.amount_paid_max)
    ) {
      return false;
    }

    if (search) {
      const fields = [
        String(ticket.id),
        ticket.customer?.name || "",
        ticket.customer?.phone || "",
        getTicketBikeBrand(ticket),
        getTicketBikeModel(ticket),
        getTicketVin(ticket),
        ticket.notes || "",
        ticket.payment_method || "",
        ticket.status,
      ];
      const matches = fields.some((field) =>
        field.toLowerCase().includes(search),
      );
      if (!matches) return false;
    }

    return true;
  });
}
