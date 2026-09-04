import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  merchantSlug: z.string(),
  query: z.string().optional().default(""),
  category: z.string().optional(),
  maxBudgetInRupees: z.number().positive().optional(),
});

// Structured product search for external AI buyers — no LLM involved here,
// purely deterministic filtering/sorting over the live catalog.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });

  const merchant = await prisma.merchant.findUnique({ where: { slug: parsed.data.merchantSlug } });
  if (!merchant) return NextResponse.json({ error: "Merchant not found." }, { status: 404 });

  const q = parsed.data.query.toLowerCase();
  const products = await prisma.product.findMany({
    where: {
      merchantId: merchant.id,
      isActive: true,
      ...(parsed.data.category ? { category: parsed.data.category } : {}),
      ...(parsed.data.maxBudgetInRupees ? { priceInPaise: { lte: Math.round(parsed.data.maxBudgetInRupees * 100) } } : {}),
    },
    include: { inventory: true },
  });

  const filtered = q
    ? products.filter((p) => `${p.name} ${p.description} ${p.category} ${p.features}`.toLowerCase().includes(q))
    : products;

  filtered.sort((a, b) => a.priceInPaise - b.priceInPaise);

  await logAudit({
    merchantId: merchant.id,
    actor: "AGENT_API",
    action: "AGENT_CATALOG_SEARCH",
    detail: { query: parsed.data.query, category: parsed.data.category, resultCount: filtered.length },
  });

  return NextResponse.json({
    results: filtered.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price_inr: p.priceInPaise / 100,
      in_stock: (p.inventory?.stockCount ?? 0) > 0,
    })),
  });
}
