import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/components/site/HomePage";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: t("Nippon | سوق أجهزة تعدين الكريبتو المستعملة") },
      {
        name: "description",
        content:
          t("بيع واشترِ أجهزة تعدين مستعملة بأمان: ضمان حجز المبلغ، دردشة مباشرة مع البائع، محفظة كريبتو، وتوثيق هوية."),
      },
      { property: "og:title", content: t("Nippon | سوق أجهزة تعدين الكريبتو المستعملة") },
      {
        property: "og:description",
        content: t("منصة موثوقة لتداول أجهزة التعدين المستعملة مع نظام حماية المشتري."),
      },
      { name: "keywords", content: "used ASIC miners, buy used Antminer, sell Whatsminer, crypto mining marketplace, bitcoin miner escrow, أجهزة تعدين مستعملة, بيع أجهزة تعدين, انتمينر مستعمل" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://nipponminers.com/og-home.jpg" },
      { name: "twitter:image", content: "https://nipponminers.com/og-home.jpg" },
    ],
    links: [
      { rel: "canonical", href: "https://nipponminers.com/" },
      { rel: "alternate", hrefLang: "ar", href: "https://nipponminers.com/" },
      { rel: "alternate", hrefLang: "en", href: "https://nipponminers.com/en" },
      { rel: "alternate", hrefLang: "x-default", href: "https://nipponminers.com/" },
    ],
  }),
  component: Home,
});
