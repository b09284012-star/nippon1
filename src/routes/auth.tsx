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

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "الدخول والتسجيل | Nippon" },
      { name: "description", content: "أنشئ حساب نيبون أو سجّل الدخول للبيع والشراء بحماية." },
      { property: "og:title", content: "الدخول والتسجيل | Nippon" },
      { property: "og:description", content: "حساب موثق للبيع والشراء على منصة نيبون." },
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
  const navigate = useNavigate();
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

  useEffect(() => {
    if (user) void navigate({ to: "/market" });
  }, [user, navigate]);

  const signIn = async () => {
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error("تعذر الدخول", { description: error.message }); return; }
    toast.success("أهلاً بعودتك");
  };

  const signUp = async () => {
    const parsed = schema.safeParse({ email, password, name });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message); return; }
    if (fullName.trim().length < 5) { toast.error("أدخل الاسم الحقيقي الكامل"); return; }
    if (phone.trim().length < 7) { toast.error("أدخل رقم هاتف صحيح"); return; }
    if (country.trim().length < 2 || city.trim().length < 2) { toast.error("أدخل الدولة والمدينة"); return; }
    if (addr.trim().length < 8) { toast.error("أدخل العنوان بالتفصيل"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/market`,
        data: { display_name: name, full_name: fullName.trim(), phone: phone.trim(), country: country.trim(), city: city.trim(), address: addr.trim() },
      },
    });
    setLoading(false);
    if (error) { toast.error("تعذر التسجيل", { description: error.message }); return; }
    toast.success("تم إنشاء الحساب", { description: "تفقد بريدك لتأكيد الحساب إن طُلب منك" });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="glass rounded-3xl p-8">
        <h1 className="font-display text-3xl font-black">
          مرحباً بك في <span className="neon-text">Nippon</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          سجّل للوصول إلى الدردشة والمحفظة ونظام حماية المشتري.
        </p>

        <Tabs defaultValue="signin" className="mt-6">
          <TabsList className="w-full">
            <TabsTrigger value="signin" className="flex-1">
              دخول
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">
              حساب جديد
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4 pt-4">
            <Field label="البريد الإلكتروني" value={email} onChange={setEmail} type="email" />
            <Field
              label="كلمة المرور"
              value={password}
              onChange={setPassword}
              type="password"
            />
            <Button className="w-full" onClick={() => void signIn()} disabled={loading}>
              دخول
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 pt-4">
            <Field label="الاسم الظاهر للمستخدمين (يمكن أن يكون وهميًا)" value={name} onChange={setName} />
            <Field label="الاسم الحقيقي الكامل" value={fullName} onChange={setFullName} />
            <Field label="رقم الهاتف" value={phone} onChange={setPhone} type="tel" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="الدولة" value={country} onChange={setCountry} />
              <Field label="المدينة" value={city} onChange={setCity} />
            </div>
            <Field label="العنوان بالتفصيل" value={addr} onChange={setAddr} />
            <p className="text-xs text-muted-foreground">بياناتك الحقيقية تظهر للإدارة فقط، والآخرون يرون الاسم الظاهر فقط.</p>
            <Field label="البريد الإلكتروني" value={email} onChange={setEmail} type="email" />
            <Field
              label="كلمة المرور"
              value={password}
              onChange={setPassword}
              type="password"
            />
            <Button className="w-full" onClick={() => void signUp()} disabled={loading}>
              إنشاء حساب
            </Button>
          </TabsContent>
        </Tabs>

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
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value.slice(0, 255))} />
    </div>
  );
}
