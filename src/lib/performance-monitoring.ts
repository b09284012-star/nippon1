export type PerformanceSample = { cache_hits: number; cache_misses: number; requests: number; errors: number; latency_total: number; latency_max: number; realtime_connections: number };
export const emptySample = (): PerformanceSample => ({ cache_hits: 0, cache_misses: 0, requests: 0, errors: 0, latency_total: 0, latency_max: 0, realtime_connections: 0 });
let current = emptySample();
export function recordCacheResult(hit: boolean) { current[hit ? "cache_hits" : "cache_misses"] += 1; }
export function recordMarketResponse(duration: number, failed: boolean) {
  const ms = Math.min(60000, Math.max(0, duration));
  current.requests += 1; current.errors += failed ? 1 : 0; current.latency_total += ms; current.latency_max = Math.max(current.latency_max, ms);
}
export function takePerformanceSample(connections: number) {
  const result = { ...current, realtime_connections: Math.min(1, connections) };
  current = emptySample();
  return result;
}
export const PERFORMANCE_LIMITS = { connections: 100, requestsPerMinute: 300, latencyMs: 2000, errorRate: 0.1, minimumRequests: 5 };
export function performanceAlerts(s: PerformanceSample) {
  return {
    load: s.realtime_connections >= PERFORMANCE_LIMITS.connections || s.requests / 15 >= PERFORMANCE_LIMITS.requestsPerMinute,
    slow: s.requests >= PERFORMANCE_LIMITS.minimumRequests && s.latency_total / s.requests >= PERFORMANCE_LIMITS.latencyMs,
    errors: s.requests >= PERFORMANCE_LIMITS.minimumRequests && s.errors / s.requests >= PERFORMANCE_LIMITS.errorRate,
  };
}