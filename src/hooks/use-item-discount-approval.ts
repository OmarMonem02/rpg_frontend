"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cancelApprovalRequest,
  getApprovalRequest,
  type ApprovalRequestRecord,
  type ApprovalRequestStatus,
  type CreateSaleItemDiscountApprovalPayload,
  type CreateTicketItemDiscountApprovalPayload,
} from "@/lib/api/approval-requests";
import { getAuthToken } from "@/lib/auth-session";
import { buildItemApprovalSnapshotFromRecord } from "@/lib/item-discount-approval-snapshot";

type ItemDiscountApprovalPayload =
  | CreateSaleItemDiscountApprovalPayload
  | CreateTicketItemDiscountApprovalPayload;

export type UseItemDiscountApprovalOptions = {
  approvalComparableSignature: string;
  buildApprovalPayload: (
    unitDiscount: number,
  ) => ItemDiscountApprovalPayload;
  createApprovalRequest: (
    token: string,
    payload: ItemDiscountApprovalPayload,
  ) => Promise<{ id: number }>;
  itemsChangedNotice?: string;
  onRequestCancelled?: () => void;
};

function normalizeAmount(amount: number) {
  return Math.round(amount * 100) / 100;
}

export function useItemDiscountApproval({
  approvalComparableSignature,
  buildApprovalPayload,
  createApprovalRequest,
  itemsChangedNotice = "Discount request cancelled because the item changed.",
  onRequestCancelled,
}: UseItemDiscountApprovalOptions) {
  const [requestId, setRequestId] = useState<number | null>(null);
  const [status, setStatus] = useState<ApprovalRequestStatus | "none">("none");
  const [approvedAmount, setApprovedAmount] = useState<number | null>(null);
  const [approvalSnapshot, setApprovalSnapshot] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [appliedLocally, setAppliedLocally] = useState(false);

  const reset = useCallback(() => {
    setRequestId(null);
    setStatus("none");
    setApprovedAmount(null);
    setApprovalSnapshot(null);
    setNotice(null);
    setAppliedLocally(false);
  }, []);

  const markAppliedLocally = useCallback(() => {
    setAppliedLocally(true);
    setNotice(null);
  }, []);

  useEffect(() => {
    if (!requestId || !approvalSnapshot || status !== "pending") return;
    if (approvalComparableSignature === approvalSnapshot) return;

    const token = getAuthToken();
    if (!token) {
      reset();
      onRequestCancelled?.();
      return;
    }

    void (async () => {
      try {
        await cancelApprovalRequest(token, requestId);
      } catch {
        // Ignore cancellation failures when the item changed.
      } finally {
        reset();
        setNotice(itemsChangedNotice);
        onRequestCancelled?.();
      }
    })();
  }, [
    approvalComparableSignature,
    approvalSnapshot,
    itemsChangedNotice,
    onRequestCancelled,
    requestId,
    reset,
    status,
  ]);

  const syncItemSignature = useCallback(() => {
    setApprovalSnapshot(approvalComparableSignature);
  }, [approvalComparableSignature]);

  const refreshStatus = useCallback(async () => {
    if (!requestId || requestId <= 0) return;

    const token = getAuthToken();
    if (!token) return;

    setBusy(true);
    setNotice(null);
    try {
      const record = await getApprovalRequest(token, requestId);
      setStatus(record.status);
      if (record.status === "approved" && record.approved_discount_amount != null) {
        setApprovedAmount(normalizeAmount(record.approved_discount_amount));
        setNotice("Discount approved. Apply it to this line.");
      } else if (record.status === "rejected") {
        setApprovedAmount(null);
        setNotice(
          record.rejection_reason
            ? `Request rejected: ${record.rejection_reason}`
            : "Discount request was rejected.",
        );
        onRequestCancelled?.();
      } else if (record.status === "pending") {
        setNotice("Pending admin approval.");
      } else if (record.status === "cancelled") {
        reset();
        setNotice("This discount request is no longer active.");
        onRequestCancelled?.();
      }
    } catch {
      setNotice("Could not refresh approval status.");
    } finally {
      setBusy(false);
    }
  }, [onRequestCancelled, requestId, reset]);

  const submitRequest = useCallback(
    async (unitDiscount: number) => {
      const token = getAuthToken();
      if (!token) {
        setNotice("Authentication required.");
        return null;
      }

      setBusy(true);
      setNotice(null);
      try {
        const payload = buildApprovalPayload(unitDiscount);
        const record = await createApprovalRequest(token, payload);
        setRequestId(record.id);
        setStatus("pending");
        setApprovalSnapshot(approvalComparableSignature);
        setApprovedAmount(null);
        setAppliedLocally(false);
        setNotice("Discount request submitted for admin approval.");
        return record.id;
      } catch {
        setNotice("Could not submit discount approval request.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [
      approvalComparableSignature,
      buildApprovalPayload,
      createApprovalRequest,
    ],
  );

  const bindApprovedRequest = useCallback(
    (record: ApprovalRequestRecord | null) => {
      if (!record) {
        reset();
        return;
      }

      const snapshot = buildItemApprovalSnapshotFromRecord(record);
      setRequestId(record.id);
      setStatus(record.status);
      setApprovalSnapshot(snapshot ?? approvalComparableSignature);
      setAppliedLocally(false);

      if (record.status === "approved" && record.approved_discount_amount != null) {
        setApprovedAmount(normalizeAmount(record.approved_discount_amount));
      } else {
        setApprovedAmount(null);
      }

      if (record.status === "pending") {
        setNotice("Pending admin approval.");
      } else if (record.status === "rejected") {
        setNotice(
          record.rejection_reason
            ? `Request rejected: ${record.rejection_reason}`
            : "Discount request was rejected.",
        );
      } else if (record.status === "cancelled") {
        setNotice("This discount request is no longer active.");
      }
    },
    [approvalComparableSignature, reset],
  );

  return {
    requestId,
    status,
    approvedAmount,
    notice,
    busy,
    submitRequest,
    refreshStatus,
    reset,
    bindApprovedRequest,
    syncItemSignature,
    markAppliedLocally,
    appliedLocally,
    isPending: status === "pending",
    isApproved:
      status === "approved" && approvedAmount != null && !appliedLocally,
  };
}
