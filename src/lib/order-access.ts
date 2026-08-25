import type { NextRequest } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { authorizeCustomerRequest } from "@/lib/customer-auth";
import { db } from "@/lib/db";

export type OrderAccess =
  | { scope: "admin" }
  | { scope: "customer"; customerId: string | null };

export async function authorizeOrderAccess(request: NextRequest): Promise<OrderAccess | null> {
  const admin = await authorizeAdminRequest(request, { module: "orders", action: "read" });
  if (admin.ok) return { scope: "admin" };

  const customer = await authorizeCustomerRequest(request);
  if (!customer) return null;

  const directory = await db.customer.findFirst({
    where: { user: { email: customer.email.toLowerCase(), role: "customer", isActive: true } },
    select: { id: true },
  });
  return { scope: "customer", customerId: directory?.id || null };
}
