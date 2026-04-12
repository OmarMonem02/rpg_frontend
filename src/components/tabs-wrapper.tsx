"use client";

import { useState } from "react";

export type Tab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export type TabsWrapperProps = {
  tabs: Tab[];
  defaultTabId?: string;
  className?: string;
};

export function TabsWrapper({ tabs, defaultTabId, className = "" }: TabsWrapperProps) {
  const [activeTabId, setActiveTabId] = useState(defaultTabId || tabs[0]?.id || "");

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  return (
    <div className={`overflow-hidden rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-low ${className}`.trim()}>
      <div className="flex flex-wrap gap-2 border-b border-outline-variant/15 p-3 md:p-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTabId === tab.id
                ? "bg-primary text-on-primary"
                : "bg-surface text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-4 md:p-5">{activeTab?.content}</div>
    </div>
  );
}
