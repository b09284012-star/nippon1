import { t, useLanguage, numberLocale } from "@/lib/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { ForgotPassword } from "@/components/site/ForgotPassword";
import { COUNTRIES } from "@/lib/countries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listingReturnPath } from "@/lib/listing-access";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string | undefined } => ({ redirect: listingReturnPath(search["redirect"]) }),
  head: () => ({
    meta: [
      { title: t("الدخول والتسجيل | Nippon") },
      { name: "description", content: t("أنشئ حساب نيبون أو سجّل الدخول للبيع والشراء بحماية.") },
      { property: "og:title", content: t("الدخول والتسجيل | Nippon") },
      { property: "og:description", content: t("حساب موثق للبيع والشراء على منصة نيبون.") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("بريد غير صالح").max(255),
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل").max(72),
  name: z.string().trim().min(2, "الاسم قصير").max(60).optional(),
});

function AuthPage() {
  useLanguage();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [addr, setAddr] = useState("");
  const [forgot, setForgot] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (redirect) {
      void navigate({ to: "/listings/$id", params: { id: redirect.slice("/listings/".length) }, replace: true });
    } else {
      void navigate({ to: "/market", replace: true });
    }
  }, [user, navigate, redirect]);

  const signIn = async () => {
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(t(parsed.error.issues[0]?.message)); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(t("تعذر الدخول"), { description: error.message }); return; }
    toast.success(t("أهلاً بعودتك"));
  };

  const signUp = async () => {
    const parsed = schema.safeParse({ email, password, name });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message); return; }
    if (fullName.trim().length < 5) { toast.error(t("أدخل الاسم الحقيقي الكامل")); return; }
    if (phone.trim().length < 7) { toast.error(t("أدخل رقم هاتف صحيح")); return; }
    if (country.trim().length < 2 || city.trim().length < 2) { toast.error(t("أدخل الدولة والمدينة")); return; }
    if (addr.trim().length < 8) { toast.error(t("أدخل العنوان بالتفصيل")); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`,
        data: { display_name: name, full_name: fullName.trim(), phone: phone.trim(), country: country.trim(), city: city.trim(), address: addr.trim() },
      },
    });
    setLoading(false);
    if (error) { toast.error(t("تعذر التسجيل"), { description: error.message }); return; }
    toast.success(t("تم إنشاء الحساب"), { description: t("تفقد بريدك لتأكيد الحساب إن طُلب منك") });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="border-t border-border pt-8">
        <h1 className="font-display text-3xl font-black">
          {t("مرحباً بك في")} <span className="neon-text">Nippon</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("سجّل للوصول إلى الدردشة والمحفظة ونظام حماية المشتري.")} </p>

        {forgot ? <ForgotPassword onClose={() => setForgot(false)} /> : (
        <Tabs defaultValue="signin" className="mt-6">
          <TabsList className="w-full">
            <TabsTrigger value="signin" className="flex-1">
              {t("دخول")} </TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">
              {t("حساب جديد")} </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4 pt-4">
            <Field label={t("البريد الإلكتروني")} value={email} onChange={setEmail} type="email" />
            <Field
              label={t("كلمة المرور")}
              value={password}
              onChange={setPassword}
              type="password"
            />
            <Button className="w-full" onClick={() => void signIn()} disabled={loading}>
              {t("دخول")} </Button>
            <Button variant="link" onClick={() => setForgot(true)}>{t("نسيت كلمة المرور؟")}</Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 pt-4">
            <Field label={t("الاسم الظاهر للمستخدمين (يمكن أن يكون وهميًا)")} value={name} onChange={setName} />
            <Field label={t("الاسم الحقيقي الكامل")} value={fullName} onChange={setFullName} />
            <Field label={t("رقم الهاتف")} value={phone} onChange={setPhone} type="tel" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-sm">{t("الدولة")}</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("اختر الدولة")} />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>{t(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field label={t("المدينة")} value={city} onChange={setCity} />
            </div>
            <Field label={t("العنوان بالتفصيل")} value={addr} onChange={setAddr} />
            <p className="text-xs text-muted-foreground">{t("بياناتك الحقيقية تظهر للإدارة فقط، والآخرون يرون الاسم الظاهر فقط.")}</p>
            <Field label={t("البريد الإلكتروني")} value={email} onChange={setEmail} type="email" />
            <Field
              label={t("كلمة المرور")}
              value={password}
              onChange={setPassword}
              type="password"
            />
            <Button className="w-full" onClick={() => void signUp()} disabled={loading}>
              {t("إنشاء حساب")} </Button>
          </TabsContent>
        </Tabs>
        )}

      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  useLanguage();
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <Input dir={type === "email" || type === "tel" ? "ltr" : undefined} type={type} value={value} onChange={(e) => onChange(e.target.value.slice(0, 255))} />
    </div>
  );
}
