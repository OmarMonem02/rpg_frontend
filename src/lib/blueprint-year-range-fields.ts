import type { FieldConfig } from "@/components/entity-form";
import {
  bulkCreateBikeBlueprintsByYearRange,
  createBikeBlueprint,
  type BikeBlueprintRecord,
  type BulkCreateBikeBlueprintByYearRangeResult,
} from "@/lib/crud-api";

const DEFAULT_MIN_YEAR = 1900;

export function getBlueprintMaxYear(): number {
  return new Date().getFullYear() + 1;
}

export function parseOptionalNumber(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function computeBlueprintYearCount(
  yearFrom: unknown,
  yearTo: unknown,
): number | undefined {
  const from = parseOptionalNumber(yearFrom);
  const to = parseOptionalNumber(yearTo);
  if (from === undefined || to === undefined || from > to) {
    return undefined;
  }
  return to - from + 1;
}

export function formatBulkBlueprintSummary(
  result: BulkCreateBikeBlueprintByYearRangeResult,
): string {
  const parts: string[] = [];
  if (result.count_created > 0) {
    parts.push(
      `${result.count_created} created`,
    );
  }
  if (result.count_restored > 0) {
    parts.push(`${result.count_restored} restored`);
  }
  if (result.count_skipped > 0) {
    parts.push(`${result.count_skipped} skipped`);
  }
  return parts.length > 0 ? parts.join(", ") : "No blueprints created";
}

export function resolveBlueprintSubmitLabel(
  formData: Record<string, unknown>,
  options?: { createPrefix?: string; singleLabel?: string },
): string {
  const createPrefix = options?.createPrefix ?? "Create";
  const singleLabel = options?.singleLabel ?? `${createPrefix} Blueprint`;

  if (formData.use_year_range === true) {
    const count = computeBlueprintYearCount(
      formData.year_from,
      formData.year_to,
    );
    if (count !== undefined) {
      return `${createPrefix} ${count} Blueprint${count === 1 ? "" : "s"}`;
    }
    return `${createPrefix} Blueprints`;
  }

  return singleLabel;
}

export type BlueprintYearRangeFieldOptions = {
  section?: string;
  singleYearValue?: number;
  maxYear?: number;
  minYear?: number;
  includeToggle?: boolean;
};

export function buildBlueprintYearRangeFields(
  options: BlueprintYearRangeFieldOptions = {},
): FieldConfig[] {
  const section = options.section ?? "Identity";
  const maxYear = options.maxYear ?? getBlueprintMaxYear();
  const minYear = options.minYear ?? DEFAULT_MIN_YEAR;
  const includeToggle = options.includeToggle ?? true;

  const fields: FieldConfig[] = [];

  if (includeToggle) {
    fields.push({
      name: "use_year_range",
      label: "Create Multiple Years",
      type: "toggle",
      section,
      description:
        "Enable to create one blueprint per year in a range (e.g. 2000–2026).",
      value: false,
    });
  }

  fields.push(
    {
      name: "year",
      label: "Production Year",
      type: "number",
      required: true,
      section,
      description: "Set the manufacturing year for this model definition.",
      placeholder: "2024",
      value: options.singleYearValue,
      min: minYear,
      max: maxYear,
      disabled: (formData) => formData.use_year_range === true,
    },
    {
      name: "year_from",
      label: "Year From",
      type: "number",
      required: true,
      section,
      description: "First production year in the range.",
      placeholder: "2000",
      min: minYear,
      max: maxYear,
      disabled: (formData) => formData.use_year_range !== true,
      onValueChange: ({ value, formData }) => {
        const selectedFrom = parseOptionalNumber(value);
        const selectedTo = parseOptionalNumber(formData.year_to);
        if (
          selectedFrom !== undefined &&
          selectedTo !== undefined &&
          selectedFrom > selectedTo
        ) {
          return { year_to: String(selectedFrom) };
        }
      },
    },
    {
      name: "year_to",
      label: "Year To",
      type: "number",
      required: true,
      section,
      description: "Last production year in the range.",
      placeholder: String(maxYear),
      min: minYear,
      max: maxYear,
      disabled: (formData) => formData.use_year_range !== true,
    },
  );

  return fields;
}

export type CreateBlueprintsFromFormDataResult = {
  blueprints: BikeBlueprintRecord[];
  summary?: string;
  bulkResult?: BulkCreateBikeBlueprintByYearRangeResult;
};

export async function createBlueprintsFromFormData(
  token: string,
  formData: Record<string, unknown>,
): Promise<CreateBlueprintsFromFormDataResult> {
  const brandId = Number(formData.brand_id);
  const model = String(formData.model);

  if (formData.use_year_range === true) {
    const yearFrom = Number(formData.year_from);
    const yearTo = Number(formData.year_to);
    const bulkResult = await bulkCreateBikeBlueprintsByYearRange(token, {
      brand_id: brandId,
      model,
      year_from: yearFrom,
      year_to: yearTo,
    });

    return {
      blueprints: [...bulkResult.created, ...bulkResult.restored],
      summary: formatBulkBlueprintSummary(bulkResult),
      bulkResult,
    };
  }

  const created = await createBikeBlueprint(token, {
    brand_id: brandId,
    model,
    year: Number(formData.year),
  });

  return { blueprints: [created] };
}
