import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { ActorType } from "@prisma/client";

export interface AuditLogParams {
  action: string;
  actorType: ActorType;
  actorId: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(params: AuditLogParams): Promise<void> {
  const { action, actorType, actorId, resourceType, resourceId, metadata } =
    params;

  await prisma.auditLog.create({
    data: {
      action,
      actorType,
      actorId,
      resourceType,
      resourceId,
      metadata: metadata
        ? (metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });
}
