"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ChatBubbleLeftRightIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { TicketChatSection, type TicketChatSectionProps } from "@/components/tickets/ticket-chat-panel";
import type { TicketMessage } from "@/lib/tickets-api";

function getDocumentBody(): HTMLElement | null {
  return typeof document !== "undefined" ? document.body : null;
}

export type TicketMessengerChatProps = TicketChatSectionProps & {
  /** Display name in the chat header (customer name for staff, shop name for customers). */
  partnerName: string;
  partnerSubtitle?: string;
  /** Count unread messages from this sender type while minimized. */
  unreadFrom?: "customer" | "staff";
  popupHint?: string;
  fabAriaLabel?: string;
  /** Position classes for FAB and popup (e.g. above a fixed footer on tracking page). */
  fabPositionClassName?: string;
  popupPositionClassName?: string;
};

export function TicketMessengerChat({
  partnerName,
  partnerSubtitle,
  unreadFrom = "customer",
  popupHint = "Replies from the customer tracking link appear here.",
  fabAriaLabel = "Open chat",
  fabPositionClassName = "bottom-6 right-6",
  popupPositionClassName = "bottom-24 right-6",
  loadMessages,
  ...chatProps
}: TicketMessengerChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastSeenIdRef = useRef(0);
  const portalTarget = useSyncExternalStore(
    () => () => {},
    getDocumentBody,
    () => null,
  );

  const checkUnread = useCallback(async () => {
    try {
      const messages = await loadMessages();
      const lastSeen = lastSeenIdRef.current;
      const unread = messages.filter(
        (message) => message.sender_type === unreadFrom && message.id > lastSeen,
      ).length;
      setUnreadCount(unread);
      return messages;
    } catch {
      return [];
    }
  }, [loadMessages, unreadFrom]);

  useEffect(() => {
    if (isOpen) return;
    void checkUnread();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible" || isOpen) return;
      void checkUnread();
    }, 25_000);
    return () => window.clearInterval(intervalId);
  }, [isOpen, checkUnread]);

  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0);
    void loadMessages().then((messages) => {
      const latest = messages.at(-1);
      if (latest) lastSeenIdRef.current = latest.id;
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    void loadMessages().then((messages) => {
      const latest = messages.at(-1);
      if (latest) lastSeenIdRef.current = latest.id;
      setUnreadCount(0);
    });
  };

  const handleNewMessages = useCallback((messages: TicketMessage[]) => {
    if (!isOpen) {
      const unread = messages.filter(
        (message) => message.sender_type === unreadFrom && message.id > lastSeenIdRef.current,
      ).length;
      setUnreadCount(unread);
      return;
    }
    const latest = messages.at(-1);
    if (latest) lastSeenIdRef.current = latest.id;
  }, [isOpen, unreadFrom]);

  const fab = !isOpen ? (
    <button
      type="button"
      onClick={handleOpen}
      aria-expanded={false}
      aria-label={fabAriaLabel}
      className={`fixed z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95 ${fabPositionClassName}`}
    >
      <ChatBubbleLeftRightIcon className="h-7 w-7" aria-hidden />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </button>
  ) : null;

  const popup =
    isOpen && portalTarget ? (
      <div
        className={`fixed z-[90] flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface shadow-2xl sm:w-[22rem] lg:w-[380px] lg:shadow-2xl ${popupPositionClassName}`}
        role="dialog"
        aria-modal="false"
        aria-label={`Chat with ${partnerName}`}
      >
        <header className="flex items-center gap-3 border-b border-outline-variant/10 bg-primary px-4 py-3 text-on-primary">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-on-primary/15 text-sm font-bold">
            {partnerName.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{partnerName}</p>
            <p className="truncate text-xs text-on-primary/80">
              {partnerSubtitle ?? "Messages"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Minimize chat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-on-primary/10"
          >
            <ChevronDownIcon className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="flex max-h-[min(28rem,calc(100vh-12rem))] min-h-[20rem] flex-col bg-surface-container-lowest p-3 lg:max-h-[min(32rem,calc(100vh-6rem))] lg:min-h-[24rem]">
          <p className="mb-2 px-1 text-center text-[11px] leading-snug text-on-surface-variant">
            {popupHint}
          </p>
          <TicketChatSection
            {...chatProps}
            loadMessages={loadMessages}
            variant="messenger"
            onMessagesChange={handleNewMessages}
          />
        </div>
      </div>
    ) : null;

  if (portalTarget === null) return null;

  return createPortal(
    <>
      {fab}
      {popup}
    </>,
    portalTarget,
  );
}
