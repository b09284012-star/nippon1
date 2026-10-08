import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "بحث عن مستخدم | Nippon" },
      { name: "description", content: "ابحث عن أي مستخدم في Nippon عن طريق معرّف المحفظة." },
      { property: "og:title", content: "بحث عن مستخدم | Nippon" },
      { property: "og:description", content: "البحث بمعرّف المحفظة على منصة Nippon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsersSearch,
});

type Row = {
  id: string;
  display_name: string;
  is_verified_seller: boolean;
  rating: number;
  sales_count: number;
  deposit_tag: string;
};

function UsersSearch() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    if (q.trim().length < 4) { toast.error("أدخل 4 أحرف على الأقل من معرّف المحفظة"); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("search_user_by_wallet", { _tag: q.trim() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setRows((data ?? []) as Row[]);
    if (!data?.length) toast("لا توجد نتائج");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl font-black">بحث عن مستخدم</h1>
      <p className="mt-2 text-sm text-muted-foreground">ابحث بمعرّف المحفظة (مثل NPN-XXXX).</p>
      {!user ? (
        <p className="mt-6 text-sm">سجّل الدخول لاستخدام البحث.</p>
      ) : (
        <>
          <div className="mt-6 flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value.slice(0, 40))} placeholder="NPN-..." dir="ltr"
              onKeyDown={(e) => { if (e.key === "Enter") void search(); }} />
            <Button onClick={() => void search()} disabled={busy}><Search className="size-4" /> بحث</Button>
          </div>
          <div className="mt-6 grid gap-3">
            {rows.map((r) => (
              <div key={r.id} className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 font-bold">
                  {r.display_name}
                  {r.is_verified_seller && <Badge className="gap-1"><BadgeCheck className="size-3.5" /> بائع معتمد</Badge>}
                </div>
                <div className="mt-1 text-xs text-muted-foreground" dir="ltr">{r.deposit_tag}</div>
                <div className="mt-1 text-xs text-muted-foreground">التقييم {Number(r.rating).toFixed(1)} • {r.sales_count} صفقة</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
