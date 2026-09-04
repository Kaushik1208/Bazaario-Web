import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/auth";

export async function GET() {
  const ctx = await requireMerchant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const merchantId = ctx.merchant.id;

  const [paidOrders, totalOrders, aiAssistedPaid, productCount, pendingOrders] = await Promise.all([
    prisma.order.findMany({ where: { merchantId, status: "PAID" }, include: { items: true } }),
    prisma.order.count({ where: { merchantId } }),
    prisma.order.findMany({
      where: { merchantId, status: "PAID", items: { some: { addedVia: { in: ["AI_RECOMMENDATION", "AI_UPSELL", "AI_CROSS_SELL"] } } } },
      include: { items: true },
    }),
    prisma.product.count({ where: { merchantId, isActive: true } }),
    prisma.order.count({ where: { merchantId, status: "PENDING_PAYMENT" } }),
  ]);

  const revenueInPaise = paidOrders.reduce((sum, o) => sum + o.totalInPaise, 0);
  const avgOrderValueInPaise = paidOrders.length > 0 ? Math.round(revenueInPaise / paidOrders.length) : 0;

  const upsellItems = paidOrders.flatMap((o) => o.items).filter((i) => i.addedVia === "AI_UPSELL");
  const crossSellItems = paidOrders.flatMap((o) => o.items).filter((i) => i.addedVia === "AI_CROSS_SELL");
  const aiUpliftInPaise = [...upsellItems, ...crossSellItems].reduce((s, i) => s + i.unitPriceInPaise * i.quantity, 0);

  return NextResponse.json({
    revenueInPaise,
    avgOrderValueInPaise,
    totalOrders,
    paidOrderCount: paidOrders.length,
    pendingOrders,
    productCount,
    aiAssistedOrderCount: aiAssistedPaid.length,
    aiUpliftInPaise,
    upsellAcceptedCount: upsellItems.length,
    crossSellAcceptedCount: crossSellItems.length,
  });
}
