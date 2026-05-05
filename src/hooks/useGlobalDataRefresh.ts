"use client";

import { useEffect } from "react";
import { REFRESH_ALL_DATA_EVENT } from "@/components/refetch-all-data-button";

export function useGlobalDataRefresh(onRefresh: () => void | Promise<void>) {
  useEffect(() => {
    const handleRefresh = () => {
      void onRefresh();
    };

    window.addEventListener(REFRESH_ALL_DATA_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(REFRESH_ALL_DATA_EVENT, handleRefresh);
    };
  }, [onRefresh]);
}
