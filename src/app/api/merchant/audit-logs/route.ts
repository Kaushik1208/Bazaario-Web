import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/auth";

export async function GET() {
  const ctx = await requireMerchant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const logs = await prisma.auditLog.findMany({
    where: { merchantId: ctx.merchant.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ logs });
}
