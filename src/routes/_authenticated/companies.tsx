import { createFileRoute, redirect } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Building2, Search } from 'lucide-react';
import { getCompanyMarket } from '@/lib/company.functions';
import { useAuth } from '@/lib/auth';
import { t, useLanguage } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { CompanyIdentity } from '@/components/site/CompanyIdentity';
import { CompanyListingCard } from '@/components/site/CompanyListingCard';

const options = (userId: string) => queryOptions({ queryKey: ['company-listings', userId], queryFn: () => getCompanyMarket(), staleTime: 0 });
export const Route = createFileRoute('/_authenticated/companies')({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: t('الشراء من الشركات | Nippon') }, { name: 'description', content: t('عروض شركات أجهزة التعدين للبائعين المعتمدين حول العالم.') },
    { property: 'og:title', content: t('الشراء من الشركات | Nippon') }, { property: 'og:description', content: t('عروض شركات أجهزة التعدين للبائعين المعتمدين حول العالم.') },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' },
  ] }),
  loader: async ({ context }) => {
    const session = await import('@/integrations/supabase/client').then(module => module.supabase.auth.getSession());
    const userId = session.data.session?.user.id ?? '';
    const data = await context.queryClient.ensureQueryData(options(userId));
    if (!data.allowed) throw redirect({ to: '/market' });
    return { userId };
  },
  component: CompanyMarket,
});
function CompanyMarket() {
  const { t } = useLanguage();
  const { userId } = Route.useLoaderData();
  const { data } = useSuspenseQuery(options(userId));
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const companies = data.companies.map(company => ({ company, offers: data.listings.filter(listing => listing.seller_id === company.user_id && (!q || [listing.title, listing.brand, listing.model, company.company_name].some(value => value.toLowerCase().includes(q)))) })).filter(item => item.offers.length);
  return <main className="mx-auto max-w-6xl px-4 py-10">
    <header className="flex flex-wrap items-center gap-3 border-b border-border pb-6"><Building2 className="size-7 text-primary" /><h1 className="font-display text-3xl font-black">{t('الشراء من الشركات')}</h1><span className="ms-auto text-sm text-muted-foreground">{t('سوق دولي')}</span></header>
    <div className="relative mt-6"><Search className="absolute start-3 top-3 size-4 text-muted-foreground" /><Input aria-label={t('ابحث عن شركة أو جهاز')} placeholder={t('ابحث عن شركة أو جهاز')} value={search} onChange={event => setSearch(event.target.value)} className="ps-10" /></div>
    {companies.length === 0 && <div className="py-20 text-center text-muted-foreground"><Building2 className="mx-auto mb-4 size-10" /><p>{t(q ? 'لا توجد نتائج مطابقة' : 'لا توجد عروض شركات متاحة حاليًا')}</p></div>}
    <div className="divide-y divide-border">{companies.map(({ company, offers }) => <section key={company.user_id} className="py-8"><CompanyIdentity company={company} /><div className="mt-6 grid gap-4">{offers.map(listing => <CompanyListingCard key={listing.id} listing={listing} />)}</div></section>)}</div>
    {profile?.is_company && <div className="border-t border-border pt-4 text-sm text-muted-foreground">{t('حساب شركة')}</div>}
  </main>;
}
