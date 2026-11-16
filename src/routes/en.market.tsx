import { createFileRoute } from "@tanstack/react-router";
import { Market } from "@/routes/market";
import { EnglishPage } from "@/lib/english-page";

const title = "Used ASIC Miners for Sale | Nippon Market";
const description = "Browse used Antminer, Whatsminer and other mining rigs by brand, hashrate, price and warranty, with escrow protection on every order.";

export const Route = createFileRoute("/en/market")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "keywords", content: "used ASIC miners for sale, used Antminer S19, Whatsminer M30 for sale, buy bitcoin miner" },
      { property: "og:locale", content: "en_US" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://nipponminers.com/en/market" },
      { rel: "alternate", hrefLang: "ar", href: "https://nipponminers.com/market" },
      { rel: "alternate", hrefLang: "en", href: "https://nipponminers.com/en/market" },
      { rel: "alternate", hrefLang: "x-default", href: "https://nipponminers.com/market" },
    ],
  }),
  component: () => <EnglishPage><Market /></EnglishPage>,
});
