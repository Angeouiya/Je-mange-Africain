export type CustomerPortfolioMember = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  city: string;
  country: string;
  orders: number;
  loyalty: number;
  lifetimeValue: number;
  averageBasket: number;
  lastOrderAt?: string | null;
  joinedAt: string;
  addresses: number;
  favorites: number;
  savedRecipes: number;
  openTickets: number;
  preferredLang: string;
  segment: "ambassador" | "active" | "at_risk" | "new";
};

export type CustomerPortfolioAction = {
  id: string;
  customerId: string;
  customerName: string;
  kind: "support" | "reengage" | "activate" | "complete_profile" | "reward";
  level: "critical" | "attention" | "opportunity";
  score: number;
  count: number;
  value: number;
  daysSinceActivity: number | null;
};

const DAY_MS = 86_400_000;
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const roundRate = (value: number) => Math.round((value + Number.EPSILON) * 10) / 10;

function elapsedDays(value: string | null | undefined, now: Date) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
}

export function buildCustomerActions(customers: CustomerPortfolioMember[], now = new Date()) {
  const actions = customers.map((customer): CustomerPortfolioAction | null => {
    const daysSinceActivity = elapsedDays(customer.lastOrderAt || customer.joinedAt, now);
    if (customer.openTickets > 0) return { id: `support:${customer.id}`, customerId: customer.id, customerName: customer.name, kind: "support", level: "critical", score: 500 + customer.openTickets * 20 + customer.lifetimeValue / 100, count: customer.openTickets, value: customer.lifetimeValue, daysSinceActivity };
    if (customer.segment === "at_risk") return { id: `reengage:${customer.id}`, customerId: customer.id, customerName: customer.name, kind: "reengage", level: "attention", score: 400 + customer.lifetimeValue / 100, count: customer.orders, value: customer.lifetimeValue, daysSinceActivity };
    if (customer.segment === "new" && (daysSinceActivity || 0) >= 7) return { id: `activate:${customer.id}`, customerId: customer.id, customerName: customer.name, kind: "activate", level: "attention", score: 300 + (daysSinceActivity || 0) / 10, count: 0, value: 0, daysSinceActivity };
    if (!customer.phone || customer.addresses === 0) return { id: `complete:${customer.id}`, customerId: customer.id, customerName: customer.name, kind: "complete_profile", level: "attention", score: 200 + customer.lifetimeValue / 100, count: 0, value: customer.lifetimeValue, daysSinceActivity };
    if (customer.segment === "ambassador") return { id: `reward:${customer.id}`, customerId: customer.id, customerName: customer.name, kind: "reward", level: "opportunity", score: 100 + customer.loyalty / 1_000 + customer.orders / 10, count: customer.orders, value: customer.lifetimeValue, daysSinceActivity };
    return null;
  }).filter((action): action is CustomerPortfolioAction => Boolean(action));

  return actions.sort((left, right) => right.score - left.score || right.value - left.value);
}

export function summarizeCustomerPortfolio(customers: CustomerPortfolioMember[], now = new Date()) {
  const buyers = customers.filter((customer) => customer.orders > 0);
  const repeatCustomers = buyers.filter((customer) => customer.orders >= 2).length;
  const completeProfiles = customers.filter((customer) => Boolean(customer.phone) && customer.addresses > 0).length;
  const savedIntent = customers.filter((customer) => customer.favorites + customer.savedRecipes > 0).length;
  const actions = buildCustomerActions(customers, now);
  const languages = customers.reduce((counts, customer) => {
    if (customer.preferredLang === "fr") counts.fr += 1;
    else if (customer.preferredLang === "en") counts.en += 1;
    else counts.other += 1;
    return counts;
  }, { fr: 0, en: 0, other: 0 });
  const lifetimeValue = customers.reduce((sum, customer) => sum + customer.lifetimeValue, 0);
  const totalOrders = customers.reduce((sum, customer) => sum + customer.orders, 0);

  return {
    total: customers.length,
    lifetimeValue: roundMoney(lifetimeValue),
    averageCustomerValue: customers.length ? roundMoney(lifetimeValue / customers.length) : 0,
    averageBasket: totalOrders ? roundMoney(lifetimeValue / totalOrders) : 0,
    totalOrders,
    repeatCustomers,
    repeatRate: buyers.length ? roundRate((repeatCustomers / buyers.length) * 100) : 0,
    profileCoverageRate: customers.length ? roundRate((completeProfiles / customers.length) * 100) : 0,
    savedIntentRate: customers.length ? roundRate((savedIntent / customers.length) * 100) : 0,
    openTickets: customers.reduce((sum, customer) => sum + customer.openTickets, 0),
    atRiskValue: roundMoney(customers.filter((customer) => customer.segment === "at_risk").reduce((sum, customer) => sum + customer.lifetimeValue, 0)),
    actionable: actions.filter((action) => action.level !== "opportunity").length,
    segments: customers.reduce((counts, customer) => {
      counts[customer.segment] += 1;
      return counts;
    }, { ambassador: 0, active: 0, at_risk: 0, new: 0 }),
    markets: new Set(customers.map((customer) => customer.country).filter((country) => country && country !== "—")).size,
    languages,
  };
}
