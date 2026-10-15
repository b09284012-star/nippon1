import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Trash2, KeyRound, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { deleteMyAccount } from "@/lib/account.functions";
import { CompanyProfileEditor } from "@/components/site/CompanyProfileEditor";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "الملف الشخصي والإعدادات | Nippon" },
      { name: "description", content: "إدارة ملفك الشخصي وكلمة المرور وإعدادات حسابك في نيبون." },
      { property: "og:title", content: "الملف الشخصي | Nippon" },
      { property: "og:description", content: "إعدادات حسابك في سوق نيبون لأجهزة التعدين." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const del = useServerFn(deleteMyAccount);
  const [f, setF] = useState({ display_name: "", bio: "", full_name: "", phone: "", country: "", city: "", address: "" });
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    void supabase.from("user_private_info").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setF((p) => ({
        ...p,
        full_name: data?.full_name ?? "", phone: data?.phone ?? "", country: data?.country ?? "", city: data?.city ?? "", address: data?.address ?? "",
      }));
    });
  }, [user]);
  useEffect(() => {
    if (profile) setF((p) => ({ ...p, display_name: profile.display_name, bio: profile.bio ?? "" }));
  }, [profile]);

  if (loading) return <div className="p-16 text-center text-muted-foreground">...</div>;
  if (!user) return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-muted-foreground">سجّل الدخول لعرض ملفك الشخصي.</p>
      <Button className="mt-4" asChild><Link to="/auth">دخول / تسجيل</Link></Button>
    </div>
  );

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value.slice(0, 255) }));

  const saveProfile = async () => {
    if (f.display_name.trim().length < 2) { toast.error("الاسم الظاهر قصير"); return; }
    setBusy(true);
    const [a, b] = await Promise.all([
      supabase.from("profiles").update({ display_name: f.display_name.trim(), bio: f.bio.trim() || null }).eq("id", user.id),
      supabase.from("user_private_info").upsert({ user_id: user.id, full_name: f.full_name.trim(), phone: f.phone.trim(), country: f.country.trim() || null, city: f.city.trim() || null, address: f.address.trim() }),
    ]);
    setBusy(false);
    const error = a.error ?? b.error;
    if (error) { toast.error(error.message); return; }
    toast.success("تم حفظ البيانات");
    void refreshProfile();
  };

  const changePw = async () => {
    if (pw.length < 8) { toast.error("كلمة المرور 8 أحرف على الأقل"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: cur } as { password: string });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setCur(""); setPw("");
    toast.success("تم تغيير كلمة المرور");
  };

  const deleteAccount = async () => {
    if (!confirm("حذف حسابك نهائيًا؟ سيتم حذف كل بياناتك ولا يمكن التراجع.")) return;
    setBusy(true);
    try {
      await del();
      await signOut();
      toast.success("تم حذف الحساب");
      void navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر حذف الحساب");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-12">
      <div className="glass flex items-center gap-4 rounded-3xl p-6">
        <div className="grid size-14 place-items-center rounded-full bg-primary/15 text-primary"><UserRound className="size-7" /></div>
        <div>
          <h1 className="font-display text-2xl font-black">{profile?.display_name}</h1>
          <p className="text-sm text-muted-foreground" dir="ltr">{user.email}</p>
          {profile?.is_verified_seller && <Badge variant="secondary" className="mt-1">بائع معتمد</Badge>}
        </div>
      </div>

      {profile?.is_company && <CompanyProfileEditor userId={user.id} defaultName={profile.display_name} />}

      <section className="glass grid gap-4 rounded-3xl p-6">
        <h2 className="font-display text-lg font-bold">البيانات الشخصية</h2>
        <F label="الاسم الظاهر" value={f.display_name} onChange={set("display_name")} />
        <F label="نبذة" value={f.bio} onChange={set("bio")} />
        <p className="text-xs text-muted-foreground">البيانات التالية تظهر للإدارة فقط.</p>
        <F label="الاسم الحقيقي الكامل" value={f.full_name} onChange={set("full_name")} />
        <F label="رقم الهاتف" value={f.phone} onChange={set("phone")} />
        <div className="grid grid-cols-2 gap-3"><F label="الدولة" value={f.country} onChange={set("country")} /><F label="المدينة" value={f.city} onChange={set("city")} /></div>
        <F label="العنوان" value={f.address} onChange={set("address")} />
        <Button disabled={busy} onClick={() => void saveProfile()}>حفظ التغييرات</Button>
      </section>

      <section className="glass grid gap-4 rounded-3xl p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><KeyRound className="size-5" /> تغيير كلمة المرور</h2>
        <F label="كلمة المرور الحالية" type="password" value={cur} onChange={(e) => setCur(e.target.value)} />
        <F label="كلمة المرور الجديدة" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Button variant="outline" disabled={busy} onClick={() => void changePw()}>تحديث كلمة المرور</Button>
      </section>

      <section className="glass grid gap-3 rounded-3xl p-6">
        <h2 className="font-display text-lg font-bold">الحساب</h2>
        <Button variant="outline" onClick={() => void signOut().then(() => navigate({ to: "/" }))}><LogOut className="size-4" /> تسجيل الخروج</Button>
        <Button variant="destructive" disabled={busy} onClick={() => void deleteAccount()}><Trash2 className="size-4" /> حذف الحساب نهائيًا</Button>
      </section>
    </div>
  );
}

function F({ label, ...p }: { label: string } & React.ComponentProps<typeof Input>) {
  return <div><Label className="mb-2 block">{label}</Label><Input {...p} /></div>;
}
