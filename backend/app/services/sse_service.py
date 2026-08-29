"""
SSE (Server-Sent Events) Service — real-time event fan-out.

Manages active SSE connections and broadcasts events to subscribed clients.
Each SSE channel is:
  - Doctor queue channel: /stream/doctors/:id/queue  (DOCTOR, RECEPTION, ADMIN)
  - Patient channel:      /stream/patients/:token    (patient own entry only)

All channels receive heartbeat pings every 30 seconds to prevent silent drops.
Clients should reconnect on connection loss (native EventSource behavior).
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import AsyncGenerator

logger = logging.getLogger(__name__)

# Connection registry
# doctor_channels: doctor_id → set of async queues
# patient_channels: patient_token → set of async queues
_doctor_channels: dict[int, set[asyncio.Queue]] = {}
_patient_channels: dict[str, set[asyncio.Queue]] = {}

HEARTBEAT_INTERVAL_SECONDS = 30


def format_sse_event(event: str, data: dict | str) -> str:
    """Format a server-sent event message."""
    if isinstance(data, dict):
        data = json.dumps(data)
    return f"event: {event}\ndata: {data}\n\n"


async def subscribe_doctor_queue(doctor_id: int) -> AsyncGenerator[str, None]:
    """
    SSE generator for a doctor's queue channel.
    Yields SSE-formatted strings.
    Handles cleanup on disconnect.
    """
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    
    if doctor_id not in _doctor_channels:
        _doctor_channels[doctor_id] = set()
    _doctor_channels[doctor_id].add(queue)
    
    logger.info(f"SSE: Client subscribed to doctor {doctor_id} queue channel")
    
    try:
        # Send initial heartbeat
        yield format_sse_event("heartbeat", {"timestamp": datetime.now(timezone.utc).isoformat()})
        
        while True:
            try:
                # Wait for event or heartbeat timeout
                event_data = await asyncio.wait_for(queue.get(), timeout=HEARTBEAT_INTERVAL_SECONDS)
                yield event_data
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                yield format_sse_event("heartbeat", {"timestamp": datetime.now(timezone.utc).isoformat()})
    except asyncio.CancelledError:
        pass
    finally:
        # Clean up on disconnect
        if doctor_id in _doctor_channels:
            _doctor_channels[doctor_id].discard(queue)
            if not _doctor_channels[doctor_id]:
                del _doctor_channels[doctor_id]
        logger.info(f"SSE: Client disconnected from doctor {doctor_id} queue channel")


async def subscribe_patient(patient_token: str) -> AsyncGenerator[str, None]:
    """
    SSE generator for a patient's personal channel.
    Only sends events relevant to this specific patient's queue entry.
    """
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    
    if patient_token not in _patient_channels:
        _patient_channels[patient_token] = set()
    _patient_channels[patient_token].add(queue)
    
    logger.info(f"SSE: Patient {patient_token} subscribed to personal channel")
    
    try:
        yield format_sse_event("heartbeat", {"timestamp": datetime.now(timezone.utc).isoformat()})
        
        while True:
            try:
                event_data = await asyncio.wait_for(queue.get(), timeout=HEARTBEAT_INTERVAL_SECONDS)
                yield event_data
            except asyncio.TimeoutError:
                yield format_sse_event("heartbeat", {"timestamp": datetime.now(timezone.utc).isoformat()})
    except asyncio.CancelledError:
        pass
    finally:
        if patient_token in _patient_channels:
            _patient_channels[patient_token].discard(queue)
            if not _patient_channels[patient_token]:
                del _patient_channels[patient_token]
        logger.info(f"SSE: Patient {patient_token} disconnected from personal channel")


def broadcast_to_doctor_channel(doctor_id: int, event: str, data: dict) -> None:
    """
    Broadcast an event to all subscribers of a doctor's queue channel.
    Called from synchronous queue service code — schedules the broadcast.
    """
    if doctor_id not in _doctor_channels:
        return
    
    message = format_sse_event(event, data)
    channels = _doctor_channels.get(doctor_id, set()).copy()
    
    for queue in channels:
        try:
            queue.put_nowait(message)
        except asyncio.QueueFull:
            logger.warning(f"SSE: Doctor {doctor_id} channel queue full, dropping event {event}")


def broadcast_to_patient(patient_token: str, event: str, data: dict) -> None:
    """
    Broadcast an event to a specific patient's SSE channel.
    """
    if patient_token not in _patient_channels:
        return
    
    message = format_sse_event(event, data)
    channels = _patient_channels.get(patient_token, set()).copy()
    
    for queue in channels:
        try:
            queue.put_nowait(message)
        except asyncio.QueueFull:
            logger.warning(f"SSE: Patient {patient_token} channel queue full, dropping event {event}")


def broadcast_queue_update(doctor_id: int, reason: str, queue_snapshot: list[dict]) -> None:
    """
    Broadcast a full queue update to all subscribers of a doctor channel
    AND to each individual patient's personal channel.
    
    This is the primary broadcast method — called after every queue mutation.
    """
    from datetime import datetime, timezone
    
    timestamp = datetime.now(timezone.utc).isoformat()
    
    # Broadcast to doctor channel (full queue state)
    broadcast_to_doctor_channel(
        doctor_id,
        "queue_updated",
        {
            "doctor_id": doctor_id,
            "reason": reason,
            "updated_at": timestamp,
            "entries": queue_snapshot,
        }
    )
    
    # Broadcast to each patient's personal channel (only their own data)
    for entry in queue_snapshot:
        patient_token = entry.get("token")
        if patient_token:
            broadcast_to_patient(
                patient_token,
                "eta_updated",
                {
                    "token": patient_token,
                    "position": entry.get("position"),
                    "eta_low_minutes": entry.get("eta_low_minutes"),
                    "eta_high_minutes": entry.get("eta_high_minutes"),
                    "eta_clock": entry.get("eta_clock"),
                    "reason": reason,
                    "updated_at": timestamp,
                }
            )


def get_connection_counts() -> dict:
    """Return number of active SSE connections (for admin monitoring)."""
    return {
        "doctor_channels": sum(len(qs) for qs in _doctor_channels.values()),
        "patient_channels": sum(len(qs) for qs in _patient_channels.values()),
        "doctor_count": len(_doctor_channels),
        "patient_count": len(_patient_channels),
    }
