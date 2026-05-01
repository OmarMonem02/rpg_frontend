import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBrand,
  deleteBrand,
  fetchAllPages,
  listBrands,
  updateBrand,
  type BrandRecord,
  type CreateBrandPayload,
} from "@/lib/crud-api";
import type { MutationIdPayload } from "@/types/api";
import { getRequiredToken } from "@/hooks/api/shared";

type BrandType = "spare_parts" | "products" | "bikes";

export const brandsKeys = {
  all: ["brands"] as const,
  lists: () => [...brandsKeys.all, "list"] as const,
  list: (page: number, type?: BrandType) =>
    [...brandsKeys.lists(), page, type ?? "all"] as const,
  details: () => [...brandsKeys.all, "detail"] as const,
  detail: (id: number, type?: BrandType) =>
    [...brandsKeys.details(), id, type ?? "all"] as const,
};

export function useBrands(page = 1, type?: BrandType) {
  return useQuery({
    queryKey: brandsKeys.list(page, type),
    queryFn: () => listBrands(getRequiredToken(), page, type),
  });
}

export function useBrand(id: number, type?: BrandType) {
  return useQuery({
    queryKey: brandsKeys.detail(id, type),
    queryFn: async (): Promise<BrandRecord | null> => {
      const token = getRequiredToken();
      const all = await fetchAllPages((page) => listBrands(token, page, type));
      return all.find((item) => item.id === id) ?? null;
    },
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBrandPayload) =>
      createBrand(getRequiredToken(), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandsKeys.lists() });
    },
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: MutationIdPayload<CreateBrandPayload>) =>
      updateBrand(getRequiredToken(), id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: brandsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: brandsKeys.lists() });
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteBrand(getRequiredToken(), id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandsKeys.lists() });
    },
  });
}
