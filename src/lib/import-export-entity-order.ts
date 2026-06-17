import type { ImportExportEntity } from "@/types/import-export";

export const IMPORT_EXPORT_ENTITY_ORDER_KEY = "import-export:entity-order";

export function defaultEntityOrder(entities: readonly ImportExportEntity[]): string[] {
  return entities.map((entity) => entity.slug);
}

export function readEntityOrder(
  storageKey: string,
  entities: readonly ImportExportEntity[],
): string[] {
  const allowed = new Set(entities.map((entity) => entity.slug));

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const stored = (parsed as string[]).filter((slug) => allowed.has(slug));
        const missing = defaultEntityOrder(entities).filter((slug) => !stored.includes(slug));
        const merged = [...stored, ...missing];
        return merged.length > 0 ? merged : defaultEntityOrder(entities);
      }
    }
  } catch {
    // ignore
  }

  return defaultEntityOrder(entities);
}

export function applyEntityOrder(
  entities: readonly ImportExportEntity[],
  orderedSlugs: readonly string[],
): ImportExportEntity[] {
  const bySlug = new Map(entities.map((entity) => [entity.slug, entity]));
  const ordered: ImportExportEntity[] = [];

  for (const slug of orderedSlugs) {
    const entity = bySlug.get(slug);
    if (entity) {
      ordered.push(entity);
      bySlug.delete(slug);
    }
  }

  for (const entity of entities) {
    if (bySlug.has(entity.slug)) {
      ordered.push(entity);
    }
  }

  return ordered;
}

export function moveEntitySlug(
  orderedSlugs: readonly string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return [...orderedSlugs];
  }

  const next = [...orderedSlugs];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return [...orderedSlugs];
  next.splice(toIndex, 0, item);
  return next;
}
