"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchTickets = async () => {
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
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const getStatusTone = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "warning";
      case "in_progress": return "primary";
      case "completed": return "success";
      case "closed": return "default";
      default: return "default";
    }
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="Operations"
        title="Maintenance Dashboard"
        description="Track vehicle repairs, manage technician tasks, and process customer billing."
        actions={
          <ActionButton tone="primary" onClick={() => setIsCreateOpen(true)} className="px-8 shadow-lg shadow-primary/20">
            + Open New Ticket
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
                  <th className="px-6 py-5 font-bold uppercase tracking-wider">ID</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider">Status</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider">Total</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider">Opened At</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5 bg-surface">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="group transition-all hover:bg-primary/[0.02]">
                    <td className="px-6 py-5 font-mono font-bold text-primary">#{ticket.id}</td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-on-surface">{ticket.customer?.name || "Unknown"}</div>
                      <div className="text-xs text-on-surface-variant">{ticket.customer?.phone}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-medium">
                        {ticket.customer_bike?.bike_blueprint?.brand?.name || "Unknown"} {ticket.customer_bike?.bike_blueprint?.model || ""}
                      </div>
                      <div className="text-xs font-mono text-on-surface-variant">VIN: {ticket.customer_bike?.brand || "N/A"}</div>
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge tone={getStatusTone(ticket.status)}>
                        {ticket.status.toUpperCase().replace("_", " ")}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-5 font-mono font-black text-on-surface">${Number(ticket.total || 0).toFixed(2)}</td>
                    <td className="px-6 py-5 text-on-surface-variant">{new Date(ticket.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-5 text-right">
                      <ActionButton href={`/tickets/${ticket.id}`} variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                        View Details
                      </ActionButton>
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
