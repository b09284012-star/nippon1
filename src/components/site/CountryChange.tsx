import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Req = { id: string; user_id: string; current_country: string | null; requested_country: string; reason: string; status: string; admin_note: string | null; created_at: string };

const statusLabel = (s: string) => (s === "pending" ? "قيد المراجعة" : s === "approved" ? "مقبول" : "مرفوض");

export function CountryChangeRequest({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => void supabase.from("country_change_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5).then(({ data }) => setReqs((data ?? []) as Req[]));
  useEffect(load, [userId]);
  const pending = reqs.find((r) => r.status === "pending");
  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("request_country_change", { _country: country, _reason: reason });
    setBusy(false);
    if (error) { toast.error(t("تعذر إرسال الطلب، تأكد من الدولة والسبب (5 أحرف على الأقل)")); return; }
    toast.success(t("تم إرسال طلب تغيير الدولة للمراجعة"));
    setOpen(false); setCountry(""); setReason(""); load();
  };
  return (
    <div className="grid gap-2 rounded-2xl border border-border p-3 text-sm">
      <p className="text-xs text-muted-foreground">{t("لا يمكن تغيير الدولة بعد التسجيل إلا بطلب يراجعه المشرف.")}</p>
      {pending ? (
        <p>{t("طلبك قيد المراجعة")}: <b>{pending.requested_country}</b></p>
      ) : open ? (
        <div className="grid gap-2">
          <Input placeholder={t("الدولة الجديدة")} value={country} maxLength={60} onChange={(e) => setCountry(e.target.value)} />
          <Input placeholder={t("سبب التغيير")} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => void submit()}>{t("إرسال الطلب")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>{t("إلغاء")}</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>{t("طلب تغيير الدولة")}</Button>
      )}
      {reqs.filter((r) => r.status !== "pending").slice(0, 2).map((r) => (
        <p key={r.id} className="text-xs text-muted-foreground">{r.requested_country} — {t(statusLabel(r.status))}{r.admin_note ? ` (${r.admin_note})` : ""}</p>
      ))}
    </div>
  );
}

export function CountryChangeReview() {
  const { t } = useLanguage();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = async () => {
    const { data } = await supabase.from("country_change_requests").select("*").order("created_at", { ascending: false }).limit(200);
    const list = ((data ?? []) as Req[]).sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"));
    setReqs(list);
    const ids = [...new Set(list.map((r) => r.user_id))];
    if (ids.length) {
      const { data: n } = await supabase.rpc("public_profile_names", { _ids: ids });
      setNames(Object.fromEntries((n ?? []).map((x: { id: string; display_name: string }) => [x.id, x.display_name])));
    }
  };
  useEffect(() => { void load(); }, []);
  const review = async (id: string, approve: boolean) => {
    const { error } = await supabase.rpc("review_country_change", { _id: id, _approve: approve, _note: notes[id] ?? "" });
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? t("تمت الموافقة") : t("تم الرفض"));
    void load();
  };
  if (!reqs.length) return <p className="text-center text-muted-foreground">{t("لا توجد طلبات")}</p>;
  return (
    <div className="grid gap-3">
      {reqs.map((r) => (
        <div key={r.id} className="glass grid gap-2 rounded-2xl p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <b>{names[r.user_id] ?? r.user_id.slice(0, 8)}</b>
            <Badge variant={r.status === "pending" ? "default" : "secondary"}>{t(statusLabel(r.status))}</Badge>
          </div>
          <p>{r.current_country ?? "—"} ← <b>{r.requested_country}</b></p>
          <p className="text-muted-foreground">{r.reason}</p>
          <p className="text-xs text-muted-foreground" dir="ltr">{new Date(r.created_at).toLocaleString("en-GB")}</p>
          {r.status === "pending" && (
            <div className="grid gap-2">
              <Input placeholder={t("ملاحظة (اختياري)")} value={notes[r.id] ?? ""} onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value.slice(0, 300) }))} />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void review(r.id, true)}>{t("موافقة")}</Button>
                <Button size="sm" variant="destructive" onClick={() => void review(r.id, false)}>{t("رفض")}</Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
