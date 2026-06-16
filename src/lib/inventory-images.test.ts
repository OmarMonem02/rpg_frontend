import { describe, expect, it } from "vitest";
import {
  ensurePrimaryInventoryImages,
  getGalleryImages,
  getPrimaryImageUrl,
  normalizeInventoryImages,
} from "./inventory-images";

describe("inventory-images helpers", () => {
  it("returns primary image url from images array", () => {
    const images = [
      { url: "https://example.com/a.jpg", is_primary: false, sort_order: 0 },
      { url: "https://example.com/b.jpg", is_primary: true, sort_order: 1 },
    ];

    expect(getPrimaryImageUrl(images)).toBe("https://example.com/b.jpg");
  });

  it("falls back to legacy image field when images are missing", () => {
    expect(getPrimaryImageUrl(undefined, "https://example.com/legacy.jpg")).toBe(
      "https://example.com/legacy.jpg",
    );
  });

  it("builds gallery urls in sort order", () => {
    const images = [
      { url: "https://example.com/b.jpg", is_primary: true, sort_order: 1 },
      { url: "https://example.com/a.jpg", is_primary: false, sort_order: 0 },
    ];

    expect(getGalleryImages(images)).toEqual([
      "https://example.com/a.jpg",
      "https://example.com/b.jpg",
    ]);
  });

  it("normalizes api image payloads", () => {
    const images = normalizeInventoryImages([
      { url: " https://example.com/a.jpg ", is_primary: "true", sort_order: 0 },
      { url: "", is_primary: false },
    ]);

    expect(images).toEqual([
      {
        url: "https://example.com/a.jpg",
        public_id: undefined,
        is_primary: true,
        sort_order: 0,
      },
    ]);
  });

  it("ensures exactly one primary image", () => {
    const images = ensurePrimaryInventoryImages([
      { url: "https://example.com/a.jpg", is_primary: false, sort_order: 0 },
      { url: "https://example.com/b.jpg", is_primary: false, sort_order: 1 },
    ]);

    expect(images.filter((image) => image.is_primary)).toHaveLength(1);
    expect(images[0]?.is_primary).toBe(true);
  });
});
