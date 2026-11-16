import { useEffect, type ReactNode } from "react";
import { setLanguage } from "@/lib/language-store";

// English URLs (/en/...) always show the English interface.
export function EnglishPage({ children }: { children: ReactNode }) {
  useEffect(() => { setLanguage("en"); }, []);
  return <>{children}</>;
}
