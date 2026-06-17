import type { LookupItemKind } from "@/lib/item-lookup";

export type CountItemType = LookupItemKind;

export type CountLine = {
  type: CountItemType;
  id: number;
  name: string;
  sku: string;
  partNumber?: string;
  image?: string;
  systemQty: number;
  counted: number;
};

export type CountListTab = "all" | "matches" | "discrepancies";

export type DiscrepancyStatus = "match" | "shortage" | "surplus";

export type StocktakeExportRow = {
  type: CountItemType;
  id: number;
  counted: number;
};

export type StocktakeSummary = {
  itemsCounted: number;
  matches: number;
  discrepancies: number;
  shortages: number;
  surpluses: number;
  netVariance: number;
  matchRate: number;
  totalSystemStock: number;
  totalCounted: number;
  absVariance: number;
};

export type CountWorkflowStep = "scan" | "review" | "export";

/** Physical count minus the system stock quantity. Negative means shortage. */
export function computeVariance(line: CountLine): number {
  return line.counted - line.systemQty;
}

export function getDiscrepancyStatus(variance: number): DiscrepancyStatus {
  if (variance < 0) return "shortage";
  if (variance > 0) return "surplus";
  return "match";
}

export function hasDiscrepancy(line: CountLine): boolean {
  return computeVariance(line) !== 0;
}

export function summarize(lines: CountLine[]): StocktakeSummary {
  const base = lines.reduce(
    (acc, line) => {
      const variance = computeVariance(line);
      acc.itemsCounted += 1;
      acc.netVariance += variance;
      acc.totalSystemStock += line.systemQty;
      acc.totalCounted += line.counted;
      acc.absVariance += Math.abs(variance);
      if (variance === 0) {
        acc.matches += 1;
      } else {
        acc.discrepancies += 1;
        if (variance < 0) acc.shortages += 1;
        if (variance > 0) acc.surpluses += 1;
      }
      return acc;
    },
    {
      itemsCounted: 0,
      matches: 0,
      discrepancies: 0,
      shortages: 0,
      surpluses: 0,
      netVariance: 0,
      totalSystemStock: 0,
      totalCounted: 0,
      absVariance: 0,
    },
  );

  return {
    ...base,
    matchRate:
      base.itemsCounted > 0
        ? Math.round((base.matches / base.itemsCounted) * 100)
        : 0,
  };
}

export function getWorkflowStep(
  lines: CountLine[],
  summary: StocktakeSummary,
): CountWorkflowStep {
  if (lines.length === 0) return "scan";
  if (summary.discrepancies > 0) return "export";
  return "review";
}

/** Only discrepant lines are sent to the report endpoint. */
export function toExportRows(lines: CountLine[]): StocktakeExportRow[] {
  return lines
    .filter(hasDiscrepancy)
    .map((line) => ({ type: line.type, id: line.id, counted: line.counted }));
}

export function filterCountLines(
  lines: CountLine[],
  tab: CountListTab,
): CountLine[] {
  if (tab === "matches") {
    return lines.filter((line) => !hasDiscrepancy(line));
  }
  if (tab === "discrepancies") {
    return lines.filter(hasDiscrepancy);
  }
  return lines;
}

export type CountSortKey = "name" | "sku" | "variance" | "type" | "default";

/** Discrepancies first, then by name (the default sort). */
export function sortCountLines(lines: CountLine[]): CountLine[] {
  return sortCountLinesBy(lines, "default");
}

/** Sort lines by user-selected key. "default" = discrepancies first → name. */
export function sortCountLinesBy(lines: CountLine[], key: CountSortKey): CountLine[] {
  return [...lines].sort((a, b) => {
    switch (key) {
      case "sku":
        return a.sku.localeCompare(b.sku);
      case "variance": {
        const vA = Math.abs(computeVariance(a));
        const vB = Math.abs(computeVariance(b));
        return vB - vA || a.name.localeCompare(b.name);
      }
      case "type":
        return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
      case "name":
        return a.name.localeCompare(b.name);
      case "default":
      default: {
        const aDisc = hasDiscrepancy(a);
        const bDisc = hasDiscrepancy(b);
        if (aDisc !== bDisc) return aDisc ? -1 : 1;
        return a.name.localeCompare(b.name);
      }
    }
  });
}

export type CountVarianceFilter = "all" | "positive" | "negative" | "zero";

export function matchesCountSearch(line: CountLine, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const skuHaystack = [line.sku, line.partNumber ?? ""]
    .join(" ")
    .toLowerCase();
  if (skuHaystack.includes(normalized)) return true;
  return line.name.toLowerCase().includes(normalized);
}

export function matchesCountSkuSearch(line: CountLine, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [line.sku, line.partNumber ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

export function matchesCountVariance(
  line: CountLine,
  filter: CountVarianceFilter,
): boolean {
  if (filter === "all") return true;
  const variance = line.counted - line.systemQty;
  if (filter === "positive") return variance > 0;
  if (filter === "negative") return variance < 0;
  return variance === 0;
}

export function matchesCountStockRange(
  line: CountLine,
  min?: number,
  max?: number,
): boolean {
  if (min === undefined && max === undefined) return true;
  const qty = line.systemQty;
  if (min !== undefined && qty < min) return false;
  if (max !== undefined && qty > max) return false;
  return true;
}
