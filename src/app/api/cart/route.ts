import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addItemToCart, removeItemFromCart, getOrCreateCart, getCartWithTotals } from "@/lib/cart";
import { ValidationError } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const getSchema = z.object({ merchantSlug: z.string(), sessionId: z.string() });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = getSchema.safeParse({
    merchantSlug: searchParams.get("merchantSlug"),
    sessionId: searchParams.get("sessionId"),
  });
  if (!parsed.success) return NextResponse.json({ error: "Missing merchantSlug or sessionId." }, { status: 400 });

  const merchant = await prisma.merchant.findUnique({ where: { slug: parsed.data.merchantSlug } });
  if (!merchant) return NextResponse.json({ error: "Merchant not found." }, { status: 404 });

  const cart = await getOrCreateCart(merchant.id, parsed.data.sessionId, "CUSTOMER_CHAT");
  const full = await getCartWithTotals(cart.id);
  return NextResponse.json({ cart: full });
}

const addSchema = z.object({
  merchantSlug: z.string(),
  sessionId: z.string(),
  productId: z.string(),
  quantity: z.number().int().positive().default(1),
  addedVia: z.enum(["CUSTOMER", "AI_RECOMMENDATION", "AI_UPSELL", "AI_CROSS_SELL"]).default("CUSTOMER"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });

  const merchant = await prisma.merchant.findUnique({ where: { slug: parsed.data.merchantSlug } });
  if (!merchant) return NextResponse.json({ error: "Merchant not found." }, { status: 404 });

  try {
    const cart = await addItemToCart({
      merchantId: merchant.id,
      sessionId: parsed.data.sessionId,
      productId: parsed.data.productId,
      quantity: parsed.data.quantity,
      addedVia: parsed.data.addedVia,
      channel: "CUSTOMER_CHAT",
    });

    await logAudit({
      merchantId: merchant.id,
      actor: "CUSTOMER",
      action: parsed.data.addedVia === "CUSTOMER" ? "CUSTOMER_ACCEPTED" : `CUSTOMER_ACCEPTED_${parsed.data.addedVia}`,
      sessionId: parsed.data.sessionId,
      detail: { productId: parsed.data.productId, quantity: parsed.data.quantity, addedVia: parsed.data.addedVia },
    });

    return NextResponse.json({ cart });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message, code: e.code }, { status: 409 });
    throw e;
  }
}

const deleteSchema = z.object({ merchantSlug: z.string(), sessionId: z.string(), productId: z.string() });

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const merchant = await prisma.merchant.findUnique({ where: { slug: parsed.data.merchantSlug } });
  if (!merchant) return NextResponse.json({ error: "Merchant not found." }, { status: 404 });

  const cart = await getOrCreateCart(merchant.id, parsed.data.sessionId, "CUSTOMER_CHAT");
  const updated = await removeItemFromCart(cart.id, parsed.data.productId);
  return NextResponse.json({ cart: updated });
}
