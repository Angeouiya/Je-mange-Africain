import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  audienceCounts: vi.fn(),
  configured: vi.fn(),
  broadcast: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ authorizeAdminRequest: mocks.authorize }));
vi.mock("@/lib/push-server", () => ({
  getPushAudienceCounts: mocks.audienceCounts,
  isPushConfigured: mocks.configured,
  broadcastLocalizedPush: mocks.broadcast,
}));
vi.mock("@/lib/db", () => ({
  db: {
    notification: { findMany: mocks.findMany, create: mocks.create, update: mocks.update },
    auditLog: { create: mocks.audit },
  },
}));

import { GET, POST } from "./route";

const counts = { all: 846, signed_in: 690, guests: 156, ambassador: 126, active: 340, at_risk: 92, new: 58 };
const validCampaign = {
  titleFr: "Le marché du week-end",
  titleEn: "The weekend market",
  bodyFr: "Découvrez nos offres choisies pour votre prochain panier.",
  bodyEn: "Discover selected offers for your next basket.",
  type: "promotion",
  url: "/?view=catalog",
  audience: "ambassador",
};

describe("admin push campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, user: { email: "marketing@je-mange-africain.com", role: "marketing" } });
    mocks.audienceCounts.mockResolvedValue(counts);
    mocks.configured.mockReturnValue(true);
    mocks.findMany.mockResolvedValue([]);
    mocks.create.mockResolvedValue({ id: "campaign-1", ...validCampaign });
    mocks.broadcast.mockResolvedValue({ total: 126, sent: 124, failed: 2, configured: true });
    mocks.update.mockResolvedValue({ id: "campaign-1" });
    mocks.audit.mockResolvedValue({ id: "audit-1" });
  });

  it("measures only devices consenting to the selected campaign type", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/push?type=promotion"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.audienceCounts).toHaveBeenCalledWith("promotion");
    expect(payload).toMatchObject({ type: "promotion", activeSubscriptions: 846, eligibleSubscriptions: 846, audiences: counts });
  });

  it("preserves the consent category in the server delivery payload and audit", async () => {
    const response = await POST(new NextRequest("http://localhost/api/admin/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validCampaign),
    }));

    expect(response.status).toBe(200);
    expect(mocks.broadcast).toHaveBeenCalledWith({
      fr: expect.objectContaining({ type: "promotion" }),
      en: expect.objectContaining({ type: "promotion" }),
    }, "ambassador");
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ recipientCount: 126, deliveredCount: 124, failedCount: 2 }) }));
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "push_campaign_sent" }) }));
  });
});
