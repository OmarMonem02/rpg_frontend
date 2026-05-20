"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  PhoneVerificationCard,
  ProgressTimeline,
  TicketTrackingDashboard,
  TrackingErrorState,
  TrackingHeader,
  TrackingLoadingState,
  TrackingRefreshBar,
  TrackingShell,
} from "@/components/ticket-tracking/tracking-ui";
import {
  clearTrackingSession,
  getStoredTrackingSession,
  publicTrackingApi,
  storeTrackingSession,
  type PublicTicketMeta,
  type PublicTicketTracking,
} from "@/lib/public-tracking-api";

type ViewState = "loading" | "verify" | "dashboard" | "error";

export default function TrackTicketPage() {
  const { token } = useParams() as { token: string };
  const [view, setView] = useState<ViewState>("loading");
  const [meta, setMeta] = useState<PublicTicketMeta | null>(null);
  const [ticket, setTicket] = useState<PublicTicketTracking | null>(null);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const refreshInFlight = useRef(false);

  const loadTicketWithSession = useCallback(async () => {
    const session = getStoredTrackingSession(token);
    if (!session) {
      setView("verify");
      return;
    }

    try {
      const res = await publicTrackingApi.getTicket(token, session);
      setTicket(res.ticket);
      setLastRefreshedAt(new Date());
      setView("dashboard");
    } catch {
      clearTrackingSession(token);
      setView("verify");
    }
  }, [token]);

  const refreshTicket = useCallback(
    async (options?: { silent?: boolean }) => {
      if (refreshInFlight.current) return;

      const session = getStoredTrackingSession(token);
      if (!session) {
        setView("verify");
        return;
      }

      refreshInFlight.current = true;
      if (!options?.silent) setRefreshing(true);

      try {
        const res = await publicTrackingApi.getTicket(token, session);
        setTicket(res.ticket);
        setLastRefreshedAt(new Date());
      } catch (err) {
        clearTrackingSession(token);
        setError(err instanceof Error ? err.message : "Session expired. Please verify again.");
        setView("verify");
      } finally {
        refreshInFlight.current = false;
        if (!options?.silent) setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const metaRes = await publicTrackingApi.getMeta(token);
        if (cancelled) return;
        setMeta(metaRes);
        await loadTicketWithSession();
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "This tracking link is invalid or expired.");
        setView("error");
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [token, loadTicketWithSession]);

  const autoRefreshMinutes = meta?.shop.auto_refresh_minutes ?? 0;

  useEffect(() => {
    if (view !== "dashboard" || autoRefreshMinutes <= 0) return;

    const intervalMs = autoRefreshMinutes * 60 * 1000;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void refreshTicket({ silent: true });
    };

    const intervalId = window.setInterval(tick, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshTicket({ silent: true });
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [view, autoRefreshMinutes, refreshTicket]);

  const handleVerify = async () => {
    setVerifying(true);
    setError("");
    try {
      const res = await publicTrackingApi.verify(token, phone.trim());
      storeTrackingSession(token, res.tracking_session);
      setTicket(res.ticket);
      setLastRefreshedAt(new Date());
      setView("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  if (view === "loading") {
    return (
      <TrackingShell>
        <TrackingLoadingState />
      </TrackingShell>
    );
  }

  if (view === "error" || !meta) {
    return (
      <TrackingShell>
        <TrackingErrorState message={error} />
      </TrackingShell>
    );
  }

  const headerStatus = ticket?.ticket.status ?? meta.ticket.status;
  const headerStatusLabel = ticket?.ticket.status_label ?? meta.ticket.status_label;
  const shop = ticket?.shop ?? meta.shop;

  return (
    <TrackingShell>
      <TrackingHeader
        shopName={shop.name}
        tagline={shop.tagline}
        logoUrl={shop.logo_url}
        ticketNumber={meta.ticket.ticket_number}
        status={headerStatus}
        statusLabel={headerStatusLabel}
        updatedAtHuman={ticket?.ticket.updated_at_human}
      />

      {view === "verify" ? (
        <>
          <ProgressTimeline steps={meta.progress.timeline} />
          <PhoneVerificationCard
            phone={phone}
            onPhoneChange={setPhone}
            onSubmit={() => void handleVerify()}
            loading={verifying}
            error={error}
          />
        </>
      ) : ticket ? (
        <>
          <TrackingRefreshBar
            onRefresh={() => void refreshTicket()}
            loading={refreshing}
            autoRefreshMinutes={shop.auto_refresh_minutes}
            lastRefreshedAt={lastRefreshedAt}
          />
          <TicketTrackingDashboard data={ticket} />
        </>
      ) : null}
    </TrackingShell>
  );
}
