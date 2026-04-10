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
    <div className={className}>
      <div className="flex flex-wrap gap-2 border-b border-outline-variant/15 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTabId === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-4">{activeTab?.content}</div>
    </div>
  );
}
