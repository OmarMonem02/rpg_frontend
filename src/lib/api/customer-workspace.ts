// === CUSTOMER WORKSPACE (aggregated profile) ===
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
import {
  normalizeCustomer,
  type CustomerRecord,
} from "./customers";
import { normalizeSale, type SaleRecord } from "./sales";

export type CustomerWorkspaceStats = {
  bikes_count: number;
  tickets_open_count: number;
  sales_count: number;
  lifetime_sales_total: number;
};

export type CustomerBikeRecord = {
  id: number;
  customer_id: number;
  vin?: string;
  mileage?: number;
  notes?: string;
  bike_blueprint?: {
    model?: string;
    year?: number;
    brand?: { name?: string };
  };
};

export type WorkspaceTicketRow = {
  id: number;
  customer_id: number;
  status: string;
  total: number;
  created_at?: string;
  user?: { name?: string };
  customer_bike?: CustomerBikeRecord;
};

export function normalizeCustomerBike(raw: unknown): CustomerBikeRecord {
  const r = asRecord(raw);
  const bp = asRecord(r.bike_blueprint);
  const brand = asRecord(bp.brand);
  const hasBlueprint = Object.keys(bp).length > 0;
  return {
    id: toNumber(r.id),
    customer_id: toNumber(r.customer_id),
    vin: toText(r.vin) || undefined,
    mileage: r.mileage !== undefined && r.mileage !== null
      ? toNumber(r.mileage)
      : undefined,
    notes: toText(r.notes) || undefined,
    bike_blueprint: hasBlueprint
      ? {
          model: toText(bp.model) || undefined,
          year: toNumber(bp.year) || undefined,
          brand:
            Object.keys(brand).length > 0
              ? { name: toText(brand.name) || undefined }
              : undefined,
        }
      : undefined,
  };
}

function normalizeWorkspaceTicket(raw: unknown): WorkspaceTicketRow {
  const r = asRecord(raw);
  const user = asRecord(r.user);
  return {
    id: toNumber(r.id),
    customer_id: toNumber(r.customer_id),
    status: toText(r.status),
    total: toNumber(r.total),
    created_at: toText(r.created_at) || undefined,
    user: Object.keys(user).length ? { name: toText(user.name) || undefined } : undefined,
    customer_bike: r.customer_bike
      ? normalizeCustomerBike(r.customer_bike)
      : undefined,
  };
}

export type CustomerWorkspacePayload = {
  customer: CustomerRecord;
  stats: CustomerWorkspaceStats;
  bikes: CustomerBikeRecord[];
  sales: PaginatedResult<SaleRecord>;
  tickets: PaginatedResult<WorkspaceTicketRow>;
};

export async function getCustomerWorkspace(
  token: string,
  customerId: number,
  opts?: {
    salesPage?: number;
    ticketsPage?: number;
    salesPerPage?: number;
    ticketsPerPage?: number;
  },
): Promise<CustomerWorkspacePayload> {
  const query = buildQuery({
    sales_page: opts?.salesPage,
    tickets_page: opts?.ticketsPage,
    sales_per_page: opts?.salesPerPage,
    tickets_per_page: opts?.ticketsPerPage,
  });

  const payload = await authorizedFetch<unknown>(
    `/customers/${customerId}/workspace?${query}`,
    token,
  );
  const root = asRecord(payload);

  const statsRaw = asRecord(root.stats);
  const stats: CustomerWorkspaceStats = {
    bikes_count: toNumber(statsRaw.bikes_count),
    tickets_open_count: toNumber(statsRaw.tickets_open_count),
    sales_count: toNumber(statsRaw.sales_count),
    lifetime_sales_total: toNumber(statsRaw.lifetime_sales_total),
  };

  const salesPayload = asRecord(root.sales);
  const salesRows = pickArray(salesPayload, ["data"]);
  const salesMeta = parsePagination(salesPayload);

  const ticketsPayload = asRecord(root.tickets);
  const ticketsRows = pickArray(ticketsPayload, ["data"]);
  const ticketsMeta = parsePagination(ticketsPayload);

  const bikesRaw = pickArray(root, ["bikes"]);

  return {
    customer: normalizeCustomer(root.customer),
    stats,
    bikes: bikesRaw.map(normalizeCustomerBike).filter((b) => toNumber(asRecord(b).id) > 0),
    sales: {
      items: salesRows.map(normalizeSale).filter((s) => s.id > 0),
      currentPage: salesMeta.current_page ?? 1,
      lastPage: salesMeta.last_page ?? 1,
    },
    tickets: {
      items: ticketsRows
        .map(normalizeWorkspaceTicket)
        .filter((t) => t.id > 0),
      currentPage: ticketsMeta.current_page ?? 1,
      lastPage: ticketsMeta.last_page ?? 1,
    },
  };
}
