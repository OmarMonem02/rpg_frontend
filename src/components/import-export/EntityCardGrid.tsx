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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { ImportExportEntity } from "@/types/import-export";
import { SortableEntityCard } from "@/components/import-export/SortableEntityCard";

type EntityCardGridProps = {
  entities: ImportExportEntity[];
  orderedSlugs: string[];
  onMove: (fromIndex: number, toIndex: number) => void;
  onReset: () => void;
};

export function EntityCardGrid({
  entities,
  orderedSlugs,
  onMove,
  onReset,
}: EntityCardGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedSlugs.indexOf(String(active.id));
    const newIndex = orderedSlugs.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    onMove(oldIndex, newIndex);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-on-surface-variant">
          Drag the handle on any card to reorder entities. Your layout is saved in this browser.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
        >
          Reset order
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedSlugs} strategy={rectSortingStrategy}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {entities.map((entity) => (
              <SortableEntityCard key={entity.slug} entity={entity} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
