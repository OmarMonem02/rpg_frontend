export type BrandType = "spare_parts" | "products" | "maintenance_parts" | "bikes";

export const BRAND_TYPE_OPTIONS: { value: BrandType; label: string }[] = [
  { value: "spare_parts", label: "Spare Parts" },
  { value: "products", label: "Products" },
  { value: "maintenance_parts", label: "Maintenance Parts" },
  { value: "bikes", label: "Bikes" },
];

export function brandHasType(
  brand: { types: BrandType[] },
  type: BrandType,
): boolean {
  return brand.types.includes(type);
}

export function filterBrandsByType<T extends { types: BrandType[] }>(
  brands: T[],
  type: BrandType,
): T[] {
  return brands.filter((brand) => brandHasType(brand, type));
}

export function formatBrandType(type: BrandType): string {
  return type.replaceAll("_", " ");
}

export function formatBrandTypes(types: BrandType[]): string {
  return types.map(formatBrandType).join(", ");
}
