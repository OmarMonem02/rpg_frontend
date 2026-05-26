"use client";

import { TabsWrapper as OpsTabsWrapper, type Tab } from "./ops-ui";

export type { Tab };

export type TabsWrapperProps = {
  tabs: Tab[];
  defaultTabId?: string;
  className?: string;
};

/** Card-style tabs — re-exports ops-ui TabsWrapper with variant="card". */
export function TabsWrapper({ tabs, defaultTabId, className = "" }: TabsWrapperProps) {
  return (
    <OpsTabsWrapper
      tabs={tabs}
      defaultTabId={defaultTabId}
      variant="card"
      className={className}
    />
  );
}
