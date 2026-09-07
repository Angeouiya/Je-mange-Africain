"use client";

import type { AdminSectionId } from "@/components/admin/admin-types";
import { prefetchJSON } from "@/lib/use-fetch";

export type AdminPrefetchLocale = "fr" | "en";

export const ADMIN_DATA_TTL_MS = 25_000;

const ADMIN_SECTION_NEIGHBORS: Record<AdminSectionId, AdminSectionId[]> = {
  overview: ["orders", "inventory", "finance"],
  catalog: ["recipes", "promotions", "inventory"],
  recipes: ["catalog", "inventory", "advertising"],
  wholesaleQuotes: ["orders", "customers", "finance"],
  orders: ["inventory", "logistics", "finance"],
  inventory: ["orders", "logistics", "catalog"],
  logistics: ["orders", "inventory", "settings"],
  customers: ["wholesaleQuotes", "orders", "promotions"],
  promotions: ["catalog", "advertising", "campaigns"],
  campaigns: ["promotions", "advertising", "customers"],
  advertising: ["promotions", "campaigns", "recipes"],
  finance: ["overview", "orders", "wholesaleQuotes"],
  governance: ["team", "settings", "overview"],
  team: ["governance", "settings"],
  settings: ["governance", "team", "logistics"],
};

export function adminPrefetchUrls(section: AdminSectionId, locale: AdminPrefetchLocale) {
  const encodedLocale = encodeURIComponent(locale);
  const urls: Partial<Record<AdminSectionId, string[]>> = {
    overview: [`/api/admin/dashboard?locale=${encodedLocale}`],
    catalog: [`/api/admin/products?locale=${encodedLocale}`],
    recipes: [`/api/admin/recipes?locale=${encodedLocale}`, `/api/admin/products?locale=${encodedLocale}`],
    wholesaleQuotes: [`/api/admin/wholesale-quotes?locale=${encodedLocale}`],
    orders: [`/api/orders?locale=${encodedLocale}`],
    inventory: [`/api/admin/stock?locale=${encodedLocale}`],
    logistics: ["/api/admin/logistics"],
    customers: [`/api/admin/customers?locale=${encodedLocale}`],
    promotions: ["/api/admin/promotions", "/api/admin/products", "/api/categories"],
    campaigns: ["/api/admin/push?type=system"],
    advertising: ["/api/admin/advertisements"],
    finance: [`/api/admin/profitability?locale=${encodedLocale}&period=30d`, `/api/admin/payments?locale=${encodedLocale}&period=30d&filter=all&query=&page=1&pageSize=24`],
    governance: [`/api/admin/audit?locale=${encodedLocale}&period=30d`],
    team: ["/api/admin/team"],
    settings: ["/api/admin/settings"],
  };
  return urls[section] || [];
}

export function prefetchAdminSectionData(section: AdminSectionId, locale: AdminPrefetchLocale) {
  return Promise.allSettled(adminPrefetchUrls(section, locale).map((url) => prefetchJSON(url, {}, { cache: true, ttlMs: ADMIN_DATA_TTL_MS })));
}

export function adminPredictiveSections(section: AdminSectionId, availableSections: AdminSectionId[] = []) {
  const available = availableSections.length ? availableSections : [section];
  const allowed = new Set(available);
  const sections: AdminSectionId[] = [];
  const add = (candidate: AdminSectionId | undefined) => {
    if (!candidate || !allowed.has(candidate) || sections.includes(candidate)) return;
    sections.push(candidate);
  };

  add(section);
  for (const candidate of ADMIN_SECTION_NEIGHBORS[section]) add(candidate);

  const index = available.indexOf(section);
  add(index > 0 ? available[index - 1] : undefined);
  add(index >= 0 && index < available.length - 1 ? available[index + 1] : undefined);
  add("overview");

  return sections;
}
