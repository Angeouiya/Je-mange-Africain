import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  authorizeCustomerRequest: vi.fn(),
  enforceRateLimit: vi.fn(),
  contactCreate: vi.fn(),
}));

vi.mock("@/lib/customer-auth", () => ({ authorizeCustomerRequest: mocks.authorizeCustomerRequest }));
vi.mock("@/lib/redis", () => ({ enforceRateLimit: mocks.enforceRateLimit }));
vi.mock("@/lib/db", () => ({ db: { contactMessage: { create: mocks.contactCreate } } }));

import { POST } from "./route";

const session = { id: "customer-auth-1", email: "awa@example.fr" };
const body = {
  name: "Awa Traore",
  email: "awa@example.fr",
  subject: "Suivi de commande",
  message: "Je souhaite verifier le suivi de ma livraison.",
};

const request = (payload: Record<string, unknown> = body) => new NextRequest("http://localhost/api/contact", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

describe("POST /api/contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorizeCustomerRequest.mockResolvedValue(session);
    mocks.enforceRateLimit.mockResolvedValue(null);
    mocks.contactCreate.mockResolvedValue({ id: "contact_12345678" });
  });

  it("requires a connected customer before recording a message", async () => {
    mocks.authorizeCustomerRequest.mockResolvedValue(null);

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Connexion client requise.");
    expect(mocks.contactCreate).not.toHaveBeenCalled();
  });

  it("keeps rate limiting before session and database work", async () => {
    mocks.enforceRateLimit.mockResolvedValue(NextResponse.json({ error: "Trop de demandes." }, { status: 429 }));

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.error).toBe("Trop de demandes.");
    expect(mocks.authorizeCustomerRequest).not.toHaveBeenCalled();
    expect(mocks.contactCreate).not.toHaveBeenCalled();
  });

  it("records a customer contact request after authentication", async () => {
    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.reference).toBe("JMA-12345678");
    expect(mocks.authorizeCustomerRequest).toHaveBeenCalledWith(expect.any(NextRequest));
    expect(mocks.contactCreate).toHaveBeenCalledWith({ data: body });
  });
});
