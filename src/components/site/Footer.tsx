import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="font-display text-2xl font-black neon-text">Nippon</div>
          <p className="mt-3 text-sm text-muted-foreground">
            سوق موثوق لبيع وشراء أجهزة تعدين العملات الرقمية المستعملة، مع حماية كاملة للمشتري
            وتوثيق للهوية.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-bold">المنصة</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/market">تصفح الأجهزة</Link>
            </li>
            <li>
              <Link to="/sell">أضف عرضك</Link>
            </li>
            <li>
              <Link to="/wallet">المحفظة</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold">الأمان</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/verify">توثيق الهوية</Link>
            </li>
            <li>
              <Link to="/orders">حماية المشتري</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold">تنبيه</h4>
          <p className="mt-3 text-sm text-muted-foreground">
            تتم كل المدفوعات داخل المنصة عبر نظام الضمان. لا تُتم أي صفقة خارج نيبون.
          </p>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Nippon — جميع الحقوق محفوظة
      </div>
    </footer>
  );
}
