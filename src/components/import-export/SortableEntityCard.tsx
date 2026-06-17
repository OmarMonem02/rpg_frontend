"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bars3Icon } from "@heroicons/react/24/outline";
import type { ImportExportEntity } from "@/types/import-export";
import { EntityCard } from "@/components/import-export/EntityCard";

export function SortableEntityCard({ entity }: { entity: ImportExportEntity }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entity.slug });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="h-full">
      <EntityCard
        entity={entity}
        isDragging={isDragging}
        dragHandle={
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="inline-flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg border border-outline-variant/15 bg-surface text-on-surface-variant transition-colors hover:border-primary/30 hover:bg-surface-container hover:text-on-surface active:cursor-grabbing"
            aria-label={`Reorder ${entity.label}`}
            onClick={(event) => event.preventDefault()}
            {...attributes}
            {...listeners}
          >
            <Bars3Icon className="h-4 w-4" />
          </button>
        }
      />
    </div>
  );
}
