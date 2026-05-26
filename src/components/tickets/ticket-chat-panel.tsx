"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { ActionButton } from "@/components/ops-ui";
import {
  TICKET_CHAT_IMAGE_FOLDER,
  type SendTicketMessagePayload,
  type TicketMessage,
} from "@/lib/tickets-api";
import { uploadImage } from "@/lib/uploadImage";

const POLL_INTERVAL_MS = 25_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function senderLabel(message: TicketMessage): string {
  if (message.sender_type === "customer") return "Customer";
  return message.user?.name?.trim() || "Staff";
}

function MessageBubble({
  message,
  isStaff,
}: {
  message: TicketMessage;
  isStaff: boolean;
}) {
  const hasImage = Boolean(message.image_url);
  const hasText = Boolean(message.body?.trim());

  return (
    <div
      className={`whitespace-pre-wrap rounded-2xl text-sm leading-relaxed ${
        isStaff
          ? "rounded-br-md bg-primary text-on-primary"
          : "rounded-bl-md border border-outline-variant/15 bg-surface-container text-on-surface"
      } ${hasImage ? "overflow-hidden p-1" : "px-4 py-3"}`}
    >
      {hasImage ? (
        <a
          href={message.image_url!}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- chat images are external URLs */}
          <img
            src={message.image_url!}
            alt={hasText ? message.body : "Shared image"}
            className="max-h-48 w-full rounded-xl object-cover"
          />
        </a>
      ) : null}
      {hasText ? (
        <p className={hasImage ? "px-3 py-2" : undefined}>{message.body}</p>
      ) : null}
    </div>
  );
}

type TicketChatPanelProps = {
  messages: TicketMessage[];
  canSend: boolean;
  onSend: (payload: SendTicketMessagePayload) => Promise<void>;
  isLoading?: boolean;
  isSending?: boolean;
  error?: string;
  sendDisabledReason?: string;
  customerNotesFallback?: string | null;
  variant?: "default" | "messenger";
};

export function TicketChatPanel({
  messages,
  canSend,
  onSend,
  isLoading = false,
  isSending = false,
  error,
  sendDisabledReason,
  customerNotesFallback,
  variant = "default",
}: TicketChatPanelProps) {
  const isMessenger = variant === "messenger";
  const [draft, setDraft] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const busy = isSending || isUploading;
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const grew = messages.length > prevCountRef.current;
    prevCountRef.current = messages.length;
    if (grew || messages.length <= 1) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const submitPayload = async (payload: SendTicketMessagePayload) => {
    if (!canSend || busy) return;
    const hasContent =
      Boolean(payload.body?.trim()) ||
      Boolean(payload.image_url && payload.image_public_id);
    if (!hasContent) return;
    await onSend(payload);
    setDraft("");
    setUploadError("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    await submitPayload({ body });
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !canSend || busy) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError("Only JPG, PNG, and WebP images are allowed.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("Image must be 5MB or smaller.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError("");
      const uploaded = await uploadImage(file, TICKET_CHAT_IMAGE_FOLDER);
      const caption = draft.trim();
      await submitPayload({
        body: caption || undefined,
        image_url: uploaded.url,
        image_public_id: uploaded.public_id,
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const showFallback =
    !isLoading &&
    messages.length === 0 &&
    Boolean(customerNotesFallback?.trim());

  const canSubmitText = Boolean(draft.trim());
  const displayError = error || uploadError;

  return (
    <div className={`flex flex-col ${isMessenger ? "min-h-0 flex-1" : ""}`}>
      {displayError ? (
        <p className="mb-3 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
          {displayError}
        </p>
      ) : null}

      <div
        ref={listRef}
        className={`flex flex-1 flex-col gap-2 overflow-y-auto ${
          isMessenger
            ? "min-h-0 px-1 py-2"
            : "max-h-[min(24rem,50vh)] min-h-[12rem] gap-3 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4"
        }`}
        aria-live="polite"
        aria-busy={isLoading}
      >
        {isLoading && messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-on-surface-variant">Loading messages…</p>
        ) : null}

        {showFallback ? (
          <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md border border-outline-variant/15 bg-surface-container px-4 py-3">
            <p className="text-xs font-semibold text-on-surface-variant">Original request</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-on-surface">
              {customerNotesFallback}
            </p>
          </div>
        ) : null}

        {!isLoading && messages.length === 0 && !showFallback ? (
          <p className="py-8 text-center text-sm text-on-surface-variant">
            No messages yet. Start the conversation below.
          </p>
        ) : null}

        {messages.map((message) => {
          const isStaff = message.sender_type === "staff";
          return (
            <div
              key={message.id}
              className={`flex max-w-[85%] flex-col ${isStaff ? "self-end items-end" : "self-start items-start"}`}
            >
              <p className="mb-1 px-1 text-xs font-medium text-on-surface-variant">
                {senderLabel(message)}
                {message.created_at ? (
                  <span className="ml-2 font-normal opacity-80">
                    {formatMessageTime(message.created_at)}
                  </span>
                ) : null}
              </p>
              <MessageBubble message={message} isStaff={isStaff} />
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className={isMessenger ? "mt-2 shrink-0 border-t border-outline-variant/10 pt-2" : "mt-4 flex flex-col gap-3"}
      >
        {!canSend && sendDisabledReason ? (
          <p className={`text-on-surface-variant ${isMessenger ? "mb-2 px-1 text-xs" : "text-sm"}`}>
            {sendDisabledReason}
          </p>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="sr-only"
          onChange={(e) => void handleImageSelect(e)}
          disabled={!canSend || busy}
        />

        {isMessenger ? (
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canSend || busy}
              aria-label="Attach image"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-40"
            >
              <PhotoIcon className="h-6 w-6" aria-hidden />
            </button>
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!canSend || busy}
              placeholder={canSend ? (busy ? "Sending…" : "Aa") : "Messaging disabled"}
              className="min-w-0 flex-1 rounded-full border border-outline-variant/25 bg-surface px-4 py-2.5 text-sm outline-none transition-all focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!canSend || busy || !canSubmitText}
              className="shrink-0 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-opacity disabled:opacity-40"
            >
              {busy ? "…" : "Send"}
            </button>
          </div>
        ) : (
          <>
            <textarea
              rows={3}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSubmit(event);
                }
              }}
              disabled={!canSend || busy}
              placeholder={canSend ? "Type a message…" : "Messaging is disabled"}
              className="w-full resize-none rounded-2xl border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition-all focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canSend || busy}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-40"
              >
                <PhotoIcon className="h-5 w-5" aria-hidden />
                {isUploading ? "Uploading…" : "Photo"}
              </button>
              <ActionButton
                type="submit"
                tone="primary"
                disabled={!canSend || busy || !canSubmitText}
              >
                {busy ? "Sending…" : "Send"}
              </ActionButton>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

export type TicketChatSectionProps = {
  canSend: boolean;
  sendDisabledReason?: string;
  loadMessages: () => Promise<TicketMessage[]>;
  sendMessage: (payload: SendTicketMessagePayload) => Promise<void>;
  customerNotesFallback?: string | null;
  pollIntervalMs?: number;
  variant?: "default" | "messenger";
  onMessagesChange?: (messages: TicketMessage[]) => void;
};

export function TicketChatSection({
  canSend,
  sendDisabledReason,
  loadMessages,
  sendMessage,
  customerNotesFallback,
  pollIntervalMs = POLL_INTERVAL_MS,
  variant = "default",
  onMessagesChange,
}: TicketChatSectionProps) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const refreshInFlight = useRef(false);

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      if (refreshInFlight.current) return;
      refreshInFlight.current = true;
      if (!options?.silent) setIsLoading(true);
      try {
        const data = await loadMessages();
        setMessages(data);
        onMessagesChange?.(data);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load messages");
      } finally {
        refreshInFlight.current = false;
        if (!options?.silent) setIsLoading(false);
      }
    },
    [loadMessages, onMessagesChange],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void refresh({ silent: true });
    };

    const intervalId = window.setInterval(tick, pollIntervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pollIntervalMs, refresh]);

  const handleSend = async (payload: SendTicketMessagePayload) => {
    try {
      setIsSending(true);
      setError("");
      await sendMessage(payload);
      await refresh({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  return (
    <TicketChatPanel
      messages={messages}
      canSend={canSend}
      onSend={handleSend}
      isLoading={isLoading}
      isSending={isSending}
      error={error}
      sendDisabledReason={sendDisabledReason}
      customerNotesFallback={customerNotesFallback}
      variant={variant}
    />
  );
}
