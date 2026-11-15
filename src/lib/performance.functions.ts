import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const count = z.number().int().min(0).max(1000);
export const submitPerformanceSample = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ session: z.string().uuid(), cache_hits: count, cache_misses: count, requests: count, errors: count, latency_total: z.number().min(0).max(60000000), latency_max: z.number().min(0).max(60000), realtime_connections: z.number().int().min(0).max(1) }).strict().parse(input))
  .handler(async ({ data }) => {
    if (data.errors > data.requests) throw new Error("INVALID_SAMPLE");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("record_performance_sample", { _session: data.session, _hits: data.cache_hits, _misses: data.cache_misses, _requests: data.requests, _errors: data.errors, _latency_total: data.latency_total, _latency_max: data.latency_max, _connections: data.realtime_connections });
    if (error) throw new Error("MONITORING_UNAVAILABLE");
    return { ok: true };
  });

export const getPerformanceSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: allowed, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !allowed) throw new Error("FORBIDDEN");
    const { data, error } = await context.supabase.rpc("admin_performance_summary");
    if (error) throw new Error("MONITORING_UNAVAILABLE");
    return data;
  });