import { describe, expect, it } from "vitest";
import { buildCustomerActions, summarizeCustomerPortfolio, type CustomerPortfolioMember } from "@/lib/customer-portfolio";

const now = new Date("2026-09-03T12:00:00.000Z");

function customer(overrides: Partial<CustomerPortfolioMember> = {}): CustomerPortfolioMember {
  return {
    id: "customer-1",
    name: "Aminata Koné",
    email: "aminata@example.fr",
    phone: "+33 6 00 00 00 00",
    city: "Paris",
    country: "France",
    orders: 4,
    loyalty: 600,
    lifetimeValue: 240,
    averageBasket: 60,
    lastOrderAt: "2026-08-28T12:00:00.000Z",
    joinedAt: "2026-01-10T12:00:00.000Z",
    addresses: 1,
    favorites: 2,
    savedRecipes: 1,
    openTickets: 0,
    preferredLang: "fr",
    segment: "active",
    ...overrides,
  };
}

describe("customer portfolio", () => {
  it("summarizes repeat business, profile quality and international coverage", () => {
    const summary = summarizeCustomerPortfolio([
      customer(),
      customer({ id: "customer-2", country: "Belgique", preferredLang: "en", orders: 1, lifetimeValue: 40, favorites: 0, savedRecipes: 0, phone: null, addresses: 0 }),
      customer({ id: "customer-3", country: "France", orders: 0, lifetimeValue: 0, segment: "new", lastOrderAt: null, joinedAt: "2026-09-01T12:00:00.000Z" }),
    ], now);

    expect(summary).toMatchObject({ total: 3, lifetimeValue: 280, totalOrders: 5, repeatCustomers: 1, repeatRate: 50, profileCoverageRate: 66.7, savedIntentRate: 66.7, markets: 2 });
    expect(summary.languages).toEqual({ fr: 2, en: 1, other: 0 });
  });

  it("prioritizes support, re-engagement, activation and loyalty opportunities", () => {
    const actions = buildCustomerActions([
      customer({ id: "support", openTickets: 2, segment: "ambassador" }),
      customer({ id: "risk", name: "Idrissa", segment: "at_risk", lifetimeValue: 600, lastOrderAt: "2026-05-01T12:00:00.000Z" }),
      customer({ id: "new", name: "Awa", segment: "new", orders: 0, lastOrderAt: null, joinedAt: "2026-08-01T12:00:00.000Z" }),
      customer({ id: "ambassador", segment: "ambassador", orders: 8, loyalty: 1800 }),
    ], now);

    expect(actions.map((action) => action.kind)).toEqual(["support", "reengage", "activate", "reward"]);
    expect(actions[1]).toMatchObject({ customerId: "risk", level: "attention", daysSinceActivity: 125 });
  });
});
