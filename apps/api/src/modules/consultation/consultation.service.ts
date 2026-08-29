import { QueueStatus } from '../../types/index.js';
import { prisma } from '../../db/client.js';
import { recalculateQueueETAs } from '../queue/queue.service.js';
import { calculateUpdatedEMA } from '../prediction/prediction.service.js';
import { logAuditEvent } from '../audit/audit.service.js';

export async function startConsultation(queueEntryId: number, actorDoctorId?: number) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.queueEntry.findUnique({
      where: { id: queueEntryId },
      include: { doctor: true, patient: true },
    });

    if (!entry) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Queue entry not found' };
    }

    if (entry.status !== QueueStatus.WAITING) {
      throw {
        statusCode: 400,
        code: 'INVALID_STATUS',
        message: `Cannot start consultation for entry with status ${entry.status}`,
      };
    }

    // RBAC: If doctor actor provided, must match
    if (actorDoctorId && entry.doctorId !== actorDoctorId) {
      throw {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Doctor cannot start consultation for another doctor’s patient',
      };
    }

    // Check if doctor already has an IN_PROGRESS patient
    const existingInProgress = await tx.queueEntry.findFirst({
      where: { doctorId: entry.doctorId, status: QueueStatus.IN_PROGRESS },
    });

    if (existingInProgress) {
      throw {
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Doctor already has an active consultation in progress',
      };
    }

    const now = new Date();

    // 1. Update queue entry status
    const updatedEntry = await tx.queueEntry.update({
      where: { id: queueEntryId },
      data: { status: QueueStatus.IN_PROGRESS, updatedAt: now },
    });

    // 2. Create Consultation record with server-authoritative startedAt
    const consultation = await tx.consultation.create({
      data: {
        queueEntryId,
        startedAt: now,
      },
    });

    // 3. Recalculate queue ETAs
    await recalculateQueueETAs(entry.doctorId, 'consultation_started', tx);

    return {
      consultationId: consultation.id,
      queueEntryId: updatedEntry.id,
      startedAt: now.toISOString(),
      patientToken: entry.patient.token,
    };
  });
}

export async function endConsultation(queueEntryId: number, actorDoctorId?: number) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.queueEntry.findUnique({
      where: { id: queueEntryId },
      include: {
        doctor: true,
        patient: true,
        consultations: {
          where: { endedAt: null },
          take: 1,
        },
      },
    });

    if (!entry) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Queue entry not found' };
    }

    if (actorDoctorId && entry.doctorId !== actorDoctorId) {
      throw {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Doctor cannot end consultation for another doctor’s patient',
      };
    }

    const activeConsultation = entry.consultations[0];
    if (!activeConsultation) {
      throw {
        statusCode: 400,
        code: 'NO_ACTIVE_CONSULTATION',
        message: 'No active consultation session found for this entry',
      };
    }

    const endedAt = new Date();
    const durationSeconds = Math.max(1, (endedAt.getTime() - activeConsultation.startedAt.getTime()) / 1000);
    const durationMinutes = durationSeconds / 60;

    // 1. Update consultation
    await tx.consultation.update({
      where: { id: activeConsultation.id },
      data: { endedAt, durationSeconds },
    });

    // 2. Update doctor's EMA baseline pace
    const currentEma = entry.doctor.emaMinutes || 12.0;
    const newEma = calculateUpdatedEMA(durationMinutes, currentEma);

    await tx.doctor.update({
      where: { id: entry.doctorId },
      data: { emaMinutes: newEma },
    });

    // 3. Mark queue entry as DONE
    await tx.queueEntry.update({
      where: { id: queueEntryId },
      data: { status: QueueStatus.DONE, updatedAt: endedAt },
    });

    // 4. Log audit event
    await logAuditEvent(
      {
        actorId: actorDoctorId,
        actorRole: 'DOCTOR',
        action: 'CONSULTATION_COMPLETED',
        targetId: queueEntryId,
        reason: `Completed in ${durationMinutes.toFixed(1)} min; updated EMA to ${newEma.toFixed(1)}m`,
        metadata: { durationSeconds, newEmaMinutes: newEma },
      },
      tx
    );

    // 5. Recalculate downstream ETAs for remaining waiting patients
    await recalculateQueueETAs(entry.doctorId, 'consultation_ended', tx);

    return {
      message: 'Consultation completed',
      durationSeconds: Math.round(durationSeconds),
      durationMinutes: Number(durationMinutes.toFixed(1)),
      doctorEmaMinutes: newEma,
    };
  });
}
