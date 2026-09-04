import { prisma } from "./db";

export type AuditActor = "CUSTOMER" | "MERCHANT_AI_AGENT" | "MERCHANT" | "SYSTEM" | "AGENT_API";

export async function logAudit(params: {
  merchantId: string;
  actor: AuditActor;
  action: string;
  detail: Record<string, unknown>;
  sessionId?: string;
  orderId?: string;
}) {
  return prisma.auditLog.create({
    data: {
      merchantId: params.merchantId,
      actor: params.actor,
      action: params.action,
      detail: JSON.stringify(params.detail),
      sessionId: params.sessionId,
      orderId: params.orderId,
    },
  });
}
