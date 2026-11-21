import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t, useLanguage } from "@/lib/i18n";
import { formatDate, formatUsd } from "@/lib/media";

const STATUSES = ["all", "escrow_held", "shipped", "completed", "disputed", "refunded", "cancelled"] as const;
const LABEL: Record<string, string> = { all: "الكل", awaiting_payment: "بانتظار الدفع", escrow_held: "محجوز", shipped: "تم الشحن", completed: "مكتمل", disputed: "نزاع", refunded: "مسترجع", cancelled: "ملغي" };

export function OrdersLog() {
  useLanguage();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const orders = useQuery({ queryKey: ["admin-orders"], queryFn: async () => {
    const { data, error } = await supabase.rpc("admin_list_orders");
    if (error) throw error;
    return data ?? [];
  } });
  const s = q.trim().toLowerCase();
  const rows = (orders.data ?? []).filter((o) => (status === "all" || o.status === status) && (!s || [o.id, o.listing_title, o.buyer_name, o.buyer_email, o.seller_name, o.seller_email].some((v) => (v ?? "").toLowerCase().includes(s))));
  return <div className="grid gap-4">
    <Input placeholder={t("ابحث برقم الطلب أو الجهاز أو المشتري أو البائع")} value={q} onChange={(e) => setQ(e.target.value)} />
    <div className="flex flex-wrap gap-2">{STATUSES.map((st) => <Button key={st} size="sm" variant={status === st ? "default" : "outline"} onClick={() => setStatus(st)}>{t(LABEL[st])}</Button>)}</div>
    <p className="text-sm text-muted-foreground">{t("عدد الطلبات")}: {rows.length}</p>
    {orders.isLoading && <p className="text-sm text-muted-foreground">{t("جارٍ التحميل...")}</p>}
    {rows.map((o) => <div key={o.id} className="rounded-xl border border-border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold">{o.listing_title ?? "—"}</span>
        <Badge variant={o.status === "disputed" ? "destructive" : "secondary"}>{t(LABEL[o.status] ?? o.status)}</Badge>
      </div>
      <div className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-2">
        <span>{t("رقم الطلب")}: <span dir="ltr">#{o.id.slice(0, 8)}</span></span>
        <span>{t("التاريخ")}: {formatDate(o.created_at)}</span>
        <span>{t("المشتري")}: {o.buyer_name} <span dir="ltr">({o.buyer_email})</span></span>
        <span>{t("البائع")}: {o.seller_name} <span dir="ltr">({o.seller_email})</span></span>
        <span>{t("القيمة")}: {formatUsd(Number(o.amount))} × {o.quantity}</span>
        <span>{t("عمولة المنصة")}: {formatUsd(Number(o.fee))}</span>
      </div>
    </div>)}
  </div>;
}
