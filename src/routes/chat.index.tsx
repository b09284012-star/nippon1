import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/media";

export const Route = createFileRoute("/chat/")({
  head: () => ({
    meta: [
      { title: "الدردشة | Nippon" },
      {
        name: "description",
        content: "تحدّث مباشرة مع البائع أو المشتري حول أجهزة التعدين قبل إتمام الصفقة.",
      },
      { property: "og:title", content: "الدردشة | Nippon" },
      { property: "og:description", content: "محادثات مباشرة بين المشتري والبائع داخل Nippon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatListPage,
});

function ChatListPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { data: conversations } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*, listings(title)")
        .order("last_message_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-black">الدردشة</h1>
        <Button className="mt-6" onClick={() => navigate({ to: "/auth" })}>
          دخول / تسجيل
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-black">
        <span className="neon-text">المحادثات</span>
      </h1>
      <div className="mt-8 grid gap-3">
        {(conversations ?? []).length === 0 && (
          <div className="glass rounded-2xl p-8 text-sm text-muted-foreground">
            لا محادثات بعد. ابدأ محادثة من صفحة أي جهاز.
          </div>
        )}
        {(conversations ?? []).map((c) => (
          <Link
            key={c.id}
            to="/chat/$id"
            params={{ id: c.id }}
            className="glass flex items-center gap-3 rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
          >
            <span className="font-display font-bold">
              {(c as { listings?: { title?: string } }).listings?.title ?? "عرض"}
            </span>
            <span className="ms-auto text-xs text-muted-foreground">
              {formatDate(c.last_message_at)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
