import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyRazorpaySignature, simulateMockPayment, isMockPayments } from "@/lib/razorpay";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  orderId: z.string(),
  // Real Razorpay checkout.js response fields (used when real keys are configured):
  razorpay_payment_id: z.string().optional(),
  razorpay_signature: z.string().optional(),
  // Demo-only: lets the UI intentionally trigger the required failure scenario
  // when running in mock mode (no real Razorpay keys configured).
  simulateOutcome: z.enum(["success", "failure"]).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid verification request." }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 }, items: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const payment = order.payments[0];
  if (!payment) return NextResponse.json({ error: "No payment record for this order." }, { status: 404 });

  // Avoid duplicate charges: an already-resolved order/payment is never re-processed.
  if (order.status === "PAID") {
    return NextResponse.json({ status: "PAID", orderId: order.id, alreadyProcessed: true });
  }
  if (payment.status === "SUCCESS") {
    return NextResponse.json({ status: "PAID", orderId: order.id, alreadyProcessed: true });
  }

  let success: boolean;
  let razorpayPaymentId: string;
  let failureReason: string | null = null;

  if (isMockPayments) {
    const forceFailure = parsed.data.simulateOutcome === "failure";
    const sim = simulateMockPayment(payment.razorpayOrderId, forceFailure);
    success = sim.success;
    razorpayPaymentId = sim.razorpay_payment_id;
    if (!success) failureReason = "Simulated payment decline (demo failure scenario).";
  } else {
    if (!parsed.data.razorpay_payment_id || !parsed.data.razorpay_signature) {
      return NextResponse.json({ error: "Missing Razorpay payment fields." }, { status: 400 });
    }
    const validSignature = verifyRazorpaySignature({
      orderId: payment.razorpayOrderId,
      paymentId: parsed.data.razorpay_payment_id,
      signature: parsed.data.razorpay_signature,
    });
    success = validSignature;
    razorpayPaymentId = parsed.data.razorpay_payment_id;
    if (!success) failureReason = "Signature verification failed.";
  }

  if (success) {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "SUCCESS", razorpayPaymentId, updatedAt: new Date() },
      });
      await tx.order.update({ where: { id: order.id }, data: { status: "PAID" } });
      await tx.cart.update({ where: { id: order.cartId }, data: { status: "CHECKED_OUT" } });
      for (const item of order.items) {
        await tx.inventory.updateMany({
          where: { productId: item.productId },
          data: { stockCount: { decrement: item.quantity } },
        });
      }
    });

    await logAudit({
      merchantId: order.merchantId,
      actor: "SYSTEM",
      action: "PAYMENT_RESULT",
      sessionId: order.sessionId,
      orderId: order.id,
      detail: { status: "SUCCESS", razorpayPaymentId, amountInPaise: order.totalInPaise },
    });

    return NextResponse.json({ status: "PAID", orderId: order.id });
  } else {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason, updatedAt: new Date() },
    });
    await prisma.order.update({ where: { id: order.id }, data: { status: "PAYMENT_FAILED" } });

    await logAudit({
      merchantId: order.merchantId,
      actor: "SYSTEM",
      action: "PAYMENT_FAILED",
      sessionId: order.sessionId,
      orderId: order.id,
      detail: { reason: failureReason, amountInPaise: order.totalInPaise },
    });

    // Order remains unpaid; no automatic retry is triggered. A retry requires
    // an explicit new customer-authorized action (handled by /api/payment/retry).
    return NextResponse.json({ status: "PAYMENT_FAILED", orderId: order.id, reason: failureReason }, { status: 402 });
  }
}
