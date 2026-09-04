import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateCartForCheckout, ValidationError } from "@/lib/validation";
import { createRazorpayOrder, isMockPayments } from "@/lib/razorpay";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  merchantSlug: z.string(),
  sessionId: z.string(),
  // The external AI buyer must pass explicit confirmation — the API itself
  // is the gate; nothing here ever charges a card without this flag.
  confirm: z.literal(true),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Checkout requires explicit confirm:true from the buyer (agent cannot auto-confirm on the user's behalf)." },
      { status: 400 }
    );
  }

  const merchant = await prisma.merchant.findUnique({ where: { slug: parsed.data.merchantSlug } });
  if (!merchant) return NextResponse.json({ error: "Merchant not found." }, { status: 404 });

  const cart = await prisma.cart.findFirst({ where: { merchantId: merchant.id, sessionId: parsed.data.sessionId, status: "ACTIVE" } });
  if (!cart) return NextResponse.json({ error: "No active cart found." }, { status: 404 });

  try {
    const validated = await validateCartForCheckout(cart.id);

    const order = await prisma.order.create({
      data: {
        merchantId: merchant.id,
        cartId: cart.id,
        sessionId: parsed.data.sessionId,
        channel: "AGENT_API",
        status: "PENDING_PAYMENT",
        subtotalInPaise: validated.subtotalInPaise,
        discountInPaise: validated.discountInPaise,
        totalInPaise: validated.totalInPaise,
        items: { create: validated.lines.map((l) => ({ productId: l.productId, productName: l.productName, quantity: l.quantity, unitPriceInPaise: l.unitPriceInPaise, addedVia: l.addedVia })) },
      },
    });

    const razorpayOrder = await createRazorpayOrder({
      amountInPaise: order.totalInPaise,
      receipt: order.id,
      notes: { merchantId: merchant.id, sessionId: parsed.data.sessionId, channel: "AGENT_API" },
    });

    await prisma.payment.create({
      data: { orderId: order.id, razorpayOrderId: razorpayOrder.id, status: "CREATED", amountInPaise: order.totalInPaise },
    });

    await logAudit({
      merchantId: merchant.id,
      actor: "AGENT_API",
      action: "AGENT_CHECKOUT_REQUESTED",
      sessionId: parsed.data.sessionId,
      orderId: order.id,
      detail: { totalInPaise: order.totalInPaise, razorpayOrderId: razorpayOrder.id },
    });

    return NextResponse.json({
      order_id: order.id,
      razorpay_order_id: razorpayOrder.id,
      amount_inr: order.totalInPaise / 100,
      status: "PENDING_PAYMENT",
      is_mock_payments: isMockPayments,
      next_step: "Complete payment via Razorpay Checkout using razorpay_order_id, then POST the result to /api/payment/verify with { orderId, razorpay_payment_id, razorpay_signature }.",
    });
  } catch (e) {
    if (e instanceof ValidationError) {
      await logAudit({
        merchantId: merchant.id,
        actor: "AGENT_API",
        action: "RULE_BLOCKED",
        sessionId: parsed.data.sessionId,
        detail: { code: e.code, message: e.message },
      });
      return NextResponse.json({ error: e.message, code: e.code }, { status: 409 });
    }
    throw e;
  }
}
