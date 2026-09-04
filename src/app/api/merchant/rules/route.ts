import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const RULE_TYPES = ["MAX_DISCOUNT_PERCENT", "MAX_TRANSACTION_AMOUNT", "MAX_UPSELLS_PER_CHAT", "ALLOW_CROSS_SELL", "ALLOW_UPSELL"] as const;

const schema = z.object({
  ruleType: z.enum(RULE_TYPES),
  value: z.string().min(1),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const ctx = await requireMerchant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rules = await prisma.merchantRule.findMany({ where: { merchantId: ctx.merchant.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const ctx = await requireMerchant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid rule." }, { status: 400 });

  // Only one active rule per ruleType — deactivate previous ones.
  await prisma.merchantRule.updateMany({
    where: { merchantId: ctx.merchant.id, ruleType: parsed.data.ruleType },
    data: { isActive: false },
  });
  const rule = await prisma.merchantRule.create({
    data: { merchantId: ctx.merchant.id, ruleType: parsed.data.ruleType, value: parsed.data.value, isActive: parsed.data.isActive },
  });

  await logAudit({ merchantId: ctx.merchant.id, actor: "MERCHANT", action: "RULE_UPDATED", detail: { ruleType: rule.ruleType, value: rule.value } });
  return NextResponse.json({ rule }, { status: 201 });
}
