import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signCustomerSession, getCustomerSessionCookieName } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Enter your name.").max(80),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  phone: z.string().max(20).optional().default(""),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input." }, { status: 400 });
  }
  const { name, email, password, phone } = parsed.data;

  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const customer = await prisma.customer.create({ data: { name, email, passwordHash, phone: phone || null } });

  const token = signCustomerSession({ customerId: customer.id, email: customer.email, name: customer.name });

  const res = NextResponse.json({ customer: { id: customer.id, name: customer.name, email: customer.email } });
  res.cookies.set(getCustomerSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
