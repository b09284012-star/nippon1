import { t, useLanguage, numberLocale } from "@/lib/i18n";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/media";
import { useIsOnline } from "@/lib/presence";
import { useMyCountry } from "@/lib/my-country";

export const Route = createFileRoute("/chat/")({
  head: () => ({
    meta: [
      { title: t("الدردشة | Nippon") },
      {
        name: "description",
        content: t("تحدّث مباشرة مع البائع أو المشتري حول أجهزة التعدين قبل إتمام الصفقة."),
      },
      { property: "og:title", content: t("الدردشة | Nippon") },
      { property: "og:description", content: t("محادثات مباشرة بين المشتري والبائع داخل Nippon.") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatListPage,
});

function ChatListPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const { country, isAccount } = useMyCountry();
  const navigate = useNavigate();

  const { data: conversations } = useQuery({
    queryKey: ["conversations", user?.id, country],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, listings(title, price_usd)")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      const convs = data ?? [];
      if (!user || convs.length === 0) return [];
      const otherIds = [...new Set(convs.map((c) => (c.buyer_id === user.id ? c.seller_id : c.buyer_id)))];
      const [{ data: names }, { data: msgs }] = await Promise.all([
        supabase.rpc("public_profile_names", { _ids: otherIds }),
        supabase
          .from("messages")
          .select("conversation_id, body, attachment_type, sender_id, created_at")
          .in("conversation_id", convs.map((c) => c.id))
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      const nameMap = new Map((names ?? []).map((n) => [n.id, n.display_name]));
      const lastMap = new Map<string, NonNullable<typeof msgs>[number]>();
      for (const m of msgs ?? []) if (!lastMap.has(m.conversation_id)) lastMap.set(m.conversation_id, m);
      return convs.map((c) => {
        const isParty = c.buyer_id === user.id || c.seller_id === user.id;
        const otherId = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
        const role: "seller" | "buyer" | "admin" = !isParty ? "admin" : c.buyer_id === user.id ? "seller" : "buyer";
        const listing = (c as { listings?: { title?: string; price_usd?: number } }).listings;
        return {
          id: c.id,
          otherId,
          name: nameMap.get(otherId) ?? t("مستخدم"),
          role,
          listingTitle: listing?.title ?? t("عرض"),
          price: listing?.price_usd,
          last: lastMap.get(c.id),
          at: c.last_message_at,
          mine: lastMap.get(c.id)?.sender_id === user.id,
        };
      });
    },
  });

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-black">{t("الدردشة")}</h1>
        <Button className="mt-6" onClick={() => navigate({ to: "/auth" })}>
          {t("دخول / تسجيل")} </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-black">
        <span className="neon-text">{t("المحادثات")}</span>
      </h1>
      {isAccount && <p className="mt-3 text-sm text-muted-foreground">{t("دردشة الدولة")}: {t(country)}</p>}
      <div className="mt-8 grid gap-3">
        {(conversations ?? []).length === 0 && (
          <div className="glass rounded-2xl p-8 text-sm text-muted-foreground">
            {t("لا محادثات بعد. ابدأ محادثة من صفحة أي جهاز.")} </div>
        )}
        {(conversations ?? []).map((c) => (
          <ConversationRow key={c.id} c={c} />
        ))}
      </div>
    </div>
  );
}

type Row = {
  id: string;
  otherId: string;
  name: string;
  role: "seller" | "buyer" | "admin";
  listingTitle: string;
  price?: number | undefined;
  last?: { body: string; attachment_type: string | null } | undefined;
  at: string;
  mine: boolean;
};

function ConversationRow({ c }: { c: Row }) {
  const { t } = useLanguage();
  const online = useIsOnline(c.otherId);
  const roleLabel = c.role === "seller" ? t("بائع") : c.role === "buyer" ? t("مشتري") : t("إدارة / نزاع");
  const roleClass =
    c.role === "seller"
      ? "bg-primary/15 text-primary border-primary/30"
      : c.role === "buyer"
        ? "bg-success/15 text-success border-success/30"
        : "bg-warning/15 text-warning border-warning/30";
  const preview = c.last
    ? c.last.attachment_type
      ? `📎 ${c.last.attachment_type.startsWith("image") ? t("صورة مرفقة") : t("ملف مرفق")}`
      : c.last.body
    : t("لا رسائل بعد");
  return (
    <Link
      to="/chat/$id"
      params={{ id: c.id }}
      className="glass flex items-center gap-4 rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
    >
      <div className="relative shrink-0">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary font-display text-lg font-black text-secondary-foreground">
          {c.name.trim().charAt(0).toUpperCase() || "?"}
        </div>
        <span
          className={`absolute bottom-0 end-0 h-3.5 w-3.5 rounded-full border-2 border-background ${online ? "bg-success" : "bg-muted-foreground/50"}`}
          title={online ? t("متصل الآن") : t("غير متصل")}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-display font-bold">{c.name}</span>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${roleClass}`}>{roleLabel}</span>
          <span className="ms-auto shrink-0 text-[11px] text-muted-foreground">{formatDate(c.at)}</span>
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {t("بخصوص:")} {c.listingTitle}
          {c.price != null && ` · $${Number(c.price).toLocaleString("en-US")}`}
        </div>
        <div className="mt-1 truncate text-sm text-foreground/80">
          {c.mine && <span className="text-muted-foreground">{t("أنت:")} </span>}
          {preview}
        </div>
      </div>
    </Link>
  );
}
