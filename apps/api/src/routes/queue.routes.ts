import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { QueueStatus, PriorityTier } from '../types/index.js';
import { prisma } from '../db/client.js';
import { requireDoctorOrStaff, requireStaff } from '../middleware/rbac.js';
import { getOrderedDoctorQueue, recalculateQueueETAs } from '../modules/queue/queue.service.js';
import { transferPatient } from '../modules/workload/workload.service.js';
import { logAuditEvent } from '../modules/audit/audit.service.js';

const prioritySchema = z.object({
  priority: z.enum(['ROUTINE', 'URGENT', 'EMERGENCY']),
  reason: z.string().min(1, 'Reason is mandatory for priority modifications'),
});

const transferSchema = z.object({
  to_doctor_id: z.number().int().positive(),
  reason: z.string().min(1, 'Reason is mandatory for patient transfers'),
});

const joinQueueSchema = z.object({
  doctor_id: z.number().int().positive(),
  patient_token: z.string().min(1),
  priority: z.enum(['ROUTINE', 'URGENT', 'EMERGENCY']).default('ROUTINE'),
});

const cancelSchema = z.object({
  reason: z.string().optional(),
});

export async function queueRoutes(fastify: FastifyInstance) {
  // GET /queue/patient/:token — Patient live wait tracker contract
  fastify.get('/queue/patient/:token', async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
    const { token } = request.params;
    const patient = await prisma.patient.findUnique({
      where: { token },
      include: {
        queueEntries: {
          where: { status: { in: [QueueStatus.WAITING, QueueStatus.IN_PROGRESS] } },
          include: {
            doctor: { include: { department: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!patient || patient.queueEntries.length === 0) {
      return reply.status(404).send({
        error: { code: 'NOT_IN_QUEUE', message: 'No active queue entry found for this token' },
      });
    }

    const activeEntry = patient.queueEntries[0];
    const orderedQueue = await getOrderedDoctorQueue(activeEntry.doctorId);

    const nowServing = orderedQueue.find((e) => e.status === QueueStatus.IN_PROGRESS)?.patient?.token || null;
    const yourIndex = orderedQueue.findIndex((e) => e.id === activeEntry.id);
    const peopleAhead = Math.max(0, yourIndex);

    let etaClock = null;
    if (activeEntry.etaLowMinutes !== null && activeEntry.etaHighMinutes !== null) {
      const avgMinutes = (activeEntry.etaLowMinutes + activeEntry.etaHighMinutes) / 2;
      const turnTime = new Date(Date.now() + avgMinutes * 60 * 1000);
      etaClock = turnTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return reply.send({
      token: patient.token,
      patient_name: patient.name,
      now_serving: nowServing,
      your_position: activeEntry.position,
      people_ahead: peopleAhead,
      eta_low_minutes: activeEntry.etaLowMinutes,
      eta_high_minutes: activeEntry.etaHighMinutes,
      eta_clock: etaClock,
      doctor_name: activeEntry.doctor.name,
      doctor_status: activeEntry.doctor.availabilityStatus,
      status: activeEntry.status,
      reason: activeEntry.etaReason,
    });
  });

  // GET /queue/doctors/:id — Full ordered queue for doctor
  fastify.get(
    '/queue/doctors/:id',
    { preHandler: [requireDoctorOrStaff()] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const doctorId = parseInt(request.params.id, 10);
      if (isNaN(doctorId)) {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'Invalid doctor ID' } });
      }

      // RBAC: Doctors can only view their own queue
      if (request.user?.role === 'DOCTOR' && request.user.doctorId && request.user.doctorId !== doctorId) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Doctors can only view their own queue' },
        });
      }

      const entries = await getOrderedDoctorQueue(doctorId);
      const mapped = entries.map((entry, idx) => ({
        id: entry.id,
        token: entry.patient?.token || '?',
        patient_name: entry.patient?.name || 'Walk-In',
        position: idx + 1,
        status: entry.status,
        priority: entry.priority,
        eta_low_minutes: entry.etaLowMinutes,
        eta_high_minutes: entry.etaHighMinutes,
        eta_reason: entry.etaReason,
        joined_at: entry.createdAt.toISOString(),
      }));

      return reply.send(mapped);
    }
  );

  // POST /queue/:id/priority — Modify priority tier (requires staff role and mandatory reason)
  fastify.post(
    '/queue/:id/priority',
    { preHandler: [requireStaff()] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const entryId = parseInt(request.params.id, 10);
      const parseResult = prioritySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0]?.message || 'Invalid body' },
        });
      }

      const { priority, reason } = parseResult.data;

      const entry = await prisma.queueEntry.findUnique({
        where: { id: entryId },
        include: { patient: true },
      });

      if (!entry) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Queue entry not found' } });
      }

      if (entry.status !== QueueStatus.WAITING) {
        return reply.status(400).send({
          error: { code: 'INVALID_STATUS', message: 'Cannot modify priority of an in-progress or completed patient' },
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.queueEntry.update({
          where: { id: entryId },
          data: { priority: priority as PriorityTier },
        });

        await logAuditEvent(
          {
            actorId: request.user?.userId,
            actorRole: request.user?.role || 'ADMIN',
            action: priority === 'EMERGENCY' ? 'EMERGENCY_FLAGGED' : 'PRIORITY_CHANGED',
            targetId: entryId,
            reason,
            metadata: {
              oldPriority: entry.priority,
              newPriority: priority,
              patientToken: entry.patient.token,
            },
          },
          tx
        );

        await recalculateQueueETAs(entry.doctorId, `priority_${priority.toLowerCase()}`, tx);
      });

      return reply.send({
        message: 'Priority updated successfully',
        entry_id: entryId,
        new_priority: priority,
      });
    }
  );

  // POST /queue/:id/no-show/confirm — Human-confirmed no-show
  fastify.post(
    '/queue/:id/no-show/confirm',
    { preHandler: [requireDoctorOrStaff()] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const entryId = parseInt(request.params.id, 10);
      const reason = (request.body as any)?.reason || 'Staff confirmed patient no-show';

      const entry = await prisma.queueEntry.findUnique({
        where: { id: entryId },
        include: { patient: true },
      });

      if (!entry) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Queue entry not found' } });
      }

      await prisma.$transaction(async (tx) => {
        await tx.queueEntry.update({
          where: { id: entryId },
          data: { status: QueueStatus.NO_SHOW },
        });

        await logAuditEvent(
          {
            actorId: request.user?.userId,
            actorRole: request.user?.role || 'STAFF',
            action: 'NO_SHOW_MARKED',
            targetId: entryId,
            reason,
            metadata: { patientToken: entry.patient.token },
          },
          tx
        );

        await recalculateQueueETAs(entry.doctorId, 'no_show_confirmed', tx);
      });

      return reply.send({
        message: 'No-show confirmed. Downstream ETAs recalculated.',
        entry_id: entryId,
      });
    }
  );

  // POST /queue/:id/transfer — Staff-confirmed patient transfer between clinicians
  fastify.post(
    '/queue/:id/transfer',
    { preHandler: [requireStaff()] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const entryId = parseInt(request.params.id, 10);
      const parseResult = transferSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0]?.message || 'Invalid transfer payload' },
        });
      }

      const { to_doctor_id, reason } = parseResult.data;
      const res = await transferPatient(entryId, to_doctor_id, reason, request.user?.userId, request.user?.role);
      return reply.send(res);
    }
  );

  // POST /queue/join — Walk-in patient joins doctor queue
  fastify.post('/queue/join', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = joinQueueSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid queue join parameters' },
      });
    }

    const { doctor_id, patient_token, priority } = parseResult.data;

    const patient = await prisma.patient.findUnique({
      where: { token: patient_token },
    });

    if (!patient) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Patient not found' } });
    }

    // Idempotency check: prevent duplicate active joins
    const existing = await prisma.queueEntry.findFirst({
      where: {
        patientId: patient.id,
        status: { in: [QueueStatus.WAITING, QueueStatus.IN_PROGRESS] },
      },
    });

    if (existing) {
      return reply.status(409).send({
        error: { code: 'ALREADY_IN_QUEUE', message: 'Patient is already in an active queue' },
      });
    }

    const entry = await prisma.$transaction(async (tx) => {
      const newEntry = await tx.queueEntry.create({
        data: {
          patientId: patient.id,
          doctorId: doctor_id,
          priority: priority as PriorityTier,
          status: QueueStatus.WAITING,
        },
      });

      await recalculateQueueETAs(doctor_id, 'patient_joined', tx);
      return newEntry;
    });

    const updated = await prisma.queueEntry.findUnique({ where: { id: entry.id } });

    return reply.status(201).send({
      entry_id: entry.id,
      token: patient.token,
      queue_sequence: updated?.position || 1,
      eta_low_minutes: updated?.etaLowMinutes || 10,
      eta_high_minutes: updated?.etaHighMinutes || 20,
    });
  });

  // POST /queue/:id/cancel — Cancel queue entry
  fastify.post('/queue/:id/cancel', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const entryId = parseInt(request.params.id, 10);
    const reason = (request.body as any)?.reason || 'Patient cancelled queue registration';

    const entry = await prisma.queueEntry.findUnique({
      where: { id: entryId },
      include: { patient: true },
    });

    if (!entry) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Queue entry not found' } });
    }

    await prisma.$transaction(async (tx) => {
      await tx.queueEntry.update({
        where: { id: entryId },
        data: { status: QueueStatus.CANCELLED },
      });

      await logAuditEvent(
        {
          actorId: request.user?.userId,
          actorRole: request.user?.role || 'PATIENT',
          action: 'QUEUE_CANCELLED',
          targetId: entryId,
          reason,
          metadata: { patientToken: entry.patient.token },
        },
        tx
      );

      await recalculateQueueETAs(entry.doctorId, 'patient_cancelled', tx);
    });

    return reply.send({
      message: 'Queue entry cancelled successfully',
      entry_id: entryId,
    });
  });
}
