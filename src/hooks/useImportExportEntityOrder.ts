"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ImportExportEntity } from "@/types/import-export";
import {
  IMPORT_EXPORT_ENTITY_ORDER_KEY,
  applyEntityOrder,
  defaultEntityOrder,
  moveEntitySlug,
  readEntityOrder,
} from "@/lib/import-export-entity-order";

export function useImportExportEntityOrder(entities: readonly ImportExportEntity[]) {
  const [orderedSlugs, setOrderedSlugs] = useState<string[]>(() =>
    defaultEntityOrder(entities),
  );

  const entitySlugs = useMemo(
    () => entities.map((entity) => entity.slug).join(","),
    [entities],
  );

  useEffect(() => {
    if (entities.length === 0) return;
    setOrderedSlugs(readEntityOrder(IMPORT_EXPORT_ENTITY_ORDER_KEY, entities));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entitySlugs]);

  const persist = useCallback((next: string[]) => {
    try {
      window.localStorage.setItem(IMPORT_EXPORT_ENTITY_ORDER_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setOrderedSlugs(next);
  }, []);

  const orderedEntities = useMemo(
    () => applyEntityOrder(entities, orderedSlugs),
    [entities, orderedSlugs],
  );

  const move = useCallback(
    (fromIndex: number, toIndex: number) => {
      persist(moveEntitySlug(orderedSlugs, fromIndex, toIndex));
    },
    [orderedSlugs, persist],
  );

  const reset = useCallback(() => {
    persist(defaultEntityOrder(entities));
  }, [entities, persist]);

  return {
    orderedEntities,
    orderedSlugs,
    move,
    reset,
  };
}
