import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runRecommendation } from "@/lib/ai/engine";
import { logAudit } from "@/lib/audit";
import { getMerchantRules } from "@/lib/validation";
import { z } from "zod";

const schema = z.object({
  merchantSlug: z.string(),
  sessionId: z.string(),
  message: z.string().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid chat request." }, { status: 400 });
  const { merchantSlug, sessionId, message } = parsed.data;

  const merchant = await prisma.merchant.findUnique({ where: { slug: merchantSlug } });
  if (!merchant) return NextResponse.json({ error: "Merchant not found." }, { status: 404 });

  await prisma.aIInteraction.create({
    data: { merchantId: merchant.id, sessionId, role: "CUSTOMER", message },
  });

  await logAudit({
    merchantId: merchant.id,
    actor: "CUSTOMER",
    action: "CUSTOMER_REQUEST",
    sessionId,
    detail: { message },
  });

  const rules = await getMerchantRules(merchant.id);

  await logAudit({
    merchantId: merchant.id,
    actor: "MERCHANT_AI_AGENT",
    action: "CATALOG_SEARCH",
    sessionId,
    detail: { query: message },
  });

  const result = await runRecommendation(merchant.id, message);

  if (result.recommended) {
    await logAudit({
      merchantId: merchant.id,
      actor: "MERCHANT_AI_AGENT",
      action: "PRODUCT_RECOMMENDATION",
      sessionId,
      detail: {
        productId: result.recommended.id,
        productName: result.recommended.name,
        priceInPaise: result.recommended.priceInPaise,
        reason: result.recommended.reason,
        consideredCount: result.alternatives.length + 1,
        usedLLM: result.usedLLM,
      },
    });
  }

  if (result.upsell && rules.allowUpsell) {
    await logAudit({
      merchantId: merchant.id,
      actor: "MERCHANT_AI_AGENT",
      action: "UPSELL_SUGGESTED",
      sessionId,
      detail: { productId: result.upsell.id, productName: result.upsell.name, priceInPaise: result.upsell.priceInPaise },
    });
  }
  if (result.crossSell && rules.allowCrossSell) {
    await logAudit({
      merchantId: merchant.id,
      actor: "MERCHANT_AI_AGENT",
      action: "CROSS_SELL_SUGGESTED",
      sessionId,
      detail: { productId: result.crossSell.id, productName: result.crossSell.name, priceInPaise: result.crossSell.priceInPaise },
    });
  }

  await prisma.aIInteraction.create({
    data: {
      merchantId: merchant.id,
      sessionId,
      role: "ASSISTANT",
      message: result.reply,
      meta: JSON.stringify({
        recommendedId: result.recommended?.id ?? null,
        upsellId: rules.allowUpsell ? result.upsell?.id ?? null : null,
        crossSellId: rules.allowCrossSell ? result.crossSell?.id ?? null : null,
      }),
    },
  });

  return NextResponse.json({
    reply: result.reply,
    intent: result.intent,
    recommended: result.recommended,
    upsell: rules.allowUpsell ? result.upsell : null,
    crossSell: rules.allowCrossSell ? result.crossSell : null,
    bundle: rules.allowCrossSell ? result.bundle : null,
    alternatives: result.alternatives,
    usedLLM: result.usedLLM,
  });
}
