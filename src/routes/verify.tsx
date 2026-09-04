import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "توثيق الهوية | Nippon" },
      {
        name: "description",
        content: "وثّق هويتك على Nippon برفع مستند رسمي وصورة سيلفي لتتمكن من البيع والشراء بأمان.",
      },
      { property: "og:title", content: "توثيق الهوية | Nippon" },
      { property: "og:description", content: "رفع مستندات التحقق ومراجعتها من الإدارة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerifyPage,
});

const LABELS: Record<string, string> = {
  none: "غير موثّق",
  pending: "قيد المراجعة",
  approved: "موثّق",
  rejected: "مرفوض",
};

function VerifyPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-black">توثيق الهوية</h1>
        <Button className="mt-6" onClick={() => navigate({ to: "/auth" })}>
          دخول / تسجيل
        </Button>
      </div>
    );
  }

  const status = profile?.kyc_status ?? "none";

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const full_name = String(fd.get("full_name") ?? "").trim();
    const document_number = String(fd.get("document_number") ?? "").trim();
    const country = String(fd.get("country") ?? "").trim();
    if (full_name.length < 5) {
      toast.error("أدخل الاسم الرباعي كما في المستند");
      return;
    }
    if (document_number.length < 4) {
      toast.error("أدخل رقم المستند");
      return;
    }
    if (!idDoc || !selfie) {
      toast.error("ارفع صورة المستند وصورة السيلفي");
      return;
    }

    setBusy(true);
    try {
      const upload = async (file: File, kind: string) => {
        const path = `${user!.id}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { error } = await supabase.storage.from("kyc-documents").upload(path, file);
        if (error) throw error;
        return path;
      };
      const id_document_path = await upload(idDoc, "id");
      const selfie_path = await upload(selfie, "selfie");

      const { error } = await supabase.from("kyc_submissions").insert({
        user_id: user!.id,
        full_name,
        document_number,
        country: country || null,
        id_document_path,
        selfie_path,
      });
      if (error) throw error;

      await supabase.from("profiles").update({ kyc_status: "pending" }).eq("id", user!.id);
      toast.success("تم إرسال طلب التوثيق وسيراجعه فريق الإدارة");
      await refreshProfile?.();
    } catch (err) {
      toast.error((err as Error).message || "تعذر إرسال الطلب");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-3xl font-black">
          توثيق <span className="neon-text">الهوية</span>
        </h1>
        <Badge variant="secondary">{LABELS[status] ?? status}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        التوثيق إلزامي للبيع والشراء. مستنداتك مخزّنة بشكل خاص ولا يطّلع عليها إلا فريق المراجعة.
      </p>

      {status === "approved" ? (
        <div className="glass mt-8 rounded-3xl p-6 text-sm">
          حسابك موثّق بالكامل. يمكنك الآن النشر والشراء عبر نظام الضمان.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="glass mt-8 grid gap-4 rounded-3xl p-6">
          {status === "pending" && (
            <div className="rounded-xl border border-accent/40 p-4 text-sm">
              طلبك قيد المراجعة حاليًا. يمكنك إعادة الإرسال إذا احتجت تحديث المستندات.
            </div>
          )}
          <div>
            <Label className="mb-2 block">الاسم الكامل</Label>
            <Input name="full_name" placeholder="كما هو في المستند" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block">رقم المستند</Label>
              <Input name="document_number" />
            </div>
            <div>
              <Label className="mb-2 block">الدولة (اختياري)</Label>
              <Input name="country" placeholder="ليبيا" />
            </div>
          </div>
          <div>
            <Label className="mb-2 block">صورة المستند (هوية / جواز)</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setIdDoc(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <Label className="mb-2 block">صورة سيلفي مع المستند</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setSelfie(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "جارٍ الإرسال…" : "إرسال للمراجعة"}
          </Button>
        </form>
      )}
    </div>
  );
}
