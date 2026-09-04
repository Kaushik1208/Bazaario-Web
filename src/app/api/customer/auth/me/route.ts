import { NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth";

export async function GET() {
  const ctx = await requireCustomer();
  if (!ctx) return NextResponse.json({ customer: null }, { status: 200 });
  return NextResponse.json({
    customer: { name: ctx.customer.name, email: ctx.customer.email },
  });
}
