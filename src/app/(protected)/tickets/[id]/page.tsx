"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import {
  PageShell,
  PageHero,
  ActionButton,
  DataTableCard,
  StatusBadge,
  SurfaceCard,
  InputGroup,
} from "@/components/ops-ui";
import { InvoiceTemplate } from "@/components/invoice-template";
import { ticketsApi, type Ticket, type TicketTask, type TicketItem } from "@/lib/tickets-api";
import { type SaleRecord } from "@/lib/crud-api";
import { CatalogPickerModal } from "@/components/catalog-picker-modal";

export default function TicketDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const permissions = usePermissions();
  const canViewCustomerWorkspace =
    permissions.canReadPage("sales") ||
    permissions.canReadPage("maintenance");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Task Management State
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");

  // Item Management State
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [itemType, setItemType] = useState<"spare_parts" | "maintenance_services">("spare_parts");

  // Close ticket payment state
  const [isClosing, setIsClosing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isExportingInvoice, setIsExportingInvoice] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ticketsApi.getTicket(Number(id));
      setTicket(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleUpdateStatus = async (action: "start" | "end" | "reopen" | "close") => {
    try {
      setIsProcessing(true);
      if (action === "start") {
        // Prompt doesn't have a direct 'start' endpoint in the reference but it says PATCH status
        // or we can just use the PATCH status endpoint if available.
        // The API reference says PATCH /api/tickets/{ticketId}/status
        // But the ticketsApi object has endTicket, reopenTicket, closeTicket.
        // Let's assume start = reopen or we add a start method.
        // Actually, let's use PATCH status for generic updates if we have it.
        // Wait, the prompt says POST /api/tickets/{ticketId}/reopen Sets status to in_progress.
        // So 'start' is basically the same as 'reopen' if we are moving from pending to in_progress.
        await ticketsApi.reopenTicket(Number(id));
      } else if (action === "end") {
        await ticketsApi.endTicket(Number(id));
      } else if (action === "reopen") {
        await ticketsApi.reopenTicket(Number(id));
      } else if (action === "close") {
        await ticketsApi.closeTicket(Number(id), { payment_method: paymentMethod, amount_paid: ticket?.total || 0 });
        setIsClosing(false);
      }
      await fetchTicket();
      if (action === "close") {
        setIsInvoiceOpen(true);
      }
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

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("Are you sure you want to delete this task? All items within it will be removed.")) return;
    try {
      setIsProcessing(true);
      await ticketsApi.deleteTask(Number(id), taskId);
      await fetchTicket();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddItemToTask = async (taskId: number, item: any) => {
    if (!canEditItems) {
      setError("Start work before adding parts or services to this ticket.");
      return;
    }

    try {
      setIsProcessing(true);
      const isPart = itemType === "spare_parts";
      await ticketsApi.addItemToTask(Number(id), taskId, {
        spare_part_id: isPart ? item.id : undefined,
        maintenance_service_id: !isPart ? item.id : undefined,
        price_snapshot: item.price || 0,
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
        item_label: item.item_name ?? (item.spare_part_id ? "Spare Part" : "Maintenance Service"),
        item_name: item.item_name ?? (item.spare_part_id ? "Spare Part" : "Maintenance Service"),
      })) ?? [],
    ) ?? [];

    const paymentMethodLabels: Record<string, string> = {
      cash: "Cash",
      card: "Card",
      bank_transfer: "Bank Transfer",
    };

    return {
      id: ticketData.id,
      customer_id: ticketData.customer_id,
      seller_id: 0,
      payment_method_id: 0,
      payment_method_name: paymentMethodLabels[paymentMethod] || paymentMethod,
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
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      // Fallback if popup blocker is enabled
      window.print();
      return;
    }

    // Get all stylesheets and style tags to ensure exact same styling
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => node.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${ticketInvoice?.id || id}</title>
          ${styles}
          <style>
            @media print {
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                background-color: white !important;
              }
              @page {
                size: A4;
                margin: 0;
              }
            }
          </style>
        </head>
        <body class="bg-white m-0 p-0">
          <div class="pdf-export w-full flex justify-center">
            ${invoiceElement.innerHTML}
          </div>
          <script>
            // Wait a brief moment for styles to apply before printing
            setTimeout(() => {
              window.focus();
              window.print();
              // Optional: close window after print dialog closes
              // window.close(); 
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportInvoicePDF = async () => {
    if (!ticketInvoice) return;

    try {
      setIsExportingInvoice(true);
      const invoiceElement = document.getElementById("invoice-export-root");
      if (!invoiceElement) throw new Error("Invoice element not found");

      invoiceElement.classList.add("pdf-export");
      const { default: html2canvas } = await import("html2canvas");
      const jspdfModule = await import("jspdf");
      const JsPDF = jspdfModule.jsPDF || (jspdfModule as any).default;

      const canvas = await html2canvas(invoiceElement, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      invoiceElement.classList.remove("pdf-export");

      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `Invoice-Ticket-${ticketInvoice.id}-${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
    } catch (err: any) {
      console.error("PDF Export Error:", err);
      alert(err.message || "Failed to export invoice PDF");
      setError(err instanceof Error ? err.message : "Failed to export invoice PDF");
    } finally {
      const invoiceElement = document.getElementById("invoice-export-root");
      if (invoiceElement) invoiceElement.classList.remove("pdf-export");
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
            We couldn't find a maintenance ticket with ID <strong>#{id}</strong>. 
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
  const canEditItems = ticket.status === "in_progress";

  return (
    <PageShell>
      <PageHero
        eyebrow="Ticket Management"
        title={`Ticket #${ticket.id} ${ticket.notes}?${ticket.notes}:"" `}
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
                <ActionButton variant="outline" onClick={() => handleUpdateStatus("reopen")} disabled={isProcessing}>
                  Reopen
                </ActionButton>
                <ActionButton tone="primary" onClick={() => setIsClosing(true)} disabled={isProcessing}>
                  Close & Pay
                </ActionButton>
              </>
            )}
          </div>
        }
      />

      {error && <div className="rounded-xl bg-error/10 p-4 text-error mb-6 animate-in fade-in slide-in-from-top-2">{error}</div>}

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-on-surface">Maintenance Tasks</h2>
          {isEditable && (
            <ActionButton tone="primary" onClick={() => setIsAddTaskModalOpen(true)}>
              + Add High-Level Task
            </ActionButton>
          )}
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
                        <ActionButton variant="ghost" size="sm" tone="danger" onClick={() => handleDeleteTask(task.id)}>
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
                          <td className="px-4 py-3 font-medium text-on-surface">{item.item_name || (item.spare_part_id ? "Spare Part" : "Service")}</td>
                          <td className="px-4 py-3">${Number(item.price_snapshot).toFixed(2)}</td>
                          <td className="px-4 py-3">{item.qty}</td>
                          <td className="px-4 py-3 text-error">-${Number(item.discount).toFixed(2)}</td>
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

      {/* Add Task Modal */}
      {isAddTaskModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[2.5rem] bg-surface p-8 shadow-2xl border border-outline-variant/20 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-on-surface mb-6">New Maintenance Task</h3>
            <InputGroup label="Task Name (e.g. Engine Repair, Periodic Service)">
              <input
                autoFocus
                className="w-full rounded-2xl border border-outline-variant/30 bg-surface px-5 py-3 outline-none focus:border-primary transition-all shadow-inner"
                placeholder="Enter task name..."
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
              />
            </InputGroup>
            <div className="flex justify-end gap-3 mt-8">
              <ActionButton variant="ghost" onClick={() => setIsAddTaskModalOpen(false)}>Cancel</ActionButton>
              <ActionButton tone="primary" onClick={handleAddTask} disabled={!newTaskName.trim() || isProcessing}>
                Create Task
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Item Picker */}
      <CatalogPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        catalogType={itemType}
        onAddItems={(items) => {
          if (items.length > 0 && activeTaskId) {
            handleAddItemToTask(activeTaskId, items[0]);
          }
          setIsPickerOpen(false);
        }}
      />

      {/* Payment Modal */}
      {isClosing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-[2.5rem] bg-surface p-8 shadow-2xl border border-outline-variant/20">
            <h3 className="text-2xl font-bold text-on-surface mb-4">Process Payment</h3>
            <div className="mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-sm text-on-surface-variant">Total Amount Due</p>
              <p className="text-3xl font-black text-primary">${Number(ticket.total || 0).toFixed(2)}</p>
            </div>
            
            <InputGroup label="Payment Method" className="mb-8">
              <select 
                className="w-full rounded-2xl border border-outline-variant/30 bg-surface px-5 py-3 outline-none focus:border-primary transition-all"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </InputGroup>

            <div className="flex flex-col gap-2">
              <ActionButton tone="success" className="w-full py-4 text-lg" onClick={() => handleUpdateStatus("close")} disabled={isProcessing}>
                Confirm & Close Ticket
              </ActionButton>
              <ActionButton variant="ghost" className="w-full" onClick={() => setIsClosing(false)}>Cancel</ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {isInvoiceOpen && ticketInvoice && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-auto bg-black/60 p-6 backdrop-blur-md">
          <div className="w-full max-w-5xl rounded-[2.5rem] bg-surface p-6 shadow-2xl border border-outline-variant/20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-on-surface">Ticket Invoice</h3>
                <p className="text-on-surface-variant">Invoice generated from ticket #{ticket.id}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ActionButton tone="primary" onClick={handlePrintInvoice}>
                  Print Invoice
                </ActionButton>
                <ActionButton tone="default" onClick={handleExportInvoicePDF} disabled={isExportingInvoice}>
                  {isExportingInvoice ? "Exporting..." : "Export PDF"}
                </ActionButton>
                <ActionButton variant="ghost" onClick={() => setIsInvoiceOpen(false)}>
                  Close
                </ActionButton>
              </div>
            </div>
            <div className="overflow-hidden rounded-[2rem] border border-outline-variant/10 bg-white">
              <div id="invoice-export-root">
                <InvoiceTemplate sale={ticketInvoice} />
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
