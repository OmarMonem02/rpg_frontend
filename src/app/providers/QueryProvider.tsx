"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

type QueryProviderProps = {
  children: ReactNode;
};

const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

function buildQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: THIRTY_MINUTES_MS,
        gcTime: ONE_HOUR_MS,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
      },
    },
  });
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(buildQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  );
}
