import { describe, it, expect } from "vitest";
import { langFromAuthUrl, emailLanguage } from "./email-language";

describe("auth email language", () => {
  it("reads English from the redirect link", () => {
    const url = "https://x.supabase.co/auth/v1/verify?token=a&type=recovery&redirect_to=" + encodeURIComponent("https://nipponminers.com/reset-password?lang=en");
    expect(langFromAuthUrl(url)).toBe("en");
  });
  it("defaults to Arabic", () => {
    expect(langFromAuthUrl("https://x.co/verify?redirect_to=https://nipponminers.com/auth")).toBe("ar");
  });
  it("foreign registration country gets English", () => {
    expect(emailLanguage("الولايات المتحدة")).toBe("en");
    expect(emailLanguage("ليبيا")).toBe("ar");
  });
});
