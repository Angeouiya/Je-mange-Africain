import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, clearFetchCache, postJSON, prefetchJSON } from "./use-fetch";

describe("postJSON structured errors", () => {
  afterEach(() => {
    clearFetchCache();
    vi.unstubAllGlobals();
  });

  it("keeps the API status and recovery payload available to the interface", async () => {
    const payload = {
      error: "Refund started",
      paymentRecovery: { status: "refund_submitted", reference: "re_checkout_42" },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    })));

    const error = await postJSON("/api/checkout", {}).catch((reason) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "Refund started", status: 409, payload });
  });

  it("deduplicates public JSON prefetches and reuses the cached payload", async () => {
    const payload = { products: [{ id: "attieke" }] };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      prefetchJSON("/api/catalog?locale=fr", {}, { ttlMs: 60_000 }),
      prefetchJSON("/api/catalog?locale=fr", {}, { ttlMs: 60_000 }),
    ]);
    const third = await prefetchJSON("/api/catalog?locale=fr", {}, { ttlMs: 60_000 });

    expect(first).toEqual(payload);
    expect(second).toEqual(payload);
    expect(third).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clears a cached public response when a fresh read is required", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ version: 1 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ version: 2 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(prefetchJSON("/api/platform")).resolves.toEqual({ version: 1 });
    clearFetchCache("/api/platform");
    await expect(prefetchJSON("/api/platform")).resolves.toEqual({ version: 2 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
