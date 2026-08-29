import { prisma } from '../../db/client.js';

export const EMA_ALPHA = 0.3;

/**
 * Update doctor's EMA pace from a completed consultation duration.
 * Formula per Section 5.1: new_avg = 0.3 * last_duration + 0.7 * old_avg
 */
export function calculateUpdatedEMA(
  lastDurationMinutes: number,
  currentEmaMinutes: number,
  alpha = EMA_ALPHA
): number {
  return Number((alpha * lastDurationMinutes + (1 - alpha) * currentEmaMinutes).toFixed(2));
}

/**
 * Predict duration in minutes for a doctor's next patient consultation.
 * Falls back to department default if doctor has no historical EMA.
 */
export async function getPredictedDurationMinutes(doctorId: number): Promise<number> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { department: true },
  });

  if (!doctor) return 12.0;

  if (doctor.emaMinutes && doctor.emaMinutes > 0) {
    return doctor.emaMinutes;
  }

  return doctor.department?.defaultConsultationMinutes || 12.0;
}

/**
 * Compute patient-facing ETA range (e.g. 25–35 min) and expected completion clock string.
 * Never exposes false precision.
 */
export function computeEtaRange(
  centralMinutes: number,
  spreadFraction = 0.20,
  minSpreadMinutes = 2
): { lowMinutes: number; highMinutes: number; etaClock: string } {
  const spread = Math.max(minSpreadMinutes, Math.round(centralMinutes * spreadFraction));
  const lowMinutes = Math.max(1, Math.round(centralMinutes - spread));
  const highMinutes = Math.round(centralMinutes + spread);

  const completionDate = new Date(Date.now() + centralMinutes * 60 * 1000);
  const etaClock = completionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return { lowMinutes, highMinutes, etaClock };
}
