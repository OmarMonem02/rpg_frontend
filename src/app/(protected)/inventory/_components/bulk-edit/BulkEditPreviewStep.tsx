"use client";

import Link from "next/link";
import {
  ActionButton,
  InlineMessage,
  SurfaceCard,
} from "@/components/ops-ui";
import type {
  BulkInventoryPreviewFieldKey,
  BulkInventoryPreviewRow,
  BulkInventoryPreviewValue,
} from "@/lib/crud-api";
import { itemStatusLabel } from "@/lib/inventory-item-attributes";
import { NUMERIC_BULK_EDIT_FIELDS } from "./types";

type BulkEditPreviewStepProps = {
  rows: BulkInventoryPreviewRow[];
  loading: boolean;
  applying: boolean;
  error: string | null;
  listHref: string;
  successUpdated?: number;
  onBack: () => void;
  onConfirm: () => void;
  onDone?: () => void;
};

const FIELD_LABELS: Record<string, string> = {
  sale_price: "Sale price",
  cost_price: "Cost price",
  stock_quantity: "Stock",
  low_stock_alarm: "Low stock alarm",
  item_status: "Item status",
  have_commission: "Commission",
  max_discount_type: "Discount type",
  max_discount_value: "Max discount",
  compatibility: "Compatibility",
  universal: "Compatibility",
  bike_blueprint_ids: "Compatibility",
};

const PREVIEW_FIELD_ORDER: BulkInventoryPreviewFieldKey[] = [
  "stock_quantity",
  "low_stock_alarm",
  "sale_price",
  "cost_price",
  "item_status",
  "have_commission",
  "max_discount_type",
  "max_discount_value",
  "compatibility",
];

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

function blueprintLabels(
  value: BulkInventoryPreviewValue | undefined,
): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  if (value.every((item) => typeof item === "string")) {
    return value;
  }
  return undefined;
}
function formatCompatibility(
  universal: boolean | undefined,
  labels: string[] | undefined,
): string {
  if (universal) return "Universal";
  if (labels && labels.length > 0) {
    return `Specific (${labels.join(", ")})`;
  }
  return "Specific (no blueprints)";
}

function formatDiscount(
  type: string | undefined,
  value: number | undefined,
): string {
  if (type === undefined || value === undefined) return "—";
  if (type === "percentage") return `${value}%`;
  return value.toFixed(2);
}

function formatValue(key: string, value: BulkInventoryPreviewValue | undefined): string {
  if (value === undefined) return "—";
  if (key === "sale_price" || key === "cost_price" || key === "max_discount_value") {
    return typeof value === "number" ? value.toFixed(2) : String(value);
  }
  if (key === "item_status" && typeof value === "string") {
    return itemStatusLabel(value);
  }
  if (key === "have_commission" && typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (key === "max_discount_type" && typeof value === "string") {
    return value === "percentage" ? "Percentage" : "Fixed amount";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return String(value);
}

function changeTone(
  key: string,
  before: BulkInventoryPreviewValue | undefined,
  after: BulkInventoryPreviewValue | undefined,
): string {
  if (typeof before !== "number" || typeof after !== "number") {
    return "text-on-surface";
  }
  if (after > before) return "text-primary";
  if (after < before) return "text-error";
  return "text-on-surface";
}

function displayFieldsForRow(row: BulkInventoryPreviewRow): BulkInventoryPreviewFieldKey[] {
  const raw = new Set(row.changed_fields);
  const fields: BulkInventoryPreviewFieldKey[] = [];

  const hasCompatibility =
    raw.has("compatibility") || raw.has("universal") || raw.has("bike_blueprint_ids");
  if (hasCompatibility) {
    fields.push("compatibility");
  }

  for (const key of PREVIEW_FIELD_ORDER) {
    if (key === "compatibility") continue;
    if (raw.has(key)) {
      fields.push(key);
    }
  }

  for (const key of raw) {
    if (!fields.includes(key) && key !== "universal" && key !== "bike_blueprint_ids" && key !== "bike_blueprint_labels") {
      fields.push(key);
    }
  }

  return fields;
}

function beforeAfterForField(
  row: BulkInventoryPreviewRow,
  field: BulkInventoryPreviewFieldKey,
): { before: string; after: string; tone: string } {
  if (field === "compatibility") {
    const before = formatCompatibility(
      typeof row.before.universal === "boolean" ? row.before.universal : undefined,
      blueprintLabels(row.before.bike_blueprint_labels),
    );
    const after = formatCompatibility(
      typeof row.after.universal === "boolean" ? row.after.universal : undefined,
      blueprintLabels(row.after.bike_blueprint_labels),
    );
    return { before, after, tone: "text-on-surface" };
  }

  if (field === "max_discount_value") {
    const before = formatDiscount(
      typeof row.before.max_discount_type === "string" ? row.before.max_discount_type : undefined,
      typeof row.before.max_discount_value === "number" ? row.before.max_discount_value : undefined,
    );
    const after = formatDiscount(
      typeof row.after.max_discount_type === "string" ? row.after.max_discount_type : undefined,
      typeof row.after.max_discount_value === "number" ? row.after.max_discount_value : undefined,
    );
    return { before, after, tone: "text-on-surface" };
  }

  if (field === "max_discount_type") {
    return {
      before: formatValue(field, row.before[field]),
      after: formatValue(field, row.after[field]),
      tone: "text-on-surface",
    };
  }

  const before = formatValue(field, row.before[field]);
  const after = formatValue(field, row.after[field]);
  const numericKey = NUMERIC_BULK_EDIT_FIELDS.some((f) => f.key === field);
  return {
    before,
    after,
    tone: numericKey ? changeTone(field, row.before[field], row.after[field]) : "text-on-surface",
  };
}

export function BulkEditPreviewStep({
  rows,
  loading,
  applying,
  error,
  listHref,
  successUpdated,
  onBack,
  onConfirm,
}: BulkEditPreviewStepProps) {
  if (successUpdated !== undefined) {
    return (
      <SurfaceCard className="animate-scale-in p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary-container">
          <svg
            className="h-7 w-7 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display text-xl font-bold text-on-surface">
          Bulk edit applied
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Updated <span className="mono-data font-medium text-on-surface">{successUpdated}</span>{" "}
          items successfully.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={listHref}>
            <ActionButton tone="primary">Back to list</ActionButton>
          </Link>
        </div>
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <SurfaceCard className="p-4">
        <p className="text-sm text-on-surface-variant">
          Review <span className="mono-data font-medium text-on-surface">{rows.length}</span>{" "}
          items with changes before applying. Each card shows old and new values per field.
        </p>
      </SurfaceCard>

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

      {loading ? (
        <SurfaceCard className="p-8 text-center text-on-surface-variant">
          Generating preview…
        </SurfaceCard>
      ) : rows.length === 0 ? (
        <SurfaceCard className="p-8 text-center text-on-surface-variant">
          No changes would be applied with the current configuration.
        </SurfaceCard>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const fields = displayFieldsForRow(row);
            return (
              <SurfaceCard key={row.id} className="p-4">
                <div className="mb-3 border-b border-outline-variant/15 pb-3">
                  <div className="font-medium text-on-surface">{row.name}</div>
                  <div className="mono-data text-xs text-on-surface-variant">
                    {row.sku} · {row.sale_currency}
                  </div>
                </div>
                <dl className="space-y-2">
                  {fields.map((field) => {
                    const { before, after, tone } = beforeAfterForField(row, field);
                    if (field === "max_discount_type" && fields.includes("max_discount_value")) {
                      return null;
                    }
                    return (
                      <div
                        key={`${row.id}-${field}`}
                        className="grid gap-2 text-sm sm:grid-cols-[minmax(8rem,11rem)_1fr_auto_1fr]"
                      >
                        <dt className="text-on-surface-variant">{fieldLabel(field)}</dt>
                        <dd className="mono-data text-on-surface-variant">{before}</dd>
                        <dd className="text-center text-on-surface-variant">→</dd>
                        <dd className={`mono-data font-medium ${tone}`}>{after}</dd>
                      </div>
                    );
                  })}
                </dl>
              </SurfaceCard>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-3">
        <ActionButton variant="ghost" onClick={onBack} disabled={applying}>
          Back
        </ActionButton>
        <ActionButton
          tone="primary"
          onClick={onConfirm}
          disabled={loading || applying || rows.length === 0}
        >
          {applying ? "Applying…" : "Confirm and apply"}
        </ActionButton>
      </div>
    </div>
  );
}
