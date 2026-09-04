import { NextResponse } from "next/server";
import { getCustomerSessionCookieName } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(getCustomerSessionCookieName(), "", { path: "/", maxAge: 0 });
  return res;
}
