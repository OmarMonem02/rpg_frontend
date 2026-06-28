import type { SaleRecord } from "@/lib/crud-api";
import type { ExchangeRates } from "@/lib/currencies";
import {
  computeTicketDisplayTotals,
  convertTicketDiscountForDisplay,
  convertTicketLineAmount,
} from "@/lib/ticket-display-pricing";
import { ticketItemName, type Ticket } from "@/lib/tickets-api";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank Transfer",
};

export function buildInvoiceFromTicket(
  ticketData: Ticket,
  rates: ExchangeRates,
  fallbackPaymentMethod = "cash",
): SaleRecord {
  const allItems = ticketData.tasks?.flatMap((task) => task.items ?? []) ?? [];
  const displayTotals = computeTicketDisplayTotals(ticketData, rates);

  const lineItems =
    ticketData.tasks?.flatMap(
      (task) =>
        task.items?.map((item) => ({
          id: item.id,
          sale_id: ticketData.id,
          sellable_type: (item.is_unstored
            ? "unstored"
            : item.spare_part_id
              ? "spare_parts"
              : item.maintenance_part_id
                ? "maintenance_parts"
                : item.product_id
                  ? "products"
                  : "maintenance_services") as
            | "spare_parts"
            | "maintenance_parts"
            | "products"
            | "maintenance_services"
            | "unstored",
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
          is_unstored: item.is_unstored,
          custom_description: item.custom_description,
          unstored_type: item.unstored_type,
        })) ?? [],
    ) ?? [];

  const invoicePaymentMethod =
    ticketData.payment_method || fallbackPaymentMethod;

  return {
    id: ticketData.id,
    customer_id: ticketData.customer_id,
    seller_id: 0,
    payment_method_id: 0,
    payment_method_name:
      PAYMENT_METHOD_LABELS[invoicePaymentMethod] || invoicePaymentMethod,
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
}
