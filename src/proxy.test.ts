import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function makeRequest(url: string, host: string) {
  return new NextRequest(url, { headers: { host } });
}

describe("platform proxy separation", () => {
  it("serves the admin platform from the admin domain root", () => {
    const response = proxy(makeRequest("https://admin.je-mange-africain.com/", "admin.je-mange-africain.com"));

    expect(response.headers.get("x-middleware-rewrite")).toBe("https://admin.je-mange-africain.com/admin");
  });

  it("moves admin pages away from the customer domain in production", () => {
    const response = proxy(makeRequest("https://je-mange-africain.com/admin?team=1", "je-mange-africain.com"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://admin.je-mange-africain.com/admin?team=1");
  });

  it("moves admin API traffic away from the customer domain in production", () => {
    const response = proxy(makeRequest("https://je-mange-africain.com/api/admin/session", "je-mange-africain.com"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://admin.je-mange-africain.com/api/admin/session");
  });

  it("keeps the public storefront canonical on the root domain", () => {
    const response = proxy(makeRequest("https://www.je-mange-africain.com/recettes?country=CI", "www.je-mange-africain.com"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://je-mange-africain.com/recettes?country=CI");
  });

  it("keeps admin paths on the admin domain even when they arrive from www", () => {
    const response = proxy(makeRequest("https://www.je-mange-africain.com/admin/orders", "www.je-mange-africain.com"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://admin.je-mange-africain.com/admin/orders");
  });

  it("keeps local admin routes available for development and tests", () => {
    const response = proxy(makeRequest("http://127.0.0.1:3000/admin", "127.0.0.1:3000"));

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
