/**
 * Pagination helpers — issue #1525
 */
export interface PaginationParams {
  cursor?: string | null;
  limit: number;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  return {
    cursor: searchParams.get('cursor'),
    limit: Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 100),
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortDirection: searchParams.get('sortDirection') === 'asc' ? 'asc' : 'desc',
  };
}

export function buildNextUrl(base: string, result: PaginatedResult<any>): string | null {
  if (!result.hasMore || !result.nextCursor) return null;
  const url = new URL(base, 'http://localhost');
  url.searchParams.set('cursor', result.nextCursor);
  return url.pathname + url.search;
}
