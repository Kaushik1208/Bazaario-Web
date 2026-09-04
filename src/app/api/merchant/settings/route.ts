import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMerchant, hashPassword, verifyPassword } from "@/lib/auth";
import { z } from "zod";

const profileSchema = z.object({
  kind: z.literal("profile"),
  name: z.string().min(1).max(80),
  storeName: z.string().min(1).max(80),
  description: z.string().max(300).optional().default(""),
  logoEmoji: z.string().min(1).max(8),
  phone: z.string().max(20).optional().default(""),
  address: z.string().max(200).optional().default(""),
  // Data-URLs (base64) or hosted URLs — capped generously, validated loosely
  // since this is a hackathon-scope upload path (see Settings > Business profile).
  logoImageUrl: z.string().max(2_000_000).optional().default(""),
  coverImageUrl: z.string().max(2_000_000).optional().default(""),
});

const passwordSchema = z.object({
  kind: z.literal("password"),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const schema = z.union([profileSchema, passwordSchema]);

export async function GET() {
  const ctx = await requireMerchant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: ctx.session.userId } });
  return NextResponse.json({
    user: { name: user?.name ?? ctx.session.name, email: ctx.session.email, role: ctx.session.role },
    merchant: {
      name: ctx.merchant.name,
      slug: ctx.merchant.slug,
      description: ctx.merchant.description ?? "",
      logoEmoji: ctx.merchant.logoEmoji,
      phone: ctx.merchant.phone ?? "",
      address: ctx.merchant.address ?? "",
      logoImageUrl: ctx.merchant.logoImageUrl ?? "",
      coverImageUrl: ctx.merchant.coverImageUrl ?? "",
      isDemo: ctx.merchant.isDemo,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireMerchant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  if (parsed.data.kind === "profile") {
    const { name, storeName, description, logoEmoji, phone, address, logoImageUrl, coverImageUrl } = parsed.data;
    await prisma.user.update({ where: { id: ctx.session.userId }, data: { name } });
    const merchant = await prisma.merchant.update({
      where: { id: ctx.merchant.id },
      data: {
        name: storeName,
        description,
        logoEmoji,
        phone: phone || null,
        address: address || null,
        logoImageUrl: logoImageUrl || null,
        coverImageUrl: coverImageUrl || null,
      },
    });
    return NextResponse.json({
      ok: true,
      merchant: {
        name: merchant.name,
        logoEmoji: merchant.logoEmoji,
        phone: merchant.phone ?? "",
        address: merchant.address ?? "",
        logoImageUrl: merchant.logoImageUrl ?? "",
        coverImageUrl: merchant.coverImageUrl ?? "",
      },
    });
  }

  // Password change
  const { currentPassword, newPassword } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: ctx.session.userId } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return NextResponse.json({ ok: true });
}
