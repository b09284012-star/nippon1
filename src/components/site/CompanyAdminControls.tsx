import { useState } from 'react';
import { toast } from 'sonner';
import { Building2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n';

export function CompanyAdminControls({ userId, enabled, verified, fee, onDone }: { userId: string; enabled: boolean; verified: boolean; fee: number | null; onDone: () => void }) {
  const { t } = useLanguage();
  const [rate, setRate] = useState(fee === null ? '' : String(fee));
  const [busy, setBusy] = useState(false);
  async function save(active: boolean) {
    const value = Number(rate);
    if (active && (!rate.trim() || !Number.isFinite(value) || value < 0 || value >= 5)) { toast.error(t('اختر عمولة من 0% إلى أقل من 5%')); return; }
    setBusy(true);
    try {
      const { error } = await supabase.rpc('admin_configure_company', { _user_id: userId, _enabled: active, _fee_percent: value });
      if (error) throw error;
      toast.success(t('تم تحديث حساب الشركة'));
      onDone();
    } catch (error) { toast.error(error instanceof Error ? error.message : t('تعذر التنفيذ')); }
    finally { setBusy(false); }
  }
  return <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
    <label className="flex items-center gap-2 text-sm"><Building2 className="size-4 text-primary" /><Switch aria-label={t('حساب شركة')} checked={enabled} disabled={busy || (!verified && !enabled)} onCheckedChange={value => void save(value)} />{t('حساب شركة')}</label>
    <label htmlFor={`company-fee-${userId}`} className="text-xs text-muted-foreground">{t('عمولة الشركة (%)')}</label>
    <Input id={`company-fee-${userId}`} type="number" min={0} max={4.99} step="0.01" value={rate} onChange={event => setRate(event.target.value)} className="h-9 w-24" dir="ltr" disabled={busy} />
    <Button size="sm" variant="outline" disabled={busy || !enabled} onClick={() => void save(true)}><Save className="size-4" />{t('حفظ العمولة')}</Button>
  </div>;
}
