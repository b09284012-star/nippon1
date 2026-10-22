import { t, useLanguage, numberLocale } from "@/lib/i18n";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export const analyticsDollar = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
const compactDollar = (value: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const config = {
  volume: { label: "المبيعات", color: "var(--chart-1)" },
  fee: { label: "الأرباح", color: "var(--chart-3)" },
} satisfies ChartConfig;
const labels: Record<string, string> = { completed: "مكتمل", escrow_held: "في الضمان", shipped: "تم الشحن", disputed: "نزاع", refunded: "مسترد", cancelled: "ملغى", awaiting_payment: "بانتظار الدفع" };
const colors: Record<string, string> = { completed: "var(--chart-3)", escrow_held: "var(--chart-1)", shipped: "var(--chart-2)", disputed: "var(--chart-5)", refunded: "var(--chart-4)", cancelled: "var(--muted-foreground)", awaiting_payment: "var(--warning)" };

type Props = {
  series: [string, { volume: number; fee: number }][];
  top: [string, { qty: number; volume: number; fee: number }][];
  statusCount: Record<string, number>;
  metric: "volume" | "fee";
};

export function AnalyticsCharts({ series, top, statusCount, metric }: Props) {
  const { direction, t } = useLanguage();
  const timeline = series.map(([date, values]) => ({ date, ...values }));
  const statuses = Object.entries(statusCount).map(([status, value]) => ({ name: t(labels[status] ?? status), value, fill: colors[status] ?? "var(--chart-4)" }));
  const total = statuses.reduce((sum, item) => sum + item.value, 0);
  const products = top.map(([name, values], index) => ({ name, rank: `#${index + 1}`, ...values }));
  return (
    <div className="mt-6 border-t border-border pt-6">
      <section aria-label={t("اتجاه المبيعات والأرباح")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">{metric === "volume" ? t("اتجاه المبيعات") : t("اتجاه الأرباح")}</h2>
          <span className="text-xs text-muted-foreground">{t("USD · دولار أمريكي")}</span>
        </div>
        {timeline.length === 0 ? <EmptyChart text={t("لا توجد مبيعات مكتملة في هذه الفترة")} /> : (
          <ChartContainer config={config} className="mt-5 h-72 w-full aspect-auto" dir="ltr">
            <AreaChart data={timeline} margin={{ top: 16, right: 12, left: 0, bottom: 8 }} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={36} tickMargin={12} tickFormatter={(value: string) => value.slice(5)} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={compactDollar} width={52} domain={[0, "auto"]} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => <div className="flex w-full items-center justify-between gap-5" dir={direction}><span>{t(config[metric].label)}</span><strong>{analyticsDollar(Number(value))}</strong></div>} labelFormatter={(value) => new Date(`${String(value)}T12:00:00`).toLocaleDateString(numberLocale(), { day: "numeric", month: "long", year: "numeric" })} />} />
              <Area type="monotone" dataKey={metric} stroke={`var(--color-${metric})`} fill={`var(--color-${metric})`} fillOpacity={0.12} strokeWidth={3} dot={timeline.length === 1} activeDot={{ r: 5 }} isAnimationActive={false} />
            </AreaChart>
          </ChartContainer>
        )}
      </section>
      <div className="mt-8 grid gap-8 border-t border-border pt-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="min-w-0" aria-label={t("الأجهزة الأكثر مبيعًا")}>
          <h2 className="font-display text-lg font-bold">{t("الأجهزة الأكثر مبيعًا")}</h2>
          {products.length === 0 ? <EmptyChart text={t("لا توجد أجهزة مباعة في هذه الفترة")} /> : <>
            <ChartContainer config={config} className="mt-4 h-64 w-full aspect-auto" dir="ltr">
              <BarChart data={products} layout="vertical" margin={{ right: 12, left: 0 }} accessibilityLayer>
                <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 5" />
                <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={compactDollar} />
                <YAxis type="category" dataKey="rank" axisLine={false} tickLine={false} width={36} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""} formatter={(value) => <strong dir={direction}>{analyticsDollar(Number(value))}</strong>} />} />
                <Bar dataKey={metric} fill={`var(--color-${metric})`} radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
            <ol className="mt-3 divide-y divide-border text-sm">
              {products.map((product) => <li key={product.name} className="flex items-start gap-3 py-3"><span className="text-primary">{product.rank}</span><div className="min-w-0 flex-1"><div className="break-words font-medium">{product.name}</div><span className="text-xs text-muted-foreground">{product.qty} {t("قطعة")}</span></div><strong className="shrink-0 text-xs tabular-nums">{analyticsDollar(product[metric])}</strong></li>)}
            </ol>
          </>}
        </section>
        <section className="min-w-0" aria-label={t("توزيع حالات الطلبات")}>
          <h2 className="font-display text-lg font-bold">{t("توزيع حالات الطلبات")}</h2>
          {total === 0 ? <EmptyChart text={t("لا توجد طلبات في هذه الفترة")} /> : <>
            <div className="relative mx-auto mt-4 max-w-72">
              <ChartContainer config={config} className="h-64 w-full aspect-auto" dir="ltr">
                <PieChart><ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value, name) => <div className="flex items-center gap-4" dir={direction}><span>{String(name)}</span><strong>{Number(value)} {t("طلب")}</strong></div>} />} /><Pie data={statuses} dataKey="value" nameKey="name" innerRadius="65%" outerRadius="85%" paddingAngle={3} stroke="var(--background)" isAnimationActive={false}>{statuses.map((status) => <Cell key={status.name} fill={status.fill} />)}</Pie></PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="font-display text-3xl tabular-nums">{total}</strong><span className="text-xs text-muted-foreground">{t("إجمالي الطلبات")}</span></div>
            </div>
            <div className="grid gap-3">{statuses.map((status) => <div key={status.name} className="flex items-center gap-2 text-sm"><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="4" fill={status.fill} /></svg><span>{status.name}</span><strong className="ms-auto tabular-nums">{status.value}</strong><span className="w-12 text-end text-xs text-muted-foreground">{Math.round(status.value / total * 100)}%</span></div>)}</div>
          </>}
        </section>
      </div>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  const { t } = useLanguage();
  return <div className="mt-4 flex h-64 items-center justify-center border-b border-dashed border-border bg-muted/20 px-4 text-center text-sm text-muted-foreground">{text}</div>;
}