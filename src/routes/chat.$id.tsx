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

export const Route = createFileRoute("/chat/$id")({
  head: () => ({
    meta: [
      { title: "محادثة | Nippon" },
      {
        name: "description",
        content: "محادثة مباشرة مع الطرف الآخر لمناقشة تفاصيل جهاز التعدين قبل الشراء.",
      },
      { property: "og:title", content: "محادثة | Nippon" },
      { property: "og:description", content: "دردشة فورية داخل منصة Nippon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatRoomPage,
});

function ChatRoomPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

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
        <h1 className="font-display text-2xl font-black">المحادثة</h1>
        <Button className="mt-6" onClick={() => navigate({ to: "/auth" })}>
          دخول / تسجيل
        </Button>
      </div>
    );
  }

  const send = async () => {
    const body = text.trim();
    if (body.length === 0) return;
    setText("");
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: id, sender_id: user!.id, body: body.slice(0, 2000) });
    if (error) {
      toast.error(error.message);
      return;
    }
    void refetch();
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-10">
      <h1 className="font-display text-2xl font-black">المحادثة</h1>
      <div className="glass mt-6 grid max-h-[60vh] gap-3 overflow-y-auto rounded-3xl p-5">
        {(messages ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">ابدأ المحادثة برسالة.</p>
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
              <p className="whitespace-pre-wrap">{m.body}</p>
              <span className="mt-1 block text-[10px] opacity-70">{formatDate(m.created_at)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
          placeholder="اكتب رسالتك…"
        />
        <Button onClick={() => void send()}>إرسال</Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        لا تُتم أي دفعة خارج المنصة — استخدم نظام الضمان لحماية أموالك.
      </p>
    </div>
  );
}
