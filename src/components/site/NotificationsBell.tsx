import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/notifications";

export function NotificationsBell() {
  const { user } = useAuth();
  const q = useNotifications(user?.id);

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
                window.location.href = "/notifications";
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

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/notifications" aria-label="الإشعارات">
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 end-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
        </Link>
      </Button>
    </div>
  );
}
