import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createRazorpayOrder, isMockPayments } from "@/lib/razorpay";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({ orderId: z.string() });

// Explicit, customer-authorized retry after a failed payment. Creates a fresh
// Razorpay order rather than reusing the failed one, and never fires automatically.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "PAYMENT_FAILED") {
    return NextResponse.json({ error: "Only a failed order can be retried." }, { status: 409 });
  }

  const razorpayOrder = await createRazorpayOrder({
    amountInPaise: order.totalInPaise,
    receipt: `${order.id}-retry-${Date.now()}`,
    notes: { merchantId: order.merchantId, retryOf: order.id },
  });

  await prisma.payment.create({
    data: { orderId: order.id, razorpayOrderId: razorpayOrder.id, status: "CREATED", amountInPaise: order.totalInPaise },
  });
  await prisma.order.update({ where: { id: order.id }, data: { status: "PENDING_PAYMENT" } });

  await logAudit({
    merchantId: order.merchantId,
    actor: "CUSTOMER",
    action: "PAYMENT_RETRY_AUTHORIZED",
    orderId: order.id,
    sessionId: order.sessionId,
    detail: { razorpayOrderId: razorpayOrder.id },
  });

  return NextResponse.json({
    orderId: order.id,
    razorpayOrderId: razorpayOrder.id,
    razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
    totalInPaise: order.totalInPaise,
    isMockPayments,
  });
}
