"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { formatDocumentTitle, resolvePageTitle } from "@/lib/page-titles";

type PageTitleContextValue = {
  setDynamicTitle: (title: string | null) => void;
};

const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [dynamicTitle, setDynamicTitleState] = useState<string | null>(null);

  const setDynamicTitle = useCallback((title: string | null) => {
    setDynamicTitleState(title);
  }, []);

  useEffect(() => {
    setDynamicTitleState(null);
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith("/track")) {
      return;
    }

    document.title = formatDocumentTitle(
      dynamicTitle ?? resolvePageTitle(pathname),
    );
  }, [pathname, dynamicTitle]);

  return (
    <PageTitleContext.Provider value={{ setDynamicTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

/** Override the route-based tab title while this page is mounted (e.g. after data loads). */
export function usePageTitle(title: string | null | undefined) {
  const context = useContext(PageTitleContext);

  useEffect(() => {
    if (!context) {
      return;
    }

    context.setDynamicTitle(title ?? null);
  }, [title, context]);
}
