import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../db/client.js';

export async function logAuditEvent(
  data: {
    actorId?: number | null;
    actorRole: string;
    action: string;
    targetId: number;
    reason: string;
    metadata?: Record<string, any>;
  },
  tx?: Prisma.TransactionClient
) {
  const client = tx || prisma;
  return client.auditEvent.create({
    data: {
      actorId: data.actorId,
      actorRole: data.actorRole,
      action: data.action,
      targetId: data.targetId,
      reason: data.reason,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    },
  });
}
