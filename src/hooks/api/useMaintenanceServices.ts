import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMaintenanceService,
  deleteMaintenanceService,
  getMaintenanceService,
  listMaintenanceServiceSectors,
  listMaintenanceServices,
  updateMaintenanceService,
  type CreateMaintenanceServicePayload,
  type UpdateMaintenanceServicePayload,
} from "@/lib/crud-api";
import type { MutationIdPayload } from "@/types/api";
import { getRequiredToken } from "@/hooks/api/shared";

type MaintenanceServiceFilters = {
  search?: string;
  sector_id?: number;
  price_range?: string;
  currency?: string;
};

export const maintenanceServicesKeys = {
  all: ["maintenance-services"] as const,
  lists: () => [...maintenanceServicesKeys.all, "list"] as const,
  list: (page: number, filters?: MaintenanceServiceFilters) =>
    [...maintenanceServicesKeys.lists(), page, filters ?? {}] as const,
  details: () => [...maintenanceServicesKeys.all, "detail"] as const,
  detail: (id: number) => [...maintenanceServicesKeys.details(), id] as const,
  sectors: () => [...maintenanceServicesKeys.all, "sectors"] as const,
};

export function useMaintenanceServices(page = 1, filters?: MaintenanceServiceFilters) {
  return useQuery({
    queryKey: maintenanceServicesKeys.list(page, filters),
    queryFn: () => listMaintenanceServices(getRequiredToken(), page, filters),
  });
}

export function useMaintenanceService(id: number) {
  return useQuery({
    queryKey: maintenanceServicesKeys.detail(id),
    queryFn: () => getMaintenanceService(getRequiredToken(), id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useMaintenanceServiceSectors(page = 1) {
  return useQuery({
    queryKey: maintenanceServicesKeys.sectors(),
    queryFn: () => listMaintenanceServiceSectors(getRequiredToken(), page),
  });
}

export function useCreateMaintenanceService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMaintenanceServicePayload) =>
      createMaintenanceService(getRequiredToken(), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceServicesKeys.lists() });
    },
  });
}

export function useUpdateMaintenanceService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: MutationIdPayload<UpdateMaintenanceServicePayload>) =>
      updateMaintenanceService(getRequiredToken(), id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: maintenanceServicesKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: maintenanceServicesKeys.lists() });
    },
  });
}

export function useDeleteMaintenanceService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMaintenanceService(getRequiredToken(), id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceServicesKeys.lists() });
    },
  });
}
