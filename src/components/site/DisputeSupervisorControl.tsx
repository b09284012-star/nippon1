import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES } from "@/lib/countries";
import { useLanguage } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export function DisputeSupervisorControl({ userId, enabled, country, onDone }: {
  userId: string; enabled: boolean; country: string | null; onDone: () => void;
}) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(country ?? "");
  const [busy, setBusy] = useState(false);
  const save = async (nextEnabled: boolean) => {
    if (nextEnabled && !selected) { toast.error(t("اختر الدولة")); return; }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("assign_dispute_supervisor", { _user_id: userId, _country: selected, _enabled: nextEnabled });
      if (error) throw error;
      toast.success(t("تم تحديث الصلاحية"));
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("تعذر الحفظ"));
    } finally { setBusy(false); }
  };
  return <div className="flex max-w-full flex-wrap items-center gap-2">
    <label className="flex items-center gap-2">
      <Switch checked={enabled} disabled={busy || (!enabled && !selected)} onCheckedChange={value => void save(value)} />
      {t("أدمن النزاعات")}
    </label>
    <select aria-label={t("دولة مشرف النزاعات")} value={selected} disabled={busy} onChange={event => setSelected(event.target.value)} className="h-9 max-w-full rounded-md border border-input bg-background px-2 text-sm">
      <option value="">{t("اختر الدولة")}</option>
      {COUNTRIES.map(value => <option key={value} value={value}>{t(value)}</option>)}
    </select>
    {enabled && selected !== country && <Button size="sm" variant="outline" disabled={busy || !selected} onClick={() => void save(true)}>{t("حفظ")}</Button>}
  </div>;
}