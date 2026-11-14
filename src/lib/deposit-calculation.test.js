import { test, expect } from "bun:test";
import { depositBreakdown } from "./deposit-calculation";
test("100 USD deposit charges 1 percent and credits 99 USD", () => {
  expect(depositBreakdown(100)).toEqual({ gross: 100, fee: 1, net: 99 });
});
test("deposit fees round to cents", () => {
  expect(depositBreakdown(25.5)).toEqual({ gross: 25.5, fee: 0.26, net: 25.24 });
});