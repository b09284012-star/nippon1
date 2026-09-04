import { MessageCircle } from "lucide-react";

export const SUPPORT_WHATSAPP = "+44 77 2333 5221";
export const SUPPORT_WHATSAPP_URL = "https://wa.me/447723335221";

export function SupportWhatsAppButton() {
  return (
    <a
      href={SUPPORT_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`تواصل مع الدعم عبر واتساب ${SUPPORT_WHATSAPP}`}
      className="fixed bottom-5 end-5 z-50 flex items-center gap-2 rounded-full bg-[image:var(--gradient-neon)] px-4 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-neon)] transition-transform hover:scale-105"
    >
      <MessageCircle className="size-5" />
      <span className="hidden sm:inline">الدعم عبر واتساب</span>
    </a>
  );
}
