import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, RefreshCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { getPerformanceSummary } from "@/lib/performance.functions";
import { performanceAlerts, type PerformanceSample } from "@/lib/performance-monitoring";

type Summary = PerformanceSample & { samples: number; active_visits: number; last_received: string | null };
export function PerformanceMonitor() {
  const { t } = useLanguage();
  const fetchSummary = useServerFn(getPerformanceSummary);
  const query = useQuery({ queryKey: ["admin-performance"], queryFn: async () => await fetchSummary() as Summary | null, refetchInterval: 60000, staleTime: 30000 });
  const s = query.data;
  const previous = useRef("");
  const flags = s ? performanceAlerts(s) : { load: false, slow: false, errors: false };
  const notices = [flags.load ? "ارتفاع الحمل المرصود" : "", flags.slow ? "بطء استجابة طلبات السوق" : "", flags.errors ? "ارتفاع أخطاء طلبات السوق" : ""].filter(Boolean);
  const signature = notices.join("|");
  useEffect(() => {
    if (signature && signature !== previous.current) toast.warning(t("تنبيه أداء الموقع"), { description: signature.split("|").map(t).join(" · ") });
    previous.current = signature;
  }, [signature, t]);
  const total = s ? s.cache_hits + s.cache_misses : 0;
  const metrics = [
    ["معدل إصابة التخزين المؤقت", total ? `${(100 * (s?.cache_hits ?? 0) / total).toFixed(1)}%` : "—"],
    ["اتصالات Realtime المرصودة", String(s?.realtime_connections ?? 0)],
    ["الزيارات المشاركة النشطة", String(s?.active_visits ?? 0)],
    ["متوسط استجابة السوق", s?.requests ? `${Math.round(s.latency_total / s.requests)} ms` : "—"],
    ["طلبات السوق في الدقيقة", s ? (s.requests / 15).toFixed(1) : "—"],
    ["أخطاء طلبات السوق", String(s?.errors ?? 0)],
  ];
  return <section className="border-y border-border py-6">
    <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-bold"><Activity className="size-5 text-primary" />{t("مراقبة الأداء")}</h2><Button variant="outline" size="icon" aria-label={t("تحديث")} disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className="size-4" /></Button></div>
    <p className="mt-3 text-sm text-muted-foreground">{t("قياسات الزيارات المشاركة خلال آخر 15 دقيقة؛ الاتصالات تقديرية لآخر 90 ثانية وليست إجمالي اتصالات المزود.")}</p>
    {query.isError && <p role="alert" className="mt-4 text-destructive">{t("تعذر تحميل قياسات الأداء")}</p>}
    {!s?.samples && !query.isError && <p className="mt-4 text-muted-foreground">{t("بانتظار القياسات؛ يبدأ الإرسال بعد دقيقة من فتح الموقع.")}</p>}
    {notices.map(n => <p key={n} role="alert" className="mt-4 flex items-center gap-2 text-warning"><TriangleAlert className="size-4" />{t(n)}</p>)}
    <dl className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-3">{metrics.map(([label,value]) => <div key={label} className="border-t border-border pt-4"><dt className="text-sm text-muted-foreground">{t(label ?? "")}</dt><dd dir="ltr" className="mt-2 text-2xl font-bold">{value}</dd></div>)}</dl>
    <p className="mt-6 text-xs text-muted-foreground">{t("حدود التنبيه: 100 اتصال، أو 300 طلب/دقيقة، أو متوسط استجابة ثانيتين، أو أخطاء 10% بعد 5 طلبات.")}</p>
    <p className="mt-2 text-xs text-muted-foreground">{t("آخر قياس")}: {s?.last_received ? new Date(s.last_received).toLocaleString("en-US") : "—"}</p>
  </section>;
}