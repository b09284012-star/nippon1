import { t, useLanguage, numberLocale } from "@/lib/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { formatDate, formatUsd } from "@/lib/media";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: t("طلباتي | Nippon") },
      {
        name: "description",
        content: t("تابع حالة صفقاتك: المبلغ محجوز، تم الشحن، تأكيد الاستلام، أو فتح نزاع."),
      },
      { property: "og:title", content: t("طلباتي | Nippon") },
      { property: "og:description", content: t("إدارة صفقات أجهزة التعدين بحماية المشتري.") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrdersPage,
});

const STATUS: Record<string, string> = {
  awaiting_payment: "بانتظار الدفع",
  escrow_held: "المبلغ محجوز",
  shipped: "تم الشحن",
  completed: "مكتمل",
  disputed: "نزاع",
  refunded: "مسترجع",
  cancelled: "ملغي",
};

function OrdersPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tracking, setTracking] = useState<Record<string, string>>({});

  const { data: orders, refetch } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, listings(title)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-black">{t("طلباتي")}</h1>
        <Button className="mt-6" onClick={() => navigate({ to: "/auth" })}>
          {t("دخول / تسجيل")} </Button>
      </div>
    );
  }

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    const { error } = await fn();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(ok);
    void refetch();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-black">{t("طلباتي")}</h1>
      <div className="mt-8 grid gap-4">
        {(orders ?? []).length === 0 && (
          <div className="glass rounded-2xl p-8 text-sm text-muted-foreground">{t("لا طلبات بعد.")}</div>
        )}
        {(orders ?? []).map((o) => {
          const isBuyer = o.buyer_id === user?.id;
          return (
            <div key={o.id} className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">{t(STATUS[o.status] ?? o.status)}</Badge>
                <span className="font-display font-bold">
                  {(o as { listings?: { title?: string } }).listings?.title ?? "عرض"}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(o.created_at)}</span>
                <span className="ms-auto font-display font-black neon-text">
                  {formatUsd(o.amount)}
                </span>
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                {isBuyer ? t("أنت المشتري") : t("أنت البائع")} {t("• الرسوم")} {formatUsd(o.fee)}
                {o.tracking_number ? (t(" • تتبع: ") + (o.shipping_carrier) + " " + (o.tracking_number)) : ""}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {!isBuyer && o.status === "escrow_held" && (
                  <>
                    <Input
                      className="w-56"
                      placeholder={t("الشركة ورقم التتبع")}
                      value={tracking[o.id] ?? ""}
                      onChange={(e) =>
                        setTracking((t) => ({ ...t, [o.id]: e.target.value.slice(0, 80) }))
                      }
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const [carrier, ...rest] = (tracking[o.id] ?? "").trim().split(" ");
                        if (!carrier || rest.length === 0) {
                          toast.error(t("اكتب اسم الشركة ثم رقم التتبع"));
                          return;
                        }
                        void run(
                          () =>
                            supabase.rpc("mark_order_shipped", {
                              _order_id: o.id,
                              _carrier: carrier,
                              _tracking: rest.join(" "),
                            }),
                          t("تم تحديث حالة الشحن"),
                        );
                      }}
                    >
                      {t("تم الشحن")} </Button>
                  </>
                )}

                {isBuyer && (o.status === "shipped" || o.status === "escrow_held") && (
                  <Button
                    size="sm"
                    onClick={() =>
                      void run(
                        () => supabase.rpc("release_escrow", { _order_id: o.id }),
                        t("تم تحرير المبلغ للبائع"),
                      )
                    }
                  >
                    {t("تأكيد الاستلام وتحرير المبلغ")} </Button>
                )}

                {isBuyer && user && o.status === "completed" && (
                  <ReviewForm
                    orderId={o.id}
                    sellerId={o.seller_id}
                    reviewerId={user.id}
                    onDone={() => void refetch()}
                  />
                )}

                {o.status !== "completed" && o.status !== "refunded" && o.status !== "disputed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const reason = window.prompt(t("سبب النزاع؟"))?.trim();
                      if (!reason || reason.length < 5) return;
                      void run(
                        () => supabase.rpc("open_dispute", { _order_id: o.id, _reason: reason }),
                        t("تم فتح النزاع وستراجعه الإدارة"),
                      );
                    }}
                  >
                    {t("فتح نزاع")} </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewForm({
  orderId,
  sellerId,
  reviewerId,
  onDone,
}: {
  orderId: string;
  sellerId: string;
  reviewerId: string;
  onDone: () => void;
}) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ["my-review", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment")
        .eq("order_id", orderId)
        .maybeSingle();
      return data;
    },
  });

  if (existing) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t("تقييمك:")}</span>
        <Stars value={existing.rating} />
        {existing.comment ? <span>— {existing.comment}</span> : null}
      </div>
    );
  }

  const submit = async () => {
    if (rating < 1) {
      toast.error(t("اختر عدد النجوم أولًا"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      order_id: orderId,
      seller_id: sellerId,
      reviewer_id: reviewerId,
      rating,
      comment: comment.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("شكرًا! تم إرسال تقييمك للبائع"));
    onDone();
  };

  return (
    <div className="glass mt-3 rounded-xl p-3">
      <div className="text-sm font-bold">{t("قيّم البائع بعد اكتمال الصفقة")}</div>
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={((n) + t(" نجوم"))}
            onClick={() => setRating(n)}
            className="p-0.5"
          >
            <Star
              className={
                n <= rating ? "size-6 fill-primary text-primary" : "size-6 text-muted-foreground/40"
              }
            />
          </button>
        ))}
      </div>
      <Textarea
        className="mt-2"
        placeholder={t("اكتب تجربتك مع البائع (اختياري)")}
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 500))}
      />
      <Button size="sm" className="mt-2" onClick={() => void submit()} disabled={busy}>
        {busy ? t("جارٍ الإرسال…") : t("إرسال التقييم")}
      </Button>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  const { t } = useLanguage();
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={
            n <= value ? "size-4 fill-primary text-primary" : "size-4 text-muted-foreground/40"
          }
        />
      ))}
    </span>
  );
}
