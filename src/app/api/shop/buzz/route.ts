import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStoreBuzz } from "@/lib/ai/buzz";

export async function GET(req: NextRequest) {
  const merchantSlug = req.nextUrl.searchParams.get("merchantSlug");
  if (!merchantSlug) return NextResponse.json({ error: "merchantSlug is required." }, { status: 400 });

  const merchant = await prisma.merchant.findUnique({ where: { slug: merchantSlug } });
  if (!merchant) return NextResponse.json({ error: "Merchant not found." }, { status: 404 });

  const buzz = await getStoreBuzz(merchant.id);
  return NextResponse.json({ buzz });
}
