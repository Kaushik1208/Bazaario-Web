import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/auth";

export async function GET() {
  const ctx = await requireMerchant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { merchantId: ctx.merchant.id },
    include: { items: true, payments: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ orders });
}
