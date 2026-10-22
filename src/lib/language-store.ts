export type Language = "ar" | "en";
let language: Language = "ar";
const listeners = new Set<() => void>();
export const getLanguage = () => language;
export const subscribeLanguage = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export function setLanguage(value: Language) {
  language = value;
  if (typeof document !== "undefined") {
    document.documentElement.lang = value;
    document.documentElement.dir = value === "ar" ? "rtl" : "ltr";
    try { localStorage.setItem("nippon-language", value); } catch { /* Storage may be unavailable. */ }
  }
  listeners.forEach((listener) => listener());
}
export function westernDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) - (digit <= "٩" ? 0x660 : 0x6f0)));
}
export const numberLocale = () => getLanguage() === "ar" ? "ar-u-nu-latn" : "en-US";