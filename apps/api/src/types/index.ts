export const PriorityTier = {
  ROUTINE: 'ROUTINE',
  URGENT: 'URGENT',
  EMERGENCY: 'EMERGENCY',
} as const;
export type PriorityTier = (typeof PriorityTier)[keyof typeof PriorityTier];

export const QueueStatus = {
  WAITING: 'WAITING',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  NO_SHOW: 'NO_SHOW',
  CANCELLED: 'CANCELLED',
  TRANSFERRED: 'TRANSFERRED',
} as const;
export type QueueStatus = (typeof QueueStatus)[keyof typeof QueueStatus];

export const UserRole = {
  ADMIN: 'ADMIN',
  RECEPTION: 'RECEPTION',
  DOCTOR: 'DOCTOR',
  PATIENT: 'PATIENT',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AvailabilityStatus = {
  AVAILABLE: 'AVAILABLE',
  ON_BREAK: 'ON_BREAK',
  UNAVAILABLE: 'UNAVAILABLE',
  OFFLINE: 'OFFLINE',
} as const;
export type AvailabilityStatus = (typeof AvailabilityStatus)[keyof typeof AvailabilityStatus];
