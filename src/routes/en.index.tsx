import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/routes/index";
import { EnglishPage } from "@/lib/english-page";

const title = "Nippon | Used Crypto Mining Hardware Marketplace";
const description = "Buy and sell used ASIC miners (Antminer, Whatsminer) safely with escrow buyer protection, direct seller chat and a built-in crypto wallet.";

export const Route = createFileRoute("/en/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "keywords", content: "used ASIC miners, buy used Antminer, sell Whatsminer, crypto mining marketplace, bitcoin miner escrow" },
      { property: "og:locale", content: "en_US" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://nipponminers.com/og-home.jpg" },
      { name: "twitter:image", content: "https://nipponminers.com/og-home.jpg" },
    ],
    links: [
      { rel: "canonical", href: "https://nipponminers.com/en" },
      { rel: "alternate", hrefLang: "ar", href: "https://nipponminers.com/" },
      { rel: "alternate", hrefLang: "en", href: "https://nipponminers.com/en" },
      { rel: "alternate", hrefLang: "x-default", href: "https://nipponminers.com/" },
    ],
  }),
  component: () => <EnglishPage><Home /></EnglishPage>,
});
