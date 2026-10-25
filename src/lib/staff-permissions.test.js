import { describe, expect, test } from "bun:test";
import { staffPermissions } from "./staff-permissions.ts";

describe("delegated staff responsibilities", () => {
  test("forum administrators moderate globally without finance or private user access", () => {
    expect(staffPermissions(false, ["forum"])).toEqual({ manager: false, forum: true, disputes: false, finance: false, privateUsers: false, assignStaff: false });
  });
  test("dispute administrators have only dispute duties", () => {
    expect(staffPermissions(false, ["disputes"])).toEqual({ manager: false, forum: false, disputes: true, finance: false, privateUsers: false, assignStaff: false });
  });
  test("the main manager controls all responsibilities", () => {
    expect(staffPermissions(true, [])).toEqual({ manager: true, forum: true, disputes: true, finance: true, privateUsers: true, assignStaff: true });
  });
  test("ordinary users have no administrative permissions", () => {
    expect(Object.values(staffPermissions(false, [])).every(value => !value)).toBe(true);
  });
});