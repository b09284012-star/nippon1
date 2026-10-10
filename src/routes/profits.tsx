import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Lock, TrendingUp, ShoppingCart, Coins, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatUsd } from "@/lib/media";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profits")({
  head: () => ({
    meta: [
      { title: "تحليل الأرباح | Nippon" },
      { name: "description", content: "تحليل أرباح ومبيعات منصة Nippon: العمولات، حجم المبيعات، وأفضل الأجهزة مبيعًا." },
      { property: "og:title", content: "تحليل الأرباح | Nippon" },
      { property: "og:description", content: "لوحة تحليل المبيعات والأرباح للإدارة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfitsPage,
});

const RANGES = [
  { k: 7, l: "7 أيام" },
  { k: 30, l: "30 يومًا" },
  { k: 90, l: "90 يومًا" },
  { k: 3650, l: "الكل" },
] as const;

function ProfitsPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState<number>(30);

  const q = useQuery({
    queryKey: ["profits-orders"],
    enabled: isAdmin,
    queryFn: async () => {
      const [{ data: orders, error }, wd] = await Promise.all([
        supabase.from("orders").select("id, amount, fee, status, quantity, created_at, listing_id, listings(title, brand, model)").order("created_at", { ascending: false }).limit(1000),
        supabase.rpc("admin_list_withdrawals"),
      ]);
      if (error) throw error;
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
    const series = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-30);

    const byProduct = new Map<string, { qty: number; volume: number; fee: number }>();
    for (const o of done) {
      const l = o.listings as { title?: string; brand?: string; model?: string } | null;
      const name = l ? `${l.brand ?? ""} ${l.model ?? l.title ?? ""}`.trim() : "عرض محذوف";
      const c = byProduct.get(name) ?? { qty: 0, volume: 0, fee: 0 };
      byProduct.set(name, { qty: c.qty + (o.quantity ?? 1), volume: c.volume + Number(o.amount), fee: c.fee + Number(o.fee) });
    }
    const top = [...byProduct.entries()].sort((a, b) => b[1].volume - a[1].volume).slice(0, 10);

    const statusCount = orders.reduce<Record<string, number>>((m, o) => ((m[o.status] = (m[o.status] ?? 0) + 1), m), {});
    return { earned, pending, volume, wdFees, count: done.length, total: orders.length, avg: done.length ? volume / done.length : 0, series, top, statusCount };
  }, [q.data, days]);

  if (loading) return <div className="px-4 py-20 text-center text-muted-foreground">جارٍ التحميل…</div>;
  if (!user || !isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Lock className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-black">تحليل الأرباح</h1>
        <p className="mt-2 text-sm text-muted-foreground">هذه الصفحة مخصّصة للإدارة فقط.</p>
        <Button className="mt-6" onClick={() => navigate({ to: user ? "/" : "/auth" })}>{user ? "العودة للرئيسية" : "دخول"}</Button>
      </div>
    );
  }

  const maxFee = Math.max(1, ...stats.series.map(([, v]) => v.volume));
  const statusLabels: Record<string, string> = {
    completed: "مكتمل", escrow_held: "في الضمان", shipped: "تم الشحن", disputed: "نزاع", refunded: "مسترد", cancelled: "ملغى", awaiting_payment: "بانتظار الدفع",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-black">تحليل الأرباح والمبيعات</h1>
        <div className="ms-auto flex flex-wrap gap-1">
          {RANGES.map((r) => (
            <Button key={r.k} size="sm" variant={days === r.k ? "default" : "outline"} onClick={() => setDays(r.k)}>{r.l}</Button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [Coins, "صافي أرباح العمولات", formatUsd(stats.earned + stats.wdFees), `عمولات ${formatUsd(stats.earned)} + سحب ${formatUsd(stats.wdFees)}`],
          [TrendingUp, "حجم المبيعات", formatUsd(stats.volume), `${stats.count} صفقة مكتملة`],
          [Clock, "أرباح معلّقة", formatUsd(stats.pending), "طلبات داخل الضمان"],
          [ShoppingCart, "متوسط قيمة الصفقة", formatUsd(stats.avg), `${stats.total} طلب في الفترة`],
        ].map(([Icon, l, v, h]) => {
          const I = Icon as typeof Coins;
          return (
            <div key={l as string} className="glass card-3d rounded-2xl p-5">
              <I className="size-5 text-primary" />
              <div className="mt-2 text-xs text-muted-foreground">{l as string}</div>
              <div className="mt-1 font-display text-2xl font-black">{v as string}</div>
              <div className="mt-1 text-xs text-muted-foreground">{h as string}</div>
            </div>
          );
        })}
      </div>

      <div className="glass mt-6 rounded-3xl p-6">
        <h2 className="font-display text-lg font-black">المبيعات اليومية</h2>
        {stats.series.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">لا مبيعات مكتملة في هذه الفترة.</p>
        ) : (
          <div className="mt-6 flex h-48 items-end gap-1" dir="ltr">
            {stats.series.map(([d, v]) => (
              <div key={d} className="group flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t-md bg-primary/80 transition-colors group-hover:bg-primary" style={{ height: `${(v.volume / maxFee) * 100}%`, minHeight: 4 }} title={`${d}: ${formatUsd(v.volume)} — ربح ${formatUsd(v.fee)}`} />
                <span className="text-[9px] text-muted-foreground">{d.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="glass rounded-3xl p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-black">الأجهزة الأكثر مبيعًا</h2>
          <div className="mt-4 grid gap-2">
            {stats.top.length === 0 && <p className="text-sm text-muted-foreground">لا بيانات بعد.</p>}
            {stats.top.map(([name, v], i) => (
              <div key={name} className="flex items-center gap-3 rounded-xl bg-background/50 p-3 text-sm">
                <span className="font-display font-black text-primary">#{i + 1}</span>
                <span className="font-bold">{name}</span>
                <span className="text-xs text-muted-foreground">{v.qty} قطعة</span>
                <span className="ms-auto font-display font-black">{formatUsd(v.volume)}</span>
                <span className="text-xs text-accent">+{formatUsd(v.fee)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-3xl p-6">
          <h2 className="font-display text-lg font-black">حالة الطلبات</h2>
          <div className="mt-4 grid gap-2 text-sm">
            {Object.keys(stats.statusCount).length === 0 && <p className="text-muted-foreground">لا طلبات.</p>}
            {Object.entries(stats.statusCount).map(([s, n]) => (
              <div key={s} className="flex justify-between rounded-xl bg-background/50 p-3">
                <span>{statusLabels[s] ?? s}</span>
                <span className="font-display font-black">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
