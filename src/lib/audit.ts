import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

type AuditAction =
  | "user.login"
  | "user.register"
  | "user.logout"
  | "review.create"
  | "review.moderate"
  | "review.flag"
  | "token.generate"
  | "token.validate"
  | "business.create"
  | "business.update"
  | "qrcode.create"
  | "plan.create"
  | "plan.update"
  | "subscription.update";

export async function logAudit(params: {
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: (params.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });
  } catch (error) {
    console.error("[AUDIT_LOG_ERROR]", error);
  }
}

