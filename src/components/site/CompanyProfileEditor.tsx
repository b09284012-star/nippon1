import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { businessWebsite } from "@/lib/companies";
import { useStorageUrl } from "@/lib/media";
import { useLanguage } from "@/lib/i18n";

export function CompanyProfileEditor({ userId, defaultName }: { userId: string; defaultName: string }) {
  const { t } = useLanguage();
  const query = useQuery({ queryKey: ["my-company-profile", userId], queryFn: async () => {
    const { data, error } = await supabase.from("company_profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return data;
  }});
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data: logo } = useStorageUrl("company-logos", query.data?.logo_path);
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("company_name") ?? "").trim();
    const website = String(form.get("website") ?? "").trim();
    if (name.length < 2) { toast.error(t("أدخل اسم الشركة")); return; }
    if (website && !businessWebsite(website)) { toast.error(t("رابط الموقع غير صالح")); return; }
    const file = form.get("logo");
    setBusy(true);
    let newPath: string | null = null;
    try {
      if (file instanceof File && file.size > 0) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error(t("اختر صورة JPG أو PNG أو WebP بحجم لا يتجاوز 5 ميغابايت"));
        newPath = `${userId}/${crypto.randomUUID()}`;
        const upload = await supabase.storage.from("company-logos").upload(newPath, file);
        if (upload.error) throw upload.error;
      }
      const { error } = await supabase.from("company_profiles").upsert({ user_id: userId, company_name: name, logo_path: newPath ?? query.data?.logo_path ?? null, contact_email: String(form.get("contact_email") ?? "").trim(), contact_phone: String(form.get("contact_phone") ?? "").trim(), website, description: String(form.get("description") ?? "").trim() });
      if (error) throw error;
      if (newPath && query.data?.logo_path) await supabase.storage.from("company-logos").remove([query.data.logo_path]);
      await Promise.all([client.invalidateQueries({ queryKey: ["my-company-profile"] }), client.invalidateQueries({ queryKey: ["company-directory"] })]);
      toast.success(t("تم حفظ بيانات الشركة"));
    } catch (error) {
      if (newPath) await supabase.storage.from("company-logos").remove([newPath]);
      toast.error(error instanceof Error ? error.message : t("تعذر الحفظ"));
    } finally { setBusy(false); }
  };
  if (query.isPending) return <p className="py-4 text-muted-foreground">{t("جارٍ تحميل بيانات الشركة…")}</p>;
  if (query.isError) return <p className="py-4 text-destructive">{t("تعذر تحميل بيانات الشركة.")}</p>;
  return (
    <section className="border-y border-border py-6">
      <h2 className="mb-4 font-display text-xl font-bold">{t("بيانات الشركة")}</h2>
      <form key={query.data?.logo_path ?? query.data?.company_name ?? "new"} onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label htmlFor="company-name">{t("اسم الشركة")}</Label><Input id="company-name" name="company_name" required maxLength={100} defaultValue={query.data?.company_name || defaultName} className="mt-2" /></div>
        <div className="sm:col-span-2"><Label htmlFor="company-logo" className="flex items-center gap-2"><ImagePlus className="size-4" />{t("شعار أو صورة الشركة")}</Label>{logo && <img src={logo} alt={t("شعار الشركة الحالي")} className="mt-2 size-20 rounded-lg border border-border object-contain" />}<Input id="company-logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" className="mt-2" /></div>
        <div><Label htmlFor="company-email">{t("بريد التواصل التجاري")}</Label><Input id="company-email" name="contact_email" type="email" dir="ltr" maxLength={255} defaultValue={query.data?.contact_email} className="mt-2" /></div>
        <div><Label htmlFor="company-phone">{t("هاتف التواصل التجاري")}</Label><Input id="company-phone" name="contact_phone" type="tel" dir="ltr" maxLength={40} defaultValue={query.data?.contact_phone} className="mt-2" /></div>
        <div className="sm:col-span-2"><Label htmlFor="company-website">{t("الموقع الإلكتروني")}</Label><Input id="company-website" name="website" dir="ltr" maxLength={300} defaultValue={query.data?.website} className="mt-2" /></div>
        <div className="sm:col-span-2"><Label htmlFor="company-description">{t("نبذة عن الشركة")}</Label><Textarea id="company-description" name="description" maxLength={1000} defaultValue={query.data?.description} className="mt-2" /></div>
        <p className="text-xs text-muted-foreground sm:col-span-2">{t("بيانات التواصل التجارية تظهر للبائعين المعتمدين فقط، ولا تُعرض بيانات حسابك الشخصية.")}</p>
        <Button type="submit" disabled={busy} className="sm:col-span-2"><Save className="size-4" />{busy ? t("جارٍ الحفظ…") : t("حفظ بيانات الشركة")}</Button>
      </form>
    </section>
  );
}