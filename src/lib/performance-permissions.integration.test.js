import { afterAll, beforeAll, describe, expect, test } from "bun:test";
describe.skipIf(process.env.RUN_PERFORMANCE_INTEGRATION !== "1")("performance access boundaries", () => {
  const url = process.env.SUPABASE_URL;
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  let id, token;
  const call = async (path, credential, body, bearer) => {
    const response = await fetch(`${url}${path}`, { method: body ? "POST" : "GET", headers: { apikey: credential, "Content-Type": "application/json", ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { ok: response.ok, data: await response.json() };
  };
  beforeAll(async () => {
    const email = `performance-${crypto.randomUUID()}@example.com`, password = crypto.randomUUID() + "Aa9!";
    const created = await call("/auth/v1/admin/users", admin, { email, password, email_confirm: true });
    if (!created.ok) throw new Error("Fixture failed");
    id = created.data.id;
    const signed = await call("/auth/v1/token?grant_type=password", key, { email, password });
    token = signed.data.access_token;
  });
  afterAll(async () => {
    if (id) {
      await fetch(`${url}/rest/v1/staff_assignments?user_id=eq.${id}`, { method: "DELETE", headers: { apikey: admin } });
      await fetch(`${url}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: { apikey: admin } });
    }
  });
  test("guests cannot read samples or summaries", async () => {
    expect((await call("/rest/v1/performance_samples", key)).ok).toBe(false);
    expect((await call("/rest/v1/rpc/admin_performance_summary", key, {})).ok).toBe(false);
  });
  test("ordinary users cannot read aggregate summaries or raw samples", async () => {
    expect((await call("/rest/v1/performance_samples", key, undefined, token)).data).toEqual([]);
    expect((await call("/rest/v1/rpc/admin_performance_summary", key, {}, token)).ok).toBe(false);
  });
  test("delegated forum staff cannot read monitoring", async () => {
    expect((await call("/rest/v1/staff_assignments", admin, { user_id: id, responsibility: "forum", assigned_by: id })).ok).toBe(true);
    expect((await call("/rest/v1/rpc/admin_performance_summary", key, {}, token)).ok).toBe(false);
  });
  test("client direct writes are refused", async () => {
    expect((await call("/rest/v1/rpc/record_performance_sample", key, { _session: crypto.randomUUID(), _hits: 1, _misses: 1, _requests: 1, _errors: 0, _latency_total: 100, _latency_max: 100, _connections: 0 }, token)).ok).toBe(false);
  });
});