import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const merchantSlug = req.nextUrl.searchParams.get("merchantSlug");
  if (!merchantSlug) return NextResponse.json({ error: "merchantSlug is required." }, { status: 400 });

  const merchant = await prisma.merchant.findUnique({ where: { slug: merchantSlug } });
  if (!merchant) return NextResponse.json({ error: "Merchant not found." }, { status: 404 });

  const products = await prisma.product.findMany({
    where: { merchantId: merchant.id, isActive: true },
    include: { inventory: true },
    orderBy: { priceInPaise: "asc" },
  });

  const byCategory = new Map<string, { name: string; priceInPaise: number }>();
  for (const p of products) {
    if (!byCategory.has(p.category) && (p.inventory?.stockCount ?? 0) > 0) {
      byCategory.set(p.category, { name: p.name, priceInPaise: p.priceInPaise });
    }
  }

  return NextResponse.json({
    hasProducts: products.length > 0,
    categories: Array.from(byCategory.entries()).map(([category, sample]) => ({ category, ...sample })),
  });
}
