import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
const enabled = process.env.RUN_COMPANY_INTEGRATION === '1';
describe.skipIf(!enabled)('exclusive international company marketplace', () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const users = [];
  const listings = [];
  const conversations = [];
  const orders = [];
  let logoPath;
  const call = async (path, credential, method = 'GET', data, token) => {
    const response = await fetch(`${url}${path}`, { method, headers: { apikey: credential,
      ...(token ? { Authorization: `Bearer ${token}` } : credential?.startsWith('sb_') ? {} : { Authorization: `Bearer ${credential}` }),
      'Content-Type': 'application/json', Prefer: 'return=representation,resolution=merge-duplicates' }, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
    const text = await response.text(); return { ok: response.ok, status: response.status, data: text ? JSON.parse(text) : null };
  };
  const as = (user, path, method = 'GET', data) => call(path, key, method, data, user.token);
  const rpc = (user, name, data = {}) => as(user, `/rest/v1/rpc/${name}`, 'POST', data);
  beforeAll(async () => {
    if (!url || !key || !adminKey) throw new Error('Integration configuration unavailable');
    for (const [name, country] of [['Company', 'ليبيا'], ['Buyer', 'مصر'], ['Ordinary', 'مصر'], ['Manager', 'ليبيا'], ['Other company', 'مصر']]) {
      const email = `company-test-${crypto.randomUUID()}@example.com`, password = crypto.randomUUID() + 'Aa9!';
      const created = await call('/auth/v1/admin/users', adminKey, 'POST', { email, password, email_confirm: true, user_metadata: { display_name: name, country } });
      if (!created.ok) throw new Error('Test account creation failed');
      const user = { id: created.data.id };
      users.push(user);
      const signed = await call('/auth/v1/token?grant_type=password', key, 'POST', { email, password });
      if (!signed.ok) throw new Error('Test sign-in failed');
      user.token = signed.data.access_token;
      if (!(await call('/rest/v1/user_private_info?on_conflict=user_id', adminKey, 'POST', { user_id: user.id, country, full_name: 'Test only', phone: '000000', address: 'Test only' })).ok) throw new Error('Country setup failed');
    }
    for (const user of [users[0], users[1], users[4]]) {
      if (!(await call(`/rest/v1/profiles?id=eq.${user.id}`, adminKey, 'PATCH', { is_verified_seller: true })).ok) throw new Error('Verification setup failed');
    }
    if (!(await call('/rest/v1/user_roles', adminKey, 'POST', { user_id: users[3].id, role: 'admin' })).ok) throw new Error('Manager setup failed');
    for (const user of [users[0], users[4]]) {
      if (!(await rpc(users[3], 'admin_configure_company', { _user_id: user.id, _enabled: true, _fee_percent: 2 })).ok) throw new Error('Company activation failed');
    }
    await call('/rest/v1/company_profiles?on_conflict=user_id', adminKey, 'POST', { user_id: users[0].id, company_name: 'Integration company', contact_email: 'business@example.com' });
    await call(`/rest/v1/wallets?user_id=eq.${users[1].id}`, adminKey, 'PATCH', { balance: 5000 });
    for (const user of [users[0], users[1]]) {
      const offer = await as(user, '/rest/v1/listings', 'POST', { seller_id: user.id, title: 'International test miner', brand: 'Test', model: 'Model', hashrate: '100 TH/s', power_watts: 1000, condition: 'Test', price_usd: 100, warranty_months: 1, description: 'Temporary company permission test', images: [], quantity: 10 });
      if (!offer.ok) throw new Error(`Offer setup failed: ${offer.data?.message ?? offer.status}`); listings.push(offer.data[0].id);
    }
  });
  afterAll(async () => {
    for (const id of conversations) { await call(`/rest/v1/messages?conversation_id=eq.${id}`, adminKey, 'DELETE'); await call(`/rest/v1/conversations?id=eq.${id}`, adminKey, 'DELETE'); }
    for (const id of orders) { await call(`/rest/v1/wallet_transactions?reference=eq.${id}`, adminKey, 'DELETE'); await call(`/rest/v1/orders?id=eq.${id}`, adminKey, 'DELETE'); }
    for (const id of listings) await call(`/rest/v1/listings?id=eq.${id}`, adminKey, 'DELETE');
    if (logoPath) await call('/storage/v1/object/company-logos', adminKey, 'DELETE', { prefixes: [logoPath] });
    for (const user of users) await call(`/auth/v1/admin/users/${user.id}`, adminKey, 'DELETE');
  });
  test('guests cannot call company inventory or directory', async () => {
    expect((await call('/rest/v1/rpc/company_market_listings', key, 'POST', {})).ok).toBe(false);
    expect((await call('/rest/v1/rpc/company_directory', key, 'POST', {})).ok).toBe(false);
  });
  test('unverified accounts cannot read company offers through inventory or direct listing requests', async () => {
    expect((await rpc(users[2], 'company_market_listings')).data).toEqual([]);
    expect((await rpc(users[2], 'company_directory')).data).toEqual([]);
    expect((await as(users[2], `/rest/v1/listings?id=eq.${listings[0]}`)).data).toEqual([]);
    expect((await rpc(users[2], 'can_shop_companies')).data).toBe(false);
  });
  test('verified sellers in another country can access international company offers', async () => {
    expect((await rpc(users[1], 'company_market_listings')).data.some(row => row.id === listings[0])).toBe(true);
    expect((await as(users[1], `/rest/v1/listings?id=eq.${listings[0]}`)).data.length).toBe(1);
  });
  test('only the manager can activate companies and change fees', async () => {
    expect((await rpc(users[0], 'admin_configure_company', { _user_id: users[0].id, _enabled: true, _fee_percent: 0 })).ok).toBe(false);
    await as(users[0], `/rest/v1/company_settings?user_id=eq.${users[0].id}`, 'PATCH', { fee_percent: 0 });
    expect((await as(users[0], `/rest/v1/company_settings?user_id=eq.${users[0].id}`)).data[0].fee_percent).toBe(2);
    expect((await rpc(users[3], 'admin_configure_company', { _user_id: users[2].id, _enabled: true, _fee_percent: 2 })).ok).toBe(false);
  });
  test('company fees must be lower than the standard 5 percent', async () => {
    expect((await rpc(users[3], 'admin_configure_company', { _user_id: users[0].id, _enabled: true, _fee_percent: 5 })).ok).toBe(false);
    expect((await rpc(users[3], 'admin_configure_company', { _user_id: users[0].id, _enabled: true, _fee_percent: -1 })).ok).toBe(false);
  });
  test('unverified buyers cannot create company purchases', async () => {
    expect((await rpc(users[2], 'create_escrow_order', { _listing_id: listings[0], _shipping_address: 'Temporary shipping address', _quantity: 1 })).ok).toBe(false);
  });
  test('international purchases use the manager-selected fee without rewriting previous orders', async () => {
    const first = await rpc(users[1], 'create_escrow_order', { _listing_id: listings[0], _shipping_address: 'Temporary shipping address', _quantity: 2 });
    expect(first.ok).toBe(true); if (!first.ok) return; orders.push(first.data);
    expect((await as(users[1], `/rest/v1/orders?id=eq.${first.data}`)).data[0].fee).toBe(4);
    expect((await rpc(users[3], 'admin_configure_company', { _user_id: users[0].id, _enabled: true, _fee_percent: 1 })).ok).toBe(true);
    const second = await rpc(users[1], 'create_escrow_order', { _listing_id: listings[0], _shipping_address: 'Temporary shipping address', _quantity: 1 });
    expect(second.ok).toBe(true); if (second.ok) orders.push(second.data);
    expect((await as(users[1], `/rest/v1/orders?id=eq.${second.data}`)).data[0].fee).toBe(1);
    expect((await as(users[1], `/rest/v1/orders?id=eq.${first.data}`)).data[0].fee).toBe(4);
  });
  test('company sales analytics are private to the company owner', async () => {
    const own = await rpc(users[0], 'company_sales_orders'); if (!own.ok) console.log('Sales analytics error:', own.data.message); expect(own.ok).toBe(true); expect(own.data.length).toBe(2);
    expect((await rpc(users[4], 'company_sales_orders')).data).toEqual([]);
    expect((await rpc(users[1], 'company_sales_orders')).ok).toBe(false);
    expect((await rpc(users[0], 'admin_finance_summary')).ok).toBe(false);
  });
  test('company conversations allow international parties but not outsiders', async () => {
    const result = await as(users[1], '/rest/v1/conversations', 'POST', { listing_id: listings[0], buyer_id: users[1].id, seller_id: users[0].id, company_trade: false });
    if (!result.ok) console.log('Conversation error:', result.data.message); expect(result.ok).toBe(true); if (!result.ok) return;
    const id = result.data[0].id; conversations.push(id); expect(result.data[0].company_trade).toBe(true);
    expect((await as(users[1], '/rest/v1/messages', 'POST', { conversation_id: id, sender_id: users[1].id, body: 'International company test' })).ok).toBe(true);
    expect((await as(users[0], `/rest/v1/messages?conversation_id=eq.${id}`)).data.length).toBe(1);
    expect((await as(users[4], `/rest/v1/conversations?id=eq.${id}`)).data).toEqual([]);
    expect((await as(users[1], `/rest/v1/conversations?id=eq.${id}`, 'PATCH', { company_trade: false })).ok).toBe(false);
  });
  test('ordinary cross-country conversations cannot forge the company exception', async () => {
    const result = await as(users[0], '/rest/v1/conversations', 'POST', { listing_id: listings[1], seller_id: users[1].id, buyer_id: users[0].id, company_trade: true });
    expect(result.ok).toBe(false);
  });
  test('company logo can be saved and read by a verified international buyer, not an ordinary account', async () => {
    logoPath = `${users[0].id}/${crypto.randomUUID()}`;
    const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='), char => char.charCodeAt(0));
    const upload = await fetch(`${url}/storage/v1/object/company-logos/${logoPath}`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${users[0].token}`, 'Content-Type': 'image/png' }, body: bytes });
    expect(upload.ok).toBe(true);
    expect((await as(users[0], `/rest/v1/company_profiles?user_id=eq.${users[0].id}`, 'PATCH', { logo_path: logoPath })).ok).toBe(true);
    expect((await as(users[1], `/storage/v1/object/sign/company-logos/${logoPath}`, 'POST', { expiresIn: 60 })).ok).toBe(true);
    expect((await as(users[2], `/storage/v1/object/sign/company-logos/${logoPath}`, 'POST', { expiresIn: 60 })).ok).toBe(false);
  });
  test('revoked buyer verification blocks new purchases while keeping previous order history', async () => {
    await call(`/rest/v1/profiles?id=eq.${users[1].id}`, adminKey, 'PATCH', { is_verified_seller: false });
    expect((await rpc(users[1], 'create_escrow_order', { _listing_id: listings[0], _shipping_address: 'Temporary address', _quantity: 1 })).ok).toBe(false);
    expect((await as(users[1], `/rest/v1/orders?id=eq.${orders[0]}`)).data.length).toBe(1);
  });
});
