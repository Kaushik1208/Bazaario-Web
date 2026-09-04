import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signSession, getSessionCookieName } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Enter your name.").max(80),
  storeName: z.string().min(1, "Enter your store name.").max(80),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  phone: z.string().max(20).optional().default(""),
  address: z.string().max(200).optional().default(""),
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "store";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input." }, { status: 400 });
  }
  const { name, storeName, email, password, phone, address } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const baseSlug = slugify(storeName);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.merchant.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const passwordHash = await hashPassword(password);

  const merchant = await prisma.merchant.create({
    data: {
      slug,
      name: storeName,
      description: "",
      phone: phone || null,
      address: address || null,
      users: { create: { email, passwordHash, name, role: "OWNER" } },
    },
    include: { users: true },
  });

  const user = merchant.users[0];

  const token = signSession({
    userId: user.id,
    merchantId: merchant.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const res = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    merchant: { id: merchant.id, name: merchant.name, slug: merchant.slug },
  });
  res.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
