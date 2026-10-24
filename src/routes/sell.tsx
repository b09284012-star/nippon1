import { t, useLanguage, numberLocale } from "@/lib/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { COUNTRIES } from "@/lib/countries";

export const Route = createFileRoute("/sell")({
  head: () => ({
    meta: [
      { title: t("أضف عرض جهاز تعدين | Nippon") },
      {
        name: "description",
        content: t("اعرض جهاز التعدين المستعمل للبيع على Nippon: المواصفات، السعر بالـ USDT، والضمان إلزامي."),
      },
      { property: "og:title", content: t("أضف عرض جهاز تعدين | Nippon") },
      { property: "og:description", content: t("بيع جهازك بحماية المشتري وضمان موثّق.") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SellPage,
});

const schema = z.object({
  title: z.string().min(6, "العنوان قصير جدًا"),
  brand: z.string().min(2, "أدخل الشركة المصنعة"),
  model: z.string().min(1, "أدخل الطراز"),
  algorithm: z.string().optional(),
  hashrate: z.string().min(2, "أدخل الهاش ريت"),
  power_watts: z.coerce.number().int().min(1, "أدخل الاستهلاك بالواط"),
  condition: z.string().min(2, "أدخل حالة الجهاز"),
  price_usd: z.coerce.number().min(1, "السعر إلزامي"),
  warranty_months: z.coerce.number().int().min(0, "الضمان إلزامي"),
  availability: z.enum(["in_stock", "on_order"]).default("in_stock"),
  quantity: z.coerce.number().int().min(1, "أدخل الكمية"),
  hours_used: z.coerce.number().int().min(0).optional(),
  location: z.string().optional(),
  description: z.string().min(20, "أضف وصفًا لا يقل عن 20 حرفًا"),
});

function SellPage() {
  const { t } = useLanguage();
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const [availability, setAvailability] = useState<"in_stock" | "on_order">("in_stock");

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-black">{t("أضف عرض")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("سجّل الدخول أولًا لإضافة عرض.")}</p>
        <Button className="mt-6" onClick={() => navigate({ to: "/auth" })}>
          {t("دخول / تسجيل")} </Button>
      </div>
    );
  }

  const verified = Boolean(profile?.is_verified_seller) || isAdmin;
  const myCountry = accountCountry;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd.entries()));
    if (!parsed.success) {
      toast.error(t(parsed.error.issues[0]?.message) ?? "تحقق من الحقول");
      return;
    }
    setBusy(true);
    try {
      const paths: string[] = [];
      for (const file of Array.from(files ?? [])) {
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { error } = await supabase.storage.from("listing-images").upload(path, file);
        if (error) throw error;
        paths.push(path);
      }
      const { algorithm, hours_used, location: _ignored, ...rest } = parsed.data;
      const { data, error } = await supabase
        .from("listings")
        .insert({
          ...rest,
          algorithm: algorithm ?? null,
          hours_used: hours_used ?? null,
          location: myCountry || null,
          images: paths,
          seller_id: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success(t("تم نشر العرض"));
      navigate({ to: "/listings/$id", params: { id: data.id } });
    } catch (err) {
      toast.error((err as Error).message || "تعذر النشر");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-black">
        {t("أضف")} <span className="neon-text">{t("عرض")}</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("السعر ومدة الضمان حقول إلزامية، والنشر متاح للبائعين المعتمدين من الإدارة فقط.")} </p>

      {!verified && (
        <div className="glass mt-6 rounded-2xl border border-accent/40 p-5">
          <p className="text-sm">
            {t("حسابك ليس بائعًا معتمدًا بعد. تواصل مع الدعم ليعتمدك فريق الإدارة كبائع موثوق ثم يمكنك النشر.")} </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="glass mt-8 grid gap-4 rounded-3xl p-6 sm:grid-cols-2">
        <Field name="title" label={t("عنوان العرض")} className="sm:col-span-2" />
        <Field name="brand" label={t("الشركة المصنعة")} placeholder="Bitmain" />
        <Field name="model" label={t("الطراز")} placeholder="Antminer S19j Pro" />
        <Field name="algorithm" label={t("الخوارزمية (اختياري)")} placeholder="SHA-256" />
        <Field name="hashrate" label={t("الهاش ريت")} placeholder="104 TH/s" />
        <Field name="power_watts" label={t("الاستهلاك (واط)")} type="number" />
        <Field name="condition" label={t("الحالة")} placeholder={t("مستعمل - ممتاز")} />
        <Field name="price_usd" label={t("السعر (USDT) *")} type="number" step="0.01" />
        <Field name="warranty_months" label={t("الضمان (شهور) *")} type="number" />
        <div>
          <Label className="mb-2 block">{t("نوع التوفر *")}</Label>
          <select
            name="availability"
            value={availability}
            onChange={(e) => setAvailability(e.target.value as "in_stock" | "on_order")}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="in_stock">{t("متوفر الآن")}</option>
            <option value="on_order">{t("حسب الطلب")}</option>
          </select>
        </div>
        <Field
          name="quantity"
          label={availability === "on_order" ? t("الكمية القابلة للتوريد *") : t("الكمية المتوفرة *")}
          type="number"
          min={1}
          defaultValue={1}
        />
        <Field name="hours_used" label={t("ساعات التشغيل (اختياري)")} type="number" />
        <div>
          <Label className="mb-2 block">{t("الدولة")}</Label>
          <p className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm">
            {myCountry ? t(myCountry) : t("الدولة")}
          </p>
        </div>

        <div className="sm:col-span-2">
          <Label className="mb-2 block">{t("الوصف")}</Label>
          <Textarea name="description" rows={5} placeholder={t("حالة الجهاز، سبب البيع، الملحقات…")} />
        </div>

        <div className="sm:col-span-2">
          <Label className="mb-2 block">{t("الصور")}</Label>
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(e.target.files)}
          />
        </div>

        <Button type="submit" className="sm:col-span-2" disabled={busy || !verified}>
          {busy ? t("جارٍ النشر…") : t("نشر العرض")}
        </Button>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  className,
  ...rest
}: { name: string; label: string; className?: string } & React.ComponentProps<typeof Input>) {
  const { t } = useLanguage();
  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      <Input name={name} {...rest} />
    </div>
  );
}
