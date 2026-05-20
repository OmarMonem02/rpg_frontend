"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getAuthToken, getAuthUser } from "@/lib/auth-session";
import { usePermissions } from "@/components/permission-provider";
import { deleteCustomer } from "@/lib/api/customers";
import { LinkCustomerBikeModal } from "@/components/customers/LinkCustomerBikeModal";
import {
  getCustomerWorkspace,
  type CustomerWorkspacePayload,
  type WorkspaceTicketRow,
} from "@/lib/api/customer-workspace";
import {
  PageShell,
  PageHero,
  ActionButton,
  StatGrid,
  StatCard,
  SurfaceCard,
  DataTableCard,
  StatusBadge,
  EmptyState,
} from "@/components/ops-ui";
import type { SaleRecord } from "@/lib/api/sales";

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ticketStatusTone(
  status: string,
): "success" | "warning" | "primary" | "default" {
  const s = status.toLowerCase();
  if (s === "completed") return "success";
  if (s === "pending") return "warning";
  if (s === "in_progress") return "primary";
  return "default";
}

function saleStatusTone(
  status: string,
): "success" | "warning" | "danger" | "default" {
  const s = status.toLowerCase();
  if (s === "completed") return "success";
  if (s === "pending" || s === "partial") return "warning";
  if (s === "cancelled" || s === "returned") return "danger";
  return "default";
}

export default function CustomerWorkspacePage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="flex h-48 items-center justify-center text-on-surface-variant">
            Loading…
          </div>
        </PageShell>
      }
    >
      <CustomerWorkspaceContent />
    </Suspense>
  );
}

function CustomerWorkspaceContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const permissions = usePermissions();
  const customerId = Number(params?.id);

  const [workspace, setWorkspace] = useState<CustomerWorkspacePayload | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesPage, setSalesPage] = useState(1);
  const [ticketsPage, setTicketsPage] = useState(1);
  const [linkBikeOpen, setLinkBikeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = getAuthUser()?.role === "admin";
  const canLinkBike =
    permissions.canCreate("maintenance") || permissions.canCreate("sales");
  const canSales = permissions.canReadPage("sales");
  const canTickets = permissions.canReadPage("maintenance");

  const load = useCallback(async () => {
    if (!customerId) return;
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      setLoading(true);
      setError(null);
      const data = await getCustomerWorkspace(token, customerId, {
        salesPage,
        ticketsPage,
        salesPerPage: 8,
        ticketsPerPage: 8,
      });
      setWorkspace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customer");
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  }, [customerId, salesPage, ticketsPage]);

  useEffect(() => {
    setSalesPage(1);
    setTicketsPage(1);
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("linkBike") === "1") {
      setLinkBikeOpen(true);
    }
  }, [searchParams]);

  async function handleDeleteCustomer() {
    if (!isAdmin || !customerId) return;
    const token = getAuthToken();
    if (!token) {
      setError("Authentication required");
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteCustomer(token, customerId);
      router.push("/customers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete customer");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (!customerId) {
    return (
      <PageShell>
        <EmptyState title="Invalid customer" description="Missing customer id." />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHero
        eyebrow="Customer workspace"
        title={workspace?.customer.name || `Customer #${customerId}`}
        meta={
          <p className="text-sm leading-relaxed text-on-surface-variant">
            Profile, registered bikes, sales history, and maintenance tickets.
          </p>
        }
        actions={
          <>
            {canLinkBike ? (
              <ActionButton tone="primary" onClick={() => setLinkBikeOpen(true)}>
                Link bike
              </ActionButton>
            ) : null}
            {isAdmin ? (
              <ActionButton
                tone="danger"
                variant="outline"
                onClick={() => setDeleteOpen(true)}
              >
                Delete customer
              </ActionButton>
            ) : null}
            <ActionButton variant="outline" onClick={() => router.push("/customers")}>
              Back to directory
            </ActionButton>
          </>
        }
      />

      {error ? (
        <div className="mb-6 rounded-2xl border border-error/30 bg-error-container p-4 text-sm text-on-error-container">
          {error}
        </div>
      ) : null}

      {loading && !workspace ? (
        <div className="flex h-56 flex-col items-center justify-center gap-3 text-on-surface-variant">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="font-medium">Loading workspace…</p>
        </div>
      ) : workspace ? (
        <div className="flex flex-col gap-8">
          {workspace.stats ? (
            <StatGrid>
              <StatCard
                label="Registered bikes"
                value={String(workspace.stats.bikes_count)}
                tone="primary"
              />
              <StatCard
                label="Open tickets"
                value={String(workspace.stats.tickets_open_count)}
                tone="warning"
                hint="Pending or in progress"
              />
              <StatCard
                label="Lifetime sales"
                value={String(workspace.stats.sales_count)}
                hint={`EGP ${formatMoney(workspace.stats.lifetime_sales_total)} total`}
              />
              <StatCard
                label="Contact"
                value={workspace.customer.phone || "—"}
                hint={workspace.customer.address || "No address on file"}
              />
            </StatGrid>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <SurfaceCard className="border-outline-variant/15 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-on-surface">Profile</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-on-surface-variant">How they found us</dt>
                  <dd className="mt-0.5 font-medium text-on-surface">
                    {workspace.customer.how_did_you_know_us || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Internal notes</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-on-surface">
                    {workspace.customer.notes || "—"}
                  </dd>
                </div>
                {workspace.customer.created_at ? (
                  <div>
                    <dt className="text-on-surface-variant">Customer since</dt>
                    <dd className="mt-0.5 font-medium text-on-surface">
                      {new Date(workspace.customer.created_at).toLocaleString()}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </SurfaceCard>

            <SurfaceCard className="border-outline-variant/15 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-on-surface">Quick links</h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                Jump into operational records for this customer when you have the
                right permissions.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {canSales ? (
                  <ActionButton
                    tone="primary"
                    variant="outline"
                    onClick={() =>
                      router.push(`/inventory/sales?customer_id=${customerId}`)
                    }
                  >
                    View in sales list
                  </ActionButton>
                ) : null}
                {canTickets ? (
                  <ActionButton
                    variant="outline"
                    onClick={() => router.push("/tickets")}
                  >
                    Tickets queue
                  </ActionButton>
                ) : null}
              </div>
            </SurfaceCard>
          </div>

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-on-surface">Linked bikes</h2>
              {canLinkBike ? (
                <ActionButton
                  size="sm"
                  tone="primary"
                  variant="outline"
                  onClick={() => setLinkBikeOpen(true)}
                >
                  + Link another bike
                </ActionButton>
              ) : null}
            </div>
            {workspace.bikes.length === 0 ? (
              <EmptyState
                title="No bikes on file"
                description={
                  canLinkBike
                    ? "Link the first bike for this customer. You can add more bikes anytime."
                    : "No bikes registered for this customer yet."
                }
                action={
                  canLinkBike ? (
                    <ActionButton tone="primary" onClick={() => setLinkBikeOpen(true)}>
                      Link first bike
                    </ActionButton>
                  ) : undefined
                }
              />
            ) : (
              <DataTableCard className="overflow-hidden border-outline-variant/10">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-outline-variant/20 bg-surface-container-low text-on-surface-variant">
                      <tr>
                        <th className="label-caps px-6 py-4">Vehicle</th>
                        <th className="label-caps px-6 py-4">VIN</th>
                        <th className="label-caps px-6 py-4">Mileage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/5">
                      {workspace.bikes.map((bike) => (
                        <tr key={bike.id}>
                          <td className="px-6 py-4 font-medium text-on-surface">
                            {bike.bike_blueprint?.brand?.name || "—"}{" "}
                            {bike.bike_blueprint?.model || ""}{" "}
                            <span className="text-on-surface-variant">
                              {bike.bike_blueprint?.year
                                ? `(${bike.bike_blueprint.year})`
                                : ""}
                            </span>
                          </td>
                          <td className="mono-data px-6 py-4 text-on-surface-variant">
                            {bike.vin || "—"}
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant">
                            {bike.mileage != null ? bike.mileage : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DataTableCard>
            )}
          </section>

          <section>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-xl font-bold text-on-surface">Sales</h2>
                {workspace.sales.lastPage > 1 ? (
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <span>
                      Page {workspace.sales.currentPage} / {workspace.sales.lastPage}
                    </span>
                    <ActionButton
                      size="sm"
                      variant="outline"
                      disabled={workspace.sales.currentPage <= 1 || loading}
                      onClick={() =>
                        setSalesPage((p) => Math.max(1, p - 1))
                      }
                    >
                      Prev
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="outline"
                      disabled={
                        workspace.sales.currentPage >= workspace.sales.lastPage ||
                        loading
                      }
                      onClick={() => setSalesPage((p) => p + 1)}
                    >
                      Next
                    </ActionButton>
                  </div>
                ) : null}
              </div>
              {workspace.sales.items.length === 0 ? (
                <EmptyState title="No sales yet" description="No invoices for this customer." />
              ) : (
                <DataTableCard className="overflow-hidden border-outline-variant/10">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="border-b border-outline-variant/20 bg-surface-container-low text-on-surface-variant">
                        <tr>
                          <th className="label-caps px-6 py-4">Sale</th>
                          <th className="label-caps px-6 py-4">Status</th>
                          <th className="label-caps px-6 py-4 text-right">Total</th>
                          <th className="label-caps px-6 py-4">Date</th>
                          <th className="label-caps px-6 py-4 text-right"> </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {workspace.sales.items.map((sale: SaleRecord) => (
                          <tr key={sale.id} className="hover:bg-surface-container-lowest/80">
                            <td className="px-6 py-4 font-semibold text-on-surface">
                              #{sale.id}
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge tone={saleStatusTone(sale.status)}>
                                {sale.status}
                              </StatusBadge>
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums font-medium">
                              EGP {formatMoney(sale.total)}
                            </td>
                            <td className="px-6 py-4 text-on-surface-variant">
                              {sale.created_at
                                ? new Date(sale.created_at).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {canSales ? (
                                <Link
                                  href={`/inventory/sales/${sale.id}`}
                                  className="text-sm font-semibold text-primary hover:underline"
                                >
                                  Open
                                </Link>
                              ) : (
                                <span className="text-xs text-on-surface-variant">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DataTableCard>
              )}
            </section>

          <section>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-xl font-bold text-on-surface">
                  Maintenance tickets
                </h2>
                {workspace.tickets.lastPage > 1 ? (
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <span>
                      Page {workspace.tickets.currentPage} /{" "}
                      {workspace.tickets.lastPage}
                    </span>
                    <ActionButton
                      size="sm"
                      variant="outline"
                      disabled={workspace.tickets.currentPage <= 1 || loading}
                      onClick={() =>
                        setTicketsPage((p) => Math.max(1, p - 1))
                      }
                    >
                      Prev
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="outline"
                      disabled={
                        workspace.tickets.currentPage >=
                          workspace.tickets.lastPage || loading
                      }
                      onClick={() => setTicketsPage((p) => p + 1)}
                    >
                      Next
                    </ActionButton>
                  </div>
                ) : null}
              </div>
              {workspace.tickets.items.length === 0 ? (
                <EmptyState
                  title="No tickets"
                  description="This customer has no maintenance tickets yet."
                />
              ) : (
                <DataTableCard className="overflow-hidden border-outline-variant/10">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="border-b border-outline-variant/20 bg-surface-container-low text-on-surface-variant">
                        <tr>
                          <th className="label-caps px-6 py-4">Ticket</th>
                          <th className="label-caps px-6 py-4">Bike</th>
                          <th className="label-caps px-6 py-4">Status</th>
                          <th className="label-caps px-6 py-4 text-right">Total</th>
                          <th className="label-caps px-6 py-4">Opened</th>
                          <th className="label-caps px-6 py-4 text-right"> </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {workspace.tickets.items.map((t: WorkspaceTicketRow) => (
                          <tr key={t.id} className="hover:bg-surface-container-lowest/80">
                            <td className="px-6 py-4 font-semibold text-on-surface">
                              #{t.id}
                            </td>
                            <td className="px-6 py-4 text-on-surface-variant">
                              {t.customer_bike?.bike_blueprint?.brand?.name || ""}{" "}
                              {t.customer_bike?.bike_blueprint?.model || "—"}
                              <div className="mono-data text-xs">
                                VIN: {t.customer_bike?.vin || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge tone={ticketStatusTone(t.status)}>
                                {t.status.replace("_", " ")}
                              </StatusBadge>
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums">
                              EGP {formatMoney(t.total)}
                            </td>
                            <td className="px-6 py-4 text-on-surface-variant">
                              {t.created_at
                                ? new Date(t.created_at).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {canTickets ? (
                                <Link
                                  href={`/tickets/${t.id}`}
                                  className="text-sm font-semibold text-primary hover:underline"
                                >
                                  Open
                                </Link>
                              ) : (
                                <span className="text-xs text-on-surface-variant">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DataTableCard>
              )}
            </section>
        </div>
      ) : null}

      {linkBikeOpen && workspace ? (
        <LinkCustomerBikeModal
          customerId={customerId}
          customerName={workspace.customer.name}
          onClose={() => setLinkBikeOpen(false)}
          onSuccess={() => void load()}
        />
      ) : null}

      {deleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-[1.25rem] border border-outline-variant/20 bg-surface p-6 shadow-lg">
            <h3 className="font-display text-lg font-semibold text-on-surface">
              Delete customer?
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Permanently remove{" "}
              <span className="font-medium text-on-surface">
                {workspace?.customer.name || `Customer #${customerId}`}
              </span>
              ? Related sales and tickets may block deletion if the server rejects
              it.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <ActionButton
                type="button"
                variant="outline"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
              >
                Cancel
              </ActionButton>
              <ActionButton
                type="button"
                tone="danger"
                onClick={() => void handleDeleteCustomer()}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
