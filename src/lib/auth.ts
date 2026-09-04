import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret-change-me";
const COOKIE_NAME = "amc_session";
const CUSTOMER_COOKIE_NAME = "amc_customer_session";

export type SessionPayload = {
  userId: string;
  merchantId: string;
  email: string;
  name: string;
  role: string;
};

export type CustomerSessionPayload = {
  customerId: string;
  email: string;
  name: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const store = cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireMerchant() {
  const session = await getCurrentSession();
  if (!session) return null;
  const merchant = await prisma.merchant.findUnique({ where: { id: session.merchantId } });
  if (!merchant) return null;
  return { session, merchant };
}

// ---------- Customer (shopper) auth — separate cookie/session from the
// merchant staff auth above, so a person can be signed in as both at once
// (e.g. testing their own store while browsing another as a customer). ----------

export function signCustomerSession(payload: CustomerSessionPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyCustomerSession(token: string): CustomerSessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as CustomerSessionPayload;
  } catch {
    return null;
  }
}

export function getCustomerSessionCookieName() {
  return CUSTOMER_COOKIE_NAME;
}

export async function getCurrentCustomerSession(): Promise<CustomerSessionPayload | null> {
  const store = cookies();
  const token = store.get(CUSTOMER_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyCustomerSession(token);
}

export async function requireCustomer() {
  const session = await getCurrentCustomerSession();
  if (!session) return null;
  const customer = await prisma.customer.findUnique({ where: { id: session.customerId } });
  if (!customer) return null;
  return { session, customer };
}
