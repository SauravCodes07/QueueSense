import { Prisma } from '@prisma/client';
import { QueueStatus, PriorityTier } from '../../types/index.js';
import { prisma } from '../../db/client.js';
import { getPredictedDurationMinutes, computeEtaRange } from '../prediction/prediction.service.js';
import { eventBus } from '../../events/bus.js';
import { config } from '../../config/env.js';

export const PRIORITY_RANK: Record<PriorityTier, number> = {
  EMERGENCY: 1,
  URGENT: 2,
  ROUTINE: 3,
};

/**
 * Get ordered active queue for a doctor.
 * IN_PROGRESS is always #1.
 * WAITING patients ordered by Priority Tier (EMERGENCY -> URGENT -> ROUTINE) and FIFO (createdAt).
 */
export async function getOrderedDoctorQueue(doctorId: number, tx?: Prisma.TransactionClient) {
  const client = tx || prisma;
  const entries = await client.queueEntry.findMany({
    where: {
      doctorId,
      status: { in: [QueueStatus.IN_PROGRESS, QueueStatus.WAITING] },
    },
    include: {
      patient: true,
      doctor: true,
      consultations: {
        where: { endedAt: null },
        take: 1,
      },
    },
    orderBy: [{ createdAt: 'asc' }],
  });

  // Sort deterministically
  entries.sort((a, b) => {
    // 1. IN_PROGRESS comes first
    if (a.status === QueueStatus.IN_PROGRESS && b.status !== QueueStatus.IN_PROGRESS) return -1;
    if (b.status === QueueStatus.IN_PROGRESS && a.status !== QueueStatus.IN_PROGRESS) return 1;

    // 2. Priority tier (EMERGENCY=1, URGENT=2, ROUTINE=3)
    const rankDiff = PRIORITY_RANK[a.priority as PriorityTier] - PRIORITY_RANK[b.priority as PriorityTier];
    if (rankDiff !== 0) return rankDiff;

    // 3. FIFO
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return entries;
}

/**
 * Recalculate and update cached ETAs for all waiting patients in a doctor's queue.
 * Formula: ETA(patient) = remaining current consultation + sum of predicted durations of all patients ahead
 */
export async function recalculateQueueETAs(
  doctorId: number,
  reason: string,
  tx?: Prisma.TransactionClient
) {
  const client = tx || prisma;
  const orderedEntries = await getOrderedDoctorQueue(doctorId, client);
  const predictedPaceMinutes = await getPredictedDurationMinutes(doctorId);

  let cumulativeWaitMinutes = 0;

  // 1. Check if there is an in-progress consultation
  const inProgressEntry = orderedEntries.find((e) => e.status === QueueStatus.IN_PROGRESS);
  if (inProgressEntry) {
    const activeConsultation = inProgressEntry.consultations[0];
    if (activeConsultation) {
      const elapsedMinutes = (Date.now() - activeConsultation.startedAt.getTime()) / (60 * 1000);
      const remainingMinutes = Math.max(1, Math.round(predictedPaceMinutes - elapsedMinutes));
      cumulativeWaitMinutes += remainingMinutes;
    } else {
      cumulativeWaitMinutes += predictedPaceMinutes;
    }
  }

  // 2. Iterate waiting entries and update ETAs
  for (let i = 0; i < orderedEntries.length; i++) {
    const entry = orderedEntries[i];
    const newPosition = i + 1;

    if (entry.status === QueueStatus.IN_PROGRESS) {
      await client.queueEntry.update({
        where: { id: entry.id },
        data: {
          position: 1,
          etaLowMinutes: 0,
          etaHighMinutes: 0,
          etaReason: reason,
        },
      });
      continue;
    }

    const patientEtaMinutes = cumulativeWaitMinutes;
    const { lowMinutes, highMinutes, etaClock } = computeEtaRange(patientEtaMinutes);

    const oldLowMinutes = entry.etaLowMinutes || 0;
    const delta = Math.abs(lowMinutes - oldLowMinutes);

    await client.queueEntry.update({
      where: { id: entry.id },
      data: {
        position: newPosition,
        etaLowMinutes: lowMinutes,
        etaHighMinutes: highMinutes,
        etaReason: reason,
      },
    });

    // Check threshold for notifications
    if (entry.patient) {
      eventBus.emitPatientETAUpdated({
        patientToken: entry.patient.token,
        doctorId,
        etaLowMinutes: lowMinutes,
        etaHighMinutes: highMinutes,
        deltaMinutes: delta,
        reason,
      });
    }

    cumulativeWaitMinutes += predictedPaceMinutes;
  }

  eventBus.emitQueueUpdated({
    doctorId,
    reason,
    timestamp: new Date().toISOString(),
  });

  return orderedEntries;
}
