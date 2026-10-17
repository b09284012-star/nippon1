import { describe, expect, test } from "bun:test";
import { inventoryCountry, listingReturnPath } from "./listing-access";

describe("guest inventory and sign-in return", () => {
  test("no chosen country requests all countries", () => {
    expect(inventoryCountry("")).toBe("");
  });
  test("a selected country remains scoped", () => {
    expect(inventoryCountry("ليبيا")).toBe("ليبيا");
  });
  test("returns to the same selected listing after sign-in", () => {
    expect(listingReturnPath("/listings/71ec2d9c-eb29-42c1-9d28-2df93322eefb")).toBe("/listings/71ec2d9c-eb29-42c1-9d28-2df93322eefb");
  });
  test("external or non-listing destinations cannot redirect sign-in", () => {
    for (const path of ["https://evil.example/listings/123", "//evil.example", "/admin", "/listings/../admin", undefined]) {
      expect(listingReturnPath(path)).toBeUndefined();
    }
  });
});