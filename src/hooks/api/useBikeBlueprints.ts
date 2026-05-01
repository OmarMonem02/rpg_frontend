import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBikeBlueprint,
  deleteBikeBlueprint,
  getBikeBlueprint,
  listBikeBlueprints,
  listBrands,
  updateBikeBlueprint,
  type CreateBikeBlueprintPayload,
} from "@/lib/crud-api";
import type { MutationIdPayload } from "@/types/api";
import { getRequiredToken } from "@/hooks/api/shared";

type BikeBlueprintFilters = {
  search?: string;
  brand_id?: number;
  price_range?: string;
  currency?: string;
};

export const bikeBlueprintsKeys = {
  all: ["bike-blueprints"] as const,
  lists: () => [...bikeBlueprintsKeys.all, "list"] as const,
  list: (page: number, filters?: BikeBlueprintFilters) =>
    [...bikeBlueprintsKeys.lists(), page, filters ?? {}] as const,
  details: () => [...bikeBlueprintsKeys.all, "detail"] as const,
  detail: (id: number) => [...bikeBlueprintsKeys.details(), id] as const,
  brands: () => [...bikeBlueprintsKeys.all, "brands"] as const,
};

export function useBikeBlueprints(page = 1, filters?: BikeBlueprintFilters) {
  return useQuery({
    queryKey: bikeBlueprintsKeys.list(page, filters),
    queryFn: () => listBikeBlueprints(getRequiredToken(), page, filters),
  });
}

export function useBikeBlueprint(id: number) {
  return useQuery({
    queryKey: bikeBlueprintsKeys.detail(id),
    queryFn: () => getBikeBlueprint(getRequiredToken(), id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useBikeBrandOptions(page = 1) {
  return useQuery({
    queryKey: bikeBlueprintsKeys.brands(),
    queryFn: () => listBrands(getRequiredToken(), page, "bikes"),
  });
}

export function useCreateBikeBlueprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBikeBlueprintPayload) =>
      createBikeBlueprint(getRequiredToken(), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bikeBlueprintsKeys.lists() });
    },
  });
}

export function useUpdateBikeBlueprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: MutationIdPayload<CreateBikeBlueprintPayload>) =>
      updateBikeBlueprint(getRequiredToken(), id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bikeBlueprintsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: bikeBlueprintsKeys.lists() });
    },
  });
}

export function useDeleteBikeBlueprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteBikeBlueprint(getRequiredToken(), id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bikeBlueprintsKeys.lists() });
    },
  });
}
