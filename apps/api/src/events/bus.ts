import { EventEmitter } from 'events';

export interface QueueUpdatedEvent {
  doctorId: number;
  reason: string;
  timestamp: string;
}

export interface PatientETAUpdatedEvent {
  patientToken: string;
  doctorId: number;
  etaLowMinutes: number | null;
  etaHighMinutes: number | null;
  deltaMinutes: number;
  reason: string;
}

class EventBus extends EventEmitter {
  public emitQueueUpdated(event: QueueUpdatedEvent) {
    this.emit(`doctor:${event.doctorId}:queue_updated`, event);
    this.emit('global:queue_updated', event);
  }

  public emitPatientETAUpdated(event: PatientETAUpdatedEvent) {
    this.emit(`patient:${event.patientToken}:eta_updated`, event);
  }
}

export const eventBus = new EventBus();
