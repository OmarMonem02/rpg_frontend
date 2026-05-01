import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBike,
  deleteBike,
  getBike,
  listBikes,
  updateBike,
  type CreateBikePayload,
  type UpdateBikePayload,
} from "@/lib/crud-api";
import type { MutationIdPayload } from "@/types/api";
import { getRequiredToken } from "@/hooks/api/shared";

type BikeFilters = {
  search?: string;
  blueprint_id?: number;
  brand_id?: number;
  status?: string;
  price_range?: string;
  currency?: string;
};

export const bikesKeys = {
  all: ["bikes"] as const,
  lists: () => [...bikesKeys.all, "list"] as const,
  list: (page: number, filters?: BikeFilters) =>
    [...bikesKeys.lists(), page, filters ?? {}] as const,
  details: () => [...bikesKeys.all, "detail"] as const,
  detail: (id: number) => [...bikesKeys.details(), id] as const,
};

export function useBikes(page = 1, filters?: BikeFilters) {
  return useQuery({
    queryKey: bikesKeys.list(page, filters),
    queryFn: () => listBikes(getRequiredToken(), page, filters),
  });
}

export function useBike(id: number) {
  return useQuery({
    queryKey: bikesKeys.detail(id),
    queryFn: () => getBike(getRequiredToken(), id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateBike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBikePayload) => createBike(getRequiredToken(), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bikesKeys.lists() });
    },
  });
}

export function useUpdateBike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: MutationIdPayload<UpdateBikePayload>) =>
      updateBike(getRequiredToken(), id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bikesKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: bikesKeys.lists() });
    },
  });
}

export function useDeleteBike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteBike(getRequiredToken(), id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bikesKeys.lists() });
    },
  });
}
