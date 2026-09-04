import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/auth";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const productSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  features: z.array(z.string()).default([]),
  priceInRupees: z.number().positive(),
  stockCount: z.number().int().min(0),
  imageEmoji: z.string().default("📦"),
  imageUrl: z.string().max(2_000_000).optional().default(""),
});

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET() {
  const ctx = await requireMerchant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const products = await prisma.product.findMany({
    where: { merchantId: ctx.merchant.id },
    include: { inventory: true, relationsFrom: { include: { toProduct: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const ctx = await requireMerchant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid product data." }, { status: 400 });
  }
  const data = parsed.data;
  const baseSlug = slugify(data.name);
  let slug = baseSlug;
  let n = 1;
  while (await prisma.product.findUnique({ where: { merchantId_slug: { merchantId: ctx.merchant.id, slug } } })) {
    slug = `${baseSlug}-${++n}`;
  }

  const product = await prisma.product.create({
    data: {
      merchantId: ctx.merchant.id,
      name: data.name,
      slug,
      category: data.category,
      description: data.description,
      features: JSON.stringify(data.features),
      priceInPaise: Math.round(data.priceInRupees * 100),
      imageEmoji: data.imageEmoji,
      imageUrl: data.imageUrl || null,
      inventory: { create: { stockCount: data.stockCount } },
    },
    include: { inventory: true },
  });

  await logAudit({
    merchantId: ctx.merchant.id,
    actor: "MERCHANT",
    action: "PRODUCT_CREATED",
    detail: { productId: product.id, name: product.name, priceInPaise: product.priceInPaise },
  });

  return NextResponse.json({ product }, { status: 201 });
}
