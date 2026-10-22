import { t, useLanguage, numberLocale } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { TrendingUp, ShoppingCart, Coins, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalyticsCharts, analyticsDollar as formatUsd } from "@/components/site/AnalyticsCharts";
import { supabase } from "@/integrations/supabase/client";

const RANGES = [
  { k: 7, l: "7 أيام" },
  { k: 30, l: "30 يومًا" },
  { k: 90, l: "90 يومًا" },
  { k: 3650, l: "الكل" },
] as const;

export function ProfitsAnalytics() {
  const { t } = useLanguage();
  const isAdmin = true;
  const [days, setDays] = useState<number>(30);
  const [metric, setMetric] = useState<"volume" | "fee">("volume");

  const q = useQuery({
    queryKey: ["profits-orders"],
    enabled: isAdmin,
    queryFn: async () => {
      const [{ data: orders, error }, wd] = await Promise.all([
        supabase.from("orders").select("id, amount, fee, status, quantity, created_at, listing_id, listings(title, brand, model)").order("created_at", { ascending: false }).limit(1000),
        supabase.rpc("admin_list_withdrawals"),
      ]);
      if (error) throw error;
      if (wd.error) throw wd.error;
      return { orders: orders ?? [], withdrawals: wd.data ?? [] };
    },
  });

  const stats = useMemo(() => {
    const since = Date.now() - days * 86400000;
    const orders = (q.data?.orders ?? []).filter((o) => new Date(o.created_at).getTime() >= since);
    const done = orders.filter((o) => o.status === "completed");
    const held = orders.filter((o) => ["escrow_held", "shipped", "disputed"].includes(o.status));
    const wdFees = (q.data?.withdrawals ?? []).filter((w) => w.status === "completed" && new Date(w.created_at).getTime() >= since).length * 2.5;
    const earned = done.reduce((s, o) => s + Number(o.fee), 0);
    const pending = held.reduce((s, o) => s + Number(o.fee), 0);
    const volume = done.reduce((s, o) => s + Number(o.amount), 0);

    const byDay = new Map<string, { volume: number; fee: number }>();
    for (const o of done) {
      const d = o.created_at.slice(0, 10);
      const c = byDay.get(d) ?? { volume: 0, fee: 0 };
      byDay.set(d, { volume: c.volume + Number(o.amount), fee: c.fee + Number(o.fee) });
    }
    // Include zero-sale days and bucket long ranges by month without truncating the period.
    const monthly = days > 30;
    const bucketed = new Map<string, { volume: number; fee: number }>();
    const start = new Date(days === 3650 && orders.length ? Math.min(...orders.map((o) => new Date(o.created_at).getTime())) : since);
    start.setUTCHours(0, 0, 0, 0);
    if (monthly) start.setUTCDate(1);
    for (const cursor = new Date(start); cursor.getTime() <= Date.now(); monthly ? cursor.setUTCMonth(cursor.getUTCMonth() + 1) : cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      bucketed.set(cursor.toISOString().slice(0, 10), { volume: 0, fee: 0 });
    }
    for (const [date, values] of byDay) {
      const key = monthly ? `${date.slice(0, 7)}-01` : date;
      const previous = bucketed.get(key) ?? { volume: 0, fee: 0 };
      bucketed.set(key, { volume: previous.volume + values.volume, fee: previous.fee + values.fee });
    }
    const series = [...bucketed.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    const byProduct = new Map<string, { qty: number; volume: number; fee: number }>();
    for (const o of done) {
      const l = o.listings as { title?: string; brand?: string; model?: string } | null;
      const name = l ? `${l.brand ?? ""} ${l.model ?? l.title ?? ""}`.trim() : t("عرض محذوف");
      const c = byProduct.get(name) ?? { qty: 0, volume: 0, fee: 0 };
      byProduct.set(name, { qty: c.qty + (o.quantity ?? 1), volume: c.volume + Number(o.amount), fee: c.fee + Number(o.fee) });
    }
    const top = [...byProduct.entries()].sort((a, b) => b[1].volume - a[1].volume).slice(0, 10);

    const statusCount = orders.reduce<Record<string, number>>((m, o) => ((m[o.status] = (m[o.status] ?? 0) + 1), m), {});
    return { earned, pending, volume, wdFees, count: done.length, total: orders.length, avg: done.length ? volume / done.length : 0, series: done.length ? series : [], top, statusCount };
  }, [q.data, days]);

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl font-black">{t("تحليل الأرباح والمبيعات")}</h2>
        <div className="ms-auto flex flex-wrap gap-1">
          {RANGES.map((r) => (
            <Button key={r.k} size="sm" variant={days === r.k ? "default" : "outline"} onClick={() => setDays(r.k)}>{t(r.l)}</Button>
          ))}
        </div>
      </div>

      {q.isPending && <p role="status" className="mt-6 text-sm text-muted-foreground">{t("جارٍ تحميل التحليل…")}</p>}
      {q.isError && <div role="alert" className="mt-6 flex flex-wrap items-center gap-3 text-sm text-destructive">{t("تعذر تحميل بيانات التحليل.")}<Button size="sm" variant="outline" onClick={() => void q.refetch()}>{t("إعادة المحاولة")}</Button></div>}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [Coins, "صافي أرباح الرسوم", formatUsd(stats.earned + stats.wdFees), (t("رسوم البيع ") + (formatUsd(stats.earned)) + t(" + سحب ") + (formatUsd(stats.wdFees)))],
          [TrendingUp, "حجم المبيعات", formatUsd(stats.volume), ((stats.count) + t(" صفقة مكتملة"))],
          [Clock, "أرباح معلّقة", formatUsd(stats.pending), "طلبات داخل الضمان"],
          [ShoppingCart, "متوسط قيمة الصفقة", formatUsd(stats.avg), ((stats.total) + t(" طلب في الفترة"))],
        ].map(([Icon, l, v, h]) => {
          const I = Icon as typeof Coins;
          return (
            <div key={t(l as string)} className="glass card-3d rounded-2xl p-5">
              <I className="size-5 text-primary" />
              <div className="mt-2 text-xs text-muted-foreground">{t(l as string)}</div>
              <div className="mt-1 font-display text-2xl font-black">{v as string}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t(h as string)}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex gap-2" role="group" aria-label={t("نوع التحليل")}>
        <Button size="sm" variant={metric === "volume" ? "default" : "outline"} aria-pressed={metric === "volume"} onClick={() => setMetric("volume")}><ShoppingCart className="size-4" /> {t("المبيعات")}</Button>
        <Button size="sm" variant={metric === "fee" ? "default" : "outline"} aria-pressed={metric === "fee"} onClick={() => setMetric("fee")}><TrendingUp className="size-4" /> {t("الأرباح")}</Button>
      </div>
      {q.isSuccess && <AnalyticsCharts series={stats.series} top={stats.top} statusCount={stats.statusCount} metric={metric} />}
    </div>
  );
}
