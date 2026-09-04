import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/auth";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  features: z.array(z.string()).optional(),
  priceInRupees: z.number().positive().optional(),
  stockCount: z.number().int().min(0).optional(),
  imageEmoji: z.string().optional(),
  imageUrl: z.string().max(2_000_000).optional(),
  isActive: z.boolean().optional(),
  crossSellProductIds: z.array(z.string()).optional(),
  upsellProductIds: z.array(z.string()).optional(),
});

async function assertOwnership(merchantId: string, productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.merchantId !== merchantId) return null;
  return product;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireMerchant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await assertOwnership(ctx.merchant.id, params.id);
  if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 400 });
  }
  const data = parsed.data;

  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.features !== undefined ? { features: JSON.stringify(data.features) } : {}),
      ...(data.priceInRupees !== undefined ? { priceInPaise: Math.round(data.priceInRupees * 100) } : {}),
      ...(data.imageEmoji !== undefined ? { imageEmoji: data.imageEmoji } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.stockCount !== undefined
        ? { inventory: { upsert: { create: { stockCount: data.stockCount }, update: { stockCount: data.stockCount } } } }
        : {}),
    },
    include: { inventory: true },
  });

  if (data.crossSellProductIds) {
    await prisma.productRelation.deleteMany({ where: { fromProductId: params.id, relationType: "CROSS_SELL" } });
    for (const toId of data.crossSellProductIds) {
      if (toId === params.id) continue;
      await prisma.productRelation.create({
        data: { fromProductId: params.id, toProductId: toId, relationType: "CROSS_SELL" },
      });
    }
  }
  if (data.upsellProductIds) {
    await prisma.productRelation.deleteMany({ where: { fromProductId: params.id, relationType: "UPSELL" } });
    for (const toId of data.upsellProductIds) {
      if (toId === params.id) continue;
      await prisma.productRelation.create({
        data: { fromProductId: params.id, toProductId: toId, relationType: "UPSELL" },
      });
    }
  }

  await logAudit({
    merchantId: ctx.merchant.id,
    actor: "MERCHANT",
    action: "PRODUCT_UPDATED",
    detail: { productId: product.id },
  });

  return NextResponse.json({ product });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireMerchant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await assertOwnership(ctx.merchant.id, params.id);
  if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  await prisma.product.update({ where: { id: params.id }, data: { isActive: false } });
  await logAudit({ merchantId: ctx.merchant.id, actor: "MERCHANT", action: "PRODUCT_DEACTIVATED", detail: { productId: params.id } });
  return NextResponse.json({ ok: true });
}
