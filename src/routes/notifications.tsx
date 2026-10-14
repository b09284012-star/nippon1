import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, BellRing, CheckCheck, Clock, RefreshCw, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/media";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [
    { title: "الإشعارات | Nippon" },
    { name: "description", content: "إشعارات حسابك ورسائلك في نيبون مع تاريخ ووقت وصولها." },
    { property: "og:title", content: "الإشعارات | Nippon" },
    { property: "og:description", content: "جميع تنبيهات ورسائل حسابك في نيبون مرتبة حسب وقت وصولها." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user, loading } = useAuth();
  const q = useNotifications(user?.id);
  const navigate = useNavigate();
  const [permission, setPermission] = useState("default");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, []);
  const unread = (q.data ?? []).filter((n) => !n.is_read).length;

  async function enableAlerts() {
    if (typeof Notification === "undefined") { toast.error("متصفحك لا يدعم الإشعارات"); return; }
    if (window.top !== window.self) { toast.info("افتح الموقع في نافذة مستقلة لتفعيل الإشعارات"); return; }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") toast.success("تم تفعيل الإشعارات");
      else toast.info("يمكنك السماح بالإشعارات من إعدادات المتصفح");
    } catch { toast.error("تعذر تفعيل الإشعارات في هذا المتصفح"); }
  }

  async function markRead(id?: string) {
    if (!user) return false;
    setBusy(true);
    try {
      let update = supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id);
      update = id ? update.eq("id", id) : update.eq("is_read", false);
      const { error } = await update;
      if (error) throw error;
      await q.refetch();
      return true;
    } catch { toast.error("تعذر تحديث الإشعارات، حاول مجددًا"); return false; }
    finally { setBusy(false); }
  }

  if (loading) return <div className="py-20 text-center text-muted-foreground">جارٍ التحميل…</div>;
  if (!user) return <div className="mx-auto max-w-md px-4 py-20 text-center"><Bell className="mx-auto mb-4 size-9 text-primary" /><h1 className="font-display text-2xl font-bold">الإشعارات</h1><p className="mt-3 text-muted-foreground">سجّل الدخول لعرض إشعاراتك.</p><Button asChild className="mt-6"><Link to="/auth">دخول / تسجيل</Link></Button></div>;

  return <main className="mx-auto min-h-[70vh] w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
    <Button asChild variant="ghost" size="sm" className="mb-6"><Link to="/profile"><ArrowRight /> حسابي</Link></Button>
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
      <div><h1 className="flex items-center gap-3 font-display text-3xl font-bold"><Bell className="size-7 text-primary" />الإشعارات</h1><p className="mt-2 text-sm text-muted-foreground">{unread > 0 ? `${unread} إشعارات غير مقروءة` : "جميع الإشعارات مقروءة"}</p></div>
      <div className="flex flex-wrap gap-2">
        {permission !== "granted" && <Button variant="outline" onClick={() => void enableAlerts()}><BellRing /> تفعيل التنبيهات</Button>}
        <Button variant="ghost" size="icon" aria-label="تحديث الإشعارات" title="تحديث الإشعارات" disabled={q.isFetching} onClick={() => void q.refetch()}><RefreshCw className={cn(q.isFetching && "animate-spin motion-reduce:animate-none")} /></Button>
        <Button variant="secondary" disabled={!unread || busy} onClick={() => void markRead()}><CheckCheck /> قراءة الكل</Button>
      </div>
    </header>
    {q.isPending ? <p className="py-16 text-center text-muted-foreground">جارٍ تحميل الإشعارات…</p> : q.isError ? <div className="py-16 text-center"><p className="text-muted-foreground">تعذر تحميل الإشعارات.</p><Button className="mt-4" onClick={() => void q.refetch()}>إعادة المحاولة</Button></div> : !q.data?.length ? <div className="py-20 text-center"><Bell className="mx-auto mb-4 size-12 text-muted-foreground" /><h2 className="text-lg font-bold">لا توجد إشعارات بعد</h2></div> : <ul className="divide-y divide-border">
      {q.data.map((n) => <li key={n.id} className={cn("relative flex gap-3 px-2 py-5 sm:gap-4 sm:px-4", !n.is_read && "bg-primary/5")}>
        <span className="mt-1 grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-primary"><Bell className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3"><h2 className="break-words font-bold">{n.title}</h2>{!n.is_read && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="غير مقروء" />}</div>
          {n.body && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{n.body}</p>}
          <time dateTime={n.created_at} className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3.5" />{formatDate(n.created_at)}</time>
          <div className="mt-3 flex flex-wrap gap-2">
            {n.link && <Button size="sm" variant="outline" disabled={busy} onClick={async () => { if (!n.is_read && !await markRead(n.id)) return; if (n.link?.startsWith("/") && !n.link.startsWith("//")) void navigate({ to: n.link }); }}>عرض التفاصيل<ArrowRight /></Button>}
            {!n.is_read && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void markRead(n.id)}><CheckCheck />تحديد كمقروء</Button>}
          </div>
        </div>
      </li>)}
    </ul>}
  </main>;
}