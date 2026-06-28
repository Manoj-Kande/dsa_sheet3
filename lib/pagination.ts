export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export function parsePagination(searchParams: URLSearchParams, defaultLimit = 50): PaginationParams {
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? String(defaultLimit), 10)));
  return { page, limit, offset: (page - 1) * limit };
}

export function paginate<T>(items: T[], total: number, params: PaginationParams): PaginatedResponse<T> {
  return { items, total, page: params.page, limit: params.limit, hasMore: params.offset + items.length < total };
}
