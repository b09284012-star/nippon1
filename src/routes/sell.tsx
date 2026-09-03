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

export const Route = createFileRoute("/sell")({
  head: () => ({
    meta: [
      { title: "أضف عرض جهاز تعدين | Nippon" },
      {
        name: "description",
        content: "اعرض جهاز التعدين المستعمل للبيع على Nippon: المواصفات، السعر بالـ USDT، والضمان إلزامي.",
      },
      { property: "og:title", content: "أضف عرض جهاز تعدين | Nippon" },
      { property: "og:description", content: "بيع جهازك بحماية المشتري وضمان موثّق." },
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
  hours_used: z.coerce.number().int().min(0).optional(),
  location: z.string().optional(),
  description: z.string().min(20, "أضف وصفًا لا يقل عن 20 حرفًا"),
});

function SellPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-black">أضف عرض</h1>
        <p className="mt-2 text-sm text-muted-foreground">سجّل الدخول أولًا لإضافة عرض.</p>
        <Button className="mt-6" onClick={() => navigate({ to: "/auth" })}>
          دخول / تسجيل
        </Button>
      </div>
    );
  }

  const verified = profile?.kyc_status === "approved";

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd.entries()));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "تحقق من الحقول");
      return;
    }
    setBusy(true);
    try {
      const paths: string[] = [];
      for (const file of Array.from(files ?? [])) {
        const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { error } = await supabase.storage.from("listing-images").upload(path, file);
        if (error) throw error;
        paths.push(path);
      }
      const { data, error } = await supabase
        .from("listings")
        .insert({ ...parsed.data, images: paths, seller_id: user!.id })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("تم نشر العرض");
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
        أضف <span className="neon-text">عرض</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        السعر ومدة الضمان حقول إلزامية، والنشر متاح للحسابات الموثّقة فقط.
      </p>

      {!verified && (
        <div className="glass mt-6 rounded-2xl border border-accent/40 p-5">
          <p className="text-sm">يجب توثيق هويتك قبل نشر أي عرض.</p>
          <Button className="mt-3" size="sm" onClick={() => navigate({ to: "/verify" })}>
            توثيق الهوية
          </Button>
        </div>
      )}

      <form onSubmit={onSubmit} className="glass mt-8 grid gap-4 rounded-3xl p-6 sm:grid-cols-2">
        <Field name="title" label="عنوان العرض" className="sm:col-span-2" />
        <Field name="brand" label="الشركة المصنعة" placeholder="Bitmain" />
        <Field name="model" label="الطراز" placeholder="Antminer S19j Pro" />
        <Field name="algorithm" label="الخوارزمية (اختياري)" placeholder="SHA-256" />
        <Field name="hashrate" label="الهاش ريت" placeholder="104 TH/s" />
        <Field name="power_watts" label="الاستهلاك (واط)" type="number" />
        <Field name="condition" label="الحالة" placeholder="مستعمل - ممتاز" />
        <Field name="price_usd" label="السعر (USDT) *" type="number" step="0.01" />
        <Field name="warranty_months" label="الضمان (شهور) *" type="number" />
        <Field name="hours_used" label="ساعات التشغيل (اختياري)" type="number" />
        <Field name="location" label="الموقع (اختياري)" placeholder="طرابلس" />

        <div className="sm:col-span-2">
          <Label className="mb-2 block">الوصف</Label>
          <Textarea name="description" rows={5} placeholder="حالة الجهاز، سبب البيع، الملحقات…" />
        </div>

        <div className="sm:col-span-2">
          <Label className="mb-2 block">الصور</Label>
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(e.target.files)}
          />
        </div>

        <Button type="submit" className="sm:col-span-2" disabled={busy || !verified}>
          {busy ? "جارٍ النشر…" : "نشر العرض"}
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
  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      <Input name={name} {...rest} />
    </div>
  );
}
