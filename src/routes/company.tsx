import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Cpu, LayoutGrid, Wrench, ShieldCheck, Eye, Scale, MessageCircle, Handshake } from "lucide-react";
import { t, useLanguage } from "@/lib/i18n";
import { company } from "@/content/company";
import logo from "@/assets/nippon-logo.png.asset.json";
import { SUPPORT_WHATSAPP, SUPPORT_WHATSAPP_URL } from "@/components/site/SupportWhatsApp";

export const Route = createFileRoute("/company")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: t("الشركة | Nippon Miners") },
    { name: "description", content: t("تعرف على شركة Nippon Miners: الإدارة، مجالات العمل، الرؤية والقيم، وقنوات التواصل والشراكات.") },
    { property: "og:title", content: t("الشركة | Nippon Miners") },
    { property: "og:description", content: t("تعرف على شركة Nippon Miners: الإدارة، مجالات العمل، الرؤية والقيم، وقنوات التواصل والشراكات.") },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://nipponminers.com/company" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: "https://nipponminers.com/company" }] }),
  component: CompanyPage,
});

const activityIcons = [LayoutGrid, Cpu, Wrench];
const valueIcons = [Eye, ShieldCheck, Scale];

function CompanyPage() {
  const { language } = useLanguage();
  const L = (x: { ar: string; en: string }) => x[language];
  const ar = language === "ar";
  const partnerUrl = `${SUPPORT_WHATSAPP_URL}${SUPPORT_WHATSAPP_URL.includes("?") ? "&" : "?"}text=${encodeURIComponent(ar ? "مرحبا، أرغب في طلب شراكة مع Nippon Miners" : "Hello, I would like to discuss a partnership with Nippon Miners")}`;
  return <article className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
    <header className="rounded-3xl border border-border bg-card/60 p-8 shadow-depth sm:p-12">
      <img src={logo.url} alt={ar ? "شعار Nippon Miners" : "Nippon Miners logo"} className="mb-6 h-14 w-auto" />
      <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Building2 className="size-4" />{ar ? "الملف التعريفي للشركة" : "Company profile"}</p>
      <h1 className="mt-3 font-display text-4xl font-black sm:text-5xl">{company.name}</h1>
      <p className="mt-3 text-lg text-foreground/90">{L(company.tagline)}</p>
      <p className="mt-5 max-w-3xl leading-8 text-muted-foreground">{L(company.intro)}</p>
    </header>

    <section className="mt-12">
      <h2 className="font-display text-2xl font-bold">{ar ? "الإدارة والقيادة" : "Leadership"}</h2>
      <div className="mt-5 flex items-center gap-5 rounded-2xl border border-border bg-card/40 p-6">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-2xl font-black text-primary">{ar ? "ع" : "A"}</div>
        <div><p className="text-xl font-bold">{L(company.leader.name)}</p><p className="text-muted-foreground">{L(company.leader.title)}</p></div>
      </div>
    </section>

    <section className="mt-12">
      <h2 className="font-display text-2xl font-bold">{ar ? "مجالات العمل" : "What we do"}</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">{company.activities.map((a, i) => { const Icon = activityIcons[i] ?? Cpu; return <div key={a.title.en} className="rounded-2xl border border-border bg-card/40 p-6">
        <Icon className="size-7 text-primary" />
        <h3 className="mt-4 font-bold">{L(a.title)}</h3>
        {ar && <p className="text-xs text-muted-foreground" dir="ltr">{a.title.en}</p>}
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{L(a.body)}</p>
      </div>; })}</div>
    </section>

    <section className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6">
        <h2 className="font-display text-2xl font-bold">{ar ? "رؤيتنا" : "Our vision"}</h2>
        <p className="mt-4 leading-8 text-muted-foreground">{L(company.vision)}</p>
      </div>
      <div className="grid gap-4">{company.values.map((v, i) => { const Icon = valueIcons[i] ?? ShieldCheck; return <div key={v.title.en} className="flex gap-4 rounded-2xl border border-border bg-card/40 p-5">
        <Icon className="size-6 shrink-0 text-primary" />
        <div><h3 className="font-bold">{L(v.title)}</h3><p className="mt-1 text-sm leading-7 text-muted-foreground">{L(v.body)}</p></div>
      </div>; })}</div>
    </section>

    <section className="mt-12 rounded-3xl border border-border bg-card/60 p-8">
      <h2 className="font-display text-2xl font-bold">{ar ? "التواصل والشراكات" : "Contact & partnerships"}</h2>
      <p className="mt-3 text-muted-foreground">{ar ? "للاستفسارات العامة أو لطلب شراكة توريد أو تعاون تقني، تواصل معنا مباشرة." : "For general enquiries, supply partnerships or technical collaboration, contact us directly."}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={partnerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground"><Handshake className="size-4" />{ar ? "طلب شراكة" : "Request a partnership"}</a>
        <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 font-semibold"><MessageCircle className="size-4" /><span dir="ltr">{SUPPORT_WHATSAPP}</span></a>
        <Link to="/about" className="inline-flex items-center rounded-xl border border-border px-5 py-3 font-semibold">{ar ? "من نحن" : "About us"}</Link>
      </div>
    </section>
  </article>;
}
