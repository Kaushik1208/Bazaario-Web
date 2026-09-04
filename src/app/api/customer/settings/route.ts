import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCustomer, hashPassword, verifyPassword } from "@/lib/auth";
import { z } from "zod";

const profileSchema = z.object({
  kind: z.literal("profile"),
  name: z.string().min(1).max(80),
  phone: z.string().max(20).optional().default(""),
});
const notificationsSchema = z.object({
  kind: z.literal("notifications"),
  notifyOrderUpdates: z.boolean(),
  notifyPromotions: z.boolean(),
});
const passwordSchema = z.object({
  kind: z.literal("password"),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
const schema = z.union([profileSchema, notificationsSchema, passwordSchema]);

export async function GET() {
  const ctx = await requireCustomer();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    customer: {
      name: ctx.customer.name,
      email: ctx.customer.email,
      phone: ctx.customer.phone ?? "",
      notifyOrderUpdates: ctx.customer.notifyOrderUpdates,
      notifyPromotions: ctx.customer.notifyPromotions,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireCustomer();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  if (parsed.data.kind === "profile") {
    const customer = await prisma.customer.update({
      where: { id: ctx.customer.id },
      data: { name: parsed.data.name, phone: parsed.data.phone || null },
    });
    return NextResponse.json({ ok: true, customer: { name: customer.name, phone: customer.phone ?? "" } });
  }

  if (parsed.data.kind === "notifications") {
    const customer = await prisma.customer.update({
      where: { id: ctx.customer.id },
      data: {
        notifyOrderUpdates: parsed.data.notifyOrderUpdates,
        notifyPromotions: parsed.data.notifyPromotions,
      },
    });
    return NextResponse.json({
      ok: true,
      customer: { notifyOrderUpdates: customer.notifyOrderUpdates, notifyPromotions: customer.notifyPromotions },
    });
  }

  const { currentPassword, newPassword } = parsed.data;
  const ok = await verifyPassword(currentPassword, ctx.customer.passwordHash);
  if (!ok) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });

  const passwordHash = await hashPassword(newPassword);
  await prisma.customer.update({ where: { id: ctx.customer.id }, data: { passwordHash } });
  return NextResponse.json({ ok: true });
}
