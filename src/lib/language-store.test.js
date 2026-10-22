import { describe, expect, test } from "bun:test";
import { getLanguage, setLanguage, numberLocale, westernDigits } from "./language-store";
import { t } from "./i18n";

describe("site languages and Western numbers", () => {
  test("Arabic and English preserve 1234 digits", () => {
    expect(westernDigits("١٢٣٤ ۱۲۳۴")).toBe("1234 1234");
    for (const language of ["ar", "en"]) {
      setLanguage(language);
      expect(new Intl.NumberFormat(numberLocale(), { useGrouping: false }).format(1234)).toBe("1234");
    }
    setLanguage("ar");
  });
  test("switches interface language without changing unknown user content", () => {
    setLanguage("en");
    expect(getLanguage()).toBe("en");
    expect(t("المحفظة")).toBe("Wallet");
    expect(t("ليبيا")).toBe("Libya");
    expect(t("عبدالهادي - جهاز خاص")).toBe("عبدالهادي - جهاز خاص");
    setLanguage("ar");
    expect(t("المحفظة")).toBe("المحفظة");
  });
});