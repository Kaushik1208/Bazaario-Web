import { NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { getDeadStockRescue } from "@/lib/ai/buzz";

export async function GET() {
  const ctx = await requireMerchant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await getDeadStockRescue(ctx.merchant.id);
  return NextResponse.json({ items });
}
