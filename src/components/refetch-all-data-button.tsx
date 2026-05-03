"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

export const REFRESH_ALL_DATA_EVENT = "rpg:refresh-all-data";

export function RefetchAllDataButton() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      window.dispatchEvent(new Event(REFRESH_ALL_DATA_EVENT));
      await queryClient.invalidateQueries();
      await queryClient.refetchQueries({ type: "active" });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container disabled:pointer-events-none disabled:opacity-60"
      aria-label="Refresh all data"
      title="Refresh all data"
    >
      <ArrowPathIcon
        className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      <span className="hidden sm:inline">
        {isRefreshing ? "Refreshing" : "Refresh"}
      </span>
    </button>
  );
}
