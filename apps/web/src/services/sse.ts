/**
 * QueueSense — Server-Sent Events (SSE) Client
 * Connects to /api/v1/stream/doctors/:id/queue or /api/v1/stream/patients/:token
 * Manages native EventSource, heartbeat, reconnection, and connection state.
 */

export type SSEConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface SSEClientOptions {
  onStatusChange?: (status: SSEConnectionStatus) => void;
  onQueueUpdate?: (data: any) => void;
  onETAUpdate?: (data: any) => void;
}

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const STREAM_BASE = `${BASE_URL}/api/v1/stream`;

export class SSEStreamManager {
  private urlPath: string;
  private options: SSEClientOptions;
  private eventSource: EventSource | null = null;
  private heartbeatTimer: any = null;
  private reconnectTimer: any = null;
  private isDestroyed = false;

  constructor(
    urlPath: string,
    options: SSEClientOptions = {}
  ) {
    this.urlPath = urlPath;
    this.options = options;
    this.connect();
  }

  private connect() {
    if (this.isDestroyed) return;

    this.options.onStatusChange?.('reconnecting');

    try {
      this.eventSource = new EventSource(`${STREAM_BASE}${this.urlPath}`);

      this.eventSource.onopen = () => {
        this.options.onStatusChange?.('connected');
        this.resetHeartbeatWatchdog();
      };

      this.eventSource.addEventListener('heartbeat', () => {
        this.resetHeartbeatWatchdog();
      });

      this.eventSource.addEventListener('queue_updated', (e) => {
        this.resetHeartbeatWatchdog();
        try {
          const data = JSON.parse(e.data);
          this.options.onQueueUpdate?.(data);
        } catch (err) {
          console.error('Error parsing queue_updated event:', err);
        }
      });

      this.eventSource.addEventListener('eta_updated', (e) => {
        this.resetHeartbeatWatchdog();
        try {
          const data = JSON.parse(e.data);
          this.options.onETAUpdate?.(data);
        } catch (err) {
          console.error('Error parsing eta_updated event:', err);
        }
      });

      this.eventSource.onerror = () => {
        this.options.onStatusChange?.('reconnecting');
        this.scheduleReconnect();
      };
    } catch (err) {
      console.warn('Failed to open EventSource:', err);
      this.scheduleReconnect();
    }
  }

  private resetHeartbeatWatchdog() {
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    // If no message/heartbeat received within 45s, mark reconnecting
    this.heartbeatTimer = setTimeout(() => {
      this.options.onStatusChange?.('reconnecting');
      this.scheduleReconnect();
    }, 45000);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.isDestroyed) return;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  public disconnect() {
    this.isDestroyed = true;
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.options.onStatusChange?.('disconnected');
  }
}
