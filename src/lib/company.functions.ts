import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const getCompanyMarket = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const access = await context.supabase.rpc('can_shop_companies');
  if (access.error) throw new Error(access.error.message);
  if (!access.data) return { allowed: false, companies: [], listings: [] };
  const [companies, listings] = await Promise.all([context.supabase.rpc('company_directory'), context.supabase.rpc('company_market_listings')]);
  if (companies.error || listings.error) throw new Error(companies.error?.message ?? listings.error?.message);
  return { allowed: true, companies: companies.data ?? [], listings: listings.data ?? [] };
});

export const getCompanyAccount = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const profile = await context.supabase.from('profiles').select('is_company,display_name').eq('id', context.userId).single();
  if (profile.error) throw new Error(profile.error.message);
  if (!profile.data.is_company) return { allowed: false, userId: context.userId, name: '', fee: null, orders: [], listings: [] };
  const [settings, orders, listings] = await Promise.all([
    context.supabase.from('company_settings').select('fee_percent').eq('user_id', context.userId).maybeSingle(),
    context.supabase.rpc('company_sales_orders'),
    context.supabase.from('listings').select('id,title,status,price_usd,quantity').eq('seller_id', context.userId).order('created_at', { ascending: false }),
  ]);
  if (settings.error || orders.error || listings.error) throw new Error(settings.error?.message ?? orders.error?.message ?? listings.error?.message);
  return { allowed: true, userId: context.userId, name: profile.data.display_name, fee: settings.data?.fee_percent ?? null, orders: orders.data ?? [], listings: listings.data ?? [] };
});
