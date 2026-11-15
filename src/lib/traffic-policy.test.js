import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { MARKET_CACHE_OPTIONS, canUseRealtime } from "./traffic-policy";

test("guests and unresolved sessions cannot use Realtime", () => {
  expect(canUseRealtime(null)).toBe(false);
  expect(canUseRealtime(undefined)).toBe(false);
  expect(canUseRealtime("signed-in-user", true)).toBe(false);
  expect(canUseRealtime("signed-in-user", false)).toBe(true);
});

test("market results are reused for two minutes, then fetched again", async () => {
  const client = new QueryClient();
  let calls = 0;
  const options = { ...MARKET_CACHE_OPTIONS, queryKey: ["listings", "ليبيا"], queryFn: async () => ++calls };
  try {
    expect(MARKET_CACHE_OPTIONS.staleTime).toBe(120_000);
    expect(await client.fetchQuery(options)).toBe(1);
    client.setQueryData(options.queryKey, 1, { updatedAt: Date.now() - 119_000 });
    expect(await client.fetchQuery(options)).toBe(1);
    expect(calls).toBe(1);
    client.setQueryData(options.queryKey, 1, { updatedAt: Date.now() - 121_000 });
    expect(await client.fetchQuery(options)).toBe(2);
    expect(calls).toBe(2);
    expect(await client.fetchQuery({ ...options, queryKey: ["listings", "مصر"] })).toBe(3);
    await client.invalidateQueries({ queryKey: ["listings"] });
    expect(await client.fetchQuery(options)).toBe(4);
  } finally {
    client.clear();
  }
});