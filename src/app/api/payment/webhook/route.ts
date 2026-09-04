import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// Optional real Razorpay webhook receiver (order.paid / payment.failed events).
// Not required when running in mock mode, but included for completeness /
// production readiness.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (secret) {
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
    }
  }

  const event = JSON.parse(raw);
  const razorpayOrderId = event?.payload?.payment?.entity?.order_id;
  if (!razorpayOrderId) return NextResponse.json({ ok: true });

  const payment = await prisma.payment.findFirst({ where: { razorpayOrderId }, include: { order: true } });
  if (!payment) return NextResponse.json({ ok: true });

  await logAudit({
    merchantId: payment.order.merchantId,
    actor: "SYSTEM",
    action: "WEBHOOK_RECEIVED",
    orderId: payment.order.id,
    detail: { event: event.event },
  });

  return NextResponse.json({ ok: true });
}
