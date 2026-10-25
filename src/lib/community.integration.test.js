import { afterAll, beforeAll, describe, expect, test } from "bun:test";

// Live authorization checks use disposable accounts and never production user credentials.
const enabled = process.env.RUN_COMMUNITY_INTEGRATION === "1";
describe.skipIf(!enabled)("community database authorization", () => {
  const url = process.env.SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const users = [];
  let listingId;
  let conversationId;
  let postId;
  const call = async (path, key, method = "GET", body, token) => {
    const response = await fetch(`${url}${path}`, { method, headers: {
      apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : key?.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }),
      "Content-Type": "application/json", Prefer: "return=representation",
    }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const text = await response.text();
    return { ok: response.ok, status: response.status, data: text ? JSON.parse(text) : null };
  };
  const as = (user, path, method, body) => call(path, publicKey, method, body, user.token);
  beforeAll(async () => {
    if (!url || !adminKey || !publicKey) throw new Error("Integration configuration unavailable");
    for (const country of ["ليبيا", "ليبيا", "مصر"]) {
      const email = `community-check-${crypto.randomUUID()}@example.com`;
      const password = crypto.randomUUID() + "Aa9!";
      const created = await call("/auth/v1/admin/users", adminKey, "POST", { email, password, email_confirm: true, user_metadata: { display_name: "Community check", country } });
      if (!created.ok) throw new Error("Temporary account setup failed");
      const user = { id: created.data.id };
      users.push(user);
      const signed = await call("/auth/v1/token?grant_type=password", publicKey, "POST", { email, password });
      if (!signed.ok) throw new Error("Temporary account sign-in failed");
      user.token = signed.data.access_token;
      const info = await call("/rest/v1/user_private_info?on_conflict=user_id", adminKey, "POST", { user_id: user.id, country, full_name: "Test", phone: "000000", address: "Test", city: "Test" });
      if (!info.ok) throw new Error("Country fixture failed");
    }
    const listing = await call("/rest/v1/listings", adminKey, "POST", { seller_id: users[0].id, title: "Temporary community test", brand: "Test", model: "Test", hashrate: "1", power_watts: 1, condition: "Test", price_usd: 10, warranty_months: 1, description: "Temporary permission test only", images: [] });
    if (!listing.ok) throw new Error("Listing fixture failed");
    listingId = listing.data[0].id;
    const conv = await as(users[1], "/rest/v1/conversations", "POST", { listing_id: listingId, buyer_id: users[1].id, seller_id: users[0].id });
    if (!conv.ok) throw new Error("Conversation fixture failed");
    conversationId = conv.data[0].id;
    const post = await as(users[0], "/rest/v1/forum_posts", "POST", { author_id: users[0].id, channel: "general", body: "Temporary country boundary test", country: "مصر" });
    if (!post.ok) throw new Error("Forum fixture failed");
    postId = post.data[0].id;
  });
  afterAll(async () => {
    if (postId) await call(`/rest/v1/forum_posts?id=eq.${postId}`, adminKey, "DELETE");
    if (conversationId) { await call(`/rest/v1/messages?conversation_id=eq.${conversationId}`, adminKey, "DELETE"); await call(`/rest/v1/conversations?id=eq.${conversationId}`, adminKey, "DELETE"); }
    if (listingId) await call(`/rest/v1/listings?id=eq.${listingId}`, adminKey, "DELETE");
    for (const user of users) {
      await call(`/rest/v1/staff_assignments?user_id=eq.${user.id}`, adminKey, "DELETE");
      await call(`/auth/v1/admin/users/${user.id}`, adminKey, "DELETE");
    }
  });
  test("forum country is derived from registration, not a forged insert value", async () => {
    const result = await as(users[0], `/rest/v1/forum_posts?id=eq.${postId}`);
    expect(result.data[0].country).toBe("ليبيا");
  });
  test("users in another country cannot read forum posts", async () => {
    const result = await as(users[2], `/rest/v1/forum_posts?id=eq.${postId}`);
    expect(result.data).toEqual([]);
  });
  test("same-country users can create and exchange private messages", async () => {
    const result = await as(users[1], "/rest/v1/messages", "POST", { conversation_id: conversationId, sender_id: users[1].id, body: "Same-country test" });
    expect(result.ok).toBe(true);
    const read = await as(users[0], `/rest/v1/messages?conversation_id=eq.${conversationId}`);
    expect(read.data.some(m => m.body === "Same-country test")).toBe(true);
  });
  test("cross-country private conversations are refused", async () => {
    const result = await as(users[2], "/rest/v1/conversations", "POST", { listing_id: listingId, buyer_id: users[2].id, seller_id: users[0].id });
    expect(result.ok).toBe(false);
  });
  test("forum staff read other countries but cannot access finance or private users", async () => {
    await call("/rest/v1/staff_assignments", adminKey, "POST", { user_id: users[2].id, responsibility: "forum", assigned_by: users[0].id });
    expect((await as(users[2], `/rest/v1/forum_posts?id=eq.${postId}`)).data.length).toBe(1);
    expect((await as(users[2], "/rest/v1/rpc/admin_finance_summary", "POST", {})).ok).toBe(false);
    expect((await as(users[2], `/rest/v1/user_private_info?user_id=eq.${users[0].id}`)).data).toEqual([]);
    expect((await as(users[2], "/rest/v1/rpc/assign_staff", "POST", { _user_id: users[2].id, _responsibility: "disputes", _enabled: true })).ok).toBe(false);
  });
  test("dispute staff cannot read ordinary private conversations or order shipping data", async () => {
    await call("/rest/v1/staff_assignments", adminKey, "POST", { user_id: users[2].id, responsibility: "disputes", assigned_by: users[0].id });
    expect((await as(users[2], `/rest/v1/conversations?id=eq.${conversationId}`)).data).toEqual([]);
    expect((await as(users[2], "/rest/v1/rpc/staff_disputes", "POST", {})).ok).toBe(true);
    expect((await as(users[2], "/rest/v1/rpc/admin_users_full", "POST", {})).ok).toBe(false);
  });
});