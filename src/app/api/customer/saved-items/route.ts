import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCustomer } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const ctx = await requireCustomer();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.savedItem.findMany({
    where: { customerId: ctx.customer.id },
    include: { product: { include: { inventory: true, merchant: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    items: items
      .filter((i) => i.product.isActive)
      .map((i) => ({
        id: i.id,
        productId: i.productId,
        name: i.product.name,
        priceInPaise: i.product.priceInPaise,
        imageEmoji: i.product.imageEmoji,
        imageUrl: i.product.imageUrl,
        stockCount: i.product.inventory?.stockCount ?? 0,
        merchantName: i.product.merchant.name,
        merchantSlug: i.product.merchant.slug,
      })),
  });
}

const addSchema = z.object({ productId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const ctx = await requireCustomer();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "productId is required." }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  await prisma.savedItem.upsert({
    where: { customerId_productId: { customerId: ctx.customer.id, productId: product.id } },
    update: {},
    create: { customerId: ctx.customer.id, productId: product.id },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

const removeSchema = z.object({ productId: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const ctx = await requireCustomer();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "productId is required." }, { status: 400 });

  await prisma.savedItem.deleteMany({ where: { customerId: ctx.customer.id, productId: parsed.data.productId } });
  return NextResponse.json({ ok: true });
}
