import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPassword({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"email" | "code" | "password">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { toast.error("أدخل بريدًا صحيحًا"); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) { toast.error("تعذر الإرسال", { description: error.message }); return; }
    toast.success("تم إرسال رمز التحقق إلى بريدك");
    setStep("code");
  };

  const verify = async () => {
    if (code.trim().length < 6) { toast.error("أدخل الرمز كاملًا"); return; }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "recovery" });
    setBusy(false);
    if (error) { toast.error("الرمز غير صحيح أو منتهي"); return; }
    toast.success("تم التحقق من الرمز");
    setStep("password");
  };

  const save = async () => {
    if (pw.length < 8) { toast.error("كلمة المرور 8 أحرف على الأقل"); return; }
    if (pw !== pw2) { toast.error("كلمتا المرور غير متطابقتين"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم تعيين كلمة المرور الجديدة");
    onClose();
  };

  return (
    <div className="space-y-4 pt-4">
      <h3 className="font-display text-lg font-bold">استعادة كلمة المرور</h3>
      {step === "email" && (
        <>
          <div><Label className="mb-2 block">البريد المسجل</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <Button className="w-full" disabled={busy} onClick={() => void send()}>إرسال رمز التحقق</Button>
        </>
      )}
      {step === "code" && (
        <>
          <p className="text-sm text-muted-foreground">أدخل الرمز المرسل إلى {email}</p>
          <Input inputMode="numeric" dir="ltr" className="text-center tracking-[0.5em]" maxLength={10} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <Button className="w-full" disabled={busy} onClick={() => void verify()}>تحقق</Button>
          <button type="button" className="text-xs text-primary" onClick={() => void send()}>إعادة إرسال الرمز</button>
        </>
      )}
      {step === "password" && (
        <>
          <div><Label className="mb-2 block">كلمة المرور الجديدة</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <div><Label className="mb-2 block">تأكيد كلمة المرور</Label><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
          <Button className="w-full" disabled={busy} onClick={() => void save()}>حفظ كلمة المرور</Button>
        </>
      )}
      <button type="button" className="text-xs text-muted-foreground" onClick={onClose}>رجوع لتسجيل الدخول</button>
    </div>
  );
}
