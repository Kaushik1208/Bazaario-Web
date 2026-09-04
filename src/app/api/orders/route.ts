import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ merchantSlug: z.string(), sessionId: z.string() });

// Customer-facing order history for a chat session (used by the shop UI to
// show payment result / past orders for this browser session).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = schema.safeParse({
    merchantSlug: searchParams.get("merchantSlug"),
    sessionId: searchParams.get("sessionId"),
  });
  if (!parsed.success) return NextResponse.json({ error: "Missing merchantSlug or sessionId." }, { status: 400 });

  const merchant = await prisma.merchant.findUnique({ where: { slug: parsed.data.merchantSlug } });
  if (!merchant) return NextResponse.json({ error: "Merchant not found." }, { status: 404 });

  const orders = await prisma.order.findMany({
    where: { merchantId: merchant.id, sessionId: parsed.data.sessionId },
    include: { items: true, payments: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ orders });
}
