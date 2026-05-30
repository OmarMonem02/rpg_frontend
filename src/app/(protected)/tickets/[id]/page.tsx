"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useParams, useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import {
  PageShell,
  PageHero,
  ActionButton,
  ConfirmDialog,
  StatusBadge,
  SurfaceCard,
  InputGroup,
} from "@/components/ops-ui";
import {
  ModalShell,
  PaymentCloseModal,
  AdminPasswordReopenModal,
  TicketInvoiceModal,
} from "@/components/tickets/ticket-workflow-modals";
import { TicketMessengerChat } from "@/components/tickets/ticket-messenger-chat";
import {
  buildTicketTrackingUrl,
  ticketsApi,
  ticketItemName,
  type Ticket,
  type TicketItem,
} from "@/lib/tickets-api";
import { getAuthUser } from "@/lib/auth-session";
import {
  clampTicketItemDiscount,
  formatTicketMaxDiscountHint,
  ticketItemMaxDiscount,
} from "@/lib/ticket-item-discount";
import {
  type SaleRecord,
  type SparePartRecord,
  type MaintenanceServiceRecord,
} from "@/lib/crud-api";
import { CatalogPickerModal } from "@/components/catalog-picker-modal";
import { printInvoiceElement } from "@/lib/pdf-export";

function parseTicketNoteLines(notes: string): string[] {
  return notes
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•\-–—*]+/, "").trim())
    .filter(Boolean);
}

function TicketNotesBlock({
  notes,
  canEdit,
  onEdit,
}: {
  notes: string;
  canEdit?: boolean;
  onEdit?: () => void;
}) {
  const lines = parseTicketNoteLines(notes);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg font-semibold text-on-surface-variant">Notes</p>
        {canEdit && onEdit ? (
          <ActionButton variant="outline" size="sm" onClick={onEdit}>
            {notes.trim() ? "Edit notes" : "Add notes"}
          </ActionButton>
        ) : null}
      </div>
      {lines.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-on-surface-variant">
          {lines.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm italic text-on-surface-variant/80">
          No notes yet. Use one line per issue (e.g. oil leak, brake noise).
        </p>
      )}
    </div>
  );
}

export default function TicketDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const permissions = usePermissions();
  const canViewCustomerWorkspace =
    permissions.canReadPage("sales") ||
    permissions.canReadPage("maintenance");
  const canSendTracking = permissions.canUpdate("maintenance");
  const canDeleteTickets = permissions.canDelete("maintenance");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Task Management State
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [isEditNotesOpen, setIsEditNotesOpen] = useState(false);
  const [editNotesDraft, setEditNotesDraft] = useState("");
  const [createTasksFromNotesOpen, setCreateTasksFromNotesOpen] = useState(false);
  const [tasksFromNotesPreview, setTasksFromNotesPreview] = useState<{
    toCreate: string[];
    skippedCount: number;
  } | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);

  // Item Management State
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [itemType, setItemType] = useState<"spare_parts" | "maintenance_services">("spare_parts");

  // Close ticket payment state
  const [isClosing, setIsClosing] = useState(false);
  const [closeModalError, setCloseModalError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaidInput, setAmountPaidInput] = useState("");
  const [isReopenAuthOpen, setIsReopenAuthOpen] = useState(false);
  const [reopenPassword, setReopenPassword] = useState("");
  const [reopenModalError, setReopenModalError] = useState("");
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isExportingInvoice, setIsExportingInvoice] = useState(false);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [trackingLinkEnsuring, setTrackingLinkEnsuring] = useState(false);
  const [trackingMessage, setTrackingMessage] = useState("");

  const ticketId = Number(id);

  const refreshTicket = useCallback(async () => {
    const data = await ticketsApi.getTicket(ticketId);
    setTicket(data);
    return data;
  }, [ticketId]);

  const loadTicketMessages = useCallback(
    () => ticketsApi.getMessages(ticketId),
    [ticketId],
  );

  const sendTicketMessage = useCallback(
    async (payload: Parameters<typeof ticketsApi.sendMessage>[1]) => {
      await ticketsApi.sendMessage(ticketId, payload);
    },
    [ticketId],
  );

  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      await refreshTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }, [refreshTicket]);

  useEffect(() => {
    void fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    if (!canSendTracking || !ticket?.id || !ticket.customer?.phone?.trim()) return;
    if (ticket.public_token) return;

    let cancelled = false;
    void (async () => {
      try {
        setTrackingLinkEnsuring(true);
        const res = await ticketsApi.ensureTrackingLink(ticket.id);
        if (cancelled) return;
        setTicket((prev) =>
          prev ? { ...prev, public_token: res.public_token } : prev,
        );
      } catch {
        // Link can still be created when sending via WhatsApp.
      } finally {
        if (!cancelled) setTrackingLinkEnsuring(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canSendTracking, ticket?.id, ticket?.customer?.phone, ticket?.public_token]);

  const handleSendTrackingLink = async () => {
    if (!ticket?.customer?.phone?.trim()) {
      setError("Customer must have a phone number before sending a tracking link.");
      return;
    }
    try {
      setTrackingBusy(true);
      setTrackingMessage("");
      setError("");
      const res = await ticketsApi.sendTrackingLink(Number(id));
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              public_token: res.public_token,
              tracking_link_sent_at: res.sent_at,
              tracking_link_send_count: (prev.tracking_link_send_count ?? 0) + 1,
            }
          : prev,
      );
      setTrackingMessage("Tracking link queued for WhatsApp delivery.");
      try {
        await refreshTicket();
      } catch {
        // Keep optimistic UI when background refresh fails.
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send tracking link");
    } finally {
      setTrackingBusy(false);
    }
  };

  const handleCopyTrackingLink = async () => {
    if (!ticket?.public_token) return;
    try {
      await navigator.clipboard.writeText(buildTicketTrackingUrl(ticket.public_token));
      setTrackingMessage("Tracking link copied to clipboard.");
    } catch {
      setError("Could not copy link to clipboard.");
    }
  };

  const handleRegenerateTrackingLink = async () => {
    if (!confirm("Regenerate tracking link? Old links shared with the customer will stop working.")) return;
    try {
      setTrackingBusy(true);
      setTrackingMessage("");
      setError("");
      const res = await ticketsApi.regenerateTrackingToken(Number(id));
      setTicket((prev) => (prev ? { ...prev, public_token: res.public_token } : prev));
      setTrackingMessage(res.message);
      try {
        await refreshTicket();
      } catch {
        // Keep regenerated token visible when refresh fails.
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to regenerate tracking link");
    } finally {
      setTrackingBusy(false);
    }
  };

  const isClosedAndFullyPaid = (ticketData: Ticket) =>
    ticketData.status === "closed" &&
    Number(ticketData.amount_paid ?? 0) >= Number(ticketData.total ?? 0);

  const openCloseModal = () => {
    const total = Number(ticket?.total ?? 0);
    setPaymentMethod("cash");
    setAmountPaidInput(total.toFixed(2));
    setCloseModalError("");
    setIsClosing(true);
  };

  const handleCloseTicket = async () => {
    if (!ticket) return;
    const amountPaid = Number(amountPaidInput);
    const total = Number(ticket.total ?? 0);
    if (!Number.isFinite(amountPaid) || amountPaid < total) {
      setCloseModalError("Full payment is required before closing this ticket.");
      return;
    }

    try {
      setIsProcessing(true);
      setCloseModalError("");
      await ticketsApi.closeTicket(Number(id), {
        payment_method: paymentMethod,
        amount_paid: amountPaid,
      });
      setIsClosing(false);
      await fetchTicket();
      setIsInvoiceOpen(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to close ticket";
      setCloseModalError(message);
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReopenTicket = async (adminPassword?: string) => {
    try {
      setIsProcessing(true);
      setReopenModalError("");
      setError("");
      await ticketsApi.reopenTicket(
        Number(id),
        adminPassword ? { admin_password: adminPassword } : undefined,
      );
      setIsReopenAuthOpen(false);
      setReopenPassword("");
      await fetchTicket();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reopen ticket";
      setReopenModalError(message);
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReopenClick = () => {
    if (!ticket) return;
    setReopenModalError("");
    setReopenPassword("");

    if (isClosedAndFullyPaid(ticket)) {
      const authUser = getAuthUser();
      if (authUser?.role !== "admin") {
        setError("Only administrators can reopen a closed ticket that was paid in full.");
        return;
      }
      setIsReopenAuthOpen(true);
      return;
    }

    void handleReopenTicket();
  };

  const handleUpdateStatus = async (action: "start" | "end") => {
    try {
      setIsProcessing(true);
      setError("");
      if (action === "start") {
        await ticketsApi.updateTicketStatus(Number(id), "in_progress");
      } else if (action === "end") {
        await ticketsApi.endTicket(Number(id));
      }
      await fetchTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${action} ticket`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskName.trim()) return;
    try {
      setIsProcessing(true);
      await ticketsApi.addTask(Number(id), { name: newTaskName, status: "pending" });
      setNewTaskName("");
      setIsAddTaskModalOpen(false);
      await fetchTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add task");
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditNotesModal = () => {
    setEditNotesDraft(ticket?.notes ?? "");
    setIsEditNotesOpen(true);
  };

  const handleSaveNotes = async () => {
    try {
      setIsProcessing(true);
      setError("");
      const updated = await ticketsApi.updateTicketNotes(Number(id), editNotesDraft);
      setTicket(updated);
      setIsEditNotesOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save notes");
    } finally {
      setIsProcessing(false);
    }
  };

  const openCreateTasksFromNotesModal = () => {
    if (!ticket?.notes?.trim()) return;

    const lines = parseTicketNoteLines(ticket.notes);
    if (lines.length === 0) return;

    const existingNames = new Set(
      (ticket.tasks ?? []).map((task) => task.name.trim().toLowerCase()),
    );
    const toCreate = lines.filter((line) => !existingNames.has(line.toLowerCase()));
    const skippedCount = lines.length - toCreate.length;

    if (toCreate.length === 0) {
      setError("Every note line already has a matching task.");
      return;
    }

    setTasksFromNotesPreview({ toCreate, skippedCount });
    setCreateTasksFromNotesOpen(true);
  };

  const handleConfirmCreateTasksFromNotes = async () => {
    if (!tasksFromNotesPreview) return;

    const { toCreate } = tasksFromNotesPreview;

    try {
      setIsProcessing(true);
      setError("");
      for (const name of toCreate) {
        await ticketsApi.addTask(Number(id), { name, status: "pending" });
      }
      setCreateTasksFromNotesOpen(false);
      setTasksFromNotesPreview(null);
      await fetchTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create tasks from notes");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDeleteTask = async () => {
    if (deleteTaskId === null) return;
    try {
      setIsProcessing(true);
      setError("");
      await ticketsApi.deleteTask(Number(id), deleteTaskId);
      setDeleteTaskId(null);
      await fetchTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTicket = async () => {
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
      setIsProcessing(true);
      await ticketsApi.deleteTicket(Number(id));
      router.push("/tickets");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete ticket");
    } finally {
      setIsProcessing(false);
    }
  };

  const taskPickerPrice = (item: SparePartRecord | MaintenanceServiceRecord) =>
    "sale_price" in item ? item.sale_price : item.service_price;

  const handleAddItemToTask = async (
    taskId: number,
    item: SparePartRecord | MaintenanceServiceRecord,
  ) => {
    if (ticket?.status !== "in_progress") {
      setError("Start work before adding parts or services to this ticket.");
      return;
    }

    try {
      setIsProcessing(true);
      const isPart = itemType === "spare_parts";
      await ticketsApi.addItemToTask(Number(id), taskId, {
        spare_part_id: isPart ? item.id : undefined,
        maintenance_service_id: !isPart ? item.id : undefined,
        price_snapshot: taskPickerPrice(item),
        qty: 1,
        discount: 0,
      });
      await fetchTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateItemDiscount = async (
    taskId: number,
    item: TicketItem,
    rawDiscount: number,
    applyCatalogCap: boolean,
  ) => {
    if (ticket?.status !== "in_progress") {
      setError("Start work before editing parts or services on this ticket.");
      return;
    }

    const discount = clampTicketItemDiscount(item, rawDiscount, { applyCatalogCap });
    if (discount === Number(item.discount)) {
      return;
    }

    try {
      setIsProcessing(true);
      setError("");
      await ticketsApi.updateItemInTask(Number(id), taskId, item.id, { discount });
      await fetchTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update discount");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveItem = async (taskId: number, itemId: number) => {
    try {
      setIsProcessing(true);
      await ticketsApi.removeItemFromTask(Number(id), taskId, itemId);
      await fetchTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove item");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, status: string) => {
    try {
      setIsProcessing(true);
      await ticketsApi.updateTask(Number(id), taskId, { status });
      await fetchTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update task status");
    } finally {
      setIsProcessing(false);
    }
  };

  const buildInvoiceFromTicket = (ticketData: Ticket): SaleRecord => {
    const lineItems = ticketData.tasks?.flatMap((task) =>
      task.items?.map((item) => ({
        id: item.id,
        sale_id: ticketData.id,
        sellable_type: (item.spare_part_id ? "spare_parts" : "maintenance_services") as "spare_parts" | "maintenance_services",
        sellable_id: item.spare_part_id ?? item.maintenance_service_id ?? 0,
        selling_price: item.price_snapshot,
        discount_amount: item.discount,
        quantity: item.qty,
        returned_qty: 0,
        remaining_qty: item.qty,
        item_label: ticketItemName(item),
        item_name: ticketItemName(item),
      })) ?? [],
    ) ?? [];

    const paymentMethodLabels: Record<string, string> = {
      cash: "Cash",
      card: "Card",
      bank_transfer: "Bank Transfer",
    };
    const invoicePaymentMethod = ticketData.payment_method || paymentMethod;

    return {
      id: ticketData.id,
      customer_id: ticketData.customer_id,
      seller_id: 0,
      payment_method_id: 0,
      payment_method_name: paymentMethodLabels[invoicePaymentMethod] || invoicePaymentMethod,
      user_id: 0,
      sale_type: "maintenance",
      status: ticketData.status,
      delivery_status: "delivered",
      is_maintenance: true,
      shipping_fee: 0,
      sale_discount: 0,
      total: ticketData.total,
      line_items: lineItems,
      created_at: ticketData.created_at,
      customer: ticketData.customer
        ? {
            id: ticketData.customer.id,
            name: ticketData.customer.name,
            phone: ticketData.customer.phone,
            address: ticketData.customer.address,
            how_did_you_know_us: ticketData.customer.how_did_you_know_us,
            notes: ticketData.customer.notes,
          }
        : undefined,
    };
  };

  const ticketInvoice = ticket ? buildInvoiceFromTicket(ticket) : null;

  const handlePrintInvoice = () => {
    const invoiceElement = document.getElementById("invoice-export-root");
    if (!invoiceElement) {
      setError("Invoice not found");
      return;
    }

    try {
      printInvoiceElement(
        invoiceElement,
        `Invoice #${ticketInvoice?.id || id}`,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to print invoice");
    }
  };

  const handleExportInvoicePDF = async () => {
    if (!ticketInvoice) return;

    try {
      setIsExportingInvoice(true);
      const invoiceElement = document.getElementById("invoice-export-root");
      if (!invoiceElement) throw new Error("Invoice element not found");

      const { exportHtmlElementToPdf } = await import("@/lib/pdf-export");
      const filename = `Invoice-Ticket-${ticketInvoice.id}-${new Date().toISOString().split("T")[0]}.pdf`;
      await exportHtmlElementToPdf(invoiceElement, filename);
    } catch (err: unknown) {
      console.error("PDF Export Error:", err);
      const message =
        err instanceof Error ? err.message : "Failed to export invoice PDF";
      alert(message);
      setError(message);
    } finally {
      setIsExportingInvoice(false);
    }
  };

  if (loading && !ticket) {
    return <PageShell><div className="p-10 text-center">Loading ticket details...</div></PageShell>;
  }

  if (!ticket) {
    return (
      <PageShell>
        <div className="p-20 text-center flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-error/10 flex items-center justify-center text-error text-2xl font-bold">!</div>
          <h2 className="text-2xl font-bold text-on-surface">{error || "Ticket Not Found"}</h2>
          <p className="text-on-surface-variant max-w-md">
            We could not find a maintenance ticket with ID <strong>#{id}</strong>. 
            It may have been deleted or the ID might be incorrect.
          </p>
          <ActionButton variant="outline" onClick={() => router.push("/tickets")} className="mt-4">
            Return to Dashboard
          </ActionButton>
        </div>
      </PageShell>
    );
  }

  const getStatusTone = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "warning";
      case "in_progress": return "primary";
      case "completed": return "success";
      case "closed": return "default";
      default: return "default";
    }
  };

  const isEditable = ticket.status === "pending" || ticket.status === "in_progress";
  const canEditNotes =
    permissions.canUpdate("maintenance") && ticket.status !== "closed";
  const canEditItems = ticket.status === "in_progress";
  const authRole = getAuthUser()?.role;
  const isStaffUser = authRole === "staff";
  const isAdminUser = authRole === "admin";
  const canEditLineDiscount = canEditItems && (isStaffUser || isAdminUser);
  const applyStaffDiscountCap = isStaffUser;
  const isClosed = ticket.status === "closed";
  const ticketFullyPaid = isClosedAndFullyPaid(ticket);
  const trackingUrl = ticket.public_token
    ? buildTicketTrackingUrl(ticket.public_token)
    : null;

  const canSendChat = permissions.canUpdate("maintenance");

  return (
    <PageShell className="pb-24">
      <PageHero
        eyebrow="Ticket Management"
        title={`Ticket #${ticket.id}`}
        subtitle={
          ticket.notes || canEditNotes ? (
            <TicketNotesBlock
              notes={ticket.notes ?? ""}
              canEdit={canEditNotes}
              onEdit={openEditNotesModal}
            />
          ) : undefined
        }
        meta={
          <div className="flex flex-wrap gap-4">
            <div className="rounded-2xl border border-outline-variant/15 bg-surface p-4 text-sm min-w-[200px] shadow-sm">
              <p className="text-on-surface-variant font-medium mb-1">Customer & Bike</p>
              <p className="font-bold text-base">{ticket.customer?.name || "No Customer Name"}</p>
              {ticket.customer_id > 0 && canViewCustomerWorkspace ? (
                <p className="mt-1">
                  <Link
                    href={`/customers/${ticket.customer_id}`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View customer workspace
                  </Link>
                </p>
              ) : null}
              <p className="text-on-surface-variant">
                {ticket.customer_bike?.bike_blueprint?.brand?.name} {ticket.customer_bike?.bike_blueprint?.model}
              </p>
              <p className="text-xs text-on-surface-variant/70 mt-1 font-mono">VIN: {ticket.customer_bike?.vin || "N/A"}</p>
            </div>
            <div className="rounded-2xl border border-outline-variant/15 bg-surface p-4 text-sm min-w-[150px] shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-on-surface-variant font-medium mb-1">Status</p>
                <StatusBadge tone={getStatusTone(ticket.status)}>
                  {ticket.status.toUpperCase().replace("_", " ")}
                </StatusBadge>
              </div>
              <div className="mt-2">
                <p className="text-on-surface-variant font-medium mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-primary">${Number(ticket.total || 0).toFixed(2)}</p>
                {isClosed ? (
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Paid ${Number(ticket.amount_paid ?? 0).toFixed(2)}
                    {ticket.payment_method ? ` · ${ticket.payment_method.replace("_", " ")}` : ""}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        }
        actions={
          <div className="flex gap-2">
            <ActionButton variant="outline" onClick={() => router.push("/tickets")}>
              Back
            </ActionButton>
            {ticket.status === "pending" && (
              <ActionButton tone="primary" onClick={() => handleUpdateStatus("start")} disabled={isProcessing}>
                Start Work
              </ActionButton>
            )}
            {ticket.status === "in_progress" && (
              <ActionButton tone="success" onClick={() => handleUpdateStatus("end")} disabled={isProcessing}>
                Finish Work
              </ActionButton>
            )}
            {ticket.status === "completed" && (
              <>
                <ActionButton variant="outline" onClick={handleReopenClick} disabled={isProcessing}>
                  Reopen
                </ActionButton>
                <ActionButton tone="primary" onClick={openCloseModal} disabled={isProcessing}>
                  Close Ticket
                </ActionButton>
              </>
            )}
            {isClosed && (
              <>
                <ActionButton variant="outline" onClick={() => setIsInvoiceOpen(true)}>
                  View Invoice
                </ActionButton>
                <ActionButton
                  variant="outline"
                  onClick={handleReopenClick}
                  disabled={isProcessing || (ticketFullyPaid && getAuthUser()?.role !== "admin")}
                  title={
                    ticketFullyPaid && getAuthUser()?.role !== "admin"
                      ? "Administrator password required to reopen a fully paid closed ticket"
                      : undefined
                  }
                >
                  Reopen Ticket
                </ActionButton>
              </>
            )}
            {canDeleteTickets ? (
              <ActionButton
                variant="outline"
                tone="danger"
                onClick={() => void handleDeleteTicket()}
                disabled={isProcessing}
                className="gap-2"
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </ActionButton>
            ) : null}
          </div>
        }
      />

      {error && <div className="rounded-xl bg-error/10 p-4 text-error mb-6 animate-in fade-in slide-in-from-top-2">{error}</div>}

      {canSendTracking && (
        <SurfaceCard className="mb-6 border-outline-variant/10">
          <h3 className="text-lg font-bold text-on-surface mb-1">Customer tracking link</h3>
          <p className="text-sm text-on-surface-variant mb-4">
            Send a WhatsApp message with a secure link so the customer can verify their phone and view ticket progress, parts, services, and total.
          </p>
          {!ticket.customer?.phone ? (
            <p className="text-sm text-error">Add a customer phone number before sending a tracking link.</p>
          ) : null}
          {trackingLinkEnsuring ? (
            <p className="mb-3 text-sm text-on-surface-variant">Preparing tracking link…</p>
          ) : null}
          {trackingUrl ? (
            <p className="mb-3 break-all rounded-lg bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface-variant">
              {trackingUrl}
            </p>
          ) : ticket.customer?.phone && !trackingLinkEnsuring ? (
            <p className="mb-3 text-sm text-on-surface-variant">
              Tracking link could not be prepared. Refresh the page or use Send via WhatsApp.
            </p>
          ) : null}
          {ticket.tracking_link_sent_at ? (
            <p className="mb-3 text-xs text-on-surface-variant">
              Last sent: {new Date(ticket.tracking_link_sent_at).toLocaleString()}
              {ticket.tracking_link_send_count ? ` · ${ticket.tracking_link_send_count} time(s)` : ""}
            </p>
          ) : null}
          {trackingMessage ? (
            <p className="mb-3 text-sm font-medium text-primary">{trackingMessage}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <ActionButton
              tone="primary"
              onClick={() => void handleSendTrackingLink()}
              disabled={trackingBusy || !ticket.customer?.phone}
            >
              {trackingBusy ? 'Sending…' : 'Send via WhatsApp'}
            </ActionButton>
            {trackingUrl ? (
              <ActionButton variant="outline" onClick={() => void handleCopyTrackingLink()} disabled={trackingBusy}>
                Copy link
              </ActionButton>
            ) : null}
            {ticket.public_token ? (
              <ActionButton variant="outline" onClick={() => void handleRegenerateTrackingLink()} disabled={trackingBusy}>
                Regenerate link
              </ActionButton>
            ) : null}
          </div>
        </SurfaceCard>
      )}

      <TicketMessengerChat
        partnerName={ticket.customer?.name || "Customer"}
        partnerSubtitle={`Ticket #${ticket.id}`}
        unreadFrom="customer"
        canSend={canSendChat}
        sendDisabledReason={
          canSendChat
            ? undefined
            : "You do not have permission to send messages on this ticket."
        }
        loadMessages={loadTicketMessages}
        sendMessage={sendTicketMessage}
      />

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-on-surface">Maintenance Tasks</h2>
          <div className="flex flex-wrap gap-2">
            {isEditable && ticket.notes && parseTicketNoteLines(ticket.notes).length > 0 ? (
              <ActionButton
                tone="default"
                onClick={openCreateTasksFromNotesModal}
                disabled={isProcessing}
              >
                Create tasks from notes
              </ActionButton>
            ) : null}
            {isEditable ? (
              <ActionButton tone="primary" onClick={() => setIsAddTaskModalOpen(true)}>
                + Add High-Level Task
              </ActionButton>
            ) : null}
          </div>
        </div>

        {(!ticket.tasks || ticket.tasks.length === 0) ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-outline-variant/20 rounded-[2rem] bg-surface-container-lowest">
            <p className="text-on-surface-variant text-lg font-medium mb-4">No tasks added yet.</p>
            {isEditable && (
              <ActionButton variant="outline" onClick={() => setIsAddTaskModalOpen(true)}>
                Create First Task
              </ActionButton>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {ticket.tasks.map((task) => (
              <SurfaceCard key={task.id} className="overflow-hidden border-outline-variant/10 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">{task.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <StatusBadge tone={task.status === "completed" ? "success" : "warning"}>
                        {task.status.toUpperCase()}
                      </StatusBadge>
                      <span className="text-sm font-semibold text-on-surface-variant">Subtotal: ${Number(task.subtotal || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {isEditable && (
                      <>
                        <ActionButton 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setItemType("spare_parts"); setActiveTaskId(task.id); setIsPickerOpen(true); }}
                          disabled={!canEditItems}
                        >
                          + Part
                        </ActionButton>
                        <ActionButton 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setItemType("maintenance_services"); setActiveTaskId(task.id); setIsPickerOpen(true); }}
                          disabled={!canEditItems}
                        >
                          + Service
                        </ActionButton>
                        <ActionButton 
                          variant="ghost" 
                          size="sm" 
                          tone={task.status === "completed" ? "danger" : "success"}
                          onClick={() => handleUpdateTaskStatus(task.id, task.status === "completed" ? "pending" : "completed")}
                        >
                          {task.status === "completed" ? "Reopen Task" : "Complete Task"}
                        </ActionButton>
                        <ActionButton variant="ghost" size="sm" tone="danger" onClick={() => setDeleteTaskId(task.id)}>
                          Delete
                        </ActionButton>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-container-low text-on-surface-variant">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Item Name</th>
                        <th className="px-4 py-3 font-semibold">Type</th>
                        <th className="px-4 py-3 font-semibold">Price</th>
                        <th className="px-4 py-3 font-semibold">Qty</th>
                        <th className="px-4 py-3 font-semibold">Discount</th>
                        <th className="px-4 py-3 font-semibold">Total</th>
                        {isEditable && <th className="px-4 py-3 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/5">
                      {task.items?.map((item) => (
                        <tr key={item.id} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="px-4 py-3 font-medium text-on-surface">{ticketItemName(item)}</td>
                          <td className="px-4 py-3 font-medium text-on-surface">{(item.spare_part_id ? "Spare Part" : "Service")}</td>
                          <td className="px-4 py-3">${Number(item.price_snapshot).toFixed(2)}</td>
                          <td className="px-4 py-3">{item.qty}</td>
                          <td className="px-4 py-3">
                            {canEditLineDiscount ? (
                              <div className="flex flex-col items-start gap-0.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={ticketItemMaxDiscount(item, {
                                    applyCatalogCap: applyStaffDiscountCap,
                                  })}
                                  step="0.01"
                                  defaultValue={Number(item.discount).toFixed(2)}
                                  key={`${item.id}-${item.discount}`}
                                  disabled={isProcessing}
                                  onBlur={(e) => {
                                    void handleUpdateItemDiscount(
                                      task.id,
                                      item,
                                      Number(e.target.value),
                                      applyStaffDiscountCap,
                                    );
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  className="w-24 rounded-lg border border-outline-variant/30 bg-surface px-2 py-1 text-right text-sm text-error outline-none focus:border-primary"
                                />
                                {applyStaffDiscountCap ? (
                                  <span className="text-caption font-medium text-on-surface-variant">
                                    {formatTicketMaxDiscountHint(item)}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-error">-${Number(item.discount).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold">${Number(item.subtotal).toFixed(2)}</td>
                          {isEditable && (
                            <td className="px-4 py-3 text-right">
                              <button 
                                onClick={() => handleRemoveItem(task.id, item.id)}
                                className="text-on-surface-variant hover:text-error transition-colors"
                              >
                                &times;
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {(!task.items || task.items.length === 0) && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant italic">
                            No items in this task.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteTaskId !== null}
        onClose={() => setDeleteTaskId(null)}
        title="Delete task?"
        confirmLabel={isProcessing ? "Deleting…" : "Delete task"}
        confirmTone="danger"
        onConfirm={() => void handleConfirmDeleteTask()}
        isLoading={isProcessing}
      >
        <p className="text-sm text-on-surface-variant">
          Are you sure you want to delete{" "}
          <span className="font-medium text-on-surface">
            {ticket?.tasks?.find((t) => t.id === deleteTaskId)?.name ?? "this task"}
          </span>
          ? All items within it will be removed.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={createTasksFromNotesOpen && tasksFromNotesPreview !== null}
        onClose={() => {
          setCreateTasksFromNotesOpen(false);
          setTasksFromNotesPreview(null);
        }}
        title="Create tasks from notes?"
        confirmLabel={isProcessing ? "Creating…" : "Create tasks"}
        onConfirm={() => void handleConfirmCreateTasksFromNotes()}
        isLoading={isProcessing}
      >
        {tasksFromNotesPreview ? (
          <>
            <p className="text-sm text-on-surface-variant">
              This will add{" "}
              <span className="font-medium text-on-surface">
                {tasksFromNotesPreview.toCreate.length} maintenance task
                {tasksFromNotesPreview.toCreate.length === 1 ? "" : "s"}
              </span>{" "}
              from your ticket notes:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-on-surface">
              {tasksFromNotesPreview.toCreate.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
            {tasksFromNotesPreview.skippedCount > 0 ? (
              <p className="mt-3 text-sm text-on-surface-variant">
                {tasksFromNotesPreview.skippedCount} line
                {tasksFromNotesPreview.skippedCount === 1 ? "" : "s"} skipped because a
                matching task already exists.
              </p>
            ) : null}
          </>
        ) : null}
      </ConfirmDialog>

      {/* Edit Notes Modal */}
      {isEditNotesOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-[2.5rem] bg-surface p-8 shadow-2xl border border-outline-variant/20 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-on-surface mb-2">Ticket notes</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              One line per issue. These lines can be converted into maintenance tasks.
            </p>
            <InputGroup label="Issue description / technical notes">
              <textarea
                autoFocus
                rows={6}
                className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-lowest px-5 py-4 min-h-[140px] outline-none focus:border-primary transition-all shadow-inner resize-y"
                placeholder={"Oil leak\nBrake noise\nChain needs adjustment"}
                value={editNotesDraft}
                onChange={(e) => setEditNotesDraft(e.target.value)}
              />
            </InputGroup>
            <div className="flex justify-end gap-3 mt-8">
              <ActionButton
                variant="ghost"
                onClick={() => setIsEditNotesOpen(false)}
                disabled={isProcessing}
              >
                Cancel
              </ActionButton>
              <ActionButton tone="primary" onClick={() => void handleSaveNotes()} disabled={isProcessing}>
                {isProcessing ? "Saving…" : "Save notes"}
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      <ModalShell
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        title="New Maintenance Task"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <ActionButton variant="ghost" onClick={() => setIsAddTaskModalOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton
              tone="primary"
              onClick={() => void handleAddTask()}
              disabled={!newTaskName.trim() || isProcessing}
            >
              {isProcessing ? "Creating…" : "Create Task"}
            </ActionButton>
          </div>
        }
      >
        <InputGroup label="Task Name (e.g. Engine Repair, Periodic Service)">
          <input
            autoFocus
            className="w-full rounded-2xl border border-outline-variant/30 bg-surface px-5 py-3 outline-none focus:border-primary transition-all shadow-inner"
            placeholder="Enter task name..."
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleAddTask()}
          />
        </InputGroup>
      </ModalShell>

      {/* Item Picker */}
      <CatalogPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        catalogType={itemType}
        onAddItems={(items) => {
          if (items.length > 0 && activeTaskId) {
            handleAddItemToTask(activeTaskId, items[0] as SparePartRecord | MaintenanceServiceRecord);
          }
          setIsPickerOpen(false);
        }}
      />

      <PaymentCloseModal
        isOpen={isClosing}
        onClose={() => {
          setIsClosing(false);
          setCloseModalError("");
        }}
        total={Number(ticket.total || 0)}
        paymentMethod={paymentMethod}
        amountPaid={amountPaidInput}
        onPaymentMethodChange={setPaymentMethod}
        onAmountPaidChange={setAmountPaidInput}
        onConfirm={() => void handleCloseTicket()}
        isProcessing={isProcessing}
        error={closeModalError}
      />

      <AdminPasswordReopenModal
        isOpen={isReopenAuthOpen}
        onClose={() => {
          setIsReopenAuthOpen(false);
          setReopenPassword("");
          setReopenModalError("");
        }}
        ticketId={ticket.id}
        total={Number(ticket.total || 0)}
        amountPaid={Number(ticket.amount_paid ?? 0)}
        password={reopenPassword}
        onPasswordChange={setReopenPassword}
        onConfirm={() => void handleReopenTicket(reopenPassword)}
        isProcessing={isProcessing}
        error={reopenModalError}
      />

      {ticketInvoice ? (
        <TicketInvoiceModal
          isOpen={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
          ticketId={ticket.id}
          invoice={ticketInvoice}
          onPrint={handlePrintInvoice}
          onExportPdf={() => void handleExportInvoicePDF()}
          isExporting={isExportingInvoice}
        />
      ) : null}

    </PageShell>
  );
}
