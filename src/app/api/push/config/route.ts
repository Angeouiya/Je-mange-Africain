import { NextResponse } from "next/server";
import { isPushConfigured } from "@/lib/push-server";

export function GET() {
  return NextResponse.json({
    configured: isPushConfigured(),
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
  }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } });
}
