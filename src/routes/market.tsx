import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/lib/i18n";
import { Market } from "@/components/site/MarketPage";

export const Route = createFileRoute("/market")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: t("السوق | أجهزة تعدين مستعملة على Nippon") },
      {
        name: "description",
        content: t("تصفح أجهزة التعدين المستعملة حسب النوع والهاش ريت والسعر والضمان على منصة نيبون."),
      },
      { property: "og:title", content: t("السوق | أجهزة تعدين مستعملة على Nippon") },
      { property: "og:description", content: t("فلترة الأجهزة حسب السعر والضمان والحالة والماركة.") },
      { name: "keywords", content: "used ASIC miners for sale, used Antminer S19, Whatsminer M30 for sale, buy bitcoin miner, أجهزة تعدين للبيع, سوق أجهزة التعدين" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://nipponminers.com/market" },
      { rel: "alternate", hrefLang: "ar", href: "https://nipponminers.com/market" },
      { rel: "alternate", hrefLang: "en", href: "https://nipponminers.com/en/market" },
      { rel: "alternate", hrefLang: "x-default", href: "https://nipponminers.com/market" },
    ],
  }),
  component: Market,
});
