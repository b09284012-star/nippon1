import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, MessagesSquare, Wallet2, BadgeCheck, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ListingCard, type ListingRow } from "@/components/site/ListingCard";
import heroMiners from "@/assets/hero-miners.jpeg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nippon | سوق أجهزة تعدين الكريبتو المستعملة" },
      {
        name: "description",
        content:
          "بيع واشترِ أجهزة تعدين مستعملة بأمان: ضمان حجز المبلغ، دردشة مباشرة مع البائع، محفظة كريبتو، وتوثيق هوية.",
      },
      { property: "og:title", content: "Nippon | سوق أجهزة تعدين الكريبتو المستعملة" },
      {
        property: "og:description",
        content: "منصة موثوقة لتداول أجهزة التعدين المستعملة مع نظام حماية المشتري.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const steps = [
  {
    icon: BadgeCheck,
    title: "أنشئ حسابك",
    text: "سجّل ببياناتك الكاملة، ثم تراجع الإدارة الطلب وتمنح البائع شارة «بائع معتمد» قبل النشر.",
  },
  {
    icon: MessagesSquare,
    title: "تفاوض مع البائع",
    text: "دردشة فورية داخل المنصة على كل عرض، بدون مشاركة بيانات خارجية.",
  },
  {
    icon: ShieldCheck,
    title: "ادفع بحماية",
    text: "يُحجز المبلغ في نيبون ولا يستلمه البائع إلا بعد تأكيدك استلام الجهاز.",
  },
  {
    icon: Wallet2,
    title: "استلم أو استرجع",
    text: "تحرير المبلغ للبائع أو استرجاعه لك عند فتح نزاع وحسمه من الإدارة.",
  },
];

function Home() {
  const { data: listings } = useQuery({
    queryKey: ["latest-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as unknown as ListingRow[];
    },
  });

  return (
    <div>
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden">
        <img
          src={heroMiners.url}
          alt="صف من أجهزة تعدين ANTMINER مستعملة"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-background/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_95%)]" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-24 text-center">
          <p className="text-sm font-bold tracking-[0.35em] text-primary uppercase">
            سوق موثوق لأجهزة التعدين
          </p>
          <h1 className="mt-6 font-display text-5xl leading-[1.1] font-black tracking-tight sm:text-7xl">
            اشترِ بثقة.
            <span className="mt-3 block text-primary sm:mt-4">بِع بأمان.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            أجهزة ASIC و GPU مستعملة من بائعين معتمدين — المبلغ يبقى محجوزًا في نيبون
            حتى تستلم جهازك، مع دردشة مباشرة ومحفظة كريبتو داخلية.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="px-8 text-base" asChild>
              <Link to="/market">
                تصفح الأجهزة <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="px-8 text-base" asChild>
              <Link to="/sell">أضف عرضك</Link>
            </Button>
          </div>
          <dl className="mx-auto mt-14 grid max-w-xl grid-cols-3 gap-4">
            {[
              ["2.5%", "عمولة المنصة"],
              ["100%", "مبالغ محجوزة بالضمان"],
              ["24/7", "دعم النزاعات"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl border border-border/50 bg-background/60 p-4 backdrop-blur-md">
                <dt className="font-display text-2xl font-black text-primary">{v}</dt>
                <dd className="mt-1 text-xs text-muted-foreground">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="font-display text-3xl font-black">كيف يعمل نظام الضمان؟</h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          أربع خطوات فقط: توثيق، تفاوض، دفع محجوز، ثم تسليم. المبلغ لا يصل للبائع إلا بعد تأكيدك.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="glass card-3d card-3d-hover rounded-2xl p-6">
              <div className="mb-4 grid size-11 place-items-center rounded-xl bg-[image:var(--gradient-neon)] text-primary-foreground">
                <s.icon className="size-5" />
              </div>
              <div className="text-xs text-muted-foreground">الخطوة {i + 1}</div>
              <h3 className="mt-1 font-display text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {listings?.length ? (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl font-black">أحدث الأجهزة</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                أجهزة معروضة الآن بحالة تشغيل موثّقة وأسعار قابلة للتفاوض مع البائع.
              </p>
            </div>
            <Link to="/market" className="text-sm text-primary hover:underline">
              عرض الكل
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
