"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { TableColumnDef } from "@/hooks/useTableColumns";

// ─── Portal hydration guard ───────────────────────────────────────────────────

function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

// ─── Dropdown positioning (mirrors searchable-select.tsx) ────────────────────

const PANEL_GAP = 4;
const PANEL_MAX_HEIGHT = 320;

type PanelPosition = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
};

function measurePanelPosition(trigger: HTMLElement): PanelPosition {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP;
  const spaceAbove = rect.top - PANEL_GAP;
  const openUp = spaceBelow < PANEL_MAX_HEIGHT && spaceAbove > spaceBelow;
  const maxHeight = Math.min(
    PANEL_MAX_HEIGHT,
    Math.max(120, openUp ? spaceAbove : spaceBelow),
  );
  return {
    left: rect.left,
    width: Math.max(rect.width, 200),
    top: openUp ? undefined : rect.bottom + PANEL_GAP,
    bottom: openUp ? window.innerHeight - rect.top + PANEL_GAP : undefined,
    maxHeight,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

type ColumnPickerProps<T extends string> = {
  columns: readonly TableColumnDef<T>[];
  visible: Set<T>;
  onToggle: (id: T) => void;
  onReset: () => void;
};

export function ColumnPicker<T extends string>({
  columns,
  visible,
  onToggle,
  onReset,
}: ColumnPickerProps<T>) {
  const mounted = useIsMounted();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setPosition(null);
  }, []);

  const toggle = useCallback(() => {
    if (open) {
      close();
      return;
    }
    const trigger = triggerRef.current;
    if (!trigger) return;
    setPosition(measurePanelPosition(trigger));
    setOpen(true);
  }, [open, close]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        close();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, close]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, close]);

  // Reposition on scroll / resize while open
  useEffect(() => {
    if (!open) return;
    function reposition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      setPosition(measurePanelPosition(trigger));
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  const visibleCount = columns.filter((c) => visible.has(c.id)).length;
  const totalOptional = columns.filter((c) => !c.required).length;
  const allVisible = visibleCount === columns.length;

  const panel =
    open && position ? (
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          left: position.left,
          width: position.width,
          top: position.top,
          bottom: position.bottom,
          maxHeight: position.maxHeight,
          zIndex: 9999,
        }}
        className="flex flex-col overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface shadow-xl shadow-black/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/10 px-3 py-2.5">
          <span className="label-caps text-on-surface-variant">Columns</span>
          <span className="text-xs text-on-surface-variant/60">
            {visibleCount}/{columns.length} shown
          </span>
        </div>

        {/* Column list */}
        <ul className="flex-1 overflow-y-auto py-1">
          {columns.map((col) => {
            const checked = visible.has(col.id);
            const disabled = col.required;
            return (
              <li key={col.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors ${
                    disabled
                      ? "cursor-not-allowed opacity-40"
                      : "hover:bg-surface-container"
                  }`}
                >
                  {/* Custom checkbox */}
                  <span className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-outline-variant bg-surface-container-lowest transition-colors">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => !disabled && onToggle(col.id)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                    />
                    {checked && (
                      <svg
                        className="pointer-events-none h-3 w-3 text-primary"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={checked ? "text-on-surface" : "text-on-surface-variant"}>
                    {col.label}
                  </span>
                  {disabled && (
                    <span className="ml-auto text-xs text-on-surface-variant/50">
                      Always on
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        {!allVisible && (
          <div className="border-t border-outline-variant/10 px-3 py-2">
            <button
              type="button"
              onClick={() => {
                onReset();
              }}
              className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              Show all {totalOptional} columns
            </button>
          </div>
        )}
      </div>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/20 bg-transparent px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition-all hover:bg-surface-container-low hover:text-on-surface"
      >
        Columns
        {!allVisible && (
          <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary">
            {visibleCount}
          </span>
        )}
        <ChevronDownIcon
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </>
  );
}
