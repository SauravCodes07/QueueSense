export type UserRole = 'PATIENT' | 'DOCTOR' | 'RECEPTION' | 'ADMIN';

export type AvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'ON_BREAK' | 'UNAVAILABLE' | 'OFFLINE';

export type QueueStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'TRANSFERRED';

export type PriorityLevel = 'ROUTINE' | 'URGENT' | 'EMERGENCY';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  doctor_id?: number;
}

export interface Department {
  id: number;
  name: string;
}

export interface Doctor {
  id: number;
  name: string;
  department_id: number;
  availability_status: AvailabilityStatus;
  ema_duration_seconds?: number;
}

export interface QueueItem {
  id: number;
  token: string;
  patient_name?: string;
  position: number;
  status: QueueStatus;
  priority: PriorityLevel;
  eta_low_minutes?: number | null;
  eta_high_minutes?: number | null;
  eta_clock?: string | null;
  eta_reason?: string | null;
  joined_at?: string | null;
}

export interface WorkloadSummary {
  doctor_id: number;
  load_score: number;
  waiting_count: number;
  has_current_patient: boolean;
  emergency_count: number;
  urgent_count: number;
  availability_status: string;
}

export interface WorkloadRecommendation {
  doctor_id: number;
  doctor_name: string;
  load_score: number;
}

export interface PatientWaitTime {
  token: string;
  now_serving: string | null;
  your_position: number | null;
  people_ahead: number;
  eta_low_minutes: number | null;
  eta_high_minutes: number | null;
  eta_clock: string | null;
  doctor_status: string | null;
  status: QueueStatus;
  reason: string | null;
}

export interface AuditEvent {
  id: number;
  actor_id?: number;
  actor_name: string;
  action_type: string;
  entity_type: string;
  entity_id: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface MLStatus {
  trained: boolean;
  model_type: string;
  samples_trained: number;
  mae_seconds?: number | null;
  baseline_mae_seconds?: number | null;
  is_enabled: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  read: boolean;
}
