/** Public listing caches stay fresh for two minutes; explicit invalidation still wins. */
export const MARKET_CACHE_OPTIONS = {
  staleTime: 120_000,
  gcTime: 300_000,
} as const;

export function canUseRealtime(userId: string | null | undefined, loading = false) {
  return Boolean(userId) && !loading;
}