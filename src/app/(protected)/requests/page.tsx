"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  approveApprovalRequest,
  getApprovalRequest,
  getPendingApprovalRequestCount,
  listApprovalRequests,
  rejectApprovalRequest,
  type ApprovalRequestRecord,
  type ApprovalRequestStatus,
} from "@/lib/api/approval-requests";
import { ApiError } from "@/lib/auth-api";
import { getAuthToken } from "@/lib/auth-session";
import {
  resolveDiscountAmount,
  type DiscountInputType,
} from "@/lib/discount-input";
import {
  formatScopeLabel,
  resolveScopeFromApprovalContext,
  type DiscountScopeCategory,
  type DiscountScopeContext,
} from "@/lib/discount-scope";
import {
  ActionButton,
  ConfirmDialog,
  DataTableCard,
  EmptyState,
  InlineMessage,
  InputGroup,
  PageHero,
  PageShell,
  PaginationControls,
  SectionHeading,
  SurfaceCard,
} from "@/components/ops-ui";
import {
  ArrowPathIcon,
  CheckIcon,
  ClockIcon,
  ReceiptPercentIcon,
  UserCircleIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type StatusMeta = {
  label: string;
  dot: string;
  chip: string;
};

const STATUS_META: Record<ApprovalRequestStatus, StatusMeta> = {
  pending: {
    label: "Pending",
    dot: "bg-warning",
    chip: "border-warning/25 bg-warning/10 text-on-warning-container",
  },
  approved: {
    label: "Approved",
    dot: "bg-success",
    chip: "border-success/25 bg-success/10 text-on-success-container",
  },
  consumed: {
    label: "Consumed",
    dot: "bg-consumed",
    chip: "border-consumed/30 bg-consumed-container text-on-consumed-container",
  },
  rejected: {
    label: "Rejected",
    dot: "bg-error",
    chip: "border-error/25 bg-error/10 text-error",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-outline-variant",
    chip: "border-outline-variant/25 bg-surface-container text-on-surface-variant",
  },
};

const STATUS_FILTERS: { value: ApprovalRequestStatus | ""; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "consumed", label: "Consumed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "", label: "All" },
];

function formatMoney(amount: number) {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2 });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function discountIntensity(amount: number, subtotal: number) {
  if (subtotal <= 0) return 0;
  return Math.min(100, Math.round((amount / subtotal) * 1000) / 10);
}

function isItemDiscountRequest(type: string) {
  return type === "sale_item_discount" || type === "ticket_item_discount";
}

function requestTypeLabel(type: string) {
  if (type === "sale_discount") return "Sale discount";
  if (type === "ticket_discount") return "Ticket discount";
  if (type === "sale_item_discount") return "Sale item discount";
  if (type === "ticket_item_discount") return "Ticket item discount";
  return type;
}

function formatItemContextMarginHints(
  request: ApprovalRequestRecord,
): string[] {
  const ctx = request.payload.item_context;
  if (!ctx) return [];

  const hints: string[] = [];
  const maxValue = Number(ctx.catalog_max_discount_value) || 0;

  if (maxValue > 0) {
    hints.push(
      ctx.catalog_max_discount_type === "percentage"
        ? `Catalog max discount: ${maxValue}%`
        : `Catalog max discount: ${formatMoney(maxValue)} EGP`,
    );
  }

  const costPrice = ctx.cost_price != null ? Number(ctx.cost_price) : 0;
  const unitPrice = Number(ctx.unit_price) || 0;
  if (costPrice > 0 && unitPrice > 0) {
    const marginAmount = unitPrice - costPrice;
    const marginPercent = (marginAmount / unitPrice) * 100;
    hints.push(
      `Profit margin: ${formatMoney(marginAmount)} EGP (${marginPercent.toFixed(1)}%)`,
    );
  }

  return hints;
}

function requestCustomerName(request: ApprovalRequestRecord) {
  return (
    request.payload.ticket_context?.customer_name ??
    request.payload.sale_context?.customer_name ??
    "—"
  );
}

function requestCurrencySuffix(_request: ApprovalRequestRecord) {
  return "EGP";
}

function requestPresentCategories(
  request: ApprovalRequestRecord,
): DiscountScopeCategory[] {
  const context: DiscountScopeContext =
    request.type === "ticket_discount" ? "ticket" : "sale";
  const present = new Set<DiscountScopeCategory>();

  for (const item of request.payload.cart_items) {
    const sellableType = item.sellable_type as DiscountScopeCategory;
    if (
      sellableType === "spare_parts" ||
      sellableType === "products" ||
      sellableType === "maintenance_services" ||
      sellableType === "bikes"
    ) {
      present.add(sellableType);
    }
  }

  const ordered =
    context === "ticket"
      ? (["spare_parts", "products", "maintenance_services"] as const)
      : (["spare_parts", "products", "maintenance_services", "bikes"] as const);

  return ordered.filter((category) => present.has(category));
}

function requestDiscountScopeLabel(request: ApprovalRequestRecord) {
  if (isItemDiscountRequest(request.type)) {
    return request.payload.item_context?.item_name ?? "Line item";
  }

  const presentCategories = requestPresentCategories(request);
  const scope = resolveScopeFromApprovalContext(
    request.payload.ticket_context?.discount_scope ??
      request.payload.sale_context?.discount_scope,
    request.payload.ticket_context?.discount_includes_maintenance ??
      request.payload.sale_context?.discount_includes_maintenance,
    presentCategories,
  );
  return formatScopeLabel(scope, presentCategories);
}

function requestFullCartSubtotal(request: ApprovalRequestRecord) {
  return (
    request.payload.ticket_context?.full_cart_subtotal ??
    request.payload.sale_context?.full_cart_subtotal ??
    null
  );
}

function StatusChip({
  status,
  className = "",
}: {
  status: ApprovalRequestStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.chip} ${className}`.trim()}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden />
      {meta.label}
    </span>
  );
}

function QueueSkeleton() {
  return (
    <DataTableCard>
      <div className="divide-y divide-outline-variant/15">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="h-4 w-32 animate-pulse rounded-full bg-surface-container-high" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-surface-container-high" />
            </div>
            <div className="h-3 w-48 animate-pulse rounded-full bg-surface-container-high/70" />
            <div className="flex gap-3">
              <div className="h-6 w-28 animate-pulse rounded-lg bg-surface-container-high/70" />
              <div className="h-6 w-28 animate-pulse rounded-lg bg-surface-container-high/70" />
            </div>
          </div>
        ))}
      </div>
    </DataTableCard>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-2xl bg-surface-container-high/60"
          />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-2xl bg-surface-container-high/60" />
    </div>
  );
}

function DetailStat({
  label,
  children,
  hint,
  tone = "default",
}: {
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "discount";
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        tone === "discount"
          ? "border-discount-emphasis/20 bg-discount-container/50"
          : "border-outline-variant/20 bg-surface-container-low"
      }`}
    >
      <p className="label-caps text-on-surface-variant">{label}</p>
      <div className="mt-1.5 font-semibold text-on-surface">{children}</div>
      {hint ? (
        <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>
      ) : null}
    </div>
  );
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<ApprovalRequestRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] =
    useState<ApprovalRequestRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApprovalRequestStatus | "">(
    "pending",
  );
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approveDraft, setApproveDraft] = useState(0);
  const [approveDraftType, setApproveDraftType] =
    useState<DiscountInputType>("fixed");
  const [confirmAction, setConfirmAction] = useState<
    "approve" | "reject" | null
  >(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const [result, count] = await Promise.all([
        listApprovalRequests(token, {
          status: statusFilter || undefined,
          page: currentPage,
          per_page: 20,
        }),
        getPendingApprovalRequestCount(token).catch(() => null),
      ]);

      setRequests(result.items);
      setLastPage(result.lastPage);
      if (count != null) setPendingCount(count);

      if (result.items.length === 0) {
        setSelectedId(null);
        setSelectedRequest(null);
      } else {
        setSelectedId((current) => {
          if (
            current != null &&
            result.items.some((item) => item.id === current)
          ) {
            return current;
          }
          return result.items[0].id;
        });
      }
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to load requests.",
      );
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  const loadSelectedRequest = useCallback(async (id: number) => {
    try {
      setDetailLoading(true);
      setActionError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const record = await getApprovalRequest(token, id);
      setSelectedRequest(record);
      setApproveDraft(record.discount_input_value);
      setApproveDraftType(record.discount_input_type);
      setRejectionReason("");
    } catch (err) {
      setActionError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to load request details.",
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    setRequests([]);
    setSelectedId(null);
    setSelectedRequest(null);
  }, [statusFilter, currentPage]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (selectedId == null) {
      setSelectedRequest(null);
      return;
    }
    void loadSelectedRequest(selectedId);
  }, [selectedId, loadSelectedRequest]);

  const resolvedApproveAmount = useMemo(() => {
    if (!selectedRequest) return 0;
    return resolveDiscountAmount(
      approveDraftType,
      approveDraft,
      selectedRequest.cart_subtotal,
    );
  }, [approveDraft, approveDraftType, selectedRequest]);

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      setActionError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      await approveApprovalRequest(token, selectedRequest.id, {
        approved_discount_amount: resolvedApproveAmount,
        approved_discount_input_type: approveDraftType,
        approved_discount_input_value: approveDraft,
      });

      setConfirmAction(null);
      await loadRequests();
      await loadSelectedRequest(selectedRequest.id);
    } catch (err) {
      setActionError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to approve request.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      setActionError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      await rejectApprovalRequest(
        token,
        selectedRequest.id,
        rejectionReason.trim() || undefined,
      );

      setConfirmAction(null);
      await loadRequests();
      await loadSelectedRequest(selectedRequest.id);
    } catch (err) {
      setActionError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to reject request.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const queueSummary = useMemo(() => {
    const totalRequested = requests.reduce(
      (sum, request) => sum + request.requested_discount_amount,
      0,
    );
    return { count: requests.length, totalRequested };
  }, [requests]);

  return (
    <PageShell>
      <PageHero
        eyebrow="Approvals"
        title="Requests"
        subtitle="Review and action staff approval requests. More request types can be added here over time."
        meta={
          <div className="flex items-center gap-3 rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15 text-on-warning-container">
              <ClockIcon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="mono-data text-2xl font-bold leading-none text-on-surface">
                {pendingCount ?? "—"}
              </p>
              <p className="label-caps mt-1 text-on-surface-variant">
                Awaiting review
              </p>
            </div>
          </div>
        }
        actions={
          <ActionButton
            type="button"
            variant="outline"
            onClick={() => void loadRequests()}
            disabled={loading}
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden
            />
            Refresh
          </ActionButton>
        }
      />

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

      <div
        role="tablist"
        aria-label="Filter requests by status"
        className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-2xl border border-outline-variant/12 bg-surface/95 p-1.5 backdrop-blur-sm"
      >
        {STATUS_FILTERS.map((option) => {
          const active = statusFilter === option.value;
          const showCount = option.value === "pending" && pendingCount != null;
          return (
            <button
              key={option.label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setStatusFilter(option.value);
                setCurrentPage(1);
              }}
              className={`flex flex-none items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              {option.label}
              {showCount ? (
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                    active
                      ? "bg-on-primary/20 text-on-primary"
                      : "bg-warning/15 text-on-warning-container"
                  }`}
                >
                  {pendingCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] xl:items-start">
        <div className="space-y-4">
          <SectionHeading
            title="Request queue"
            description="Select a request to review cart details and take action."
            actions={
              !loading && requests.length > 0 ? (
                <span className="form-chip">
                  {queueSummary.count} shown ·{" "}
                  {formatMoney(queueSummary.totalRequested)} EGP requested
                </span>
              ) : undefined
            }
          />

          {loading && requests.length === 0 ? (
            <QueueSkeleton />
          ) : requests.length === 0 ? (
            <EmptyState
              title="No requests found"
              description="Pending sale discount requests from staff will appear here."
            />
          ) : (
            <DataTableCard>
              <div className="tracking-stagger divide-y divide-outline-variant/15">
                {requests.map((request) => {
                  const active = request.id === selectedId;
                  const intensity = discountIntensity(
                    request.requested_discount_amount,
                    request.cart_subtotal,
                  );
                  return (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => setSelectedId(request.id)}
                      aria-current={active}
                      className={`relative block w-full px-4 py-4 pl-5 text-left transition-colors ${
                        active
                          ? "bg-surface-selected"
                          : "hover:bg-surface-container-low"
                      }`}
                    >
                      <span
                        className={`absolute inset-y-3 left-0 w-1 rounded-full transition-colors ${
                          active ? "bg-primary" : "bg-transparent"
                        }`}
                        aria-hidden
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-on-surface">
                            {requestTypeLabel(request.type)}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-on-surface-variant">
                            <UserCircleIcon
                              className="h-4 w-4 flex-none"
                              aria-hidden
                            />
                            <span className="truncate">
                              {request.requester?.name ?? "Unknown staff"}
                            </span>
                            <span aria-hidden>·</span>
                            <span className="flex-none">
                              {formatDate(request.created_at)}
                            </span>
                          </p>
                          <p className="mt-0.5 truncate text-sm text-on-surface-variant">
                            Customer: {requestCustomerName(request)}
                            {(request.type === "ticket_discount" ||
                              request.type === "ticket_item_discount") &&
                            request.payload.ticket_context?.ticket_id
                              ? ` · Ticket #${request.payload.ticket_context.ticket_id}`
                              : ""}
                          </p>
                        </div>
                        <StatusChip status={request.status} />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="text-on-surface-variant">
                          {isItemDiscountRequest(request.type)
                            ? "Line subtotal"
                            : "Subtotal"}{" "}
                          <strong className="mono-data text-on-surface">
                            {formatMoney(request.cart_subtotal)}{" "}
                            {requestCurrencySuffix(request)}
                          </strong>
                        </span>
                        <span className="text-on-surface-variant">
                          Requested{" "}
                          <strong className="mono-data text-discount-emphasis">
                            −{formatMoney(request.requested_discount_amount)}{" "}
                            {requestCurrencySuffix(request)}
                          </strong>
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                          <div
                            className="h-full rounded-full bg-discount-emphasis/70"
                            style={{ width: `${intensity}%` }}
                          />
                        </div>
                        <span className="mono-data text-xs font-semibold text-on-surface-variant">
                          {intensity}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </DataTableCard>
          )}

          <PaginationControls
            page={currentPage}
            totalPages={lastPage}
            onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
            onNext={() =>
              setCurrentPage((page) => Math.min(lastPage, page + 1))
            }
            onPageChange={setCurrentPage}
          />
        </div>

        <SurfaceCard className="xl:sticky xl:top-4">
          <SectionHeading
            title="Request details"
            description="Review cart items and approve, edit, or reject the discount."
            actions={
              selectedRequest && !detailLoading ? (
                <StatusChip status={selectedRequest.status} />
              ) : undefined
            }
          />

          {selectedId == null ? (
            <EmptyState
              title="No request selected"
              description="Choose a request from the queue to review it."
            />
          ) : !selectedRequest || selectedRequest.id !== selectedId ? (
            <DetailSkeleton />
          ) : (
            <div className="animate-fade-in space-y-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailStat label="Requester">
                  {selectedRequest.requester?.name ?? "—"}
                </DetailStat>
                <DetailStat label="Customer">
                  {requestCustomerName(selectedRequest)}
                </DetailStat>
                {selectedRequest.type === "ticket_discount" ||
                selectedRequest.type === "ticket_item_discount" ? (
                  <DetailStat label="Ticket">
                    {selectedRequest.payload.ticket_context?.ticket_id
                      ? `#${selectedRequest.payload.ticket_context.ticket_id}`
                      : "—"}
                  </DetailStat>
                ) : null}
                <DetailStat
                  label={
                    isItemDiscountRequest(selectedRequest.type)
                      ? "Line item"
                      : "Discount scope"
                  }
                >
                  {requestDiscountScopeLabel(selectedRequest)}
                </DetailStat>
                <DetailStat
                  label={
                    isItemDiscountRequest(selectedRequest.type)
                      ? "Line subtotal"
                      : "Discount base subtotal"
                  }
                  hint={
                    requestFullCartSubtotal(selectedRequest) != null &&
                    requestFullCartSubtotal(selectedRequest) !==
                      selectedRequest.cart_subtotal
                      ? `Full cart subtotal: ${formatMoney(
                          requestFullCartSubtotal(selectedRequest) ?? 0,
                        )} ${requestCurrencySuffix(selectedRequest)}`
                      : undefined
                  }
                >
                  <span className="mono-data">
                    {formatMoney(selectedRequest.cart_subtotal)}{" "}
                    {requestCurrencySuffix(selectedRequest)}
                  </span>
                </DetailStat>
              </div>

              <div className="rounded-2xl border border-discount-emphasis/20 bg-discount-container/50 p-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="label-caps text-on-surface-variant">
                      Requested discount
                    </p>
                    <p className="mono-data mt-1 text-2xl font-bold text-discount-emphasis">
                      −{formatMoney(selectedRequest.requested_discount_amount)}{" "}
                      {requestCurrencySuffix(selectedRequest)}
                    </p>
                  </div>
                  <span className="mono-data text-sm font-semibold text-discount-emphasis">
                    {discountIntensity(
                      selectedRequest.requested_discount_amount,
                      selectedRequest.cart_subtotal,
                    )}
                    % of subtotal
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-lowest">
                  <div
                    className="h-full rounded-full bg-discount-emphasis"
                    style={{
                      width: `${discountIntensity(
                        selectedRequest.requested_discount_amount,
                        selectedRequest.cart_subtotal,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {formatItemContextMarginHints(selectedRequest).length > 0 ? (
                <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4">
                  <p className="label-caps text-on-surface-variant">
                    Item margin context
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-on-surface">
                    {formatItemContextMarginHints(selectedRequest).map((hint) => (
                      <li key={hint}>{hint}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <p className="mb-3 label-caps text-on-surface-variant">
                  {isItemDiscountRequest(selectedRequest.type)
                    ? "Line item"
                    : "Cart items"}
                </p>
                <div className="overflow-x-auto rounded-2xl border border-outline-variant/20">
                  <table className="min-w-full text-sm">
                    <thead className="bg-surface-container-low text-left label-caps text-on-surface-variant">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Qty</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">Line discount</th>
                        <th className="px-4 py-3 text-right">Line total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {selectedRequest.payload.cart_items.map((item, index) => (
                        <tr
                          key={`${item.sellable_type}-${item.sellable_id}-${index}`}
                          className="transition-colors hover:bg-surface-container-low/60"
                        >
                          <td className="px-4 py-3 font-medium text-on-surface">
                            {item.item_name}
                            {item.sellable_type === "maintenance_services" ? (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-on-warning-container">
                                <WrenchScrewdriverIcon
                                  className="h-3 w-3"
                                  aria-hidden
                                />
                                Maintenance
                              </span>
                            ) : null}
                          </td>
                          <td className="mono-data px-4 py-3">
                            {item.quantity}
                          </td>
                          <td className="mono-data px-4 py-3">
                            {formatMoney(item.selling_price)} {item.currency}
                          </td>
                          <td className="mono-data px-4 py-3">
                            {formatMoney(item.discount_amount)} {item.currency}
                          </td>
                          <td className="mono-data px-4 py-3 text-right font-medium">
                            {formatMoney(item.line_total)} {item.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedRequest.status === "pending" ? (
                <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <p className="flex items-center gap-2 font-semibold text-on-surface">
                    <ReceiptPercentIcon
                      className="h-5 w-5 text-primary"
                      aria-hidden
                    />
                    Admin decision
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InputGroup label="Discount type">
                      <div className="flex gap-1.5 rounded-xl border border-outline-variant/25 bg-surface p-1">
                        {(["fixed", "percentage"] as DiscountInputType[]).map(
                          (type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setApproveDraftType(type)}
                              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                                approveDraftType === type
                                  ? "bg-primary text-on-primary shadow-sm"
                                  : "text-on-surface-variant hover:bg-surface-container"
                              }`}
                            >
                              {type === "fixed"
                                ? `Fixed (${requestCurrencySuffix(selectedRequest)})`
                                : "Percentage (%)"}
                            </button>
                          ),
                        )}
                      </div>
                    </InputGroup>
                    <InputGroup label="Discount value">
                      <input
                        type="number"
                        onWheel={(event) => {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }}
                        min={0}
                        step="0.01"
                        value={approveDraft}
                        onChange={(event) =>
                          setApproveDraft(Number(event.target.value) || 0)
                        }
                        className="form-input-base mono-data [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </InputGroup>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3">
                    <span className="text-sm text-on-surface-variant">
                      Resolved approval amount
                    </span>
                    <strong className="mono-data text-lg font-bold text-discount-emphasis">
                      −{formatMoney(resolvedApproveAmount)}{" "}
                      {requestCurrencySuffix(selectedRequest)}
                    </strong>
                  </div>

                  <InputGroup label="Rejection reason (optional)">
                    <textarea
                      value={rejectionReason}
                      onChange={(event) =>
                        setRejectionReason(event.target.value)
                      }
                      rows={3}
                      className="form-input-base"
                      placeholder="Explain why this discount was rejected"
                    />
                  </InputGroup>

                  {actionError ? (
                    <InlineMessage tone="danger">{actionError}</InlineMessage>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <ActionButton
                      type="button"
                      tone="primary"
                      onClick={() => setConfirmAction("approve")}
                      disabled={processing || resolvedApproveAmount <= 0}
                    >
                      <CheckIcon className="h-4 w-4" aria-hidden />
                      Approve
                    </ActionButton>
                    <ActionButton
                      type="button"
                      tone="danger"
                      variant="outline"
                      onClick={() => setConfirmAction("reject")}
                      disabled={processing}
                    >
                      <XMarkIcon className="h-4 w-4" aria-hidden />
                      Reject
                    </ActionButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 text-sm">
                  {selectedRequest.approved_discount_amount != null ? (
                    <p className="flex items-center justify-between gap-3">
                      <span className="text-on-surface-variant">
                        Approved discount
                      </span>
                      <strong className="mono-data text-discount-emphasis">
                        −{formatMoney(selectedRequest.approved_discount_amount)}{" "}
                        {requestCurrencySuffix(selectedRequest)}
                      </strong>
                    </p>
                  ) : null}
                  {selectedRequest.rejection_reason ? (
                    <p className="text-on-surface-variant">
                      <span className="label-caps mb-1 block">
                        Rejection reason
                      </span>
                      {selectedRequest.rejection_reason}
                    </p>
                  ) : null}
                  {selectedRequest.reviewer ? (
                    <p className="border-t border-outline-variant/15 pt-2 text-on-surface-variant">
                      Reviewed by{" "}
                      <strong className="text-on-surface">
                        {selectedRequest.reviewer.name}
                      </strong>{" "}
                      on {formatDate(selectedRequest.reviewed_at)}
                    </p>
                  ) : null}
                  {selectedRequest.status === "consumed" &&
                  selectedRequest.consumed_sale_id != null ? (
                    <p className="border-t border-outline-variant/15 pt-2 text-on-surface-variant">
                      Consumed by sale{" "}
                      <strong className="mono-data text-on-surface">
                        #{selectedRequest.consumed_sale_id}
                      </strong>
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </SurfaceCard>
      </div>

      <ConfirmDialog
        isOpen={confirmAction === "approve"}
        onClose={() => setConfirmAction(null)}
        title="Approve discount request?"
        confirmLabel="Approve"
        confirmTone="primary"
        isLoading={processing}
        onConfirm={() => void handleApprove()}
      >
        <p className="text-sm text-on-surface-variant">
          This will approve a discount of{" "}
          <strong className="text-discount-emphasis">
            −{formatMoney(resolvedApproveAmount)} EGP
          </strong>{" "}
          for{" "}
          <strong className="text-on-surface">
            {selectedRequest?.requester?.name ?? "this staff member"}
          </strong>
          . They can then apply it to the sale.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={confirmAction === "reject"}
        onClose={() => setConfirmAction(null)}
        title="Reject discount request?"
        confirmLabel="Reject"
        confirmTone="danger"
        isLoading={processing}
        onConfirm={() => void handleReject()}
      >
        <p className="text-sm text-on-surface-variant">
          This request will be marked as rejected.
          {rejectionReason.trim() ? (
            <>
              {" "}
              Reason:{" "}
              <span className="text-on-surface">
                “{rejectionReason.trim()}”
              </span>
            </>
          ) : (
            " No reason was provided."
          )}
        </p>
      </ConfirmDialog>
    </PageShell>
  );
}
