import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addItemToCart, removeItemFromCart, getOrCreateCart, getCartWithTotals } from "@/lib/cart";
import { ValidationError } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  merchantSlug: z.string(),
  sessionId: z.string(),
  action: z.enum(["get", "add", "remove"]).default("get"),
  productId: z.string().optional(),
  quantity: z.number().int().positive().optional().default(1),
});

// Cart management for external AI buyers, mirroring /api/cart but tagged as
// AGENT_API channel for full traceability in the audit trail.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });

  const merchant = await prisma.merchant.findUnique({ where: { slug: parsed.data.merchantSlug } });
  if (!merchant) return NextResponse.json({ error: "Merchant not found." }, { status: 404 });

  try {
    if (parsed.data.action === "get") {
      const cart = await getOrCreateCart(merchant.id, parsed.data.sessionId, "AGENT_API");
      return NextResponse.json({ cart: await getCartWithTotals(cart.id) });
    }
    if (parsed.data.action === "add") {
      if (!parsed.data.productId) return NextResponse.json({ error: "productId is required." }, { status: 400 });
      const cart = await addItemToCart({
        merchantId: merchant.id,
        sessionId: parsed.data.sessionId,
        productId: parsed.data.productId,
        quantity: parsed.data.quantity,
        addedVia: "CUSTOMER",
        channel: "AGENT_API",
      });
      await logAudit({
        merchantId: merchant.id,
        actor: "AGENT_API",
        action: "AGENT_CART_ADD",
        sessionId: parsed.data.sessionId,
        detail: { productId: parsed.data.productId, quantity: parsed.data.quantity },
      });
      return NextResponse.json({ cart });
    }
    // remove
    if (!parsed.data.productId) return NextResponse.json({ error: "productId is required." }, { status: 400 });
    const existingCart = await getOrCreateCart(merchant.id, parsed.data.sessionId, "AGENT_API");
    const cart = await removeItemFromCart(existingCart.id, parsed.data.productId);
    await logAudit({
      merchantId: merchant.id,
      actor: "AGENT_API",
      action: "AGENT_CART_REMOVE",
      sessionId: parsed.data.sessionId,
      detail: { productId: parsed.data.productId },
    });
    return NextResponse.json({ cart });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message, code: e.code }, { status: 409 });
    throw e;
  }
}
