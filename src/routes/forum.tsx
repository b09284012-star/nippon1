import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Newspaper, MessagesSquare, Megaphone, TrendingUp, TrendingDown, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/media";
import { getMarketNews } from "@/lib/finance.functions";

export const Route = createFileRoute("/forum")({
  head: () => ({
    meta: [
      { title: "المنتدى والأخبار | Nippon" },
      {
        name: "description",
        content: "أسعار الكريبتو المباشرة، أخبار التعدين، نقاش مفتوح بين المستخدمين، وإعلانات إدارة Nippon الرسمية.",
      },
      { property: "og:title", content: "المنتدى والأخبار | Nippon" },
      { property: "og:description", content: "أخبار السوق ونقاش مجتمع Nippon في مكان واحد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForumPage,
});

type Post = {
  id: string;
  channel: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles?: { display_name: string; avatar_url: string | null } | null;
};

function ForumPage() {
  const fetchNews = useServerFn(getMarketNews);

  const news = useQuery({
    queryKey: ["market-news"],
    queryFn: () => fetchNews(),
    refetchInterval: 60000,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-black">
        منتدى <span className="neon-text">Nippon</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        أخبار السوق لحظة بلحظة، نقاش بين المعدّنين، وإعلانات رسمية من الإدارة.
      </p>

      <Tabs defaultValue="news" className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="news">
            <Newspaper className="size-4" /> الأخبار المباشرة
          </TabsTrigger>
          <TabsTrigger value="general">
            <MessagesSquare className="size-4" /> القروب الجماعي
          </TabsTrigger>
          <TabsTrigger value="announcements">
            <Megaphone className="size-4" /> الإعلانات الرسمية
          </TabsTrigger>
        </TabsList>

        <TabsContent value="news" className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(news.data?.tickers ?? []).map((t) => (
              <div key={t.symbol} className="glass card-3d rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-black">{t.symbol}</span>
                  <Badge variant={t.change >= 0 ? "default" : "destructive"} className="gap-1">
                    {t.change >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {t.change.toFixed(2)}%
                  </Badge>
                </div>
                <div className="mt-2 font-display text-2xl font-black">
                  ${t.price.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                </div>
              </div>
            ))}
            {news.isLoading && <p className="text-sm text-muted-foreground">جارٍ تحميل الأسعار…</p>}
          </div>

          <div className="mt-8 grid gap-4">
            {(news.data?.news ?? []).map((n) => (
              <a
                key={n.id}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass flex gap-4 rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
              >
                {n.image && (
                  <img
                    src={n.image}
                    alt={n.title}
                    loading="lazy"
                    className="hidden size-24 shrink-0 rounded-xl object-cover sm:block"
                  />
                )}
                <div>
                  <h3 className="font-display font-bold leading-snug">{n.title}</h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {n.source} · {formatDate(n.published)}
                  </p>
                </div>
              </a>
            ))}
            {news.data && news.data.news.length === 0 && (
              <p className="text-sm text-muted-foreground">تعذر جلب الأخبار حاليًا، حاول لاحقًا.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          <Channel channel="general" />
        </TabsContent>

        <TabsContent value="announcements" className="mt-6">
          <Channel channel="announcements" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Channel({ channel }: { channel: "general" | "announcements" }) {
  const { user, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const canPost = Boolean(user) && (channel === "general" || isAdmin);

  const posts = useQuery({
    queryKey: ["forum", channel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_posts")
        .select("id, channel, author_id, body, created_at, profiles(display_name, avatar_url)")
        .eq("channel", channel)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Post[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`forum-${channel}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forum_posts", filter: `channel=eq.${channel}` },
        () => void qc.invalidateQueries({ queryKey: ["forum", channel] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [channel, qc]);

  const submit = async () => {
    if (!user) return;
    const text = body.trim();
    if (text.length < 2) {
      toast.error("اكتب رسالة أطول");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("forum_posts").insert({
      channel,
      author_id: user.id,
      body: text,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setBody("");
      void qc.invalidateQueries({ queryKey: ["forum", channel] });
    }
  };

  return (
    <div>
      {canPost ? (
        <div className="glass rounded-2xl p-4">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 4000))}
            placeholder={channel === "general" ? "شارك خبرتك أو اسأل المجتمع…" : "اكتب إعلانًا رسميًا للمستخدمين…"}
            rows={3}
          />
          <div className="mt-3 flex items-center gap-3">
            <Button disabled={busy} onClick={() => void submit()}>
              <Send className="size-4" /> {busy ? "جارٍ النشر…" : "نشر"}
            </Button>
            <span className="text-xs text-muted-foreground">
              باسم {profile?.display_name ?? "مستخدم"}
            </span>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-4 text-sm text-muted-foreground">
          {user
            ? "قسم الإعلانات مخصّص لنشر الإدارة فقط، ويمكنك قراءة كل الإعلانات هنا."
            : "سجّل الدخول للمشاركة في النقاش."}
          {!user && (
            <Button className="ms-3" size="sm" onClick={() => navigate({ to: "/auth" })}>
              دخول
            </Button>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-3">
        {(posts.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">لا منشورات بعد.</p>
        )}
        {(posts.data ?? []).map((p) => (
          <article key={p.id} className="glass rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-display font-bold">{p.profiles?.display_name ?? "مستخدم"}</span>
              {channel === "announcements" && (
                <Badge className="bg-accent text-accent-foreground">إعلان رسمي</Badge>
              )}
              <span className="text-xs text-muted-foreground">{formatDate(p.created_at)}</span>
              {(isAdmin || p.author_id === user?.id) && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="حذف المنشور"
                  className="ms-auto"
                  onClick={async () => {
                    const { error } = await supabase.from("forum_posts").delete().eq("id", p.id);
                    if (error) toast.error(error.message);
                    else void qc.invalidateQueries({ queryKey: ["forum", channel] });
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{p.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
