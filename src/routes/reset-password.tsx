import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "تعيين كلمة مرور جديدة | Nippon" },
      { name: "description", content: "عيّن كلمة مرور جديدة لحسابك في نيبون." },
      { property: "og:title", content: "تعيين كلمة مرور جديدة | Nippon" },
      { property: "og:description", content: "استعادة الوصول إلى حسابك في نيبون." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (pw.length < 8) { toast.error("كلمة المرور 8 أحرف على الأقل"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم تحديث كلمة المرور");
    void navigate({ to: "/market" });
  };
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="glass space-y-4 rounded-3xl p-8">
        <h1 className="font-display text-2xl font-black">كلمة مرور جديدة</h1>
        <Input type="password" placeholder="كلمة المرور الجديدة" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Button className="w-full" disabled={busy} onClick={() => void save()}>حفظ</Button>
      </div>
    </div>
  );
}
