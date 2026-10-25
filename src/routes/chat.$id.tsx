import { t, useLanguage, numberLocale } from "@/lib/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/media";
import { useIsOnline } from "@/lib/presence";
import { ChatAttachment } from "@/components/site/ChatAttachment";

export const Route = createFileRoute("/chat/$id")({
  head: () => ({
    meta: [
      { title: t("محادثة | Nippon") },
      {
        name: "description",
        content: t("محادثة مباشرة مع الطرف الآخر لمناقشة تفاصيل جهاز التعدين قبل الشراء."),
      },
      { property: "og:title", content: t("محادثة | Nippon") },
      { property: "og:description", content: t("دردشة فورية داخل منصة Nippon.") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatRoomPage,
});

function ChatRoomPage() {
  const { t } = useLanguage();
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: other, isPending: conversationPending } = useQuery({
    queryKey: ["conv-other", id, user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return null;
      const { data: c } = await supabase.from("conversations").select("buyer_id, seller_id").eq("id", id).maybeSingle();
      if (!c) return null;
      const isParty = c.buyer_id === user.id || c.seller_id === user.id;
      const otherId = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
      const { data, error } = await supabase.rpc("public_profile_names", { _ids: [otherId] });
      if (error) throw error;
      const p = data?.[0];
      return p ? { ...p, buyer_id: c.buyer_id, seller_id: c.seller_id, isParty } : null;
    },
  });
  const otherOnline = useIsOnline(other?.id);

  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`messages-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => void refetch(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, user, refetch]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-black">{t("المحادثة")}</h1>
        <Button className="mt-6" onClick={() => navigate({ to: "/auth" })}>
          {t("دخول / تسجيل")} </Button>
      </div>
    );
  }
  if (user && conversationPending) return <p className="px-4 py-20 text-center text-muted-foreground">{t("جارٍ التحميل…")}</p>;
  if (user && !other) return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><h1 className="text-xl font-bold">{t("المحادثة غير متاحة")}</h1><p className="mt-3 text-muted-foreground">{t("المحادثات الخاصة متاحة داخل دولة حسابك فقط، باستثناء الإدارة المختصة.")}</p><Button className="mt-5" onClick={() => navigate({ to: "/chat" })}>{t("المحادثات")}</Button></div>;

  const send = async () => {
    if (!user) return;
    const body = text.trim();
    if (body.length === 0) return;
    setText("");
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: id, sender_id: user.id, body: body.slice(0, 2000) });
    if (error) {
      toast.error(error.message);
      return;
    }
    void refetch();
  };

  const sendFile = async (file: File) => {
    if (!user) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error(t("الحد الأقصى لحجم الملف 20 ميغابايت"));
      return;
    }
    setUploading(true);
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const path = `${id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("chat-files").upload(path, file, { contentType: file.type });
    if (upErr) {
      setUploading(false);
      toast.error(t("تعذر رفع الملف"));
      return;
    }
    const { error } = await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: user.id,
      body: "",
      attachment_path: path,
      attachment_name: file.name.slice(0, 200),
      attachment_type: file.type || null,
    });
    setUploading(false);
    if (error) toast.error(error.message);
    else void refetch();
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-10">
      <div className="flex items-center gap-3">
        <div className="relative grid size-11 place-items-center rounded-full bg-secondary font-bold">
          {(other?.display_name ?? "؟").slice(0, 1)}
          <span className={cn("absolute bottom-0 end-0 size-3 rounded-full border-2 border-background", otherOnline ? "bg-primary" : "bg-muted-foreground/50")} />
        </div>
        <div>
          <h1 className="font-display text-xl font-black">{other && !other.isParty ? t("دردشة النزاع (الإدارة)") : other?.display_name ?? "المحادثة"}</h1>
          <p className="text-xs text-muted-foreground">{otherOnline ? t("نشط الآن") : t("غير متصل")}</p>
        </div>
      </div>
      <div className="glass mt-6 grid max-h-[60vh] gap-3 overflow-y-auto rounded-3xl p-5">
        {(messages ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">{t("ابدأ المحادثة برسالة.")}</p>
        )}
        {(messages ?? []).map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div
              key={m.id}
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                mine ? "ms-auto bg-primary text-primary-foreground" : "bg-secondary",
              )}
            >
              {other && m.sender_id !== other.buyer_id && m.sender_id !== other.seller_id && (
                <span className="mb-1 block text-[10px] font-bold">{t("الإدارة")}</span>
              )}
              {other && !other.isParty && !mine && (
                <span className="mb-1 block text-[10px] font-bold">{m.sender_id === other.buyer_id ? t("المشتري") : t("البائع")}</span>
              )}
              {m.attachment_path && <ChatAttachment path={m.attachment_path} name={m.attachment_name} type={m.attachment_type} />}
              {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
              <span className="mt-1 block text-[10px] opacity-70">{formatDate(m.created_at)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void sendFile(f); }} />
        <Button variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()} aria-label={t("إرفاق صورة أو ملف")}>
          {uploading ? "…" : "📎"}
        </Button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
          placeholder={t("اكتب رسالتك…")}
        />
        <Button onClick={() => void send()}>{t("إرسال")}</Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {t("لا تُتم أي دفعة خارج المنصة — استخدم نظام الضمان لحماية أموالك.")} </p>
    </div>
  );
}
