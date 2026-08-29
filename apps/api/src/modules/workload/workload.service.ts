import { QueueStatus, PriorityTier } from '../../types/index.js';
import { prisma } from '../../db/client.js';
import { config } from '../../config/env.js';
import { recalculateQueueETAs } from '../queue/queue.service.js';
import { logAuditEvent } from '../audit/audit.service.js';

export async function calculateDoctorLoadScore(doctorId: number) {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      department: true,
      queueEntries: {
        where: { status: { in: [QueueStatus.WAITING, QueueStatus.IN_PROGRESS] } },
        include: {
          consultations: {
            where: { endedAt: null },
            take: 1,
          },
        },
      },
    },
  });

  if (!doctor) return null;

  const paceMinutes = doctor.emaMinutes || doctor.department?.defaultConsultationMinutes || 12.0;
  const waitingEntries = doctor.queueEntries.filter((e) => e.status === QueueStatus.WAITING);
  const inProgressEntry = doctor.queueEntries.find((e) => e.status === QueueStatus.IN_PROGRESS);

  const queueCount = waitingEntries.length + (inProgressEntry ? 1 : 0);
  const totalPredictedMinutes = waitingEntries.length * paceMinutes;

  let remainingCurrentMinutes = 0;
  if (inProgressEntry) {
    const consultation = inProgressEntry.consultations[0];
    if (consultation) {
      const elapsedMinutes = (Date.now() - consultation.startedAt.getTime()) / (60 * 1000);
      remainingCurrentMinutes = Math.max(1, Math.round(paceMinutes - elapsedMinutes));
    } else {
      remainingCurrentMinutes = paceMinutes;
    }
  }

  const priorityBonus = waitingEntries.reduce((acc, e) => {
    if (e.priority === PriorityTier.EMERGENCY) return acc + 10;
    if (e.priority === PriorityTier.URGENT) return acc + 5;
    return acc;
  }, 0);

  const loadScore = Number(
    (
      config.WEIGHT_COUNT * queueCount +
      config.WEIGHT_DURATION * totalPredictedMinutes +
      config.WEIGHT_REMAINING * remainingCurrentMinutes +
      config.WEIGHT_PRIORITY * priorityBonus
    ).toFixed(1)
  );

  return {
    doctorId: doctor.id,
    doctorName: doctor.name,
    departmentId: doctor.departmentId,
    departmentName: doctor.department.name,
    loadScore,
    queueCount,
    totalPredictedMinutes: Math.round(totalPredictedMinutes),
    remainingCurrentMinutes: Math.round(remainingCurrentMinutes),
    priorityBonus,
    availabilityStatus: doctor.availabilityStatus,
  };
}

export async function getAllDoctorWorkloads(departmentId?: number) {
  const query = departmentId ? { departmentId } : {};
  const doctors = await prisma.doctor.findMany({ where: query });
  const scores = await Promise.all(doctors.map((d) => calculateDoctorLoadScore(d.id)));
  return scores.filter((s) => s !== null);
}

export async function getIntakeRecommendation(departmentId: number, excludeDoctorId?: number) {
  const workloads = await getAllDoctorWorkloads(departmentId);
  const compatible = workloads.filter(
    (w) => w && w.availabilityStatus === 'AVAILABLE' && (!excludeDoctorId || w.doctorId !== excludeDoctorId)
  );

  if (compatible.length === 0) return { recommendation: null, reason: 'No available clinicians in this department' };

  compatible.sort((a, b) => a!.loadScore - b!.loadScore);
  const top = compatible[0]!;

  return {
    recommendation: {
      doctorId: top.doctorId,
      doctorName: top.doctorName,
      loadScore: top.loadScore,
      departmentName: top.departmentName,
    },
  };
}

export async function transferPatient(
  queueEntryId: number,
  targetDoctorId: number,
  reason: string,
  actorId?: number,
  actorRole = 'RECEPTION'
) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.queueEntry.findUnique({
      where: { id: queueEntryId },
      include: { patient: true, doctor: true },
    });

    if (!entry) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Queue entry not found' };
    }

    if (entry.status !== QueueStatus.WAITING) {
      throw {
        statusCode: 400,
        code: 'INVALID_STATUS',
        message: 'Only waiting patients can be transferred',
      };
    }

    if (entry.doctorId === targetDoctorId) {
      throw {
        statusCode: 400,
        code: 'INVALID_TARGET',
        message: 'Cannot transfer patient to the same doctor',
      };
    }

    const fromDoctorId = entry.doctorId;
    const now = new Date();

    // 1. Mark existing entry as TRANSFERRED
    await tx.queueEntry.update({
      where: { id: queueEntryId },
      data: { status: QueueStatus.TRANSFERRED, updatedAt: now },
    });

    // 2. Create new QueueEntry under target doctor preserving priority tier
    const newEntry = await tx.queueEntry.create({
      data: {
        patientId: entry.patientId,
        doctorId: targetDoctorId,
        priority: entry.priority,
        status: QueueStatus.WAITING,
        createdAt: now,
      },
    });

    // 3. Immutable audit log write
    await logAuditEvent(
      {
        actorId,
        actorRole,
        action: 'PATIENT_TRANSFERRED',
        targetId: queueEntryId,
        reason,
        metadata: {
          fromDoctorId,
          toDoctorId: targetDoctorId,
          patientToken: entry.patient.token,
          newEntryId: newEntry.id,
        },
      },
      tx
    );

    // 4. Recalculate both doctor queues atomically
    await recalculateQueueETAs(fromDoctorId, 'patient_transferred_out', tx);
    await recalculateQueueETAs(targetDoctorId, 'patient_transferred_in', tx);

    return {
      message: 'Patient transferred successfully',
      fromDoctorId,
      toDoctorId: targetDoctorId,
      newEntryId: newEntry.id,
      patientToken: entry.patient.token,
    };
  });
}
