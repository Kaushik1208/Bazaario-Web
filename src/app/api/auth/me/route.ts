import { NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";

export async function GET() {
  const ctx = await requireMerchant();
  if (!ctx) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({
    user: { name: ctx.session.name, email: ctx.session.email, role: ctx.session.role },
    merchant: { id: ctx.merchant.id, name: ctx.merchant.name, slug: ctx.merchant.slug, logoEmoji: ctx.merchant.logoEmoji },
  });
}
