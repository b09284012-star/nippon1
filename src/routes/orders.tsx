import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { formatDate, formatUsd } from "@/lib/media";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "طلباتي | Nippon" },
      {
        name: "description",
        content: "تابع حالة صفقاتك: المبلغ محجوز، تم الشحن، تأكيد الاستلام، أو فتح نزاع.",
      },
      { property: "og:title", content: "طلباتي | Nippon" },
      { property: "og:description", content: "إدارة صفقات أجهزة التعدين بحماية المشتري." },
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
        <h1 className="font-display text-2xl font-black">طلباتي</h1>
        <Button className="mt-6" onClick={() => navigate({ to: "/auth" })}>
          دخول / تسجيل
        </Button>
      </div>
    );
  }

  const run = async (fn: () => Promise<{ error: { message: string } | null }>, ok: string) => {
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
      <h1 className="font-display text-3xl font-black">طلباتي</h1>
      <div className="mt-8 grid gap-4">
        {(orders ?? []).length === 0 && (
          <div className="glass rounded-2xl p-8 text-sm text-muted-foreground">لا طلبات بعد.</div>
        )}
        {(orders ?? []).map((o) => {
          const isBuyer = o.buyer_id === user?.id;
          return (
            <div key={o.id} className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">{STATUS[o.status] ?? o.status}</Badge>
                <span className="font-display font-bold">
                  {(o as { listings?: { title?: string } }).listings?.title ?? "عرض"}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(o.created_at)}</span>
                <span className="ms-auto font-display font-black neon-text">
                  {formatUsd(o.amount)}
                </span>
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                {isBuyer ? "أنت المشتري" : "أنت البائع"} • العمولة {formatUsd(o.fee)}
                {o.tracking_number ? ` • تتبع: ${o.shipping_carrier} ${o.tracking_number}` : ""}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {!isBuyer && o.status === "escrow_held" && (
                  <>
                    <Input
                      className="w-56"
                      placeholder="الشركة ورقم التتبع"
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
                          toast.error("اكتب اسم الشركة ثم رقم التتبع");
                          return;
                        }
                        void run(
                          () =>
                            supabase.rpc("mark_order_shipped", {
                              _order_id: o.id,
                              _carrier: carrier,
                              _tracking: rest.join(" "),
                            }),
                          "تم تحديث حالة الشحن",
                        );
                      }}
                    >
                      تم الشحن
                    </Button>
                  </>
                )}

                {isBuyer && (o.status === "shipped" || o.status === "escrow_held") && (
                  <Button
                    size="sm"
                    onClick={() =>
                      void run(
                        () => supabase.rpc("release_escrow", { _order_id: o.id }),
                        "تم تحرير المبلغ للبائع",
                      )
                    }
                  >
                    تأكيد الاستلام وتحرير المبلغ
                  </Button>
                )}

                {o.status !== "completed" && o.status !== "refunded" && o.status !== "disputed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const reason = window.prompt("سبب النزاع؟")?.trim();
                      if (!reason || reason.length < 5) return;
                      void run(
                        () => supabase.rpc("open_dispute", { _order_id: o.id, _reason: reason }),
                        "تم فتح النزاع وستراجعه الإدارة",
                      );
                    }}
                  >
                    فتح نزاع
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
