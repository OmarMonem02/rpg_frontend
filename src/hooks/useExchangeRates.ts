"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import { getSettings } from "@/lib/api/settings";
import type { ExchangeRates } from "@/lib/currencies";

const DEFAULT_RATES: ExchangeRates = { usdToEgp: 0, eurToEgp: 0 };

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_RATES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRates = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setRates(DEFAULT_RATES);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const settings = await getSettings(token);
      setRates({
        usdToEgp: settings.exchange_rate ?? 0,
        eurToEgp: settings.exchange_rate_eur ?? 0,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load exchange rates");
      setRates(DEFAULT_RATES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  return { rates, loading, error, reload: loadRates };
}
