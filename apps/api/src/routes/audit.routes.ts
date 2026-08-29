import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db/client.js';
import { requireAdmin, requireStaff } from '../middleware/rbac.js';

export async function auditRoutes(fastify: FastifyInstance) {
  // GET /audit/events — Immutable audit log
  fastify.get(
    '/audit/events',
    { preHandler: [requireStaff()] },
    async (request: FastifyRequest<{ Querystring: { limit?: string; action?: string } }>, reply: FastifyReply) => {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;
      const action = request.query.action;

      const where = action ? { action } : {};
      const events = await prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const formatted = events.map((e) => ({
        id: e.id,
        actor_id: e.actorId,
        actor_role: e.actorRole,
        actor_name: e.actorRole === 'ADMIN' ? 'Admin Staff' : e.actorRole === 'DOCTOR' ? 'Doctor' : 'Reception Staff',
        action_type: e.action,
        entity_type: 'queue_entry',
        entity_id: e.targetId,
        reason: e.reason,
        metadata: e.metadata ? JSON.parse(e.metadata) : { reason: e.reason },
        created_at: e.createdAt.toISOString(),
      }));

      return reply.send(formatted);
    }
  );
}
