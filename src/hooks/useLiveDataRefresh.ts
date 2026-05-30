"use client";

import { useEffect } from "react";
import { useGlobalDataRefresh } from "@/hooks/useGlobalDataRefresh";
import { useRefetchOnVisible } from "@/hooks/useRefetchOnVisible";

/**
 * Refetch when the global refresh button fires, the tab becomes visible,
 * or the window regains focus (covers returning via client-side navigation).
 */
export function useLiveDataRefresh(onRefetch: () => void | Promise<void>) {
  useGlobalDataRefresh(onRefetch);
  useRefetchOnVisible(onRefetch);

  useEffect(() => {
    const refetch = () => {
      void onRefetch();
    };

    window.addEventListener("focus", refetch);
    window.addEventListener("pageshow", refetch);

    return () => {
      window.removeEventListener("focus", refetch);
      window.removeEventListener("pageshow", refetch);
    };
  }, [onRefetch]);
}
