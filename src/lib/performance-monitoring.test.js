import { expect, test } from "bun:test";
import { emptySample, performanceAlerts, recordCacheResult, recordMarketResponse, takePerformanceSample } from "./performance-monitoring";
test("measures cache hits, misses and actual request time separately", () => {
  takePerformanceSample(0);
  recordCacheResult(true); recordCacheResult(false); recordMarketResponse(250, false);
  expect(takePerformanceSample(1)).toEqual({ cache_hits: 1, cache_misses: 1, requests: 1, errors: 0, latency_total: 250, latency_max: 250, realtime_connections: 1 });
  expect(takePerformanceSample(0)).toEqual(emptySample());
});
test("load alert starts at 100 observed sockets or 300 requests per minute", () => {
  expect(performanceAlerts({ ...emptySample(), realtime_connections: 99 }).load).toBe(false);
  expect(performanceAlerts({ ...emptySample(), realtime_connections: 100 }).load).toBe(true);
  expect(performanceAlerts({ ...emptySample(), requests: 4500 }).load).toBe(true);
});
test("slow and error alerts require at least five requests", () => {
  expect(performanceAlerts({ ...emptySample(), requests: 4, latency_total: 10000, errors: 4 })).toEqual({ load: false, slow: false, errors: false });
  expect(performanceAlerts({ ...emptySample(), requests: 5, latency_total: 10000, errors: 1 })).toEqual({ load: false, slow: true, errors: true });
});