import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, ShieldCheck, Wallet2, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import logo from "@/assets/nippon-logo.png.asset.json";

const links = [
  { to: "/market", label: "السوق" },
  { to: "/sell", label: "أضف عرض" },
  { to: "/chat", label: "الدردشة" },
  { to: "/forum", label: "المنتدى" },
  { to: "/orders", label: "طلباتي" },
  { to: "/wallet", label: "المحفظة" },
  { to: "/verify", label: "توثيق الهوية" },
] as const;

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo.url} alt="شعار Nippon Mining" className="h-9 w-auto" />
          <span className="font-display text-xl font-extrabold tracking-tight">Nippon</span>
        </Link>

        <nav className="mx-auto hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className="rounded-lg px-3 py-2 text-sm text-accent transition-colors hover:bg-secondary"
            >
              الإدارة
            </Link>
          )}
        </nav>

        <div className="ms-auto flex items-center gap-2 lg:ms-0">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => navigate({ to: "/wallet" })}
              >
                <Wallet2 className="size-4" /> محفظتي
              </Button>
              <Button variant="outline" size="sm" onClick={() => void signOut()}>
                <LogOut className="size-4" /> خروج
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate({ to: "/auth" })}>
              <ShieldCheck className="size-4" /> دخول / تسجيل
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="القائمة"
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      <div className={cn("border-t border-border/60 lg:hidden", open ? "block" : "hidden")}>
        <nav className="mx-auto grid max-w-7xl gap-1 px-4 py-3">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-accent">
              الإدارة
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
