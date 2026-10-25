import { analyticsDollar as formatUsd } from "@/components/site/AnalyticsCharts";
import { t, useLanguage, numberLocale } from "@/lib/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/media";
import { supabase } from "@/integrations/supabase/client";
import { ProfitsAnalytics } from "@/components/site/ProfitsAnalytics";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: t("اللوحة المالية | Nippon") },
      {
        name: "description",
        content: t("لوحة مالية مستقلة تعرض أرباح ومبيعات Nippon للإدارة."),
      },
      { property: "og:title", content: t("اللوحة المالية | Nippon") },
      { property: "og:description", content: t("أرباح المنصة وتحليل المبيعات.") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FinancePage,
});

function FinancePage() {
  const { t } = useLanguage();
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  const summary = useQuery({
    queryKey: ["finance-summary"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_finance_summary");
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  if (loading) return <div className="px-4 py-20 text-center text-muted-foreground">{t("جارٍ التحميل…")}</div>;

  if (!user || !isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Lock className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-black">{t("اللوحة المالية")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("هذه اللوحة مغلقة ومخصّصة للإدارة فقط.")}</p>
        <Button className="mt-6" onClick={() => navigate({ to: user ? "/" : "/auth" })}>
          {user ? t("العودة للرئيسية") : t("دخول")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-black">{t("لوحة البيانات المالية")}</h1>
      </div>


      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["قيمة الأجهزة المعروضة", formatUsd(Number(summary.data?.listed_value ?? 0)), ((summary.data?.listed_count ?? 0) + t(" عرض نشط"))],
          ["أرباح متوقعة (5%)", formatUsd(Number(summary.data?.expected_fees ?? 0)), "من الأجهزة المعروضة"],
          ["أرباح محققة", formatUsd(Number(summary.data?.earned_fees ?? 0)), ("+ " + (formatUsd(Number(summary.data?.held_fees ?? 0))) + t(" في الضمان"))],
          ["رسوم السحب", formatUsd(Number(summary.data?.withdrawal_fees ?? 0)), "2.5$ لكل سحب مكتمل"],
        ].map(([l, v, h]) => (
          <div key={t(l)} className="glass card-3d rounded-2xl p-5">
            <div className="text-xs text-muted-foreground">{t(l)}</div>
            <div className="mt-1 font-display text-2xl font-black">{v}</div>
            <div className="mt-1 text-xs text-muted-foreground">{t(h)}</div>
          </div>
        ))}
      </div>


      <ManualCredit />

      <ProfitsAnalytics />

    </div>
  );
}

function ManualCredit() {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<{ id: string; label: string } | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const users = useQuery({
    queryKey: ["finance-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_users_full");
      if (error) throw error;
      return data ?? [];
    },
  });
  const s = q.trim().toLowerCase();
  const matches = s.length < 2 ? [] : (users.data ?? []).filter((u) =>
    [u.email, u.display_name, u.full_name, u.deposit_tag, u.phone].some((v) => (v ?? "").toLowerCase().includes(s)),
  ).slice(0, 6);

  const submit = async () => {
    const n = Number(amount);
    if (!target || !Number.isFinite(n) || n === 0) { toast.error(t("اختر مستخدمًا وأدخل مبلغًا صحيحًا")); return; }
    setBusy(true);
    const { error } = await supabase.rpc("admin_credit_user", { _user_id: target.id, _amount: n, _note: note.trim() || "إضافة يدوية" });
    setBusy(false);
    if (error) { toast.error(error.message === "NEGATIVE_BALANCE" ? t("الرصيد لا يكفي للخصم") : error.message); return; }
    toast.success(n > 0 ? (t("تمت إضافة ") + (formatUsd(n))) : (t("تم خصم ") + (formatUsd(-n))));
    setAmount(""); setNote(""); void users.refetch();
  };

  return (
    <div className="glass mt-8 rounded-2xl p-6">
      <h2 className="font-display text-xl font-bold">{t("إضافة رصيد يدويًا")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("ابحث بالاسم أو البريد أو معرّف المحفظة. استخدم مبلغًا سالبًا للخصم.")}</p>
      <Input className="mt-4" placeholder={t("بحث عن مستخدم...")} value={q} onChange={(e) => setQ(e.target.value)} />
      {matches.length > 0 && (
        <div className="mt-2 grid gap-1">
          {matches.map((u) => (
            <button key={u.id} type="button" onClick={() => { setTarget({ id: u.id, label: `${u.display_name} — ${u.email}` }); setQ(""); }}
              className="rounded-lg px-3 py-2 text-start text-sm hover:bg-secondary">
              {u.display_name} • {u.email} • {u.deposit_tag} • {formatUsd(Number(u.balance ?? 0))}
            </button>
          ))}
        </div>
      )}
      {target && <p className="mt-3 text-sm">{t("المستخدم:")} <span className="font-semibold text-primary">{target.label}</span></p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr_auto]">
        <Input type="number" placeholder={t("المبلغ $")} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input placeholder={t("ملاحظة (اختياري)")} value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} />
        <Button disabled={busy || !target} onClick={() => void submit()}>{t("تنفيذ")}</Button>
      </div>
    </div>
  );
}
