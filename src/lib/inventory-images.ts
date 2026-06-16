export type InventoryImageRecord = {
  url: string;
  public_id?: string;
  is_primary: boolean;
  sort_order?: number;
};

export const MAX_INVENTORY_IMAGES = 4;

export function getPrimaryImageUrl(
  images?: InventoryImageRecord[],
  fallback?: string,
): string | undefined {
  if (images && images.length > 0) {
    const primary = images.find((image) => image.is_primary);
    return primary?.url ?? images[0]?.url;
  }

  return fallback;
}

export function getGalleryImages(
  images?: InventoryImageRecord[],
  fallback?: string,
): string[] {
  if (images && images.length > 0) {
    const sorted = [...images].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    return sorted.map((image) => image.url).filter(Boolean);
  }

  return fallback ? [fallback] : [];
}

export function normalizeInventoryImages(raw: unknown): InventoryImageRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item, index): InventoryImageRecord | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const url = typeof record.url === "string" ? record.url.trim() : "";
      if (!url) {
        return null;
      }

      return {
        url,
        public_id:
          typeof record.public_id === "string" && record.public_id.trim()
            ? record.public_id.trim()
            : undefined,
        is_primary: record.is_primary === true || record.is_primary === "true",
        sort_order:
          typeof record.sort_order === "number"
            ? record.sort_order
            : index,
      };
    })
    .filter((item): item is InventoryImageRecord => item !== null);
}

export function ensurePrimaryInventoryImages(
  images: InventoryImageRecord[],
): InventoryImageRecord[] {
  if (images.length === 0) {
    return [];
  }

  const primaryCount = images.filter((image) => image.is_primary).length;
  if (primaryCount === 1) {
    return images.map((image, index) => ({
      ...image,
      sort_order: image.sort_order ?? index,
    }));
  }

  return images.map((image, index) => ({
    ...image,
    is_primary: index === 0,
    sort_order: image.sort_order ?? index,
  }));
}
