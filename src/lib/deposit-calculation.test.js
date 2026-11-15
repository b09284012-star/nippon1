import { test, expect } from "bun:test";
import { depositBreakdown } from "./deposit-calculation";
test("100 USD deposit has no commission and credits the full 100 USD", () => {
  expect(depositBreakdown(100)).toEqual({ gross: 100, fee: 0, net: 100 });
});
test("fractional deposits also credit the full amount without commission", () => {
  expect(depositBreakdown(25.5)).toEqual({ gross: 25.5, fee: 0, net: 25.5 });
});