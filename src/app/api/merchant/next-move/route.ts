import { NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { getNextMoveInsights } from "@/lib/ai/buzz";

export async function GET() {
  const ctx = await requireMerchant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const insights = await getNextMoveInsights(ctx.merchant.id);
  return NextResponse.json({ insights });
}
