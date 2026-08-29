import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireDoctorOrStaff } from '../middleware/rbac.js';
import { startConsultation, endConsultation } from '../modules/consultation/consultation.service.js';

export async function consultationRoutes(fastify: FastifyInstance) {
  // POST /consultations/:queueEntryId/start — Start consultation
  fastify.post<{ Params: { queueEntryId: string } }>(
    '/consultations/:queueEntryId/start',
    { preHandler: [requireDoctorOrStaff()] },
    async (request, reply) => {
      const queueEntryId = parseInt(request.params.queueEntryId, 10);
      if (isNaN(queueEntryId)) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'Invalid queueEntryId' } });
      }

      try {
        const actorDoctorId = request.user?.role === 'DOCTOR' ? request.user.doctorId || undefined : undefined;
        const res = await startConsultation(queueEntryId, actorDoctorId);
        return reply.send(res);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          error: { code: err.code || 'INTERNAL_ERROR', message: err.message || 'Consultation start failed' },
        });
      }
    }
  );

  // POST /consultations/:queueEntryId/end — End consultation
  fastify.post<{ Params: { queueEntryId: string } }>(
    '/consultations/:queueEntryId/end',
    { preHandler: [requireDoctorOrStaff()] },
    async (request, reply) => {
      const queueEntryId = parseInt(request.params.queueEntryId, 10);
      if (isNaN(queueEntryId)) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'Invalid queueEntryId' } });
      }

      try {
        const actorDoctorId = request.user?.role === 'DOCTOR' ? request.user.doctorId || undefined : undefined;
        const res = await endConsultation(queueEntryId, actorDoctorId);
        return reply.send(res);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          error: { code: err.code || 'INTERNAL_ERROR', message: err.message || 'Consultation completion failed' },
        });
      }
    }
  );
}
