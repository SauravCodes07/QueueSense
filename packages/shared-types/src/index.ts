/**
 * QueueSense — Shared Types & DTOs
 * Authoritative interface definitions shared between apps/api and apps/web
 */

export type UserRole = 'ADMIN' | 'RECEPTION' | 'DOCTOR' | 'PATIENT';

export type PriorityTier = 'ROUTINE' | 'URGENT' | 'EMERGENCY';

export type QueueStatus = 'WAITING' | 'IN_PROGRESS' | 'DONE' | 'NO_SHOW' | 'CANCELLED' | 'TRANSFERRED';

export interface UserDTO {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  doctorId?: number;
}

export interface DepartmentDTO {
  id: number;
  name: string;
  defaultConsultationMinutes: number;
}

export interface DoctorDTO {
  id: number;
  name: string;
  departmentId: number;
  departmentName?: string;
  emaMinutes: number;
  updatedAt: string;
  availabilityStatus?: string;
}

export interface QueueEntryDTO {
  id: number;
  patientId: number;
  patientName?: string;
  patientToken: string;
  doctorId: number;
  priority: PriorityTier;
  status: QueueStatus;
  position: number;
  softFlaggedAt?: string | null;
  etaLowMinutes?: number | null;
  etaHighMinutes?: number | null;
  etaClock?: string | null;
  etaReason?: string | null;
  createdAt: string;
}

export interface ConsultationDTO {
  id: number;
  queueEntryId: number;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds?: number | null;
}

export interface AuditEventDTO {
  id: number;
  actorId?: number | null;
  actorRole: string;
  action: string;
  targetId: number;
  reason: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface PatientWaitViewDTO {
  token: string;
  patientName?: string;
  nowServing: string | null;
  yourPosition: number | null;
  peopleAhead: number;
  etaLowMinutes: number | null;
  etaHighMinutes: number | null;
  etaClock: string | null;
  doctorName: string;
  doctorStatus: string;
  status: QueueStatus;
  reason: string | null;
}

export interface WorkloadScoreDTO {
  doctorId: number;
  doctorName: string;
  departmentId: number;
  loadScore: number;
  queueCount: number;
  totalPredictedMinutes: number;
  remainingCurrentMinutes: number;
  priorityBonus: number;
}

export interface WorkloadRecommendationDTO {
  recommendation: {
    doctorId: number;
    doctorName: string;
    loadScore: number;
    departmentName: string;
  } | null;
  reason?: string;
}
