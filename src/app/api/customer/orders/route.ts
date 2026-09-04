import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCustomer } from "@/lib/auth";

export async function GET() {
  const ctx = await requireCustomer();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { customerId: ctx.customer.id, status: { in: ["PAID", "PENDING_PAYMENT", "FAILED"] } },
    include: { merchant: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      totalInPaise: o.totalInPaise,
      createdAt: o.createdAt,
      merchantName: o.merchant.name,
      merchantSlug: o.merchant.slug,
      items: o.items.map((i) => ({ productName: i.productName, quantity: i.quantity, unitPriceInPaise: i.unitPriceInPaise })),
    })),
  });
}
