import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { QueueStatus, PriorityTier } from '../types/index.js';
import { prisma } from '../db/client.js';
import { seedDatabase } from '../db/seed.js';
import { recalculateQueueETAs } from '../modules/queue/queue.service.js';
import { logAuditEvent } from '../modules/audit/audit.service.js';

export async function demoRoutes(fastify: FastifyInstance) {
  // POST /demo/reset — Reset database to initial seed dataset
  fastify.post('/demo/reset', async (_request: FastifyRequest, reply: FastifyReply) => {
    await seedDatabase();
    return reply.send({ message: 'Demo database reset to initial seed state successfully' });
  });

  // POST /demo/trigger-emergency — Scripted demo trigger for emergency priority
  fastify.post(
    '/demo/trigger-emergency',
    async (request: FastifyRequest<{ Querystring: { doctor_id?: string } }>, reply: FastifyReply) => {
      const doctorId = request.query.doctor_id ? parseInt(request.query.doctor_id, 10) : 1;

      const waitingEntry = await prisma.queueEntry.findFirst({
        where: { doctorId, status: QueueStatus.WAITING, priority: { not: PriorityTier.EMERGENCY } },
        include: { patient: true },
        orderBy: { createdAt: 'asc' },
      });

      if (!waitingEntry) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No eligible waiting patient found' } });
      }

      await prisma.$transaction(async (tx) => {
        await tx.queueEntry.update({
          where: { id: waitingEntry.id },
          data: { priority: PriorityTier.EMERGENCY },
        });

        await logAuditEvent(
          {
            actorId: 1,
            actorRole: 'ADMIN',
            action: 'EMERGENCY_FLAGGED',
            targetId: waitingEntry.id,
            reason: 'Demo Scripted Incident: Acute distress emergency escalation at triage',
            metadata: { patientToken: waitingEntry.patient.token },
          },
          tx
        );

        await recalculateQueueETAs(doctorId, 'demo_emergency_escalation', tx);
      });

      return reply.send({
        message: 'Emergency priority incident triggered',
        entry_id: waitingEntry.id,
        patient_token: waitingEntry.patient.token,
      });
    }
  );

  // POST /demo/trigger-no-show — Scripted demo trigger for confirmed no-show
  fastify.post(
    '/demo/trigger-no-show',
    async (request: FastifyRequest<{ Querystring: { doctor_id?: string } }>, reply: FastifyReply) => {
      const doctorId = request.query.doctor_id ? parseInt(request.query.doctor_id, 10) : 1;

      const waitingEntry = await prisma.queueEntry.findFirst({
        where: { doctorId, status: QueueStatus.WAITING },
        include: { patient: true },
        orderBy: { createdAt: 'asc' },
      });

      if (!waitingEntry) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No eligible waiting patient found' } });
      }

      await prisma.$transaction(async (tx) => {
        await tx.queueEntry.update({
          where: { id: waitingEntry.id },
          data: { status: QueueStatus.NO_SHOW },
        });

        await logAuditEvent(
          {
            actorId: 1,
            actorRole: 'ADMIN',
            action: 'NO_SHOW_MARKED',
            targetId: waitingEntry.id,
            reason: 'Demo Scripted Incident: Patient called 3 times without response after grace period',
            metadata: { patientToken: waitingEntry.patient.token },
          },
          tx
        );

        await recalculateQueueETAs(doctorId, 'demo_no_show_confirmed', tx);
      });

      return reply.send({
        message: 'No-show incident confirmed',
        entry_id: waitingEntry.id,
        patient_token: waitingEntry.patient.token,
      });
    }
  );
}
