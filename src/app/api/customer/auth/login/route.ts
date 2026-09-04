import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signCustomerSession, getCustomerSessionCookieName } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password format." }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

  const ok = await verifyPassword(password, customer.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

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
