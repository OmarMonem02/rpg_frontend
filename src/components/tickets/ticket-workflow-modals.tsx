"use client";

import { useEffect, useId, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon, LockClosedIcon, BanknotesIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { ActionButton, InputGroup, SearchableSelect } from "@/components/ops-ui";
import { formatEgp } from "@/lib/currencies";
import { InvoiceTemplate } from "@/components/invoice-template";
import type { SaleRecord } from "@/lib/crud-api";

function getDocumentBody(): HTMLElement | null {
  return typeof document !== "undefined" ? document.body : null;
}

function useModalBodyLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);
}

type ModalShellProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "full";
  align?: "center" | "top";
};

export function ModalShell({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = "md",
  align = "center",
}: ModalShellProps) {
  const titleId = useId();
  const portalTarget = useSyncExternalStore(
    () => () => {},
    getDocumentBody,
    () => null,
  );

  useModalBodyLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || portalTarget === null) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    full: "max-w-5xl",
  };

  const alignClasses =
    align === "top"
      ? "items-start overflow-y-auto p-4 sm:p-6"
      : "items-center p-4";

  return createPortal(
    <div
      className={`form-modal-overlay fixed inset-0 z-[100] flex justify-center bg-black/60 backdrop-blur-md ${alignClasses}`}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`form-modal-shell relative w-full ${sizeClasses[size]} animate-in zoom-in-95 fade-in duration-200 rounded-[2rem] border border-outline-variant/20 bg-surface shadow-2xl`}
      >
        <div className="border-b border-outline-variant/10 px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              {icon ? (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  {icon}
                </span>
              ) : null}
              <div className="min-w-0">
                <h3 id={titleId} className="font-display text-2xl font-bold tracking-tight text-on-surface">
                  {title}
                </h3>
                {description ? (
                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">{description}</p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <XMarkIcon className="h-6 w-6" aria-hidden />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 sm:px-8">{children}</div>

        {footer ? (
          <div className="border-t border-outline-variant/10 px-6 py-4 sm:px-8">{footer}</div>
        ) : null}
      </div>
    </div>,
    portalTarget,
  );
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
] as const;

export type PaymentCloseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  paymentMethod: string;
  amountPaid: string;
  adminPassword?: string;
  onPaymentMethodChange: (value: string) => void;
  onAmountPaidChange: (value: string) => void;
  onAdminPasswordChange?: (value: string) => void;
  onConfirm: () => void;
  isProcessing: boolean;
  error?: string;
  mode?: "close" | "record";
  requiresAdminPassword?: boolean;
  previouslyPaid?: number;
};

export function PaymentCloseModal({
  isOpen,
  onClose,
  total,
  paymentMethod,
  amountPaid,
  adminPassword,
  onPaymentMethodChange,
  onAmountPaidChange,
  onAdminPasswordChange,
  onConfirm,
  isProcessing,
  error,
  mode = "close",
  requiresAdminPassword = false,
  previouslyPaid = 0,
}: PaymentCloseModalProps) {
  const parsedAmount = Number(amountPaid);
  const newTotalPaid = previouslyPaid + (Number.isFinite(parsedAmount) ? parsedAmount : 0);
  const isValidAmount = Number.isFinite(parsedAmount);
  const balanceDue = Math.max(0, total - newTotalPaid);

  const isRecordMode = mode === "record";
  const title = isRecordMode ? "Record payment" : "Close ticket & collect payment";
  const description = isRecordMode
    ? "Record a partial or full payment without closing the ticket."
    : "Record payment to close this ticket and generate an invoice.";
  const confirmLabel = isRecordMode ? "Record payment" : "Confirm & close ticket";

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      icon={<BanknotesIcon className="h-6 w-6" aria-hidden />}
      size="md"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <ActionButton variant="ghost" className="w-full sm:w-auto" onClick={onClose} disabled={isProcessing}>
            Cancel
          </ActionButton>
          <ActionButton
            tone="success"
            className="w-full sm:w-auto"
            onClick={onConfirm}
            disabled={isProcessing || !isValidAmount || (requiresAdminPassword && !adminPassword?.trim())}
          >
            {isProcessing ? "Processing…" : confirmLabel}
          </ActionButton>
        </div>
      }
    >
      {error ? (
        <p className="mb-4 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">{error}</p>
      ) : null}

      <div className="mb-6 rounded-2xl border border-primary/10 bg-primary/5 p-5">
        {previouslyPaid > 0 ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-on-surface-variant">Ticket total</p>
              <p className="font-display text-xl font-bold text-on-surface">
                {formatEgp(total)}
              </p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-on-surface-variant">Recorded payment</p>
              <p className="font-display text-xl font-bold text-success">
                {formatEgp(previouslyPaid)}
              </p>
            </div>
            <div className="pt-3 border-t border-primary/10 flex justify-between items-center">
              <p className="text-sm font-medium text-on-surface-variant">Remaining balance</p>
              <p className="font-display text-3xl font-black tracking-tight text-warning">
                {formatEgp(Math.max(0, total - previouslyPaid))}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-on-surface-variant">Total amount due</p>
            <p className="mt-1 font-display text-4xl font-black tracking-tight text-primary">
              {formatEgp(total)}
            </p>
          </div>
        )}
      </div>

      <InputGroup label="Payment amount (now)" className="mb-4">
        <input
          type="number"
          onWheel={(event) => {
            event.currentTarget.blur();
          }}
          step="1"
          inputMode="decimal"
          className="w-full rounded-2xl border border-outline-variant/30 bg-surface px-5 py-3 outline-none transition-all focus:border-primary"
          value={amountPaid}
          onChange={(event) => onAmountPaidChange(event.target.value)}
        />
      </InputGroup>

      {balanceDue > 0 ? (
        <p className="mb-4 text-sm text-warning">
          {formatEgp(balanceDue)} remaining balance after this payment.
        </p>
      ) : newTotalPaid >= total ? (
        <p className="mb-4 text-sm text-on-success-container">Payment covers the full ticket total.</p>
      ) : null}

      <InputGroup label="Payment method" className="mb-2">
        <SearchableSelect
          className="w-full rounded-2xl border border-outline-variant/30 bg-surface px-5 py-3 outline-none transition-all focus:border-primary"
          value={paymentMethod}
          onChange={onPaymentMethodChange}
          options={PAYMENT_METHODS.map((method) => ({
            value: method.value,
            label: method.label,
          }))}
        />
      </InputGroup>

      {requiresAdminPassword && onAdminPasswordChange && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
          <InputGroup label="Admin Password (Required to change recorded payment)">
            <input
              type="password"
              className="w-full rounded-2xl border border-outline-variant/30 bg-surface px-5 py-3 outline-none transition-all focus:border-primary"
              value={adminPassword || ""}
              onChange={(event) => onAdminPasswordChange(event.target.value)}
              placeholder="Enter admin password"
            />
          </InputGroup>
        </div>
      )}
    </ModalShell>
  );
}

export type AdminPasswordReopenModalProps = {
  isOpen: boolean;
  onClose: () => void;
  ticketId: number;
  total: number;
  amountPaid: number;
  password: string;
  onPasswordChange: (value: string) => void;
  onConfirm: () => void;
  isProcessing: boolean;
  error?: string;
};

export function AdminPasswordReopenModal({
  isOpen,
  onClose,
  ticketId,
  total,
  amountPaid,
  password,
  onPasswordChange,
  onConfirm,
  isProcessing,
  error,
}: AdminPasswordReopenModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Administrator confirmation"
      description={`Ticket #${ticketId} was closed with full payment (${formatEgp(amountPaid)} of ${formatEgp(total)}). Enter your admin password to reopen it.`}
      icon={<LockClosedIcon className="h-6 w-6" aria-hidden />}
      size="md"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <ActionButton variant="ghost" className="w-full sm:w-auto" onClick={onClose} disabled={isProcessing}>
            Cancel
          </ActionButton>
          <ActionButton
            tone="primary"
            className="w-full sm:w-auto"
            onClick={onConfirm}
            disabled={isProcessing || !password.trim()}
          >
            {isProcessing ? "Verifying…" : "Reopen ticket"}
          </ActionButton>
        </div>
      }
    >
      {error ? (
        <p className="mb-4 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">{error}</p>
      ) : null}

      <InputGroup label="Admin password">
        <input
          autoFocus
          type="password"
          autoComplete="current-password"
          className="w-full rounded-2xl border border-outline-variant/30 bg-surface px-5 py-3 outline-none transition-all focus:border-primary"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && password.trim()) onConfirm();
          }}
        />
      </InputGroup>
    </ModalShell>
  );
}

export type TicketInvoiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  ticketId: number;
  invoice: SaleRecord;
  onPrint: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
};

export function TicketInvoiceModal({
  isOpen,
  onClose,
  ticketId,
  invoice,
  onPrint,
  onExportPdf,
  isExporting,
}: TicketInvoiceModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Ticket invoice"
      description={`Invoice for maintenance ticket #${ticketId}`}
      icon={<DocumentTextIcon className="h-6 w-6" aria-hidden />}
      size="full"
      align="top"
      footer={
        <div className="flex flex-wrap gap-2">
          <ActionButton tone="primary" onClick={onPrint}>
            Print invoice
          </ActionButton>
          <ActionButton tone="default" onClick={onExportPdf} disabled={isExporting}>
            {isExporting ? "Exporting…" : "Export PDF"}
          </ActionButton>
          <ActionButton variant="ghost" onClick={onClose}>
            Close
          </ActionButton>
        </div>
      }
    >
      <div className="overflow-x-auto rounded-[1.5rem] border border-outline-variant/10 bg-surface-container-lowest">
        <div id="invoice-export-root" className="min-w-0">
          <InvoiceTemplate
            sale={invoice}
            documentTitle="Maintenance Invoice"
            referenceLabel="Ticket #"
          />
        </div>
      </div>
    </ModalShell>
  );
}
