/**
 * QueueSense — Frontend API Client
 * Connects to the FastAPI backend at http://localhost:8000/api/v1 (or configurable baseURL)
 */
import {
  Department,
  Doctor,
  QueueItem,
  WorkloadSummary,
  WorkloadRecommendation,
  PatientWaitTime,
  AuditEvent,
  MLStatus,
  PriorityLevel,
  AvailabilityStatus,
} from '../types';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const API_BASE = `${BASE_URL}/api/v1`;

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('queuesense_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      // Fallback text
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

// ─── Authentication API ───────────────────────────────────────────────────────
export const apiAuth = {
  login: (email: string, password: string) =>
    request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  verifyPatientToken: (patient_token: string) =>
    request<{ token: string; name: string; patient_id: number }>(`/auth/patient-token?patient_token=${patient_token}`, {
      method: 'POST',
    }),
};

// ─── Departments & Doctors API ────────────────────────────────────────────────
export const apiData = {
  getDepartments: () => request<Department[]>('/departments/'),
  getDoctors: (deptId?: number) =>
    request<Doctor[]>(deptId ? `/doctors/?department_id=${deptId}` : '/doctors/'),
  getDoctor: (doctorId: number) => request<Doctor>(`/doctors/${doctorId}`),
  setAvailability: (doctorId: number, status: AvailabilityStatus, note?: string) =>
    request<{ doctor_id: number; new_status: string }>(`/doctors/${doctorId}/availability`, {
      method: 'POST',
      body: JSON.stringify({ status, note }),
    }),
  getWorkload: (doctorId: number) => request<WorkloadSummary>(`/doctors/${doctorId}/workload`),
  getWorkloadRecommendations: (departmentId: number, excludeDoctorId?: number) =>
    request<{ recommendation: WorkloadRecommendation | null }>(
      `/doctors/workload-recommendations?department_id=${departmentId}${excludeDoctorId ? `&exclude_doctor_id=${excludeDoctorId}` : ''}`
    ),
};

// ─── Patients & Queue API ─────────────────────────────────────────────────────
export const apiQueue = {
  getDoctorQueue: (doctorId: number) => request<QueueItem[]>(`/queue/${doctorId}`),
  registerPatient: (name: string, contact?: string) =>
    request<{ id: number; token: string; name: string }>('/patients/', {
      method: 'POST',
      body: JSON.stringify({ name, contact }),
    }),
  joinQueue: (doctorId: number, patientToken: string, priority: PriorityLevel = 'ROUTINE') =>
    request<{ entry_id: number; token: string; queue_sequence: number; eta_low_minutes: number; eta_high_minutes: number }>('/queue/join', {
      method: 'POST',
      body: JSON.stringify({ doctor_id: doctorId, patient_token: patientToken, priority }),
    }),
  getPatientWaitTime: (token: string) => request<PatientWaitTime>(`/patients/${token}/wait-time`),
  setPriority: (entryId: number, priority: PriorityLevel, reason: string) =>
    request<{ message: string; entry_id: number; new_priority: string }>(`/queue/${entryId}/priority`, {
      method: 'POST',
      body: JSON.stringify({ priority, reason }),
    }),
  flagNoShow: (entryId: number) =>
    request<{ message: string; entry_id: number; flagged_at: string }>(`/queue/${entryId}/flag-no-show`, {
      method: 'POST',
    }),
  markNoShow: (entryId: number, reason?: string) =>
    request<{ message: string; entry_id: number }>(`/queue/${entryId}/no-show`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  transferPatient: (entryId: number, toDoctorId: number, reason: string) =>
    request<{ message: string; new_entry_id: number }>(`/queue/${entryId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ to_doctor_id: toDoctorId, reason }),
    }),
  cancelQueueEntry: (entryId: number, reason?: string) =>
    request<{ message: string; entry_id: number }>(`/queue/${entryId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

// ─── Consultation Tracking API ────────────────────────────────────────────────
export const apiConsultations = {
  start: (queueEntryId: number) =>
    request<{ message: string; session_id: number; queue_entry_id: number; started_at: string }>('/consultations/start', {
      method: 'POST',
      body: JSON.stringify({ queue_entry_id: queueEntryId }),
    }),
  complete: (sessionId?: number, queueEntryId?: number) =>
    request<{ message: string; duration_seconds: number; duration_minutes: number; doctor_ema_seconds?: number }>('/consultations/complete', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, queue_entry_id: queueEntryId }),
    }),
};

// ─── Admin, ML & Demo API ─────────────────────────────────────────────────────
export const apiAdmin = {
  getAuditEvents: (limit: number = 50) => request<AuditEvent[]>(`/audit-events/?limit=${limit}`),
  getAnalyticsWaitTimes: (rangeDays: number = 7) => request<any>(`/analytics/wait-times?range=${rangeDays}`),
  getMLStatus: () => request<MLStatus>('/ml/status'),
  trainML: () => request<any>('/ml/train', { method: 'POST' }),
  toggleML: (enabled: boolean) => request<{ message: string; metrics: MLStatus }>('/ml/toggle', {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  }),
  resetDemoData: () => request<{ message: string }>('/demo/reset', { method: 'POST' }),
  triggerEmergencyIncident: (doctorId: number) =>
    request<{ message: string; entry_id: number; patient_token: string }>(`/demo/trigger-emergency?doctor_id=${doctorId}`, {
      method: 'POST',
    }),
  triggerNoShowIncident: (doctorId: number) =>
    request<{ message: string; entry_id: number; patient_token: string }>(`/demo/trigger-no-show?doctor_id=${doctorId}`, {
      method: 'POST',
    }),
};
