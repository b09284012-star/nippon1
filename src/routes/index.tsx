import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, MessagesSquare, Wallet2, BadgeCheck, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ListingCard, type ListingRow } from "@/components/site/ListingCard";
import heroMiner from "@/assets/hero-miner.jpg";

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
    ],
  }),
  component: Home,
});

const steps = [
  {
    icon: BadgeCheck,
    title: "وثّق هويتك",
    text: "رفع الهوية والسيلفي ومراجعة إدارية سريعة قبل السماح بالنشر أو البيع.",
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
      <section className="relative overflow-hidden">
        <div className="grid-floor pointer-events-none absolute inset-0" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs text-primary">
              <ShieldCheck className="size-3.5" /> نظام حماية المشتري مفعّل على كل صفقة
            </span>
            <h1 className="mt-6 font-display text-4xl leading-tight font-black sm:text-6xl">
              سوق <span className="neon-text">Nippon</span> لأجهزة التعدين المستعملة
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              اشترِ أجهزة ASIC وGPU مستعملة من بائعين موثقين، مع حجز المبلغ في المنصة حتى استلام
              الجهاز، ودردشة مباشرة، ومحفظة كريبتو داخلية.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/market">
                  تصفح الأجهزة <ArrowLeft className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/sell">أضف عرضك</Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
              {[
                ["2.5%", "عمولة المنصة"],
                ["100%", "مبالغ محجوزة بالضمان"],
                ["24/7", "دعم النزاعات"],
              ].map(([v, l]) => (
                <div key={l} className="glass rounded-xl p-4 text-center">
                  <dt className="font-display text-2xl font-black text-primary">{v}</dt>
                  <dd className="mt-1 text-xs text-muted-foreground">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="float-slow glass card-3d overflow-hidden rounded-3xl p-3 shadow-[var(--shadow-violet)]">
              <img
                src={heroMiner}
                alt="جهاز تعدين كريبتو ثلاثي الأبعاد بإضاءة نيون"
                width={1280}
                height={960}
                className="w-full rounded-2xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="font-display text-3xl font-black">كيف يعمل نظام الضمان؟</h2>
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

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl font-black">أحدث الأجهزة</h2>
          <Link to="/market" className="text-sm text-primary hover:underline">
            عرض الكل
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings?.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      </section>
    </div>
  );
}
