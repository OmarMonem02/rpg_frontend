export type SortOrder = "asc" | "desc";

export type QueryParams = {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_order?: SortOrder;
  filters?: Record<string, unknown>;
};

export type PaginatedResponse<T> = {
  items: T[];
  currentPage: number;
  lastPage: number;
};

export type MutationIdPayload<T> = {
  id: number;
  payload: T;
};
