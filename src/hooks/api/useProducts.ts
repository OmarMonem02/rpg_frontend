import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listBrands,
  listProductCategories,
  listProducts,
  updateProduct,
  type CreateProductPayload,
  type UpdateProductPayload,
} from "@/lib/crud-api";
import type { MutationIdPayload } from "@/types/api";
import { getRequiredToken } from "@/hooks/api/shared";

type ProductFilters = {
  search?: string;
  category_id?: number;
  brand_id?: number;
  price_range?: string;
  currency?: string;
  low_stock?: boolean;
};

export const productsKeys = {
  all: ["products"] as const,
  lists: () => [...productsKeys.all, "list"] as const,
  list: (page: number, filters?: ProductFilters) =>
    [...productsKeys.lists(), page, filters ?? {}] as const,
  details: () => [...productsKeys.all, "detail"] as const,
  detail: (id: number) => [...productsKeys.details(), id] as const,
  categories: () => [...productsKeys.all, "categories"] as const,
  brands: () => [...productsKeys.all, "brands"] as const,
};

export function useProducts(page = 1, filters?: ProductFilters) {
  return useQuery({
    queryKey: productsKeys.list(page, filters),
    queryFn: () => listProducts(getRequiredToken(), page, filters),
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: productsKeys.detail(id),
    queryFn: () => getProduct(getRequiredToken(), id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useProductCategories(page = 1) {
  return useQuery({
    queryKey: productsKeys.categories(),
    queryFn: () => listProductCategories(getRequiredToken(), page),
  });
}

export function useProductBrands(page = 1) {
  return useQuery({
    queryKey: productsKeys.brands(),
    queryFn: () => listBrands(getRequiredToken(), page, { type: "products" }),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) =>
      createProduct(getRequiredToken(), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: MutationIdPayload<UpdateProductPayload>) =>
      updateProduct(getRequiredToken(), id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProduct(getRequiredToken(), id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
    },
  });
}
