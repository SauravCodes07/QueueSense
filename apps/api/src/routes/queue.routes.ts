import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { QueueStatus, PriorityTier, AvailabilityStatus } from '../types/index.js';
import { prisma } from '../db/client.js';
import { requireDoctorOrStaff, requireStaff } from '../middleware/rbac.js';
import { getOrderedDoctorQueue, recalculateQueueETAs } from '../modules/queue/queue.service.js';
import { transferPatient, calculateDoctorLoadScore } from '../modules/workload/workload.service.js';
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

const registerPatientSchema = z.object({
  name: z.string().min(1, 'Patient name is required'),
  contact: z.string().optional(),
  doctor_id: z.number().int().positive().optional(),
  department_id: z.number().int().positive().optional(),
  priority: z.enum(['ROUTINE', 'URGENT', 'EMERGENCY']).default('ROUTINE'),
});

export async function queueRoutes(fastify: FastifyInstance) {
  // Helper for patient wait time calculation
  const getPatientWaitTimeHandler = async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
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

    let etaClock = '';
    if (activeEntry.etaHighMinutes !== null) {
      const targetDate = new Date(Date.now() + activeEntry.etaHighMinutes * 60 * 1000);
      etaClock = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return reply.send({
      token: patient.token,
      doctor_id: activeEntry.doctorId,
      doctor_name: activeEntry.doctor.name,
      doctor_status: activeEntry.doctor.availabilityStatus,
      status: activeEntry.status,
      your_position: activeEntry.position || (yourIndex + 1),
      people_ahead: peopleAhead,
      now_serving: nowServing,
      eta_low_minutes: activeEntry.etaLowMinutes,
      eta_high_minutes: activeEntry.etaHighMinutes,
      eta_clock: etaClock,
      reason: activeEntry.etaReason,
    });
  };

  // GET /queue/patient/:token & GET /patients/:token/wait-time
  fastify.get('/queue/patient/:token', getPatientWaitTimeHandler);
  fastify.get('/patients/:token/wait-time', getPatientWaitTimeHandler);

  // Helper for doctor queue listing
  const getDoctorQueueHandler = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const doctorId = parseInt(request.params.id, 10);
    if (isNaN(doctorId)) {
      return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'Invalid doctor ID' } });
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
  };

  // GET /queue/doctors/:id & GET /queue/:id
  fastify.get('/queue/doctors/:id', getDoctorQueueHandler);
  fastify.get('/queue/:id', getDoctorQueueHandler);

  // Departments listing: GET /departments & GET /departments/
  const getDepartmentsHandler = async (_req: FastifyRequest, reply: FastifyReply) => {
    const depts = await prisma.department.findMany({
      orderBy: { id: 'asc' },
    });
    return reply.send(depts);
  };
  fastify.get('/departments', getDepartmentsHandler);
  fastify.get('/departments/', getDepartmentsHandler);

  // Doctors listing: GET /doctors & GET /doctors/
  const getDoctorsHandler = async (request: FastifyRequest<{ Querystring: { department_id?: string } }>, reply: FastifyReply) => {
    const deptId = request.query.department_id ? parseInt(request.query.department_id, 10) : undefined;
    const where = deptId ? { departmentId: deptId } : {};
    const doctors = await prisma.doctor.findMany({
      where,
      include: { department: true },
      orderBy: { id: 'asc' },
    });

    const mapped = doctors.map((d) => ({
      id: d.id,
      name: d.name,
      department_id: d.departmentId,
      department_name: d.department.name,
      availability_status: d.availabilityStatus,
      ema_duration_seconds: Math.round((d.emaMinutes || 12) * 60),
    }));

    return reply.send(mapped);
  };
  fastify.get('/doctors', getDoctorsHandler);
  fastify.get('/doctors/', getDoctorsHandler);

  // Single Doctor details: GET /doctors/:id
  fastify.get('/doctors/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const docId = parseInt(request.params.id, 10);
    const doc = await prisma.doctor.findUnique({
      where: { id: docId },
      include: { department: true },
    });
    if (!doc) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Doctor not found' } });
    }
    return reply.send({
      id: doc.id,
      name: doc.name,
      department_id: doc.departmentId,
      department_name: doc.department.name,
      availability_status: doc.availabilityStatus,
      ema_duration_seconds: Math.round((doc.emaMinutes || 12) * 60),
    });
  });

  // Doctor Availability update: POST /doctors/:id/availability
  fastify.post('/doctors/:id/availability', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const docId = parseInt(request.params.id, 10);
    const body = request.body as any;
    const newStatus = body?.status as AvailabilityStatus;

    if (!newStatus) {
      return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'Status is required' } });
    }

    const updated = await prisma.doctor.update({
      where: { id: docId },
      data: { availabilityStatus: newStatus },
    });

    await logAuditEvent({
      actorId: (request as any).user?.userId,
      actorRole: (request as any).user?.role || 'STAFF',
      action: 'AVAILABILITY_CHANGED',
      targetId: docId,
      reason: body?.note || `Availability changed to ${newStatus}`,
      metadata: { newStatus },
    });

    return reply.send({ doctor_id: updated.id, new_status: updated.availabilityStatus });
  });

  // Single Doctor Workload: GET /doctors/:id/workload
  fastify.get('/doctors/:id/workload', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const docId = parseInt(request.params.id, 10);
    const summary = await calculateDoctorLoadScore(docId);
    if (!summary) {
      return reply.send({ load_score: 0, waiting_count: 0, emergency_count: 0, urgent_count: 0 });
    }
    return reply.send({
      doctor_id: summary.doctorId,
      doctor_name: summary.doctorName,
      department_id: summary.departmentId,
      department_name: summary.departmentName,
      load_score: summary.loadScore,
      waiting_count: summary.queueCount,
      emergency_count: 0,
      urgent_count: 0,
    });
  });

  // Patient Registration: POST /patients & POST /patients/
  const registerPatientHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = registerPatientSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0]?.message || 'Invalid body' },
      });
    }

    const { name, contact, doctor_id, department_id, priority } = parseResult.data;
    const count = await prisma.patient.count();
    const token = `P-${String(count + 1).padStart(3, '0')}`;

    // Resolve target doctor
    let targetDoctorId = doctor_id;
    if (!targetDoctorId && department_id) {
      const doc = await prisma.doctor.findFirst({
        where: { departmentId: department_id, availabilityStatus: AvailabilityStatus.AVAILABLE },
      }) || await prisma.doctor.findFirst({
        where: { departmentId: department_id },
      });
      if (doc) targetDoctorId = doc.id;
    }
    if (!targetDoctorId) {
      const firstDoc = await prisma.doctor.findFirst();
      targetDoctorId = firstDoc ? firstDoc.id : 1;
    }

    const result = await prisma.$transaction(async (tx) => {
      const newPatient = await tx.patient.create({
        data: {
          token,
          name,
          phone: contact || null,
        },
      });

      const waitingCount = await tx.queueEntry.count({
        where: { doctorId: targetDoctorId, status: QueueStatus.WAITING },
      });

      const newEntry = await tx.queueEntry.create({
        data: {
          patientId: newPatient.id,
          doctorId: targetDoctorId,
          priority: priority as PriorityTier,
          status: QueueStatus.WAITING,
          position: waitingCount + 1,
        },
      });

      await logAuditEvent(
        {
          actorId: 1,
          actorRole: 'RECEPTION',
          action: 'PATIENT_ENROLLED',
          targetId: newEntry.id,
          reason: `Walk-in registration for ${name} (${token})`,
          metadata: { patientToken: token, priority, doctorId: targetDoctorId },
        },
        tx
      );

      await recalculateQueueETAs(targetDoctorId, 'patient_registered', tx);

      return {
        patient: newPatient,
        entry: newEntry,
      };
    });

    return reply.status(201).send({
      id: result.patient.id,
      token: result.patient.token,
      name: result.patient.name,
      doctor_id: targetDoctorId,
      queue_entry_id: result.entry.id,
    });
  };
  fastify.post('/patients', registerPatientHandler);
  fastify.post('/patients/', registerPatientHandler);

  // POST /queue/:id/priority — Modify priority tier (requires staff role and mandatory reason)
  fastify.post(
    '/queue/:id/priority',
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

      await prisma.$transaction(async (tx) => {
        await tx.queueEntry.update({
          where: { id: entryId },
          data: { priority: priority as PriorityTier },
        });

        await logAuditEvent(
          {
            actorId: request.user?.userId,
            actorRole: request.user?.role || 'STAFF',
            action: priority === 'EMERGENCY' ? 'EMERGENCY_FLAGGED' : 'PRIORITY_CHANGED',
            targetId: entryId,
            reason,
            metadata: { previousPriority: entry.priority, newPriority: priority },
          },
          tx
        );

        await recalculateQueueETAs(entry.doctorId, `priority_changed_${priority.toLowerCase()}`, tx);
      });

      return reply.send({
        message: `Priority updated to ${priority}`,
        entry_id: entryId,
        new_priority: priority,
      });
    }
  );

  // POST /queue/:id/no-show — Confirm no-show
  fastify.post(
    '/queue/:id/no-show',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const entryId = parseInt(request.params.id, 10);
      const reason = (request.body as any)?.reason || 'Staff confirmed patient not present';

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
