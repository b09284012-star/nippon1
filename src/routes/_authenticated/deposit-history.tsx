import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Download, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { t, useLanguage } from "@/lib/i18n";
import { formatUsd, formatDate } from "@/lib/media";

const historyQuery = () => queryOptions({
  queryKey: ["deposit-history"],
  queryFn: async () => {
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) throw new Error(t("سجّل الدخول"));
    const { data, error } = await supabase.from("deposit_history").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
    if (error) throw new Error(t("تعذر تحميل سجل الإيداعات"));
    const { data: completed } = await supabase.rpc("claim_deposit_analytics");
    for (const d of completed ?? []) window.__lovableEvents?.track?.("project.deposit_completed", { amount: Number(d.gross_amount), fee: Number(d.fee_amount), net_amount: Number(d.credited_amount), network: d.network, status: "completed" });
    return data ?? [];
  },
  refetchInterval: 15000,
});

export const Route = createFileRoute("/_authenticated/deposit-history")({
  head: () => ({ meta: [
    { title: t("سجل الإيداعات") + " | Nippon" },
    { name: "description", content: t("المبلغ قبل الرسوم") + " · " + t("المضاف للمحفظة") },
    { property: "og:title", content: t("سجل الإيداعات") + " | Nippon" },
    { property: "og:description", content: t("سجل الإيداعات") + " · " + t("تنزيل إيصال") },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(historyQuery()),
  component: DepositHistory,
});

const labels: Record<string, string> = { started: "قيد الإنشاء", pending: "بانتظار الدفع", confirming: "قيد التأكيد", completed: "مكتمل", cancelled: "ملغى", failed: "فشل", expired: "منتهي الصلاحية", partial: "دفع جزئي" };

function DepositHistory() {
  const { t, language } = useLanguage();
  const { data } = useSuspenseQuery(historyQuery());
  return <main className="mx-auto max-w-5xl px-4 py-10">
    <Button variant="ghost" asChild><Link to="/wallet"><ArrowRight className="size-4" />{t("المحفظة")}</Link></Button>
    <h1 className="mt-5 font-display text-3xl font-black">{t("سجل الإيداعات")}</h1>
    <p className="mt-3 text-sm text-muted-foreground">{t("تنبيه: رسوم الإيداع 1% هي رسوم بوابة الدفع وشبكة التحويل، ولا تعود للمنصة.")}</p>
    <div className="mt-8 divide-y divide-border border-y border-border">
      {data.length === 0 && <p className="py-10 text-muted-foreground">{t("لا إيداعات بعد.")}</p>}
      {data.map(d => <article key={d.id} className="py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0"><time className="text-sm text-muted-foreground">{formatDate(d.created_at)}</time><p className="mt-1 break-all font-mono text-xs" dir="ltr">{d.payment_id ?? d.id} · {d.network}</p></div>
          <Badge variant={d.status === "completed" ? "default" : "secondary"}>{t(labels[d.status] ?? d.status)}</Badge>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {[[t("المبلغ قبل الرسوم"), d.gross_amount], [t("رسوم الإيداع") + ` (${Math.round(Number(d.fee_rate) * 10000) / 100}%)`, d.fee_amount], [t("الصافي المتوقع"), d.net_amount], [t("المضاف للمحفظة"), d.credited_amount]].map(([label, value]) => <div key={String(label)}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-2 font-display text-lg font-bold" dir="ltr">{formatUsd(Number(value))}</dd></div>)}
        </dl>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => {
          const escape = (v: string) => v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
          const rows = [[t("المعرف"), d.payment_id ?? d.id], [t("التاريخ"), formatDate(d.created_at)], [t("الشبكة"), d.network], [t("الحالة"), t(labels[d.status] ?? d.status)], [t("المبلغ قبل الرسوم"), formatUsd(d.gross_amount)], [t("رسوم الإيداع") + ` (${Math.round(Number(d.fee_rate) * 10000) / 100}%)`, formatUsd(d.fee_amount)], [t("الصافي المتوقع"), formatUsd(d.net_amount)], [t("المضاف للمحفظة"), formatUsd(d.credited_amount)]];
          const html = `<!doctype html><html lang="${language === "ar" ? "ar" : "en"}" dir="${language === "ar" ? "rtl" : "ltr"}"><meta charset="utf-8"><title>Nippon — ${escape(t("إيصال إيداع"))}</title><body><h1>Nippon — ${escape(t("إيصال إيداع"))}</h1><dl>${rows.map(([key, value]) => `<dt>${escape(String(key))}</dt><dd>${escape(String(value))}</dd>`).join("")}</dl><p>${escape(t("تنبيه: رسوم الإيداع 1% هي رسوم بوابة الدفع وشبكة التحويل، ولا تعود للمنصة."))}</p></body></html>`;
          const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
          const a = document.createElement("a"); a.href = url; a.download = `nippon-deposit-${d.id}.html`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
        }}><Download className="size-4" />{t("تنزيل إيصال")}</Button>
      </article>)}
    </div>
  </main>;
}