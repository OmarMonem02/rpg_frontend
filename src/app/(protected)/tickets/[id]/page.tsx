"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TrashIcon, CheckIcon, ArrowPathIcon, ChevronUpIcon, ChevronDownIcon, PlusIcon } from "@heroicons/react/24/outline";
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
  EmptyState,
} from "@/components/ops-ui";
import {
  ModalShell,
  PaymentCloseModal,
  AdminPasswordReopenModal,
  TicketInvoiceModal,
} from "@/components/tickets/ticket-workflow-modals";
import { TicketMessengerChat } from "@/components/tickets/ticket-messenger-chat";
import { TicketOverallDiscountPanel } from "@/components/tickets/ticket-overall-discount-panel";
import { TicketLineItemDiscountCell } from "@/components/ticket-line-item-discount-cell";
import {
  buildTicketTrackingUrl,
  ticketsApi,
  ticketItemName,
  ticketItemTypeLabel,
  type Ticket,
  type TicketItem,
} from "@/lib/tickets-api";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { getAuthUser } from "@/lib/auth-session";
import { convertToEGP, formatEgp, toPricingCurrency } from "@/lib/currencies";
import { clampTicketItemDiscount } from "@/lib/ticket-item-discount";
import {
  readTicketPendingItemDiscountRequests,
  writeTicketPendingItemDiscountRequests,
} from "@/lib/ticket-pending-item-discount-storage";
import {
  computeTicketDisplayTotals,
  computeTicketLineSubtotalDisplay,
  computeTicketTaskSubtotalDisplay,
  convertTicketDiscountForDisplay,
  convertTicketLineAmount,
} from "@/lib/ticket-display-pricing";
import {
  type SaleRecord,
  type ProductRecord,
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

function DebouncedQuantityInput({
  initialQty,
  disabled,
  onUpdate,
}: {
  initialQty: number;
  disabled: boolean;
  onUpdate: (newQty: number) => void;
}) {
  const [localQty, setLocalQty] = useState(initialQty);

  useEffect(() => {
    setLocalQty(initialQty);
  }, [initialQty]);

  useEffect(() => {
    if (localQty === initialQty) return;
    const timer = setTimeout(() => {
      onUpdate(localQty);
    }, 500);
    return () => clearTimeout(timer);
  }, [localQty, initialQty, onUpdate]);

  const handleIncrement = () => {
    if (disabled) return;
    setLocalQty((prev) => prev + 1);
  };

  const handleDecrement = () => {
    if (disabled || localQty <= 1) return;
    setLocalQty((prev) => prev - 1);
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={disabled || localQty <= 1}
        onClick={handleDecrement}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-outline-variant/30 bg-surface text-on-surface-variant hover:bg-surface-container hover:text-on-surface disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        -
      </button>
      <input
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        value={localQty}
        disabled={disabled}
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          if (!isNaN(val) && val >= 1) {
            setLocalQty(val);
          } else if (e.target.value === "") {
            // Allow empty temporarily while typing, but it will revert or we can handle it.
            // For simplicity, let's just use the value if valid.
            // Actually, if it's empty, we might not want to update localQty to NaN.
            // We'll leave it as a controlled input that requires valid numbers.
          }
        }}
        onWheel={(event) => {
          event.currentTarget.blur();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
            if (localQty !== initialQty) {
              onUpdate(localQty);
            }
          }
        }}
        className="w-12 text-center rounded-md border border-outline-variant/30 bg-surface px-1 py-1 text-sm text-on-surface outline-none focus:border-primary [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={handleIncrement}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-outline-variant/30 bg-surface text-on-surface-variant hover:bg-surface-container hover:text-on-surface disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        +
      </button>
    </div>
  );
}

export default function TicketDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { rates } = useExchangeRates();
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
  const [pendingItemDiscountRequestByItemId, setPendingItemDiscountRequestByItemId] =
    useState<Record<number, number>>(() =>
      readTicketPendingItemDiscountRequests(Number(id)),
    );

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
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});

  const toggleTaskExpanded = (taskId: number) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: prev[taskId] === undefined ? false : !prev[taskId],
    }));
  };

  // Item Management State
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [pickerCatalogType, setPickerCatalogType] = useState<
    "spare_parts" | "maintenance_parts" | "maintenance_services" | "products" | null
  >(null);

  const openCatalogPicker = (
    taskId: number,
    catalogType: "spare_parts" | "maintenance_parts" | "maintenance_services" | "products",
  ) => {
    setActiveTaskId(taskId);
    setPickerCatalogType(catalogType);
  };

  const closeCatalogPicker = () => {
    setPickerCatalogType(null);
    setActiveTaskId(null);
  };

  // Close ticket payment state
  const [isClosing, setIsClosing] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [closeModalError, setCloseModalError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaidInput, setAmountPaidInput] = useState("");
  const [paymentAdminPassword, setPaymentAdminPassword] = useState("");
  const [isReopenAuthOpen, setIsReopenAuthOpen] = useState(false);
  const [reopenPassword, setReopenPassword] = useState("");
  const [reopenModalError, setReopenModalError] = useState("");
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isExportingInvoice, setIsExportingInvoice] = useState(false);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [trackingLinkEnsuring, setTrackingLinkEnsuring] = useState(false);
  const [trackingMessage, setTrackingMessage] = useState("");

  const ticketId = Number(id);

  useEffect(() => {
    setPendingItemDiscountRequestByItemId(
      readTicketPendingItemDiscountRequests(ticketId),
    );
  }, [ticketId]);

  useEffect(() => {
    writeTicketPendingItemDiscountRequests(
      ticketId,
      pendingItemDiscountRequestByItemId,
    );
  }, [ticketId, pendingItemDiscountRequestByItemId]);

  const handlePersistPendingItemDiscountRequest = useCallback(
    (itemId: number, requestId: number) => {
      setPendingItemDiscountRequestByItemId((current) => ({
        ...current,
        [itemId]: requestId,
      }));
    },
    [],
  );

  const handleClearPendingItemDiscountRequest = useCallback((itemId: number) => {
    setPendingItemDiscountRequestByItemId((current) => {
      if (!(itemId in current)) return current;
      const next = { ...current };
      delete next[itemId];
      return next;
    });
  }, []);

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
    if (!ticket) return;
    const total = computeTicketDisplayTotals(ticket, rates).total;
    setPaymentMethod(ticket.payment_method || "cash");
    const remaining = total - Number(ticket.amount_paid || 0);
    setAmountPaidInput(Math.max(0, remaining).toFixed(2));
    setPaymentAdminPassword("");
    setCloseModalError("");
    setIsClosing(true);
  };

  const openRecordPaymentModal = () => {
    if (!ticket) return;
    setPaymentMethod(ticket.payment_method || "cash");
    setAmountPaidInput("");
    setPaymentAdminPassword("");
    setCloseModalError("");
    setIsRecordingPayment(true);
  };

  const handleCloseTicket = async () => {
    if (!ticket) return;
    const amountPaid = Number(amountPaidInput);
    if (!Number.isFinite(amountPaid)) {
      setCloseModalError("Please enter a valid payment amount.");
      return;
    }

    const newTotalPaid = Number(ticket.amount_paid || 0) + amountPaid;

    try {
      setIsProcessing(true);
      setCloseModalError("");
      await ticketsApi.closeTicket(Number(id), {
        payment_method: paymentMethod,
        amount_paid: newTotalPaid,
        admin_password: paymentAdminPassword || undefined,
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

  const handleRecordPayment = async () => {
    if (!ticket) return;
    const amountPaid = Number(amountPaidInput);
    if (!Number.isFinite(amountPaid)) {
      setCloseModalError("Please enter a valid payment amount.");
      return;
    }

    const newTotalPaid = Number(ticket.amount_paid || 0) + amountPaid;

    try {
      setIsProcessing(true);
      setCloseModalError("");
      await ticketsApi.recordPayment(Number(id), {
        payment_method: paymentMethod,
        amount_paid: newTotalPaid,
        admin_password: paymentAdminPassword || undefined,
      });
      setIsRecordingPayment(false);
      await fetchTicket();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record payment";
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

  const taskPickerPrice = (item: SparePartRecord | MaintenanceServiceRecord | ProductRecord) =>
    "service_price" in item ? item.service_price : item.sale_price;

  const buildTaskItemPayload = (
    catalogType: "spare_parts" | "maintenance_parts" | "maintenance_services" | "products",
    item: SparePartRecord | MaintenanceServiceRecord | ProductRecord,
  ) => ({
    spare_part_id: catalogType === "spare_parts" ? item.id : undefined,
    maintenance_part_id: catalogType === "maintenance_parts" ? item.id : undefined,
    maintenance_service_id: catalogType === "maintenance_services" ? item.id : undefined,
    product_id: catalogType === "products" ? item.id : undefined,
    price_snapshot: convertToEGP(
      taskPickerPrice(item),
      toPricingCurrency(item.sale_currency),
      rates,
    ),
    qty: 1,
    discount: 0,
  });

  const handleAddItemsToTask = async (
    taskId: number,
    catalogType: "spare_parts" | "maintenance_parts" | "maintenance_services" | "products",
    items: Array<SparePartRecord | MaintenanceServiceRecord | ProductRecord>,
  ) => {
    if (ticket?.status !== "in_progress") {
      setError("Start work before adding parts, products, or services to this ticket.");
      return;
    }

    if (items.length === 0) return;

    try {
      setIsProcessing(true);
      setError("");
      for (const item of items) {
        await ticketsApi.addItemToTask(
          Number(id),
          taskId,
          buildTaskItemPayload(catalogType, item),
        );
      }
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
    unitDiscount: number,
    approvalRequestId?: number,
  ) => {
    if (ticket?.status !== "in_progress") {
      setError("Start work before editing parts or services on this ticket.");
      return;
    }

    const unitPrice = Number(item.price_snapshot) || 0;
    let discount = unitDiscount;

    if (isAdminUser) {
      discount = Math.max(0, Math.min(unitDiscount, unitPrice));
    } else if (!approvalRequestId) {
      discount = clampTicketItemDiscount(item, unitDiscount, {
        applyCatalogCap: true,
      });
    }

    if (
      discount === Number(item.discount) &&
      !approvalRequestId
    ) {
      return;
    }

    try {
      setIsProcessing(true);
      setError("");
      await ticketsApi.updateItemInTask(Number(id), taskId, item.id, {
        discount,
        ...(approvalRequestId
          ? { discount_approval_request_id: approvalRequestId }
          : {}),
      });
      handleClearPendingItemDiscountRequest(item.id);
      await fetchTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update discount");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateItemQty = async (
    taskId: number,
    item: TicketItem,
    rawQty: number,
  ) => {
    if (ticket?.status !== "in_progress") {
      setError("Start work before editing parts or services on this ticket.");
      return;
    }

    const qty = Math.max(1, Math.trunc(Number.isFinite(rawQty) ? rawQty : 1));
    if (qty === Number(item.qty)) {
      return;
    }

    try {
      setIsProcessing(true);
      setError("");
      await ticketsApi.updateItemInTask(Number(id), taskId, item.id, { qty });
      await fetchTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update quantity");
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
    const allItems =
      ticketData.tasks?.flatMap((task) => task.items ?? []) ?? [];
    const displayTotals = computeTicketDisplayTotals(ticketData, rates);

    const lineItems = ticketData.tasks?.flatMap((task) =>
      task.items?.map((item) => ({
        id: item.id,
        sale_id: ticketData.id,
        sellable_type: (item.spare_part_id
          ? "spare_parts"
          : item.maintenance_part_id
            ? "maintenance_parts"
          : item.product_id
            ? "products"
            : "maintenance_services") as "spare_parts" | "maintenance_parts" | "products" | "maintenance_services",
        sellable_id:
          item.spare_part_id ??
          item.maintenance_part_id ??
          item.product_id ??
          item.maintenance_service_id ??
          0,
        selling_price: convertTicketLineAmount(item, item.price_snapshot, rates),
        discount_amount: convertTicketLineAmount(item, item.discount, rates),
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
      sale_discount: convertTicketDiscountForDisplay(
        Number(ticketData.discount ?? 0),
        allItems,
        rates,
      ),
      total: displayTotals.total,
      amount_paid: convertTicketDiscountForDisplay(
        Number(ticketData.amount_paid ?? 0),
        allItems,
        rates,
      ),
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
      case "partial": return "info";
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
  const canEditOverallDiscount =
    ticket.status !== "closed" &&
    (isStaffUser || isAdminUser) &&
    permissions.canUpdate("maintenance");
  const allTicketItems =
    ticket.tasks?.flatMap((task) => task.items ?? []) ?? [];
  const displayTotals = computeTicketDisplayTotals(ticket, rates);
  const displayAmountPaid = convertTicketDiscountForDisplay(
    Number(ticket.amount_paid ?? 0),
    allTicketItems,
    rates,
  );
  const isClosed = ticket.status === "closed";
  const isPartial = ticket.status === "partial";
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
                {ticket.customer_bike?.bike_blueprint?.brand?.name} {ticket.customer_bike?.bike_blueprint?.model} {ticket.customer_bike?.bike_blueprint?.year}
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
                <p className="text-2xl font-bold text-primary">{formatEgp(displayTotals.total)}</p>
                {displayAmountPaid > 0 ? (
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Paid {formatEgp(displayAmountPaid)}
                    {ticket.payment_method ? ` · ${ticket.payment_method.replace("_", " ")}` : ""}
                  </p>
                ) : null}
                {isPartial && displayAmountPaid < displayTotals.total ? (
                  <p className="mt-1 text-xs font-semibold text-warning">
                    {formatEgp(displayTotals.total - displayAmountPaid)} remaining balance
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
            {(ticket.status === "pending" || ticket.status === "in_progress") && (
              <ActionButton variant="outline" onClick={openRecordPaymentModal} disabled={isProcessing}>
                Record Payment
              </ActionButton>
            )}
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
            {isPartial && (
              <>
                <ActionButton variant="outline" onClick={() => setIsInvoiceOpen(true)}>
                  View Invoice
                </ActionButton>
                <ActionButton variant="outline" onClick={handleReopenClick} disabled={isProcessing}>
                  Reopen
                </ActionButton>
                <ActionButton tone="primary" onClick={openCloseModal} disabled={isProcessing}>
                  Pay Remaining Balance
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
          <EmptyState
            title="No tasks added yet"
            description="Create a task to start adding items and tracking work."
            action={
              isEditable ? (
                <ActionButton tone="primary" onClick={() => setIsAddTaskModalOpen(true)}>
                  <PlusIcon className="h-5 w-5" />
                  Create First Task
                </ActionButton>
              ) : undefined
            }
          />
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
                      <span className="text-sm font-semibold text-on-surface-variant">
                        Subtotal: {formatEgp(computeTicketTaskSubtotalDisplay(task.items, rates))}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {isEditable && (
                      <>
                        <div className="flex items-center rounded-xl border border-outline-variant/20 bg-surface p-1">
                          <ActionButton 
                            variant="ghost" 
                            size="sm" 
                            className="border-0 rounded-lg"
                            onClick={() => openCatalogPicker(task.id, "spare_parts")}
                            disabled={!canEditItems}
                          >
                            + Spare Part
                          </ActionButton>
                          <div className="w-px h-4 bg-outline-variant/20 mx-1" />
                          <ActionButton 
                            variant="ghost" 
                            size="sm" 
                            className="border-0 rounded-lg"
                            onClick={() => openCatalogPicker(task.id, "maintenance_parts")}
                            disabled={!canEditItems}
                          >
                            + Maint. Part
                          </ActionButton>
                          <div className="w-px h-4 bg-outline-variant/20 mx-1" />
                          <ActionButton 
                            variant="ghost" 
                            size="sm" 
                            className="border-0 rounded-lg"
                            onClick={() => openCatalogPicker(task.id, "products")}
                            disabled={!canEditItems}
                          >
                            + Product
                          </ActionButton>
                          <div className="w-px h-4 bg-outline-variant/20 mx-1" />
                          <ActionButton 
                            variant="ghost" 
                            size="sm" 
                            className="border-0 rounded-lg"
                            onClick={() => openCatalogPicker(task.id, "maintenance_services")}
                            disabled={!canEditItems}
                          >
                            + Service
                          </ActionButton>
                        </div>
                        <ActionButton 
                          variant="ghost" 
                          size="sm" 
                          tone={task.status === "completed" ? "danger" : "success"}
                          onClick={() => handleUpdateTaskStatus(task.id, task.status === "completed" ? "pending" : "completed")}
                          className="gap-1.5"
                        >
                          {task.status === "completed" ? (
                            <>
                              <ArrowPathIcon className="h-4 w-4" />
                              Reopen Task
                            </>
                          ) : (
                            <>
                              <CheckIcon className="h-4 w-4" />
                              Complete Task
                            </>
                          )}
                        </ActionButton>
                        <ActionButton 
                          variant="ghost" 
                          size="sm" 
                          tone="danger" 
                          onClick={() => setDeleteTaskId(task.id)}
                          className="gap-1.5"
                        >
                          <TrashIcon className="h-4 w-4" />
                          Delete
                        </ActionButton>
                      </>
                    )}
                    <button
                      onClick={() => toggleTaskExpanded(task.id)}
                      className="ml-2 p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
                    >
                      {expandedTasks[task.id] === false ? (
                        <ChevronDownIcon className="h-5 w-5" />
                      ) : (
                        <ChevronUpIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {expandedTasks[task.id] !== false && (
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
                            <td className="px-4 py-3 font-medium text-on-surface">{ticketItemTypeLabel(item)}</td>
                            <td className="px-4 py-3">
                              {formatEgp(
                                convertTicketLineAmount(item, item.price_snapshot, rates),
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {canEditItems ? (
                                <DebouncedQuantityInput
                                  initialQty={item.qty}
                                  disabled={isProcessing}
                                  onUpdate={(newQty) => {
                                    void handleUpdateItemQty(task.id, item, newQty);
                                  }}
                                />
                              ) : (
                                item.qty
                              )}
                            </td>
                          <td className="px-4 py-3">
                            {canEditLineDiscount ? (
                              <TicketLineItemDiscountCell
                                key={`${item.id}-${item.discount}-${pendingItemDiscountRequestByItemId[item.id] ?? 0}`}
                                item={item}
                                isAdmin={isAdminUser}
                                disabled={isProcessing}
                                ticketId={Number(id)}
                                taskId={task.id}
                                customerName={ticket.customer?.name ?? null}
                                rates={rates}
                                storedRequestId={
                                  pendingItemDiscountRequestByItemId[item.id]
                                }
                                onPersistPendingRequest={
                                  handlePersistPendingItemDiscountRequest
                                }
                                onClearStoredRequest={
                                  handleClearPendingItemDiscountRequest
                                }
                                onApply={(unitDiscount, approvalRequestId) =>
                                  handleUpdateItemDiscount(
                                    task.id,
                                    item,
                                    unitDiscount,
                                    approvalRequestId,
                                  )
                                }
                              />
                            ) : (
                              <span className="text-error">
                                -{formatEgp(
                                  convertTicketLineAmount(item, item.discount, rates),
                                )}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold">
                            {formatEgp(computeTicketLineSubtotalDisplay(item, rates))}
                          </td>
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
                )}
              </SurfaceCard>
            ))}
          </div>
        )}
      </div>

      <TicketOverallDiscountPanel
        ticket={ticket}
        items={allTicketItems}
        canEdit={canEditOverallDiscount}
        onTicketUpdated={(updated) => setTicket(updated)}
        onError={(message) => setError(message)}
      />

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

      {pickerCatalogType ? (
        <CatalogPickerModal
          isOpen
          onClose={closeCatalogPicker}
          catalogType={pickerCatalogType}
          onAddItems={(items) => {
            if (activeTaskId) {
              void handleAddItemsToTask(
                activeTaskId,
                pickerCatalogType,
                items as Array<SparePartRecord | MaintenanceServiceRecord | ProductRecord>,
              );
            }
          }}
        />
      ) : null}

      <PaymentCloseModal
        isOpen={isClosing}
        onClose={() => {
          setIsClosing(false);
          setCloseModalError("");
        }}
        total={displayTotals.total}
        paymentMethod={paymentMethod}
        amountPaid={amountPaidInput}
        adminPassword={paymentAdminPassword}
        onPaymentMethodChange={setPaymentMethod}
        onAmountPaidChange={setAmountPaidInput}
        onAdminPasswordChange={setPaymentAdminPassword}
        onConfirm={() => void handleCloseTicket()}
        isProcessing={isProcessing}
        error={closeModalError}
        mode="close"
        previouslyPaid={Number(ticket?.amount_paid || 0)}
        requiresAdminPassword={
          Number(ticket?.amount_paid || 0) > 0 &&
          (Number(amountPaidInput) < 0 ||
            paymentMethod !== ticket?.payment_method)
        }
      />

      <PaymentCloseModal
        isOpen={isRecordingPayment}
        onClose={() => {
          setIsRecordingPayment(false);
          setCloseModalError("");
        }}
        total={displayTotals.total}
        paymentMethod={paymentMethod}
        amountPaid={amountPaidInput}
        adminPassword={paymentAdminPassword}
        onPaymentMethodChange={setPaymentMethod}
        onAmountPaidChange={setAmountPaidInput}
        onAdminPasswordChange={setPaymentAdminPassword}
        onConfirm={() => void handleRecordPayment()}
        isProcessing={isProcessing}
        error={closeModalError}
        mode="record"
        previouslyPaid={Number(ticket?.amount_paid || 0)}
        requiresAdminPassword={
          Number(ticket?.amount_paid || 0) > 0 &&
          (Number(amountPaidInput) < 0 ||
            paymentMethod !== ticket?.payment_method)
        }
      />

      <AdminPasswordReopenModal
        isOpen={isReopenAuthOpen}
        onClose={() => {
          setIsReopenAuthOpen(false);
          setReopenPassword("");
          setReopenModalError("");
        }}
        ticketId={ticket.id}
        total={displayTotals.total}
        amountPaid={displayAmountPaid}
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
