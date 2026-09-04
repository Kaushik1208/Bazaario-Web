import { NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { getLiveDemandSignals } from "@/lib/ai/buzz";

export async function GET() {
  const ctx = await requireMerchant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const signals = await getLiveDemandSignals(ctx.merchant.id);
  return NextResponse.json({ signals });
}
