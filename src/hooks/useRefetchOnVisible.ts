"use client";

import { useEffect } from "react";

export function useRefetchOnVisible(onRefetch: () => void | Promise<void>) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void onRefetch();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [onRefetch]);
}
