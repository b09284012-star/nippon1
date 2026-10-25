import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, ShieldCheck, Wallet2, LogOut, UserRound, Languages } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import logo from "@/assets/nippon-logo.png.asset.json";
import { NotificationsBell } from "@/components/site/NotificationsBell";
import { useLanguage } from "@/lib/i18n";

const links = [
  { to: "/market", label: "السوق" },
  { to: "/sell", label: "أضف عرض" },
  { to: "/chat", label: "الدردشة" },
  { to: "/forum", label: "المنتدى" },
  { to: "/orders", label: "طلباتي" },
  { to: "/wallet", label: "المحفظة" },
] as const;

export function Header() {
  const { language, setLanguage, t: translate } = useLanguage();
  const { user, isAdmin, canModerateForum, canManageDisputes, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-4 sm:px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src={logo.url} alt={translate("شعار Nippon Mining")} className="h-10 w-auto brightness-125 drop-shadow-[0_0_10px_var(--color-primary)]" />
          <span className="hidden font-display text-xl font-extrabold sm:inline">
            Nip<span className="text-primary">pon</span>
          </span>
        </Link>

        <nav className="mx-auto hidden items-center gap-4 xl:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {translate(l.label)}
            </Link>
          ))}
          {(isAdmin || canModerateForum || canManageDisputes) && (
            <>
              <Link to="/admin" className="text-sm font-medium text-primary transition-colors hover:text-foreground">
                {translate("الإدارة")} </Link>
              {isAdmin && <Link to="/finance" className="text-sm font-medium text-primary transition-colors hover:text-foreground">
                 {translate("المالية والمبيعات")} </Link>}
            </>
          )}
        </nav>

        <div className="ms-auto flex shrink-0 items-center gap-1 xl:ms-0">
          <Button variant="ghost" size="sm" onClick={() => setLanguage(language === "ar" ? "en" : "ar")} aria-label={language === "ar" ? "Switch to English" : "Switch to Arabic"}>
            <Languages className="size-4" /><span>{language === "ar" ? "English" : "العربية"}</span>
          </Button>
          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => navigate({ to: "/wallet" })}
              >
                <Wallet2 className="size-4" /> {translate("محفظتي")} </Button>
              <NotificationsBell />
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/profile" })}>
                <UserRound className="size-4" /> {translate("حسابي")} </Button>
              <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => void signOut()}>
                <LogOut className="size-4" /> {translate("خروج")} </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate({ to: "/auth" })}>
              <ShieldCheck className="size-4" /> {translate("دخول / تسجيل")} </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="xl:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={translate("القائمة")}
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      <div className={cn("border-t border-border/60 xl:hidden", open ? "block" : "hidden")}>
        <nav className="mx-auto grid max-w-7xl gap-1 px-4 py-3">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {translate(l.label)}
            </Link>
          ))}
          {(isAdmin || canModerateForum || canManageDisputes) && (
            <>
              <Link to="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-accent">
                {translate("الإدارة")} </Link>
              {isAdmin && <Link to="/finance" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-accent">
                 {translate("المالية والمبيعات")} </Link>}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
