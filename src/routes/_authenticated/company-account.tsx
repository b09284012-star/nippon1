import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { getCompanyAccount } from '@/lib/company.functions';
import { companyAnalytics } from '@/lib/company-analytics';
import { t, useLanguage } from '@/lib/i18n';
import { CompanyProfileEditor } from '@/components/site/CompanyProfileEditor';
import { AnalyticsCharts, analyticsDollar } from '@/components/site/AnalyticsCharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDate } from '@/lib/media';
const options = (userId: string) => queryOptions({ queryKey: ['company-account', userId], queryFn: () => getCompanyAccount(), staleTime: 0 });
export const Route = createFileRoute('/_authenticated/company-account')({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: t('حساب الشركة | Nippon') }, { name: 'description', content: t('بيانات الشركة وشعارها وتحليلات مبيعاتها وإيراداتها الخاصة.') },
    { property: 'og:title', content: t('حساب الشركة | Nippon') }, { property: 'og:description', content: t('بيانات الشركة وشعارها وتحليلات مبيعاتها وإيراداتها الخاصة.') },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' },
  ] }),
  loader: async ({ context }) => {
    const session = await import('@/integrations/supabase/client').then(module => module.supabase.auth.getSession());
    const userId = session.data.session?.user.id ?? '';
    const data = await context.queryClient.ensureQueryData(options(userId));
    if (!data.allowed) throw redirect({ to: '/profile' });
    return { userId };
  },
  component: CompanyAccount,
});
function CompanyAccount() {
  const { t } = useLanguage();
  const { userId } = Route.useLoaderData();
  const { data } = useSuspenseQuery(options(userId));
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState<'volume' | 'fee'>('volume');
  const stats = companyAnalytics(data.orders, days);
  return <main className="mx-auto max-w-6xl px-4 py-10">
    <header className="flex flex-wrap items-center gap-3 border-b border-border pb-6"><Building2 className="size-7 text-primary" /><h1 className="font-display text-3xl font-black">{t('حساب الشركة')}</h1><Badge variant="outline" className="ms-auto">{t('عمولة الشركة')}: {data.fee === null ? t('غير محددة') : `${data.fee}%`}</Badge></header>
    <Tabs defaultValue="analytics" className="mt-6"><TabsList className="flex-wrap"><TabsTrigger value="analytics">{t('المالية والمبيعات')}</TabsTrigger><TabsTrigger value="inventory">{t('عروض الشركة')}</TabsTrigger><TabsTrigger value="profile">{t('بيانات الشركة')}</TabsTrigger></TabsList>
      <TabsContent value="analytics" className="mt-6">
        <div className="flex flex-wrap gap-2">{[[7, '7 أيام'], [30, '30 يومًا'], [90, '90 يومًا'], [0, 'الكل']].map(([value, label]) => <Button key={value} size="sm" variant={days === value ? 'default' : 'outline'} onClick={() => setDays(Number(value))}>{t(String(label))}</Button>)}</div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['حجم المبيعات', stats.gross], ['صافي إيرادات المبيعات', stats.net], ['العمولات المدفوعة', stats.fees], ['إيرادات معلقة', stats.pending]].map(([label, value]) => <div key={label} className="rounded-lg border border-border bg-card p-5"><dt className="text-xs text-muted-foreground">{t(String(label))}</dt><dd className="mt-2 break-all font-display text-2xl font-bold">{analyticsDollar(Number(value))}</dd></div>)}</dl>
        <p className="mt-4 text-sm text-muted-foreground">{stats.count} {t('صفقة مكتملة')} · {stats.units} {t('قطعة')} · {t('صافي الإيرادات بعد عمولة المنصة، قبل تكاليف الأجهزة والشحن.')}</p>
        <div className="mt-6 flex flex-wrap gap-2"><Button size="sm" variant={metric === 'volume' ? 'default' : 'outline'} onClick={() => setMetric('volume')}>{t('المبيعات')}</Button><Button size="sm" variant={metric === 'fee' ? 'default' : 'outline'} onClick={() => setMetric('fee')}>{t('صافي الإيرادات')}</Button></div>
        <AnalyticsCharts series={stats.series} top={stats.top} statusCount={stats.statusCount} metric={metric} feeLabel="صافي الإيرادات" />
        <h2 className="mt-8 border-t border-border pt-6 text-xl font-bold">{t('سجل الطلبات')}</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[600px] text-start text-sm"><thead><tr className="border-b border-border text-muted-foreground">{['الجهاز', 'القيمة', 'عمولة المنصة', 'الحالة', 'التاريخ'].map(label => <th key={label} className="p-3 text-start font-medium">{t(label)}</th>)}</tr></thead><tbody>{stats.orders.map(order => <tr key={order.id} className="border-b border-border"><td className="p-3">{order.title}</td><td className="p-3">{analyticsDollar(order.amount)}</td><td className="p-3">{analyticsDollar(order.fee)}</td><td className="p-3">{t(({ completed: 'مكتمل', escrow_held: 'في الضمان', shipped: 'تم الشحن', disputed: 'نزاع', refunded: 'مسترد', cancelled: 'ملغى' } as Record<string, string>)[order.status] ?? order.status)}</td><td className="p-3">{formatDate(order.created_at)}</td></tr>)}</tbody></table>{stats.orders.length === 0 && <p className="py-8 text-center text-muted-foreground">{t('لا توجد طلبات في هذه الفترة')}</p>}</div>
      </TabsContent>
      <TabsContent value="profile" className="mt-6"><CompanyProfileEditor userId={data.userId} defaultName={data.name} /></TabsContent>
      <TabsContent value="inventory" className="mt-6"><Button asChild><Link to="/sell"><Plus className="size-4" />{t('أضف عرض')}</Link></Button><div className="mt-5 divide-y divide-border">{data.listings.map(listing => <Link key={listing.id} to="/listings/$id" params={{ id: listing.id }} className="flex flex-wrap items-center gap-3 py-4"><span className="min-w-0 flex-1 break-words font-bold">{listing.title}</span><Badge variant="outline">{t(({ active: 'معروض', paused: 'مخفي مؤقتًا', sold: 'تم البيع' } as Record<string, string>)[listing.status] ?? listing.status)}</Badge><span>{analyticsDollar(listing.price_usd)}</span></Link>)}{data.listings.length === 0 && <p className="py-8 text-muted-foreground">{t('لا توجد عروض بعد')}</p>}</div></TabsContent>
    </Tabs>
  </main>;
}
