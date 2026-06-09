"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cancelApprovalRequest,
  getApprovalRequest,
  type ApprovalRequestRecord,
  type ApprovalRequestStatus,
  type CreateSaleDiscountApprovalPayload,
  type CreateTicketDiscountApprovalPayload,
} from "@/lib/api/approval-requests";
import { getAuthToken, getAuthUser } from "@/lib/auth-session";
import {
  resolveDiscountAmount,
  type DiscountInputType,
} from "@/lib/discount-input";
import {
  createDefaultScope,
  createEmptyScope,
  formatScopeSummary,
  isScopeEqual,
  normalizeScopeForPresentCategories,
  type DiscountScope,
  type DiscountScopeCategory,
} from "@/lib/discount-scope";
import { formatEgp } from "@/lib/currencies";

export type OverallDiscountApproval = {
  amount: number;
  inputType: DiscountInputType;
  inputValue: number;
  scope: DiscountScope;
  requestId?: number;
};

type PendingDiscountSnapshot = {
  amount: number;
  inputType: DiscountInputType;
  inputValue: number;
  scope: DiscountScope;
};

type DiscountApprovalPayload =
  | CreateSaleDiscountApprovalPayload
  | CreateTicketDiscountApprovalPayload;

export type UseOverallDiscountOptions = {
  presentCategories: DiscountScopeCategory[];
  computeDiscountBase: (scope: DiscountScope) => number;
  getItemsSignature: () => string;
  buildApprovalPayload: (params: {
    amount: number;
    discountDraft: number;
    discountDraftType: DiscountInputType;
    discountScope: DiscountScope;
    discountBaseSubtotal: number;
  }) => DiscountApprovalPayload;
  createApprovalRequest: (
    token: string,
    payload: DiscountApprovalPayload,
  ) => Promise<{ id: number }>;
  resolveScopeFromRecord: (record: ApprovalRequestRecord) => DiscountScope;
  persistMode: "local" | "immediate";
  onPersistDiscount?: (amount: number, requestId?: number) => Promise<void>;
  savedDiscountAmount?: number;
  getSavedDiscountDraft?: () => number;
  itemsChangedNotice: string;
  applySuccessNotice?: string;
  removeSuccessNotice?: string;
  autoCapExcessDiscount?: boolean;
  emptyItemsError?: string;
};

function normalizeDiscountAmount(amount: number) {
  return Math.round(amount * 100) / 100;
}

export function useOverallDiscount({
  presentCategories,
  computeDiscountBase,
  getItemsSignature,
  buildApprovalPayload,
  createApprovalRequest,
  resolveScopeFromRecord,
  persistMode,
  onPersistDiscount,
  savedDiscountAmount = 0,
  getSavedDiscountDraft,
  itemsChangedNotice,
  applySuccessNotice = "Overall discount applied.",
  removeSuccessNotice = "Overall discount removed.",
  autoCapExcessDiscount = false,
  emptyItemsError = "Add items before applying a discount.",
}: UseOverallDiscountOptions) {
  const isAdmin = getAuthUser()?.role === "admin";

  const [discountScope, setDiscountScope] = useState<DiscountScope>(
    createEmptyScope(),
  );
  const [discountDraft, setDiscountDraft] = useState(savedDiscountAmount);
  const [discountDraftType, setDiscountDraftType] =
    useState<DiscountInputType>("fixed");
  const [discountApproval, setDiscountApproval] =
    useState<OverallDiscountApproval | null>(
      savedDiscountAmount > 0
        ? {
            amount: savedDiscountAmount,
            inputType: "fixed",
            inputValue: savedDiscountAmount,
            scope: createEmptyScope(),
          }
        : null,
    );
  const [discountFieldError, setDiscountFieldError] = useState<string | null>(
    null,
  );
  const [discountRequestNotice, setDiscountRequestNotice] = useState<
    string | null
  >(null);
  const [discountRequestBusy, setDiscountRequestBusy] = useState(false);
  const [activeDiscountRequestId, setActiveDiscountRequestId] = useState<
    number | null
  >(null);
  const [discountRequestStatus, setDiscountRequestStatus] =
    useState<ApprovalRequestStatus | "none">("none");
  const [requestItemsSignature, setRequestItemsSignature] = useState<
    string | null
  >(null);
  const [pendingDiscountSnapshot, setPendingDiscountSnapshot] =
    useState<PendingDiscountSnapshot | null>(null);
  const [saving, setSaving] = useState(false);

  const approvedDiscount = discountApproval?.amount ?? 0;

  useEffect(() => {
    setDiscountScope((current) =>
      normalizeScopeForPresentCategories(current, presentCategories),
    );
  }, [presentCategories]);

  const discountBaseSubtotal = useMemo(
    () => computeDiscountBase(discountScope),
    [computeDiscountBase, discountScope],
  );

  const resolvedDiscountDraft = useMemo(
    () =>
      resolveDiscountAmount(
        discountDraftType,
        discountDraft,
        discountBaseSubtotal,
      ),
    [discountBaseSubtotal, discountDraft, discountDraftType],
  );

  const resetDiscountRequestState = useCallback(() => {
    setActiveDiscountRequestId(null);
    setDiscountRequestStatus("none");
    setRequestItemsSignature(null);
    setPendingDiscountSnapshot(null);
  }, []);

  const revertDiscountDraft = useCallback(() => {
    if (discountApproval) {
      setDiscountDraft(discountApproval.inputValue);
      setDiscountDraftType(discountApproval.inputType);
      setDiscountScope(
        normalizeScopeForPresentCategories(
          discountApproval.scope,
          presentCategories,
        ),
      );
      return;
    }

    const savedDraft = getSavedDiscountDraft?.() ?? savedDiscountAmount;
    setDiscountDraft(savedDraft);
    setDiscountDraftType("fixed");
    setDiscountScope(createDefaultScope(presentCategories));
  }, [
    discountApproval,
    getSavedDiscountDraft,
    presentCategories,
    savedDiscountAmount,
  ]);

  useEffect(() => {
    const saved = getSavedDiscountDraft?.() ?? savedDiscountAmount;
    if (saved > 0 && !discountApproval) {
      setDiscountApproval({
        amount: saved,
        inputType: "fixed",
        inputValue: saved,
        scope: createDefaultScope(presentCategories),
      });
      setDiscountDraft(saved);
    }
    if (saved === 0 && discountApproval && !activeDiscountRequestId) {
      setDiscountApproval(null);
      setDiscountDraft(0);
    }
  }, [
    activeDiscountRequestId,
    discountApproval,
    getSavedDiscountDraft,
    presentCategories,
    savedDiscountAmount,
  ]);

  const draftMatchesPendingRequest = useCallback(() => {
    if (!pendingDiscountSnapshot) return false;
    return (
      pendingDiscountSnapshot.amount ===
        normalizeDiscountAmount(resolvedDiscountDraft) &&
      pendingDiscountSnapshot.inputType === discountDraftType &&
      pendingDiscountSnapshot.inputValue === discountDraft &&
      isScopeEqual(pendingDiscountSnapshot.scope, discountScope)
    );
  }, [
    discountDraft,
    discountDraftType,
    discountScope,
    pendingDiscountSnapshot,
    resolvedDiscountDraft,
  ]);

  const persistDiscount = useCallback(
    async (amount: number, requestId?: number) => {
      if (persistMode === "local") {
        if (amount > 0) {
          setDiscountApproval({
            amount,
            inputType: discountDraftType,
            inputValue: discountDraft,
            scope: discountScope,
            requestId,
          });
        } else {
          setDiscountApproval(null);
        }
        resetDiscountRequestState();
        setDiscountRequestNotice(
          amount > 0 ? applySuccessNotice : removeSuccessNotice,
        );
        return;
      }

      if (!onPersistDiscount) {
        throw new Error("Discount persistence is not configured.");
      }

      setSaving(true);
      setDiscountFieldError(null);
      try {
        await onPersistDiscount(amount, requestId);
        if (amount > 0) {
          setDiscountApproval({
            amount,
            inputType: discountDraftType,
            inputValue: discountDraft,
            scope: discountScope,
            requestId,
          });
        } else {
          setDiscountApproval(null);
        }
        resetDiscountRequestState();
        setDiscountRequestNotice(
          amount > 0 ? applySuccessNotice : removeSuccessNotice,
        );
      } catch (err) {
        setDiscountFieldError(
          err instanceof Error ? err.message : "Failed to update discount.",
        );
        revertDiscountDraft();
      } finally {
        setSaving(false);
      }
    },
    [
      applySuccessNotice,
      discountDraft,
      discountDraftType,
      discountScope,
      onPersistDiscount,
      persistMode,
      removeSuccessNotice,
      resetDiscountRequestState,
      revertDiscountDraft,
    ],
  );

  const cancelPendingDiscountRequest = useCallback(
    async (notice?: string) => {
      const token = getAuthToken();
      if (activeDiscountRequestId && token) {
        try {
          await cancelApprovalRequest(token, activeDiscountRequestId);
        } catch {
          // Best-effort cancellation when items change.
        }
      }
      resetDiscountRequestState();
      setDiscountApproval(null);
      if (notice) {
        setDiscountRequestNotice(notice);
        setDiscountFieldError(null);
      }
    },
    [activeDiscountRequestId, resetDiscountRequestState],
  );

  const applyApprovedDiscountFromRequest = useCallback(
    (record: ApprovalRequestRecord) => {
      const amount = record.approved_discount_amount ?? 0;
      const inputType =
        record.approved_discount_input_type ?? record.discount_input_type;
      const inputValue =
        record.approved_discount_input_value ?? record.discount_input_value;
      const resolvedScope = resolveScopeFromRecord(record);

      setDiscountApproval({
        amount,
        inputType,
        inputValue,
        scope: resolvedScope,
        requestId: record.id,
      });
      setDiscountDraft(inputValue);
      setDiscountDraftType(inputType);
      setDiscountScope(resolvedScope);
      setActiveDiscountRequestId(record.id);
      setDiscountRequestStatus("approved");
      setDiscountFieldError(null);
      setDiscountRequestNotice(null);
    },
    [resolveScopeFromRecord],
  );

  const refreshDiscountRequest = useCallback(async () => {
    if (!activeDiscountRequestId) return;

    try {
      setDiscountRequestBusy(true);
      setDiscountFieldError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const record = await getApprovalRequest(token, activeDiscountRequestId);

      if (record.status === "approved") {
        applyApprovedDiscountFromRequest(record);
        setDiscountRequestNotice("Admin approved this discount request.");
        return;
      }

      if (record.status === "rejected") {
        resetDiscountRequestState();
        setDiscountApproval(null);
        revertDiscountDraft();
        setDiscountFieldError(
          record.rejection_reason ||
            "The discount request was rejected by an administrator.",
        );
        return;
      }

      if (record.status === "cancelled") {
        resetDiscountRequestState();
        setDiscountApproval(null);
        revertDiscountDraft();
        setDiscountRequestNotice("This discount request is no longer active.");
        return;
      }

      setDiscountRequestStatus(record.status);
    } catch (err) {
      setDiscountFieldError(
        err instanceof Error
          ? err.message
          : "Failed to refresh discount request status.",
      );
    } finally {
      setDiscountRequestBusy(false);
    }
  }, [
    activeDiscountRequestId,
    applyApprovedDiscountFromRequest,
    resetDiscountRequestState,
    revertDiscountDraft,
  ]);

  const submitDiscountAction = useCallback(async () => {
    const amount = normalizeDiscountAmount(resolvedDiscountDraft);
    setDiscountFieldError(null);
    setDiscountRequestNotice(null);

    if (amount <= 0) {
      if (!isAdmin && activeDiscountRequestId) {
        await cancelPendingDiscountRequest();
      }
      if (persistMode === "immediate") {
        await persistDiscount(0);
      } else {
        setDiscountApproval(null);
        resetDiscountRequestState();
      }
      return;
    }

    if (discountBaseSubtotal <= 0) {
      setDiscountFieldError(emptyItemsError);
      revertDiscountDraft();
      return;
    }

    if (amount > discountBaseSubtotal) {
      setDiscountFieldError(
        `Discount cannot exceed the discount base (${formatEgp(discountBaseSubtotal)}).`,
      );
      revertDiscountDraft();
      return;
    }

    if (isAdmin) {
      if (discountApproval?.amount === amount) {
        return;
      }
      await persistDiscount(amount);
      return;
    }

    if (
      discountRequestStatus === "approved" &&
      discountApproval?.amount === amount &&
      activeDiscountRequestId
    ) {
      await persistDiscount(amount, activeDiscountRequestId);
      return;
    }

    if (
      discountRequestStatus === "pending" &&
      activeDiscountRequestId &&
      draftMatchesPendingRequest()
    ) {
      setDiscountRequestNotice(
        "Discount approval request is already pending. Use Refresh to check status.",
      );
      return;
    }

    try {
      setDiscountRequestBusy(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const record = await createApprovalRequest(
        token,
        buildApprovalPayload({
          amount,
          discountDraft,
          discountDraftType,
          discountScope,
          discountBaseSubtotal,
        }),
      );

      setActiveDiscountRequestId(record.id);
      setDiscountRequestStatus("pending");
      setRequestItemsSignature(getItemsSignature());
      setPendingDiscountSnapshot({
        amount,
        inputType: discountDraftType,
        inputValue: discountDraft,
        scope: discountScope,
      });
      setDiscountApproval(null);
      setDiscountRequestNotice(
        `Discount request sent to admin. Scope: ${formatScopeSummary(discountScope, presentCategories)}. Use Refresh to check approval status.`,
      );
    } catch (err) {
      setDiscountFieldError(
        err instanceof Error
          ? err.message
          : "Failed to submit discount approval request.",
      );
      revertDiscountDraft();
    } finally {
      setDiscountRequestBusy(false);
    }
  }, [
    activeDiscountRequestId,
    buildApprovalPayload,
    cancelPendingDiscountRequest,
    discountApproval,
    discountBaseSubtotal,
    discountDraft,
    discountDraftType,
    discountRequestStatus,
    discountScope,
    draftMatchesPendingRequest,
    emptyItemsError,
    getItemsSignature,
    isAdmin,
    persistDiscount,
    persistMode,
    presentCategories,
    resetDiscountRequestState,
    resolvedDiscountDraft,
    revertDiscountDraft,
    createApprovalRequest,
  ]);

  const clearApprovedDiscount = useCallback(() => {
    if (persistMode === "immediate") {
      void persistDiscount(0);
    } else {
      setDiscountApproval(null);
    }
    setDiscountDraft(0);
    setDiscountDraftType("fixed");
    setDiscountScope(createDefaultScope(presentCategories));
    setDiscountFieldError(null);
    setDiscountRequestNotice(null);
    resetDiscountRequestState();
  }, [
    persistDiscount,
    persistMode,
    presentCategories,
    resetDiscountRequestState,
  ]);

  useEffect(() => {
    if (!discountApproval || discountApproval.amount <= discountBaseSubtotal) {
      return;
    }

    if (autoCapExcessDiscount) {
      void persistDiscount(
        Math.min(discountApproval.amount, discountBaseSubtotal),
      );
      setDiscountFieldError(
        "Discount was adjusted because the subtotal changed.",
      );
      return;
    }

    setDiscountApproval(null);
    setDiscountDraft(0);
    setDiscountDraftType("fixed");
    setDiscountScope(createDefaultScope(presentCategories));
    resetDiscountRequestState();
    setDiscountFieldError("Discount was cleared because the subtotal changed.");
  }, [
    autoCapExcessDiscount,
    discountApproval,
    discountBaseSubtotal,
    persistDiscount,
    presentCategories,
    resetDiscountRequestState,
  ]);

  useEffect(() => {
    if (
      isAdmin ||
      !activeDiscountRequestId ||
      discountRequestStatus !== "pending" ||
      !requestItemsSignature
    ) {
      return;
    }

    const currentSignature = getItemsSignature();
    if (currentSignature !== requestItemsSignature) {
      void cancelPendingDiscountRequest(itemsChangedNotice);
    }
  }, [
    activeDiscountRequestId,
    cancelPendingDiscountRequest,
    discountRequestStatus,
    getItemsSignature,
    isAdmin,
    itemsChangedNotice,
    requestItemsSignature,
  ]);

  return {
    isAdmin,
    discountScope,
    setDiscountScope,
    discountDraft,
    setDiscountDraft,
    discountDraftType,
    setDiscountDraftType,
    discountApproval,
    setDiscountApproval,
    approvedDiscount,
    discountFieldError,
    discountRequestNotice,
    discountRequestBusy,
    saving,
    discountRequestStatus,
    activeDiscountRequestId,
    discountBaseSubtotal,
    resolvedDiscountDraft,
    submitDiscountAction,
    refreshDiscountRequest,
    clearApprovedDiscount,
    normalizeDiscountAmount,
  };
}
