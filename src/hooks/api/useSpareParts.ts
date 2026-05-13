import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignSparePartToBikeBlueprint,
  createSparePart,
  deleteSparePart,
  fetchAllPages,
  getSparePart,
  listBikeBlueprintFilterModels,
  listBikeBlueprintFilterYears,
  listBikeBlueprints,
  listBrands,
  listSparePartCategories,
  listSpareParts,
  removeSparePartFromBikeBlueprint,
  updateSparePart,
  type CreateSparePartPayload,
  type SparePartRecord,
  type UpdateSparePartPayload,
} from "@/lib/crud-api";
import type { MutationIdPayload } from "@/types/api";
import { getRequiredToken } from "@/hooks/api/shared";

type SparePartFilters = {
  search?: string;
  category_id?: number;
  brand_id?: number;
  price_range?: string;
  currency?: string;
  low_stock?: boolean;
  bike_brand_id?: number;
  bike_model?: string;
  bike_year?: number;
  bike_year_from?: number;
  bike_year_to?: number;
};

export const sparePartsKeys = {
  all: ["spare-parts"] as const,
  lists: () => [...sparePartsKeys.all, "list"] as const,
  list: (page: number, filters?: SparePartFilters) =>
    [...sparePartsKeys.lists(), page, filters ?? {}] as const,
  details: () => [...sparePartsKeys.all, "detail"] as const,
  detail: (id: number) => [...sparePartsKeys.details(), id] as const,
  categories: () => [...sparePartsKeys.all, "categories"] as const,
  brands: () => [...sparePartsKeys.all, "brands"] as const,
  bikeBlueprints: () => [...sparePartsKeys.all, "bike-blueprints"] as const,
};

export function useSpareParts(page = 1, filters?: SparePartFilters) {
  return useQuery({
    queryKey: sparePartsKeys.list(page, filters),
    queryFn: () => listSpareParts(getRequiredToken(), page, filters),
  });
}

export function useSparePart(id: number) {
  return useQuery({
    queryKey: sparePartsKeys.detail(id),
    queryFn: () => getSparePart(getRequiredToken(), id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useSparePartFormDependencies() {
  const categories = useQuery({
    queryKey: sparePartsKeys.categories(),
    queryFn: () =>
      fetchAllPages((page) => listSparePartCategories(getRequiredToken(), page)),
  });

  const brands = useQuery({
    queryKey: sparePartsKeys.brands(),
    queryFn: () => fetchAllPages((page) => listBrands(getRequiredToken(), page)),
  });

  const bikeBlueprints = useQuery({
    queryKey: sparePartsKeys.bikeBlueprints(),
    queryFn: () =>
      fetchAllPages((page) => listBikeBlueprints(getRequiredToken(), page)),
  });

  return { categories, brands, bikeBlueprints };
}

export function useCreateSparePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSparePartPayload) =>
      createSparePart(getRequiredToken(), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sparePartsKeys.lists() });
    },
  });
}

export function useUpdateSparePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: MutationIdPayload<UpdateSparePartPayload>) =>
      updateSparePart(getRequiredToken(), id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sparePartsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: sparePartsKeys.lists() });
    },
  });
}

export function useDeleteSparePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteSparePart(getRequiredToken(), id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sparePartsKeys.lists() });
    },
  });
}

export function useSyncSparePartBlueprints() {
  return useMutation({
    mutationFn: async ({
      sparePart,
      currentBlueprintIds,
      selectedBlueprintIds,
    }: {
      sparePart: SparePartRecord;
      currentBlueprintIds: number[];
      selectedBlueprintIds: number[];
    }) => {
      const token = getRequiredToken();
      const toAdd = selectedBlueprintIds.filter((id) => !currentBlueprintIds.includes(id));
      const toRemove = currentBlueprintIds.filter((id) => !selectedBlueprintIds.includes(id));

      await Promise.all(
        toRemove.map((blueprintId) =>
          removeSparePartFromBikeBlueprint(token, blueprintId, sparePart.id),
        ),
      );

      await Promise.all(
        toAdd.map((blueprintId) =>
          assignSparePartToBikeBlueprint(token, blueprintId, {
            spare_part_id: sparePart.id,
          }),
        ),
      );
    },
  });
}

export function useGetBikeModels(brandId?: number) {
  return useQuery({
    queryKey: ["bike-models", brandId],
    queryFn: () =>
      listBikeBlueprintFilterModels(getRequiredToken(), brandId as number),
    enabled: typeof brandId === "number" && brandId > 0,
  });
}

export function useGetBikeYears(brandId?: number, model?: string) {
  const modelTrimmed = model?.trim();
  return useQuery({
    queryKey: ["bike-years", brandId, modelTrimmed],
    queryFn: () =>
      listBikeBlueprintFilterYears(
        getRequiredToken(),
        brandId as number,
        modelTrimmed as string,
      ),
    enabled:
      typeof brandId === "number" &&
      brandId > 0 &&
      !!modelTrimmed &&
      modelTrimmed.length > 0,
  });
}
