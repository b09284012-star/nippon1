import { createFileRoute } from "@tanstack/react-router";
import { t, useLanguage } from "@/lib/i18n";
import sections from "@/content/about.json";
import logo from "@/assets/nippon-logo.png.asset.json";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [
    { title: t("من نحن | Nippon") },
    { name: "description", content: t("تعرف على نيبون، أهداف سوق أجهزة التعدين المستعملة، حماية المشتري، مجتمع الدول، والخصوصية.") },
    { property: "og:title", content: t("من نحن | Nippon") },
    { property: "og:description", content: t("تعرف على نيبون، أهداف سوق أجهزة التعدين المستعملة، حماية المشتري، مجتمع الدول، والخصوصية.") },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AboutPage,
});

function AboutPage() {
  const { t } = useLanguage();
  return <article className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
    <header className="border-b border-border pb-10">
      <img src={logo.url} alt={t("شعار Nippon Mining")} className="mb-6 h-16 w-auto" />
      <h1 className="font-display text-4xl font-black">Nippon <span className="text-primary">— {t("من نحن")}</span></h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t("نيبون منصة متخصصة في بيع وشراء أجهزة تعدين العملات الرقمية المستعملة.")}</p>
    </header>
    <div className="mt-10 grid gap-12 lg:grid-cols-[210px_minmax(0,1fr)]">
      <nav className="self-start border-s-2 border-primary ps-5 lg:sticky lg:top-24" aria-label={t("من نحن")}>
        <ol className="grid gap-3 text-sm text-muted-foreground">{sections.map((section, i) => <li key={section.title}><a href={`#about-${i}`} className="transition-colors hover:text-primary">{String(i + 1).padStart(2, "0")} · {t(section.title)}</a></li>)}</ol>
      </nav>
      <div className="min-w-0">{sections.map((section, i) => <section key={section.title} id={`about-${i}`} className="scroll-mt-24 border-b border-border pb-10 not-first:pt-10">
        <h2 className="mb-6 flex items-center gap-3 font-display text-2xl font-bold"><span className="text-sm text-primary">{String(i + 1).padStart(2, "0")}</span>{t(section.title)}</h2>
        <div className="space-y-4 text-base leading-8 text-muted-foreground">{section.paragraphs.map(paragraph => <p key={paragraph}>{t(paragraph)}</p>)}</div>
      </section>)}</div>
    </div>
  </article>;
}