import { getLanguage } from "@/lib/language-store";

export type EmailLang = "ar" | "en";

/** Foreign (non-Arabic-speaking) registration countries receive English emails. */
const FOREIGN_COUNTRIES = new Set(["تركيا", "ألمانيا", "فرنسا", "بريطانيا", "الولايات المتحدة"]);

/** Language for auth emails: the visitor's site language, or English for a foreign registration country. */
export function emailLanguage(country?: string): EmailLang {
  if (country && FOREIGN_COUNTRIES.has(country.trim())) return "en";
  return getLanguage() === "en" ? "en" : "ar";
}

/** Reads the language tag embedded in the auth link's redirect address. Defaults to Arabic. */
export function langFromAuthUrl(url: string | null | undefined): EmailLang {
  if (!url) return "ar";
  try {
    const u = new URL(url);
    const redirect = u.searchParams.get("redirect_to");
    const target = redirect ? new URL(redirect) : u;
    return target.searchParams.get("lang") === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}
