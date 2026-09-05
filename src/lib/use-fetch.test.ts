import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, postJSON } from "./use-fetch";

describe("postJSON structured errors", () => {
  afterEach(() => vi.unstubAllGlobals());

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
});
