import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/media";
import { cn } from "@/lib/utils";

export function NotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState<string>("default");

  useEffect(() => {
    if (typeof Notification !== "undefined") setPerm(Notification.permission);
  }, []);

  const q = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as { title: string; body: string; link: string | null };
          toast(n.title, { description: n.body });
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              const notif = new Notification(n.title, { body: n.body, icon: "/favicon.png" });
              notif.onclick = () => {
                window.focus();
                if (n.link) window.location.href = n.link;
              };
            } catch {
              /* ignore */
            }
          }
          void q.refetch();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return null;
  const unread = (q.data ?? []).filter((n) => !n.is_read).length;

  const askPermission = async () => {
    if (typeof Notification === "undefined") {
      toast.error("متصفحك لا يدعم الإشعارات");
      return;
    }
    if (window.top !== window.self) {
      toast.info("افتح الموقع في نافذة مستقلة لتفعيل الإشعارات");
      return;
    }
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === "granted") toast.success("تم تفعيل الإشعارات");
    else toast.error("تم رفض الإشعارات — فعّلها من إعدادات المتصفح");
  };

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
      void q.refetch();
    }
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={() => void toggle()} aria-label="الإشعارات">
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 end-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread}
          </span>
        )}
      </Button>
      {open && (
        <div className="glass absolute end-0 top-10 z-50 w-80 max-w-[90vw] rounded-2xl p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-display font-bold">الإشعارات</span>
            {perm !== "granted" && (
              <Button size="sm" variant="outline" onClick={() => void askPermission()}>
                تفعيل التنبيهات
              </Button>
            )}
          </div>
          <div className="grid max-h-80 gap-2 overflow-y-auto">
            {(q.data ?? []).length === 0 && <p className="p-3 text-sm text-muted-foreground">لا إشعارات.</p>}
            {(q.data ?? []).map((n) => (
              <button
                key={n.id}
                className={cn("rounded-xl p-3 text-start text-sm hover:bg-secondary", !n.is_read && "bg-primary/10")}
                onClick={() => {
                  setOpen(false);
                  if (n.link) void navigate({ to: n.link });
                }}
              >
                <p className="font-bold">{n.title}</p>
                {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
                <span className="mt-1 block text-[10px] text-muted-foreground">{formatDate(n.created_at)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
