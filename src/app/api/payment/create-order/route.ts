import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateCartForCheckout, ValidationError } from "@/lib/validation";
import { createRazorpayOrder, isMockPayments } from "@/lib/razorpay";
import { logAudit } from "@/lib/audit";
import { getCurrentCustomerSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ merchantSlug: z.string(), sessionId: z.string() });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const merchant = await prisma.merchant.findUnique({ where: { slug: parsed.data.merchantSlug } });
  if (!merchant) return NextResponse.json({ error: "Merchant not found." }, { status: 404 });

  const cart = await prisma.cart.findFirst({
    where: { merchantId: merchant.id, sessionId: parsed.data.sessionId, status: "ACTIVE" },
  });
  if (!cart) return NextResponse.json({ error: "No active cart found." }, { status: 404 });

  try {
    // Independent backend re-validation — never trusts client/LLM totals.
    const validated = await validateCartForCheckout(cart.id);

    await logAudit({
      merchantId: merchant.id,
      actor: "SYSTEM",
      action: "PRICE_VALIDATED",
      sessionId: parsed.data.sessionId,
      detail: { subtotalInPaise: validated.subtotalInPaise, totalInPaise: validated.totalInPaise, lines: validated.lines },
    });

    // Attribute the order to a logged-in customer when there is one, so it
    // shows up in their "My Orders" history — guest checkouts stay null.
    const customerSession = await getCurrentCustomerSession().catch(() => null);

    const order = await prisma.order.create({
      data: {
        merchantId: merchant.id,
        cartId: cart.id,
        sessionId: parsed.data.sessionId,
        customerId: customerSession?.customerId ?? null,
        channel: cart.channel,
        status: "PENDING_PAYMENT",
        subtotalInPaise: validated.subtotalInPaise,
        discountInPaise: validated.discountInPaise,
        totalInPaise: validated.totalInPaise,
        items: {
          create: validated.lines.map((l) => ({
            productId: l.productId,
            productName: l.productName,
            quantity: l.quantity,
            unitPriceInPaise: l.unitPriceInPaise,
            addedVia: l.addedVia,
          })),
        },
      },
    });

    await logAudit({
      merchantId: merchant.id,
      actor: "SYSTEM",
      action: "PAYMENT_AUTHORIZED",
      sessionId: parsed.data.sessionId,
      orderId: order.id,
      detail: { totalInPaise: order.totalInPaise },
    });

    const razorpayOrder = await createRazorpayOrder({
      amountInPaise: order.totalInPaise,
      receipt: order.id,
      notes: { merchantId: merchant.id, sessionId: parsed.data.sessionId },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        razorpayOrderId: razorpayOrder.id,
        status: "CREATED",
        amountInPaise: order.totalInPaise,
      },
    });

    await logAudit({
      merchantId: merchant.id,
      actor: "SYSTEM",
      action: "RAZORPAY_ORDER_CREATED",
      sessionId: parsed.data.sessionId,
      orderId: order.id,
      detail: { razorpayOrderId: razorpayOrder.id, isMock: isMockPayments },
    });

    return NextResponse.json({
      orderId: order.id,
      totalInPaise: order.totalInPaise,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
      isMockPayments,
    });
  } catch (e) {
    if (e instanceof ValidationError) {
      await logAudit({
        merchantId: merchant.id,
        actor: "SYSTEM",
        action: "RULE_BLOCKED",
        sessionId: parsed.data.sessionId,
        detail: { code: e.code, message: e.message },
      });
      return NextResponse.json({ error: e.message, code: e.code }, { status: 409 });
    }
    throw e;
  }
}
