import { useEffect, useSyncExternalStore } from "react";
import translations from "@/lib/translations.json";
import { getLanguage, numberLocale, setLanguage, subscribeLanguage, westernDigits } from "@/lib/language-store";

const dictionary: Record<string, string> = translations;
export function t<T>(value: T): T {
  if (typeof value !== "string") return value;
  if (getLanguage() === "ar") return value;
  const normalized = value.replace(/\s+/g, " ").trim();
  const translated = dictionary[normalized];
  if (translated) return ((value.match(/^\s+/)?.[0] ?? "") + translated + (value.match(/\s+$/)?.[0] ?? "")) as T;
  return value as T;
}
export function useLanguage() {
  const language = useSyncExternalStore(subscribeLanguage, getLanguage, () => "ar" as const);
  return { language, direction: language === "ar" ? "rtl" as const : "ltr" as const, locale: numberLocale(), setLanguage, t };
}
export function LanguageInitializer() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nippon-language");
      if (saved === "en" || saved === "ar") setLanguage(saved);
    } catch { /* Keep Arabic as the default. */ }
  }, []);
  return null;
}
export { westernDigits, numberLocale };