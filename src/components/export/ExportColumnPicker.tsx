"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bars3Icon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import type { ExportColumnDef } from "@/types/export-columns";

type ExportColumnPickerProps = {
  allColumns: readonly ExportColumnDef[];
  orderedKeys: string[];
  isVisible: (key: string) => boolean;
  onToggle: (key: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onReset: () => void;
  hiddenRequiredCount?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
};

function SortableRow({
  column,
  checked,
  disabled,
  onToggle,
}: {
  column: ExportColumnDef;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.key,
    disabled: !checked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-2 px-3 py-2">
      <button
        type="button"
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors ${
          checked ? "cursor-grab hover:bg-surface-container active:cursor-grabbing" : "cursor-not-allowed opacity-30"
        }`}
        aria-label={`Reorder ${column.label}`}
        disabled={!checked}
        {...attributes}
        {...listeners}
      >
        <Bars3Icon className="h-4 w-4" />
      </button>

      <label
        className={`flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        }`}
      >
        <span className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-outline-variant bg-surface-container-lowest">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onToggle}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          {checked ? (
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
          ) : null}
        </span>
        <span className={checked ? "text-on-surface" : "text-on-surface-variant"}>
          {column.label}
          {column.exportOnly ? (
            <span className="ml-2 text-xs text-on-surface-variant/60">Export only</span>
          ) : null}
        </span>
        {disabled ? (
          <span className="ml-auto text-xs text-on-surface-variant/50">Required</span>
        ) : null}
      </label>
    </li>
  );
}

export function ExportColumnPicker({
  allColumns,
  orderedKeys,
  isVisible,
  onToggle,
  onMove,
  onReset,
  hiddenRequiredCount = 0,
  collapsible = false,
  defaultCollapsed = true,
}: ExportColumnPickerProps) {
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columnByKey = new Map(allColumns.map((col) => [col.key, col]));
  const orderedVisible = orderedKeys
    .map((key) => columnByKey.get(key))
    .filter((col): col is ExportColumnDef => Boolean(col));
  const hiddenColumns = allColumns.filter((col) => !isVisible(col.key));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedKeys.indexOf(String(active.id));
    const newIndex = orderedKeys.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onMove(oldIndex, newIndex);
  };

  return (
    <div className="rounded-[1.25rem] border border-outline-variant/15 bg-surface-container-lowest p-5 shadow-sm">
      <div className={`flex flex-wrap items-start justify-between gap-3 ${collapsed ? "" : "mb-4"}`}>
        {collapsible ? (
          <button
            type="button"
            className="flex min-w-0 flex-1 items-start gap-2 text-left"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((current) => !current)}
          >
            <ChevronDownIcon
              className={`mt-1 h-5 w-5 shrink-0 text-on-surface-variant transition-transform ${
                collapsed ? "" : "rotate-180"
              }`}
              aria-hidden
            />
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-on-surface">Columns</h3>
              {collapsed ? (
                <p className="mt-1 text-sm text-on-surface-variant">
                  {orderedKeys.length} of {allColumns.length} columns selected for export.
                </p>
              ) : (
                <p className="mt-1 text-sm text-on-surface-variant">
                  Choose which columns to include and drag to reorder exports and templates.
                </p>
              )}
            </div>
          </button>
        ) : (
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-on-surface">Columns</h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              Choose which columns to include and drag to reorder exports and templates.
            </p>
          </div>
        )}

        {!collapsed ? (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-on-surface-variant">
              {orderedKeys.length} of {allColumns.length} selected
            </span>
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Reset to default
            </button>
          </div>
        ) : null}
      </div>

      {!collapsed && hiddenRequiredCount > 0 ? (
        <div className="mb-4 rounded-xl bg-warning/10 px-3 py-2 text-sm text-on-warning-container">
          Some required import columns are hidden. Include them before generating import templates.
        </div>
      ) : null}

      {!collapsed ? (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-outline-variant/15 bg-surface">
            <div className="border-b border-outline-variant/10 px-3 py-2.5">
              <span className="label-caps text-on-surface-variant">Selected order</span>
            </div>
            <SortableContext items={orderedKeys} strategy={verticalListSortingStrategy}>
              <ul className="max-h-80 overflow-y-auto py-1">
                {orderedVisible.map((column) => (
                  <SortableRow
                    key={column.key}
                    column={column}
                    checked
                    disabled={Boolean(column.required)}
                    onToggle={() => onToggle(column.key)}
                  />
                ))}
              </ul>
            </SortableContext>
          </div>

          <div className="rounded-xl border border-outline-variant/15 bg-surface">
            <div className="border-b border-outline-variant/10 px-3 py-2.5">
              <span className="label-caps text-on-surface-variant">Available columns</span>
            </div>
            <ul className="max-h-80 overflow-y-auto py-1">
              {hiddenColumns.map((column) => (
                <li key={column.key} className="px-3 py-2">
                  <label className="flex cursor-pointer items-center gap-3 text-sm">
                    <span className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-outline-variant bg-surface-container-lowest">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => onToggle(column.key)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </span>
                    <span className="text-on-surface-variant">{column.label}</span>
                  </label>
                </li>
              ))}
              {hiddenColumns.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-on-surface-variant">
                  All columns are selected.
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </DndContext>
      ) : null}
    </div>
  );
}
