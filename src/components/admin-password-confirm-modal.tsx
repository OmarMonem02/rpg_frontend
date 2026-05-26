"use client";

import type { ReactNode } from "react";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { ActionButton, InputGroup } from "@/components/ops-ui";
import { ModalShell } from "@/components/tickets/ticket-workflow-modals";

export type AdminPasswordConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description: string;
  password: string;
  onPasswordChange: (value: string) => void;
  onConfirm: () => void | Promise<void>;
  isProcessing?: boolean;
  error?: string | null;
  confirmLabel?: string;
  summary?: ReactNode;
};

export function AdminPasswordConfirmModal({
  isOpen,
  onClose,
  title = "Administrator confirmation",
  description,
  password,
  onPasswordChange,
  onConfirm,
  isProcessing = false,
  error,
  confirmLabel = "Confirm",
  summary,
}: AdminPasswordConfirmModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      icon={<LockClosedIcon className="h-6 w-6" aria-hidden />}
      size="md"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <ActionButton
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </ActionButton>
          <ActionButton
            tone="primary"
            className="w-full sm:w-auto"
            onClick={onConfirm}
            disabled={isProcessing || !password.trim()}
          >
            {isProcessing ? "Verifying…" : confirmLabel}
          </ActionButton>
        </div>
      }
    >
      {summary ? <div className="mb-4">{summary}</div> : null}

      {error ? (
        <p className="mb-4 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
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
