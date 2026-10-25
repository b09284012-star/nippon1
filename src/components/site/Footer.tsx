import { t, useLanguage, numberLocale } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import logo from "@/assets/nippon-logo.png.asset.json";
import { SUPPORT_WHATSAPP, SUPPORT_WHATSAPP_URL } from "@/components/site/SupportWhatsApp";

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="mt-24 border-t border-border/60 bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <img src={logo.url} alt={t("شعار Nippon Mining")} className="h-12 w-auto brightness-125 drop-shadow-[0_0_10px_var(--color-primary)]" />
          <p className="mt-3 text-sm text-muted-foreground">
            {t("سوق موثوق لبيع وشراء أجهزة تعدين العملات الرقمية المستعملة، مع حماية كاملة للمشتري وتوثيق للهوية.")} </p>
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
