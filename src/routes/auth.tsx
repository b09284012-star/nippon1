import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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

  useEffect(() => {
    if (user) void navigate({ to: "/market" });
  }, [user, navigate]);

  const signIn = async () => {
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error("تعذر الدخول", { description: error.message });
    toast.success("أهلاً بعودتك");
  };

  const signUp = async () => {
    const parsed = schema.safeParse({ email, password, name });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/market`,
        data: { display_name: name },
      },
    });
    setLoading(false);
    if (error) return toast.error("تعذر التسجيل", { description: error.message });
    toast.success("تم إنشاء الحساب", { description: "تفقد بريدك لتأكيد الحساب إن طُلب منك" });
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return toast.error("تعذر الدخول عبر Google");
    if (result.redirected) return;
    void navigate({ to: "/market" });
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
            <Field label="الاسم الظاهر" value={name} onChange={setName} />
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

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> أو <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full" onClick={() => void google()}>
          المتابعة عبر Google
        </Button>
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
