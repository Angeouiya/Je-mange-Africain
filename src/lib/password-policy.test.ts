import { describe, expect, it } from "vitest";
import { connectedPasswordRequirements, isConnectedPasswordStrong } from "./password-policy";

describe("connected password policy", () => {
  it("requires length, lowercase, uppercase, a number and a symbol", () => {
    expect(connectedPasswordRequirements("motdepasse")).toEqual({
      length: false,
      lowercase: true,
      uppercase: false,
      number: false,
      symbol: false,
    });
    expect(isConnectedPasswordStrong("Jma26!Aa")).toBe(true);
    expect(isConnectedPasswordStrong("Cuisine2026!Sûre")).toBe(false);
  });
});
