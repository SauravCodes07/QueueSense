"""
Core Queue Service — deterministic ordering, state machine, ETA calculation.

ORDERING RULE (per doctor):
  1. IN_PROGRESS entry first
  2. EMERGENCY entries next (FIFO within tier)
  3. URGENT entries next (FIFO within tier)
  4. ROUTINE WAITING entries (FIFO by queue_sequence)
  5. NO_SHOW, CANCELLED, COMPLETED, TRANSFERRED excluded

STATE MACHINE:
  WAITING → IN_PROGRESS → COMPLETED
  WAITING → NO_SHOW
  WAITING → CANCELLED
  WAITING → TRANSFERRED

All mutations use db transactions with row locking to prevent race conditions.
Recalculation is idempotent — same state + same event = same result.
"""
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.core.enums import QueueStatus, PriorityLevel, AvailabilityStatus
from app.models import QueueEntry, Doctor, ConsultationSession
from app.services.prediction_service import predict_duration, ema_baseline
from app.core.config import settings

logger = logging.getLogger(__name__)

# Priority ordering for SQL (lower number = higher priority in active queue)
PRIORITY_ORDER = {
    PriorityLevel.EMERGENCY: 1,
    PriorityLevel.URGENT: 2,
    PriorityLevel.ROUTINE: 3,
}

# Active statuses — only these appear in the ordered queue
ACTIVE_STATUSES = {QueueStatus.WAITING, QueueStatus.IN_PROGRESS}


def get_ordered_queue(doctor_id: int, db: Session) -> list[QueueEntry]:
    """
    Return the fully ordered active queue for a doctor.
    
    Order:
      1. IN_PROGRESS first
      2. EMERGENCY WAITING (by queue_sequence)
      3. URGENT WAITING (by queue_sequence)
      4. ROUTINE WAITING (by queue_sequence)
    
    Does NOT lock rows — use get_ordered_queue_for_update() for mutations.
    """
    entries = (
        db.query(QueueEntry)
        .filter(
            QueueEntry.doctor_id == doctor_id,
            QueueEntry.status.in_([QueueStatus.WAITING, QueueStatus.IN_PROGRESS]),
        )
        .all()
    )
    return _sort_queue_entries(entries)


def get_ordered_queue_for_update(doctor_id: int, db: Session) -> list[QueueEntry]:
    """
    Return the ordered active queue WITH a row-level lock.
    Use inside a transaction before any mutation.
    SQLite does not support FOR UPDATE — the pattern is still safe for single-process dev.
    """
    try:
        entries = (
            db.query(QueueEntry)
            .filter(
                QueueEntry.doctor_id == doctor_id,
                QueueEntry.status.in_([QueueStatus.WAITING, QueueStatus.IN_PROGRESS]),
            )
            .with_for_update()
            .all()
        )
    except Exception:
        # SQLite fallback (no FOR UPDATE support)
        entries = (
            db.query(QueueEntry)
            .filter(
                QueueEntry.doctor_id == doctor_id,
                QueueEntry.status.in_([QueueStatus.WAITING, QueueStatus.IN_PROGRESS]),
            )
            .all()
        )
    return _sort_queue_entries(entries)


def _sort_queue_entries(entries: list[QueueEntry]) -> list[QueueEntry]:
    """
    Pure, deterministic sort of queue entries.
    Idempotent: same inputs always produce the same order.
    """
    def sort_key(entry: QueueEntry):
        # IN_PROGRESS always first
        if entry.status == QueueStatus.IN_PROGRESS:
            return (0, 0, entry.queue_sequence)
        # Then by priority tier, then by sequence (FIFO within tier)
        priority_rank = PRIORITY_ORDER.get(entry.priority_level, 99)
        return (1, priority_rank, entry.queue_sequence)

    return sorted(entries, key=sort_key)


def get_next_queue_sequence(doctor_id: int, db: Session) -> int:
    """
    Return the next available queue_sequence for a doctor.
    Monotonically increasing — never reused.
    """
    max_seq = (
        db.query(func.max(QueueEntry.queue_sequence))
        .filter(QueueEntry.doctor_id == doctor_id)
        .scalar()
    )
    return (max_seq or 0) + 1


def calculate_etas(doctor_id: int, db: Session, prediction_source: str = "BASELINE") -> list[dict]:
    """
    Calculate ETAs for all WAITING entries in a doctor's queue.
    
    Formula for patient_i:
      ETA = remaining_time_of_current_consultation
            + sum(predict_duration(doctor, j) for each j ahead of i)
    
    Returns a list of dicts: {queue_entry_id, eta_low_seconds, eta_high_seconds, reason}
    
    This is the core engine. Never call anything outside this function
    to compute ETAs — always go through here for consistency.
    """
    ordered = get_ordered_queue(doctor_id, db)
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    
    if not doctor:
        return []

    now = datetime.now(timezone.utc)
    results = []
    
    # Time accumulated before each WAITING patient
    accumulated_seconds = 0.0
    reason = "queue_position"

    for entry in ordered:
        if entry.status == QueueStatus.IN_PROGRESS:
            # Calculate remaining time of current consultation
            session = entry.consultation_session
            if session and session.started_at:
                started_at = session.started_at
                if started_at.tzinfo is None:
                    started_at = started_at.replace(tzinfo=timezone.utc)
                elapsed = (now - started_at).total_seconds()
                predicted_total = predict_duration(doctor_id, db)
                remaining = max(0.0, predicted_total - elapsed)
                accumulated_seconds = remaining
                reason = "consultation_in_progress"
            else:
                # Session record missing — use full prediction
                accumulated_seconds = predict_duration(doctor_id, db)
            continue  # Don't emit an ETA for IN_PROGRESS patient (they're already being seen)

        if entry.status != QueueStatus.WAITING:
            continue

        # This WAITING patient's ETA is the accumulated time so far
        # Add a range: ±20% of central estimate, minimum ±2 minutes (120s)
        central = accumulated_seconds
        margin = max(central * 0.20, 120.0)
        eta_low = max(0, int(central - margin))
        eta_high = int(central + margin)

        results.append({
            "queue_entry_id": entry.id,
            "eta_low_seconds": eta_low,
            "eta_high_seconds": eta_high,
            "reason": reason,
            "prediction_source": prediction_source,
        })

        # Update accumulated time — add this patient's predicted consultation duration
        accumulated_seconds += predict_duration(doctor_id, db)

    return results


def update_cached_etas(doctor_id: int, db: Session, reason: str = "recalculation") -> list[dict]:
    """
    Recalculate ETAs and persist them to queue_entries.cached_eta_* fields.
    Called after every queue mutation event.
    
    Returns the new ETAs for SSE broadcast.
    """
    etas = calculate_etas(doctor_id, db)
    
    for eta in etas:
        entry = db.query(QueueEntry).filter(QueueEntry.id == eta["queue_entry_id"]).first()
        if entry:
            entry.cached_eta_low_seconds = eta["eta_low_seconds"]
            entry.cached_eta_high_seconds = eta["eta_high_seconds"]
            entry.cached_eta_reason = reason
            entry.updated_at = datetime.now(timezone.utc)

    db.flush()  # Persist within current transaction (don't commit yet)
    return etas


def validate_status_transition(
    current_status: QueueStatus, new_status: QueueStatus
) -> bool:
    """
    Validate that a queue status transition is legal.
    Returns True if valid, False if not.
    """
    valid_transitions = {
        QueueStatus.WAITING: {
            QueueStatus.IN_PROGRESS,
            QueueStatus.NO_SHOW,
            QueueStatus.CANCELLED,
            QueueStatus.TRANSFERRED,
        },
        QueueStatus.IN_PROGRESS: {
            QueueStatus.COMPLETED,
        },
        # Terminal states — no transitions out
        QueueStatus.COMPLETED: set(),
        QueueStatus.NO_SHOW: set(),
        QueueStatus.CANCELLED: set(),
        QueueStatus.TRANSFERRED: set(),
    }
    return new_status in valid_transitions.get(current_status, set())
