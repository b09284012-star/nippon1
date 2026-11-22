import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t, useLanguage } from "@/lib/i18n";
import { formatDate } from "@/lib/media";

const ACTIONS = ["all", "ban", "suspend", "unban", "delete"] as const;
const LABEL: Record<string, string> = { all: "الكل", ban: "حظر دائم", suspend: "تعليق", unban: "رفع الحظر", delete: "حذف الحساب" };
const VARIANT: Record<string, "destructive" | "secondary" | "default" | "outline"> = { ban: "destructive", delete: "destructive", suspend: "secondary", unban: "outline" };

export function AuditLog() {
  useLanguage();
  const [q, setQ] = useState("");
  const [action, setAction] = useState<string>("all");
  const logs = useQuery({ queryKey: ["admin-audit-logs"], queryFn: async () => {
    const { data, error } = await supabase.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) throw error;
    return data ?? [];
  } });
  const s = q.trim().toLowerCase();
  const rows = (logs.data ?? []).filter((l) => (action === "all" || l.action === action) && (!s || [l.admin_name, l.admin_email, l.target_name, l.target_email, l.target_id].some((v) => (v ?? "").toLowerCase().includes(s))));
  return <div className="grid gap-4">
    <Input placeholder={t("ابحث باسم المدير أو المستخدم أو البريد")} value={q} onChange={(e) => setQ(e.target.value)} />
    <div className="flex flex-wrap gap-2">{ACTIONS.map((a) => <Button key={a} size="sm" variant={action === a ? "default" : "outline"} onClick={() => setAction(a)}>{t(LABEL[a] ?? a)}</Button>)}</div>
    <p className="text-sm text-muted-foreground">{t("عدد الإجراءات")}: {rows.length}</p>
    {logs.isLoading && <p className="text-sm text-muted-foreground">{t("جارٍ التحميل...")}</p>}
    {!logs.isLoading && rows.length === 0 && <p className="text-sm text-muted-foreground">{t("لا توجد إجراءات مسجلة")}</p>}
    {rows.map((l) => <div key={l.id} className="rounded-xl border border-border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant={VARIANT[l.action] ?? "default"}>{t(LABEL[l.action] ?? l.action)}{l.action === "suspend" && l.details ? ` · ${l.details} ${t("أيام")}` : ""}</Badge>
        <span className="text-muted-foreground" dir="ltr">{formatDate(l.created_at)} {new Date(l.created_at).toLocaleTimeString("en-GB")}</span>
      </div>
      <div className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-2">
        <span>{t("المدير المنفّذ")}: <span className="text-foreground">{l.admin_name ?? "—"}</span> <span dir="ltr">({l.admin_email ?? "—"})</span></span>
        <span>{t("الحساب المستهدف")}: <span className="text-foreground">{l.target_name ?? "—"}</span> <span dir="ltr">({l.target_email ?? "—"})</span></span>
      </div>
    </div>)}
  </div>;
}
