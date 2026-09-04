import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// Machine-readable catalog discovery endpoint for external AI buyers.
// GET /api/agent/catalog?merchantSlug=demo-gearhub
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const merchantSlug = searchParams.get("merchantSlug");
  if (!merchantSlug) return NextResponse.json({ error: "merchantSlug is required." }, { status: 400 });

  const merchant = await prisma.merchant.findUnique({ where: { slug: merchantSlug } });
  if (!merchant) return NextResponse.json({ error: "Merchant not found." }, { status: 404 });

  const products = await prisma.product.findMany({
    where: { merchantId: merchant.id, isActive: true },
    include: { inventory: true },
    orderBy: { category: "asc" },
  });

  await logAudit({
    merchantId: merchant.id,
    actor: "AGENT_API",
    action: "AGENT_CATALOG_DISCOVERY",
    detail: { productCount: products.length },
  });

  return NextResponse.json({
    merchant: { name: merchant.name, slug: merchant.slug, description: merchant.description },
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      features: JSON.parse(p.features || "[]"),
      price_inr: p.priceInPaise / 100,
      currency: "INR",
      in_stock: (p.inventory?.stockCount ?? 0) > 0,
      stock_count: p.inventory?.stockCount ?? 0,
    })),
  });
}
