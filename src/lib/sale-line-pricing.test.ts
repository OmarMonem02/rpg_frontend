import { describe, expect, it } from "vitest";
import { normalizeSaleLineItem } from "@/lib/api/sales";
import {
  computeSaleTotalsBreakdown,
  lineDiscountTotal,
  lineGrossAmount,
  lineNetAmount,
  lineNetAmountForQty,
  lineUnitDiscount,
  resolveDisplayTotal,
  resolveLineItemReturnStatus,
  saleHasReturns,
} from "@/lib/sale-line-pricing";

function lineItem(
  overrides: Partial<{
    selling_price: number;
    discount_amount: number;
    quantity: number;
    remaining_qty: number;
    returned_qty: number;
    status: "active" | "partially_returned" | "returned" | "exchanged";
  }> = {},
) {
  return {
    selling_price: 100,
    discount_amount: 0,
    quantity: 1,
    remaining_qty: 1,
    returned_qty: 0,
    status: "active" as const,
    ...overrides,
  };
}

describe("sale line pricing", () => {
  it("computes net amount for qty=1 with unit discount", () => {
    const item = lineItem({ discount_amount: 10, quantity: 1, remaining_qty: 1 });
    expect(lineUnitDiscount(item)).toBe(10);
    expect(lineGrossAmount(item)).toBe(100);
    expect(lineDiscountTotal(item)).toBe(10);
    expect(lineNetAmount(item)).toBe(90);
  });

  it("computes net amount for qty>1 with total line discount", () => {
    const item = lineItem({
      selling_price: 100,
      discount_amount: 30,
      quantity: 3,
      remaining_qty: 3,
    });

    expect(lineUnitDiscount(item)).toBe(10);
    expect(lineGrossAmount(item)).toBe(300);
    expect(lineDiscountTotal(item)).toBe(30);
    expect(lineNetAmount(item)).toBe(270);
  });

  it("prorates discount for partial returns", () => {
    const item = lineItem({
      selling_price: 100,
      discount_amount: 20,
      quantity: 4,
      remaining_qty: 2,
    });

    expect(lineDiscountTotal(item)).toBe(10);
    expect(lineNetAmount(item)).toBe(190);
    expect(lineNetAmountForQty(item, 2)).toBe(190);
  });

  it("returns zero amounts for fully returned lines", () => {
    const item = lineItem({
      discount_amount: 50,
      quantity: 2,
      remaining_qty: 0,
    });

    expect(lineGrossAmount(item)).toBe(0);
    expect(lineDiscountTotal(item)).toBe(0);
    expect(lineNetAmount(item)).toBe(0);
  });

  it("computes sale totals with shipping and promotional discount", () => {
    const breakdown = computeSaleTotalsBreakdown({
      line_items: [
        lineItem({
          selling_price: 100,
          discount_amount: 20,
          quantity: 2,
          remaining_qty: 2,
        }),
        lineItem({
          selling_price: 50,
          discount_amount: 0,
          quantity: 1,
          remaining_qty: 1,
        }),
      ],
      shipping_fee: 15,
      sale_discount: 25,
      total: 220,
    });

    expect(breakdown.grossSubtotal).toBe(250);
    expect(breakdown.lineDiscountTotal).toBe(20);
    expect(breakdown.netSubtotal).toBe(230);
    expect(breakdown.shipping).toBe(15);
    expect(breakdown.saleDiscount).toBe(25);
    expect(breakdown.total).toBe(220);
    expect(breakdown.units).toBe(3);
  });

  it("ignores fully returned lines in sale totals", () => {
    const breakdown = computeSaleTotalsBreakdown({
      line_items: [
        lineItem({
          selling_price: 100,
          discount_amount: 10,
          quantity: 1,
          remaining_qty: 0,
        }),
        lineItem({
          selling_price: 80,
          discount_amount: 0,
          quantity: 1,
          remaining_qty: 1,
        }),
      ],
      shipping_fee: 0,
      sale_discount: 0,
      total: 80,
    });

    expect(breakdown.grossSubtotal).toBe(80);
    expect(breakdown.netSubtotal).toBe(80);
    expect(breakdown.units).toBe(1);
  });
});

describe("normalizeSaleLineItem discount conversion", () => {
  it("converts API per-unit discount to total discount_amount", () => {
    const item = normalizeSaleLineItem({
      id: 1,
      sale_id: 10,
      selling_price: 100,
      discount: 10,
      qty: 3,
      returned_qty: 0,
      remaining_qty: 3,
      item_type: "product",
      product_id: 5,
    });

    expect(item.discount_amount).toBe(30);
    expect(item.quantity).toBe(3);
    expect(lineNetAmount(item)).toBe(270);
  });

  it("keeps explicit discount_amount when provided", () => {
    const item = normalizeSaleLineItem({
      id: 1,
      sale_id: 10,
      selling_price: 100,
      discount_amount: 45,
      discount: 10,
      qty: 3,
      returned_qty: 0,
      remaining_qty: 3,
      item_type: "product",
      product_id: 5,
    });

    expect(item.discount_amount).toBe(45);
  });

  it("maps line item status from API and qty fallbacks", () => {
    const exchanged = normalizeSaleLineItem({
      id: 2,
      sale_id: 10,
      selling_price: 100,
      discount: 0,
      qty: 1,
      returned_qty: 1,
      remaining_qty: 0,
      status: "exchanged",
      item_type: "product",
      product_id: 5,
    });

    expect(exchanged.status).toBe("exchanged");
    expect(resolveLineItemReturnStatus(exchanged)).toBe("exchanged");

    const partial = normalizeSaleLineItem({
      id: 3,
      sale_id: 10,
      selling_price: 100,
      discount: 0,
      qty: 4,
      returned_qty: 2,
      remaining_qty: 2,
      item_type: "product",
      product_id: 5,
    });

    expect(partial.status).toBe("partially_returned");
  });
});

describe("return status and display total helpers", () => {
  it("resolves return statuses from qty fields", () => {
    expect(
      resolveLineItemReturnStatus({
        status: undefined,
        quantity: 2,
        returned_qty: 2,
        remaining_qty: 0,
      }),
    ).toBe("returned");

    expect(
      resolveLineItemReturnStatus({
        status: undefined,
        quantity: 4,
        returned_qty: 1,
        remaining_qty: 3,
      }),
    ).toBe("partially_returned");
  });

  it("prefers computed total when API total is stale", () => {
    const sale = {
      line_items: [
        lineItem({
          selling_price: 200,
          quantity: 3,
          remaining_qty: 1,
        }),
      ],
      shipping_fee: 0,
      sale_discount: 0,
      total: 600,
    };

    expect(resolveDisplayTotal(sale)).toBe(200);
    expect(saleHasReturns(sale)).toBe(false);
  });

  it("detects sales with returns", () => {
    expect(
      saleHasReturns({
        line_items: [
          lineItem({ returned_qty: 1, remaining_qty: 0, quantity: 1 }),
        ],
      }),
    ).toBe(true);
  });
});
