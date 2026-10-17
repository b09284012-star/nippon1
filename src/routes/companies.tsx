import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ListingRow } from "@/components/site/ListingCard";
import { CompanyListingCard } from "@/components/site/CompanyListingCard";
import { CompanyIdentity } from "@/components/site/CompanyIdentity";
import { CompanyProfileEditor } from "@/components/site/CompanyProfileEditor";
import { useCompanies } from "@/lib/companies";

export const Route = createFileRoute("/companies")({
  head: () => ({
    meta: [
      { title: "شراء من الشركات | Nippon" },
      { name: "description", content: "اشترِ أجهزة التعدين مباشرة من شركات موثقة برخصة تجارية على نيبون." },
      { property: "og:title", content: "شراء من الشركات | Nippon" },
      { property: "og:description", content: "شركات تعدين موثقة وحساب شركة بالبريد ورمز التحقق." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Companies,
});

const WA = "https://wa.me/447723335221?text=" + encodeURIComponent("مرحبًا، أريد توثيق حساب شركتي على Nippon. البريد المسجل: ");

function Companies() {
  const { user, profile } = useAuth();
  const companies = useCompanies();

  const me = useQuery({
    queryKey: ["my-company", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("is_company,is_verified_seller").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const listings = useQuery({
    queryKey: ["company-listings"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("company_market_listings");
      if (error) throw error;
      return data as unknown as ListingRow[];
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="flex items-center gap-3 font-display text-4xl font-black">
        <Building2 className="size-9 text-primary" /> شراء من الشركات
      </h1>
      <p className="mt-2 text-muted-foreground">أجهزة من شركات موثقة برخصة تجارية.</p>

      {!user && <CompanySignup />}
      {user && me.data?.is_company && (
        <div className="mt-6">
          <CompanyProfileEditor userId={user.id} defaultName={profile?.display_name ?? ""} />
          {me.data.is_verified_seller && <Button asChild className="mt-4"><Link to="/sell">نشر عرض شركة</Link></Button>}
        </div>
      )}

      {user && me.data?.is_company && !me.data.is_verified_seller && (
        <div className="glass mt-6 rounded-2xl p-5">
          <p className="font-bold">حساب شركتك بانتظار التوثيق</p>
          <p className="mt-1 text-sm text-muted-foreground">
            أرسل صورة الرخصة التجارية عبر واتساب، وسنفعّل حسابك كشركة موثقة لتتمكن من نشر العروض.
          </p>
          <Button asChild className="mt-4">
            <a href={WA + (user.email ?? "")} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" /> إرسال الرخصة عبر واتساب
            </a>
          </Button>
        </div>
      )}

      {(
        <div className="mt-8 space-y-10">
          {(listings.isLoading || companies.isLoading) && <p className="text-muted-foreground">جارٍ تحميل الشركات…</p>}
          {(listings.isError || companies.isError) && <p className="text-destructive">تعذر تحميل عروض الشركات.</p>}
          {companies.data?.map((company) => {
            const offers = (listings.data ?? []).filter((listing) => listing.seller_id === company.user_id);
            return <section key={company.user_id} className="border-t border-border pt-6">
              <CompanyIdentity company={company} />
              <div className="mt-5 space-y-4">{offers.map((listing) => <CompanyListingCard key={listing.id} listing={listing} />)}</div>
              {!listings.isLoading && !offers.length && <p className="mt-4 text-sm text-muted-foreground">لا توجد عروض متاحة لهذه الشركة حاليًا.</p>}
            </section>;
          })}
          {!listings.isLoading && !companies.isLoading && !companies.isError && !companies.data?.length && (
            <p className="text-muted-foreground">لا توجد عروض من الشركات حاليًا.</p>
          )}
        </div>
      )}
    </div>
  );
}

function CompanySignup() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { toast.error("بريد غير صالح"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/companies`,
        data: { account_type: "company", display_name: name.trim().slice(0, 60) || undefined },
      },
    });
    setLoading(false);
    if (error) { toast.error("تعذر الإرسال", { description: error.message }); return; }
    setSent(true);
    toast.success("أرسلنا رمز التحقق إلى بريدك");
  };

  const verify = async () => {
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setLoading(false);
    if (error) { toast.error("رمز غير صحيح", { description: error.message }); return; }
    toast.success("تم إنشاء حساب الشركة");
  };

  return (
    <div className="glass mt-6 max-w-md space-y-4 rounded-2xl p-6">
      <h2 className="font-display text-xl font-bold">فتح حساب شركة</h2>
      <div>
        <Label className="mb-2 block">اسم الشركة</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} disabled={sent} />
      </div>
      <div>
        <Label className="mb-2 block">البريد الإلكتروني</Label>
        <Input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} disabled={sent} />
      </div>
      {sent ? (
        <>
          <div>
            <Label className="mb-2 block">رمز التحقق</Label>
            <Input dir="ltr" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} maxLength={10} />
            <p className="mt-1 text-xs text-muted-foreground">أدخل الرمز من البريد، أو اضغط الرابط الموجود فيه.</p>
          </div>
          <Button className="w-full" disabled={loading || code.length < 6} onClick={verify}>تأكيد</Button>
        </>
      ) : (
        <Button className="w-full" disabled={loading} onClick={send}>إرسال رمز التحقق</Button>
      )}
      <p className="text-xs text-muted-foreground">بعد الدخول، أرسل الرخصة التجارية عبر واتساب لتوثيق الشركة.</p>
    </div>
  );
}
