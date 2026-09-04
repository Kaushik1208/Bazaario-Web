import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runRecommendation } from "@/lib/ai/engine";
import { getMerchantRules } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({ merchantSlug: z.string(), query: z.string().min(1), sessionId: z.string().optional() });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });

  const merchant = await prisma.merchant.findUnique({ where: { slug: parsed.data.merchantSlug } });
  if (!merchant) return NextResponse.json({ error: "Merchant not found." }, { status: 404 });

  const rules = await getMerchantRules(merchant.id);
  const result = await runRecommendation(merchant.id, parsed.data.query);

  await logAudit({
    merchantId: merchant.id,
    actor: "AGENT_API",
    action: "AGENT_RECOMMENDATION_REQUEST",
    sessionId: parsed.data.sessionId,
    detail: { query: parsed.data.query, recommendedId: result.recommended?.id ?? null },
  });

  return NextResponse.json({
    query: parsed.data.query,
    recommended: result.recommended
      ? { id: result.recommended.id, name: result.recommended.name, price_inr: result.recommended.priceInPaise / 100, reason: result.recommended.reason }
      : null,
    upsell: rules.allowUpsell && result.upsell
      ? { id: result.upsell.id, name: result.upsell.name, price_inr: result.upsell.priceInPaise / 100, reason: result.upsell.reason }
      : null,
    cross_sell: rules.allowCrossSell && result.crossSell
      ? { id: result.crossSell.id, name: result.crossSell.name, price_inr: result.crossSell.priceInPaise / 100, reason: result.crossSell.reason }
      : null,
  });
}
