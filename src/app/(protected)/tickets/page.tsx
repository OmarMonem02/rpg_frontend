"use client";

import { useCallback, useEffect, useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { usePermissions } from "@/components/permission-provider";
import { useGlobalDataRefresh } from "@/hooks/useGlobalDataRefresh";
import {
  PageShell,
  PageHero,
  ActionButton,
  DataTableCard,
  StatusBadge,
  EmptyState,
} from "@/components/ops-ui";
import { ticketsApi, type Ticket } from "@/lib/tickets-api";
import { CreateTicketModal } from "./CreateTicketModal";

export default function TicketsPage() {
  const permissions = usePermissions();
  const canDeleteTickets = permissions.canDelete("maintenance");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await ticketsApi.getTickets();
      setTickets(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useGlobalDataRefresh(fetchTickets);

  const handleDeleteTicket = async (ticketId: number) => {
    if (!canDeleteTickets) {
      setError("You do not have permission to delete tickets.");
      return;
    }
    if (
      !confirm(
        "Are you sure you want to delete this ticket? All tasks and line items will be removed.",
      )
    ) {
      return;
    }
    try {
      setDeletingId(ticketId);
      setError("");
      await ticketsApi.deleteTicket(ticketId);
      await fetchTickets();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete ticket");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusTone = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "warning";
      case "in_progress": return "primary";
      case "completed": return "success";
      case "cancelled": return "danger";
      case "closed": return "default";
      default: return "default";
    }
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="Operations"
        title="Maintenance Dashboard"
        actions={
          <ActionButton tone="primary" onClick={() => setIsCreateOpen(true)} className="px-8">
            + Create Ticket
          </ActionButton>
        }
      />

      {error ? (
        <div className="rounded-2xl bg-error/10 p-4 text-error border border-error/20 mb-6 animate-in fade-in">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4 text-on-surface-variant">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="font-medium">Loading tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          title="No active tickets"
          description="Your maintenance queue is empty. Start by opening a new ticket for a customer bike."
          action={
            <ActionButton tone="primary" onClick={() => setIsCreateOpen(true)}>
              Open New Ticket
            </ActionButton>
          }
        />
      ) : (
        <DataTableCard className="overflow-hidden border-outline-variant/10 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-on-surface">
              <thead className="border-b border-outline-variant/20 bg-surface-container-low text-on-surface-variant">
                <tr>
                  <th className="label-caps px-6 py-5">ID</th>
                  <th className="label-caps px-6 py-5">Customer</th>
                  <th className="label-caps px-6 py-5">Vehicle</th>
                  <th className="label-caps px-6 py-5">Status</th>
                  <th className="label-caps px-6 py-5">Total</th>
                  <th className="label-caps px-6 py-5">Opened At</th>
                  <th className="label-caps px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5 bg-surface">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="data-row group">
                    <td className="mono-data px-6 py-5 font-bold text-primary">#{ticket.id}</td>
                    <td className="px-6 py-5">
                      <div className="font-semibold text-on-surface">{ticket.customer?.name || "Unknown"}</div>
                      <div className="text-xs text-on-surface-variant">{ticket.customer?.phone}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-medium">
                        {ticket.customer_bike?.bike_blueprint?.brand?.name ||
                          ticket.customer_bike?.brand ||
                          "Unknown"}{" "}
                        {ticket.customer_bike?.bike_blueprint?.model ||
                          ticket.customer_bike?.model ||
                          ""}
                      </div>
                      <div className="mono-data text-xs text-on-surface-variant">
                        VIN: {ticket.customer_bike?.vin || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge tone={getStatusTone(ticket.status)}>
                        {ticket.status.toUpperCase().replace("_", " ")}
                      </StatusBadge>
                    </td>
                    <td className="mono-data px-6 py-5 font-black text-on-surface">${Number(ticket.total || 0).toFixed(2)}</td>
                    <td className="mono-data px-6 py-5 text-on-surface-variant">{new Date(ticket.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-5 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <ActionButton
                          href={`/tickets/${ticket.id}`}
                          variant="outline"
                          size="sm"
                          className="group-hover:border-primary group-hover:bg-primary group-hover:text-on-primary transition-all"
                        >
                          View Details
                        </ActionButton>
                        {canDeleteTickets ? (
                          <ActionButton
                            variant="outline"
                            tone="danger"
                            size="sm"
                            disabled={deletingId === ticket.id}
                            className="group-hover:border-error group-hover:bg-error group-hover:text-on-primary transition-all"
                            onClick={() => void handleDeleteTicket(ticket.id)}
                            title="Delete ticket"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </ActionButton>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataTableCard>
      )}

      {isCreateOpen && (
        <CreateTicketModal
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            setIsCreateOpen(false);
            fetchTickets();
          }}
        />
      )}
    </PageShell>
  );
}
