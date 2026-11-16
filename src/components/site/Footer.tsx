import { t, useLanguage, numberLocale } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { Facebook } from "lucide-react";
import logo from "@/assets/nippon-logo.png.asset.json";
import { SUPPORT_WHATSAPP, SUPPORT_WHATSAPP_URL } from "@/components/site/SupportWhatsApp";

const SOCIAL_LINKS = [
  {
    name: "فيسبوك",
    href: "https://www.facebook.com/share/19oJ47akEf/?mibextid=wwXIfr",
    icon: (props: { className?: string }) => <Facebook aria-hidden="true" className={props.className} />,
  },
  {
    name: "تيك توك",
    href: "https://www.tiktok.com/@nipponminers?_r=1&_t=ZS-9BSlsIbu0eK",
    icon: (props: { className?: string }) => (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={props.className}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
];

function SocialLinks() {
  const { t } = useLanguage();
  return (
    <div className="mt-4">
      <h4 className="text-sm font-bold">{t("حسابات التواصل الاجتماعي")}</h4>
      <div className="mt-3 flex items-center gap-2">
        {SOCIAL_LINKS.map((social) => (
          <a
            key={social.name}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-background/40 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
          >
            <social.icon className="size-4" />
            <span className="sr-only">{t(social.name)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="mt-24 border-t border-border/60 bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <img src={logo.url} alt={t("شعار Nippon Mining")} className="h-12 w-auto brightness-125 drop-shadow-[0_0_10px_var(--color-primary)]" />
          <p className="mt-3 text-sm text-muted-foreground">
            {t("سوق موثوق لبيع وشراء أجهزة تعدين العملات الرقمية المستعملة، مع حماية كاملة للمشتري وتوثيق للهوية.")} </p>
          <SocialLinks />
        </div>
        <div>
          <h4 className="text-sm font-bold">{t("المنصة")}</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about">{t("من نحن")}</Link></li>
            <li>
              <Link to="/market">{t("تصفح الأجهزة")}</Link>
            </li>
            <li>
              <Link to="/sell">{t("أضف عرضك")}</Link>
            </li>
            <li>
              <Link to="/wallet">{t("المحفظة")}</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold">{t("الأمان")}</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/market">{t("السوق")}</Link>
            </li>
            <li>
              <Link to="/orders">{t("حماية المشتري")}</Link>
            </li>
            <li>
              <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                {t("الدعم عبر واتساب")} {SUPPORT_WHATSAPP}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold">{t("تنبيه")}</h4>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("تتم كل المدفوعات داخل المنصة عبر نظام الضمان. لا تُتم أي صفقة خارج نيبون.")} </p>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {t("Nippon — جميع الحقوق محفوظة")} </div>
    </footer>
  );
}
