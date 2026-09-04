import Razorpay from "razorpay";
import crypto from "crypto";

// The application always talks to this thin wrapper, never to the LLM.
// If real Razorpay Test Mode keys are configured, it uses the actual SDK.
// Otherwise it falls back to a deterministic mock so the full payment flow
// (order creation -> success/failure -> webhook) can be demoed without keys.

const hasRealKeys = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

let client: Razorpay | null = null;
if (hasRealKeys) {
  client = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

export const isMockPayments = !hasRealKeys;

export async function createRazorpayOrder(params: {
  amountInPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  if (client) {
    return client.orders.create({
      amount: params.amountInPaise,
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes,
    });
  }
  // Mock order — mirrors the shape of a real Razorpay order object closely
  // enough for the frontend checkout widget / verification flow to work.
  return {
    id: `order_mock_${crypto.randomBytes(8).toString("hex")}`,
    entity: "order",
    amount: params.amountInPaise,
    currency: "INR",
    receipt: params.receipt,
    status: "created",
    notes: params.notes ?? {},
  };
}

export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET || "mock-secret";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  return expected === params.signature;
}

// Used only by the mock checkout UI to simulate Razorpay's client-side
// checkout.js completing with a success or (intentionally, for the demo)
// a failure — no real money and no real gateway involved when keys are absent.
export function simulateMockPayment(orderId: string, forceFailure: boolean) {
  const paymentId = `pay_mock_${crypto.randomBytes(8).toString("hex")}`;
  const secret = process.env.RAZORPAY_KEY_SECRET || "mock-secret";
  const signature = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return {
    success: !forceFailure,
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: forceFailure ? "invalid_signature" : signature,
  };
}
