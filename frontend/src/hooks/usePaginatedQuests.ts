import { useState, useCallback } from 'react';

export function usePaginatedQuests(fetchFn: (cursor: string | null) => Promise<{ items: any[]; nextCursor: string | null }>) {
  const [items, setItems] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      const result = await fetchFn(cursor);
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        const deduped = result.items.filter((i) => !seen.has(i.id));
        return [...prev, ...deduped];
      });
      setCursor(result.nextCursor);
      setHasMore(!!result.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading, fetchFn]);

  return { items, hasMore, loading, error, loadMore, empty: items.length === 0 && !loading, terminal: !hasMore };
}
